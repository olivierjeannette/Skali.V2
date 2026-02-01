// =====================================================
// WORKFLOW EXECUTION ENGINE
// Moteur d'execution des workflows automatises
// =====================================================

import { createClient } from '@/lib/supabase/server';
import type {
  Workflow,
  WorkflowNode,
  WorkflowEdge,
  WorkflowContext,
  WorkflowExecutionStatus,
  NodeExecutionStatus,
  TriggerType,
  ActionType,
} from '@/types/workflow.types';
import { executeAction } from './action-handlers';

// =====================================================
// TYPES
// =====================================================

export interface TriggerPayload {
  trigger_type: TriggerType;
  data: Record<string, unknown>;
  member_id?: string;
  subscription_id?: string;
  class_id?: string;
  workout_id?: string;
}

export interface ExecutionResult {
  success: boolean;
  run_id?: string;
  error?: string;
  nodes_executed?: number;
  duration_ms?: number;
}

interface NodeExecutionResult {
  status: NodeExecutionStatus;
  output: Record<string, unknown>;
  error?: string;
  next_nodes: string[];
  should_delay?: {
    duration: number;
    unit: 'seconds' | 'minutes' | 'hours' | 'days';
  };
}

// =====================================================
// WORKFLOW ENGINE
// =====================================================

export class WorkflowEngine {
  private supabase: Awaited<ReturnType<typeof createClient>> | null = null;
  private orgId: string;
  private context: WorkflowContext;

  constructor(orgId: string) {
    this.orgId = orgId;
    this.context = {
      org: { id: orgId, name: '', settings: {} },
      trigger_data: {},
      variables: {},
      now: new Date().toISOString(),
    };
  }

  private async getSupabase() {
    if (!this.supabase) {
      this.supabase = await createClient();
    }
    return this.supabase;
  }

  /**
   * Execute a workflow triggered by an event
   */
  async executeByTrigger(payload: TriggerPayload): Promise<ExecutionResult[]> {
    const supabase = await this.getSupabase();
    const results: ExecutionResult[] = [];

    // Find active workflows with matching trigger
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: workflows, error } = await (supabase as any)
      .from('workflows')
      .select('*')
      .eq('org_id', this.orgId)
      .eq('is_active', true);

    if (error || !workflows) {
      console.error('Error fetching workflows:', error);
      return [{ success: false, error: 'Failed to fetch workflows' }];
    }

    // Filter workflows that have a trigger node matching the trigger type
    const matchingWorkflows = workflows.filter((workflow: Workflow) => {
      const triggerNode = workflow.canvas_data.nodes.find(
        (node: WorkflowNode) =>
          node.type === 'trigger' &&
          node.data.trigger_type === payload.trigger_type
      );
      return !!triggerNode;
    });

    // Build context with trigger data
    await this.buildContext(payload);

    // Execute each matching workflow
    for (const workflow of matchingWorkflows) {
      const result = await this.executeWorkflow(workflow, payload);
      results.push(result);
    }

    return results;
  }

  /**
   * Execute a specific workflow (manual trigger or by ID)
   */
  async executeWorkflow(
    workflow: Workflow,
    payload?: TriggerPayload,
    executedBy?: string
  ): Promise<ExecutionResult> {
    const supabase = await this.getSupabase();
    const startTime = Date.now();

    // Create workflow run record
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: run, error: runError } = await (supabase as any)
      .from('workflow_runs')
      .insert({
        workflow_id: workflow.id,
        org_id: this.orgId,
        status: 'running' as WorkflowExecutionStatus,
        triggered_by: payload ? 'trigger' : 'manual',
        trigger_data: payload?.data || {},
        context: this.context,
        started_at: new Date().toISOString(),
        executed_by: executedBy,
      })
      .select()
      .single();

    if (runError || !run) {
      console.error('Error creating workflow run:', runError);
      return { success: false, error: 'Failed to create workflow run' };
    }

    try {
      await this.log(run.id, null, 'info', `Starting workflow: ${workflow.name}`);

      // Get the trigger node or first node
      const nodes = workflow.canvas_data.nodes;
      const edges = workflow.canvas_data.edges;

      const triggerNode = nodes.find(
        (n: WorkflowNode) =>
          n.type === 'trigger' &&
          (!payload || n.data.trigger_type === payload.trigger_type)
      );

      if (!triggerNode) {
        throw new Error('No trigger node found in workflow');
      }

      // Execute nodes starting from trigger
      let nodesExecuted = 0;
      const executedNodeIds = new Set<string>();
      const nodeQueue: string[] = [triggerNode.id];

      while (nodeQueue.length > 0) {
        const currentNodeId = nodeQueue.shift()!;

        if (executedNodeIds.has(currentNodeId)) {
          continue; // Skip already executed nodes
        }

        const currentNode = nodes.find((n: WorkflowNode) => n.id === currentNodeId);
        if (!currentNode) {
          continue;
        }

        // Execute the node
        const nodeResult = await this.executeNode(run.id, currentNode, edges);
        executedNodeIds.add(currentNodeId);
        nodesExecuted++;

        // Log node execution
        await this.logNodeRun(run.id, currentNode.id, nodeResult);

        // Check continue_on_fail from action config if it exists
        const continueOnFail = (currentNode.data.action_config as Record<string, unknown> | undefined)?.continue_on_fail;
        if (nodeResult.status === 'failed' && !continueOnFail) {
          throw new Error(nodeResult.error || 'Node execution failed');
        }

        // Handle delay actions - schedule continuation instead of waiting
        if (nodeResult.should_delay) {
          await this.scheduleDelayedExecution(
            run.id,
            workflow.id,
            nodeResult.next_nodes,
            nodeResult.should_delay
          );
          // Don't add next nodes to queue - they'll be executed after delay
        } else {
          // Add next nodes to queue
          nodeQueue.push(...nodeResult.next_nodes);
        }
      }

      // Update run status to completed
      const duration = Date.now() - startTime;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await (supabase as any)
        .from('workflow_runs')
        .update({
          status: 'completed' as WorkflowExecutionStatus,
          completed_at: new Date().toISOString(),
          duration_ms: duration,
        })
        .eq('id', run.id);

      await this.log(run.id, null, 'info', `Workflow completed in ${duration}ms`);

      return {
        success: true,
        run_id: run.id,
        nodes_executed: nodesExecuted,
        duration_ms: duration,
      };
    } catch (err) {
      const error = err instanceof Error ? err.message : 'Unknown error';
      const duration = Date.now() - startTime;

      // Update run status to failed
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await (supabase as any)
        .from('workflow_runs')
        .update({
          status: 'failed' as WorkflowExecutionStatus,
          error_message: error,
          completed_at: new Date().toISOString(),
          duration_ms: duration,
        })
        .eq('id', run.id);

      await this.log(run.id, null, 'error', `Workflow failed: ${error}`);

      return {
        success: false,
        run_id: run.id,
        error,
        duration_ms: duration,
      };
    }
  }

  /**
   * Execute a single node
   */
  private async executeNode(
    runId: string,
    node: WorkflowNode,
    edges: WorkflowEdge[]
  ): Promise<NodeExecutionResult> {
    try {
      await this.log(runId, node.id, 'debug', `Executing node: ${node.data.label || node.id}`);

      // Handle trigger nodes (just pass through)
      if (node.type === 'trigger') {
        const nextNodes = this.getNextNodes(node.id, edges);
        return {
          status: 'completed',
          output: { triggered: true, trigger_type: node.data.trigger_type },
          next_nodes: nextNodes,
        };
      }

      // Handle action nodes
      if (node.type === 'action' && node.data.action_type) {
        const result = await this.executeActionNode(runId, node, edges);
        return result;
      }

      // Handle condition nodes
      if (node.type === 'condition' || node.data.action_type === 'condition_branch') {
        const result = await this.executeConditionNode(node, edges);
        return result;
      }

      throw new Error(`Unknown node type: ${node.type}`);
    } catch (err) {
      const error = err instanceof Error ? err.message : 'Unknown error';
      await this.log(runId, node.id, 'error', `Node failed: ${error}`);

      return {
        status: 'failed',
        output: {},
        error,
        next_nodes: [],
      };
    }
  }

  /**
   * Execute an action node
   */
  private async executeActionNode(
    runId: string,
    node: WorkflowNode,
    edges: WorkflowEdge[]
  ): Promise<NodeExecutionResult> {
    const actionType = node.data.action_type as ActionType;
    const config = (node.data.action_config || {}) as Record<string, unknown>;

    // Handle delay action specially
    if (actionType === 'delay') {
      const delayConfig = config as { duration?: number; unit?: string };
      const nextNodes = this.getNextNodes(node.id, edges);

      return {
        status: 'completed',
        output: { delayed: true, ...delayConfig },
        next_nodes: nextNodes,
        should_delay: {
          duration: delayConfig.duration || 60,
          unit: (delayConfig.unit as 'seconds' | 'minutes' | 'hours' | 'days') || 'seconds',
        },
      };
    }

    // Execute other actions
    const result = await executeAction(actionType, config, this.context, this.orgId);

    await this.log(
      runId,
      node.id,
      result.success ? 'info' : 'error',
      result.success
        ? `Action ${actionType} completed`
        : `Action ${actionType} failed: ${result.error}`
    );

    const nextNodes = this.getNextNodes(node.id, edges);

    return {
      status: result.success ? 'completed' : 'failed',
      output: result.data || {},
      error: result.error,
      next_nodes: result.success ? nextNodes : [],
    };
  }

  /**
   * Execute a condition node
   */
  private async executeConditionNode(
    node: WorkflowNode,
    edges: WorkflowEdge[]
  ): Promise<NodeExecutionResult> {
    const config = node.data.action_config as { expression?: string } | undefined;
    const expression = config?.expression || 'true';

    // Evaluate condition
    const result = this.evaluateExpression(expression);

    // Get edges for true/false branches
    const trueEdges = edges.filter(
      (e) => e.source === node.id && e.sourceHandle === 'true'
    );
    const falseEdges = edges.filter(
      (e) => e.source === node.id && e.sourceHandle === 'false'
    );

    // If no specific handles, get all next nodes
    if (trueEdges.length === 0 && falseEdges.length === 0) {
      return {
        status: 'completed',
        output: { condition_result: result },
        next_nodes: result ? this.getNextNodes(node.id, edges) : [],
      };
    }

    return {
      status: 'completed',
      output: { condition_result: result },
      next_nodes: result
        ? trueEdges.map((e) => e.target)
        : falseEdges.map((e) => e.target),
    };
  }

  /**
   * Get next node IDs from edges
   */
  private getNextNodes(nodeId: string, edges: WorkflowEdge[]): string[] {
    return edges
      .filter((e) => e.source === nodeId)
      .map((e) => e.target);
  }

  /**
   * Evaluate a condition expression with context
   */
  private evaluateExpression(expression: string): boolean {
    try {
      // Replace template variables with actual values
      const processedExpression = this.interpolateTemplate(expression);

      // Simple evaluation for common patterns
      // Pattern: {{value}} == 'string'
      const equalMatch = processedExpression.match(/^(.+?)\s*==\s*['"](.+?)['"]$/);
      if (equalMatch) {
        return equalMatch[1].trim() === equalMatch[2];
      }

      // Pattern: {{value}} != 'string'
      const notEqualMatch = processedExpression.match(/^(.+?)\s*!=\s*['"](.+?)['"]$/);
      if (notEqualMatch) {
        return notEqualMatch[1].trim() !== notEqualMatch[2];
      }

      // Pattern: {{value}} > number
      const gtMatch = processedExpression.match(/^(.+?)\s*>\s*(\d+)$/);
      if (gtMatch) {
        return parseFloat(gtMatch[1]) > parseFloat(gtMatch[2]);
      }

      // Pattern: {{value}} < number
      const ltMatch = processedExpression.match(/^(.+?)\s*<\s*(\d+)$/);
      if (ltMatch) {
        return parseFloat(ltMatch[1]) < parseFloat(ltMatch[2]);
      }

      // Default: truthy check
      return !!processedExpression && processedExpression !== 'false' && processedExpression !== '0';
    } catch {
      return false;
    }
  }

  /**
   * Interpolate template variables in a string
   */
  private interpolateTemplate(template: string): string {
    return template.replace(/\{\{(.+?)\}\}/g, (_, path) => {
      const value = this.getValueFromPath(path.trim());
      return value !== undefined ? String(value) : '';
    });
  }

  /**
   * Get a value from context using dot notation path
   */
  private getValueFromPath(path: string): unknown {
    const parts = path.split('.');
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let current: any = this.context;

    for (const part of parts) {
      if (current === null || current === undefined) {
        return undefined;
      }
      current = current[part];
    }

    return current;
  }

  /**
   * Build execution context from trigger payload
   */
  private async buildContext(payload: TriggerPayload): Promise<void> {
    const supabase = await this.getSupabase();

    // Get organization info
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: org } = await (supabase as any)
      .from('organizations')
      .select('id, name, settings')
      .eq('id', this.orgId)
      .single();

    if (org) {
      this.context.org = {
        id: org.id,
        name: org.name,
        settings: org.settings || {},
      };
    }

    // Get member info if provided
    if (payload.member_id) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data: member } = await (supabase as any)
        .from('members')
        .select('id, first_name, last_name, email, phone, status, tags')
        .eq('id', payload.member_id)
        .single();

      if (member) {
        this.context.member = {
          id: member.id,
          first_name: member.first_name,
          last_name: member.last_name,
          email: member.email,
          phone: member.phone,
          status: member.status,
          tags: member.tags || [],
        };
      }
    }

    // Get subscription info if provided
    if (payload.subscription_id) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data: sub } = await (supabase as any)
        .from('subscriptions')
        .select('id, start_date, end_date, status, plan:plans(name)')
        .eq('id', payload.subscription_id)
        .single();

      if (sub) {
        this.context.subscription = {
          id: sub.id,
          plan_name: sub.plan?.name || '',
          start_date: sub.start_date,
          end_date: sub.end_date,
          status: sub.status,
        };
      }
    }

    // Get class info if provided
    if (payload.class_id) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data: classData } = await (supabase as any)
        .from('classes')
        .select('id, name, start_time, end_time, coach:profiles(full_name)')
        .eq('id', payload.class_id)
        .single();

      if (classData) {
        this.context.class = {
          id: classData.id,
          name: classData.name,
          starts_at: classData.start_time,
          ends_at: classData.end_time,
          coach_name: classData.coach?.full_name,
        };
      }
    }

    // Store trigger data
    this.context.trigger_data = payload.data;
    this.context.now = new Date().toISOString();
  }

  /**
   * Schedule delayed execution (for delay actions)
   */
  private async scheduleDelayedExecution(
    runId: string,
    workflowId: string,
    nextNodeIds: string[],
    delay: { duration: number; unit: string }
  ): Promise<void> {
    // Calculate delay in milliseconds
    const multipliers: Record<string, number> = {
      seconds: 1000,
      minutes: 60 * 1000,
      hours: 60 * 60 * 1000,
      days: 24 * 60 * 60 * 1000,
    };

    const delayMs = delay.duration * (multipliers[delay.unit] || 1000);
    const executeAt = new Date(Date.now() + delayMs);

    await this.log(
      runId,
      null,
      'info',
      `Scheduled continuation at ${executeAt.toISOString()} (${delay.duration} ${delay.unit})`
    );

    // Store scheduled execution in database
    const supabase = await this.getSupabase();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (supabase as any).from('workflow_scheduled_runs').insert({
      run_id: runId,
      workflow_id: workflowId,
      org_id: this.orgId,
      next_node_ids: nextNodeIds,
      execute_at: executeAt.toISOString(),
      status: 'pending',
    });

    // Update run status to waiting
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (supabase as any)
      .from('workflow_runs')
      .update({ status: 'waiting' as WorkflowExecutionStatus })
      .eq('id', runId);
  }

  /**
   * Log a message
   */
  private async log(
    runId: string,
    nodeId: string | null,
    level: 'debug' | 'info' | 'warn' | 'error',
    message: string,
    data?: Record<string, unknown>
  ): Promise<void> {
    const supabase = await this.getSupabase();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (supabase as any).from('workflow_logs').insert({
      run_id: runId,
      node_id: nodeId,
      level,
      message,
      data: data || {},
    });
  }

  /**
   * Log node run result
   */
  private async logNodeRun(
    runId: string,
    nodeId: string,
    result: NodeExecutionResult
  ): Promise<void> {
    const supabase = await this.getSupabase();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (supabase as any).from('workflow_node_runs').insert({
      run_id: runId,
      node_id: nodeId,
      status: result.status,
      output_data: result.output,
      error_message: result.error,
      completed_at: new Date().toISOString(),
    });
  }
}

/**
 * Create and run workflow engine for a trigger event
 */
export async function triggerWorkflowsByEvent(
  orgId: string,
  payload: TriggerPayload
): Promise<ExecutionResult[]> {
  const engine = new WorkflowEngine(orgId);
  return engine.executeByTrigger(payload);
}

/**
 * Manually execute a workflow by ID
 */
export async function executeWorkflowById(
  workflowId: string,
  orgId: string,
  triggerData?: Record<string, unknown>,
  executedBy?: string
): Promise<ExecutionResult> {
  const supabase = await createClient();

  // Get workflow
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: workflow, error } = await (supabase as any)
    .from('workflows')
    .select('*')
    .eq('id', workflowId)
    .eq('org_id', orgId)
    .single();

  if (error || !workflow) {
    return { success: false, error: 'Workflow not found' };
  }

  if (!workflow.is_active) {
    return { success: false, error: 'Workflow is not active' };
  }

  const engine = new WorkflowEngine(orgId);
  return engine.executeWorkflow(workflow, undefined, executedBy);
}
