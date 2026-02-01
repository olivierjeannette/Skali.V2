'use server';

import { createClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';
import { requireOrganization } from '@/lib/auth';
import type {
  Workflow,
  WorkflowTemplate,
  WorkflowRun,
  WorkflowLog,
  WorkflowCanvasData,
  WorkflowSettings,
  CreateWorkflowInput,
  UpdateWorkflowInput,
  WorkflowWithStats,
} from '@/types/workflow.types';

// =====================================================
// TYPES
// =====================================================

type ActionResult<T = void> =
  | { success: true; data?: T }
  | { success: false; error: string };

// Default settings for new workflows
const DEFAULT_SETTINGS: WorkflowSettings = {
  timezone: 'Europe/Paris',
  max_executions_per_day: 1000,
  retry_failed: true,
  retry_count: 3,
  retry_delay_seconds: 60,
  log_level: 'info',
  notifications: {
    on_failure: true,
    on_success: false,
    notify_emails: [],
  },
};

// Default canvas data for new workflows
const DEFAULT_CANVAS_DATA: WorkflowCanvasData = {
  nodes: [],
  edges: [],
  viewport: { x: 0, y: 0, zoom: 1 },
};

// =====================================================
// WORKFLOW CRUD ACTIONS
// =====================================================

/**
 * Get all workflows for the organization
 */
export async function getWorkflows(): Promise<WorkflowWithStats[]> {
  const org = await requireOrganization();
  const orgId = org.id;
  const supabase = await createClient();

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (supabase as any)
    .from('workflows')
    .select('*')
    .eq('org_id', orgId)
    .order('updated_at', { ascending: false });

  if (error) {
    console.error('Error fetching workflows:', error);
    return [];
  }

  // Calculate success rate for each workflow
  return (data || []).map((workflow: Workflow) => ({
    ...workflow,
    success_rate: workflow.total_executions > 0
      ? Math.round((workflow.successful_executions / workflow.total_executions) * 100)
      : 0,
  }));
}

/**
 * Get a single workflow by ID with all details
 */
export async function getWorkflow(workflowId: string): Promise<Workflow | null> {
  await requireOrganization();
  const supabase = await createClient();

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (supabase as any)
    .from('workflows')
    .select('*')
    .eq('id', workflowId)
    .single();

  if (error) {
    console.error('Error fetching workflow:', error);
    return null;
  }

  return data;
}

/**
 * Create a new workflow
 */
export async function createWorkflow(
  input: CreateWorkflowInput
): Promise<ActionResult<Workflow>> {
  const org = await requireOrganization();
  const orgId = org.id;
  const supabase = await createClient();

  // Get current user
  const { data: { user } } = await supabase.auth.getUser();

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (supabase as any)
    .from('workflows')
    .insert({
      org_id: orgId,
      name: input.name,
      description: input.description || null,
      icon: input.icon || 'workflow',
      color: input.color || '#6366f1',
      folder_id: input.folder_id || null,
      tags: input.tags || [],
      canvas_data: DEFAULT_CANVAS_DATA,
      settings: DEFAULT_SETTINGS,
      created_by: user?.id || null,
    })
    .select()
    .single();

  if (error) {
    console.error('Error creating workflow:', error);
    return { success: false, error: error.message };
  }

  revalidatePath('/dashboard/workflows');
  return { success: true, data };
}

/**
 * Update a workflow
 */
export async function updateWorkflow(
  workflowId: string,
  input: UpdateWorkflowInput
): Promise<ActionResult<Workflow>> {
  await requireOrganization();
  const supabase = await createClient();

  // Get current user
  const { data: { user } } = await supabase.auth.getUser();

  const updateData: Record<string, unknown> = {
    updated_by: user?.id || null,
  };

  if (input.name !== undefined) updateData.name = input.name;
  if (input.description !== undefined) updateData.description = input.description;
  if (input.icon !== undefined) updateData.icon = input.icon;
  if (input.color !== undefined) updateData.color = input.color;
  if (input.folder_id !== undefined) updateData.folder_id = input.folder_id;
  if (input.tags !== undefined) updateData.tags = input.tags;
  if (input.is_active !== undefined) updateData.is_active = input.is_active;
  if (input.canvas_data !== undefined) updateData.canvas_data = input.canvas_data;
  if (input.settings !== undefined) {
    // Merge with existing settings
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: existing } = await (supabase as any)
      .from('workflows')
      .select('settings')
      .eq('id', workflowId)
      .single();

    updateData.settings = {
      ...(existing?.settings || DEFAULT_SETTINGS),
      ...input.settings,
    };
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (supabase as any)
    .from('workflows')
    .update(updateData)
    .eq('id', workflowId)
    .select()
    .single();

  if (error) {
    console.error('Error updating workflow:', error);
    return { success: false, error: error.message };
  }

  revalidatePath('/dashboard/workflows');
  revalidatePath(`/dashboard/workflows/${workflowId}`);
  return { success: true, data };
}

/**
 * Delete a workflow
 */
export async function deleteWorkflow(workflowId: string): Promise<ActionResult> {
  await requireOrganization();
  const supabase = await createClient();

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error } = await (supabase as any)
    .from('workflows')
    .delete()
    .eq('id', workflowId);

  if (error) {
    console.error('Error deleting workflow:', error);
    return { success: false, error: error.message };
  }

  revalidatePath('/dashboard/workflows');
  return { success: true };
}

/**
 * Duplicate a workflow
 */
export async function duplicateWorkflow(
  workflowId: string,
  newName?: string
): Promise<ActionResult<Workflow>> {
  await requireOrganization();
  const supabase = await createClient();

  // Get current user
  const { data: { user } } = await supabase.auth.getUser();

  // Call the database function
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (supabase as any)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    .rpc('duplicate_workflow', {
      p_workflow_id: workflowId,
      p_new_name: newName || 'Copie de workflow',
      p_created_by: user?.id || null,
    });

  if (error) {
    console.error('Error duplicating workflow:', error);
    return { success: false, error: error.message };
  }

  // Fetch the new workflow
  const newWorkflow = await getWorkflow(data);

  revalidatePath('/dashboard/workflows');
  return { success: true, data: newWorkflow || undefined };
}

/**
 * Toggle workflow active status
 */
export async function toggleWorkflowActive(
  workflowId: string,
  isActive: boolean
): Promise<ActionResult<Workflow>> {
  return updateWorkflow(workflowId, { is_active: isActive });
}

// =====================================================
// WORKFLOW TEMPLATE ACTIONS
// =====================================================

/**
 * Get all workflow templates (official + org-specific)
 */
export async function getWorkflowTemplates(): Promise<WorkflowTemplate[]> {
  const org = await requireOrganization();
  const orgId = org.id;
  const supabase = await createClient();

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (supabase as any)
    .from('workflow_templates')
    .select('*')
    .or(`org_id.is.null,org_id.eq.${orgId}`)
    .order('is_official', { ascending: false })
    .order('name');

  if (error) {
    console.error('Error fetching workflow templates:', error);
    return [];
  }

  return data || [];
}

/**
 * Create a workflow from a template
 */
export async function createWorkflowFromTemplate(
  templateId: string,
  name: string
): Promise<ActionResult<Workflow>> {
  const org = await requireOrganization();
  const orgId = org.id;
  const supabase = await createClient();

  // Get current user
  const { data: { user } } = await supabase.auth.getUser();

  // Get the template
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: template, error: templateError } = await (supabase as any)
    .from('workflow_templates')
    .select('*')
    .eq('id', templateId)
    .single();

  if (templateError || !template) {
    console.error('Error fetching template:', templateError);
    return { success: false, error: 'Template non trouve' };
  }

  // Create workflow from template
  const canvasData: WorkflowCanvasData = {
    nodes: template.nodes_config || [],
    edges: template.edges_config || [],
    viewport: { x: 0, y: 0, zoom: 1 },
  };

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: workflow, error } = await (supabase as any)
    .from('workflows')
    .insert({
      org_id: orgId,
      name: name,
      description: template.description,
      icon: template.icon || 'workflow',
      color: '#6366f1',
      canvas_data: canvasData,
      settings: { ...DEFAULT_SETTINGS, ...template.settings },
      created_by: user?.id || null,
    })
    .select()
    .single();

  if (error) {
    console.error('Error creating workflow from template:', error);
    return { success: false, error: error.message };
  }

  // Increment template usage count
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  await (supabase as any)
    .from('workflow_templates')
    .update({ usage_count: template.usage_count + 1 })
    .eq('id', templateId);

  revalidatePath('/dashboard/workflows');
  return { success: true, data: workflow };
}

// =====================================================
// WORKFLOW EXECUTION ACTIONS
// =====================================================

/**
 * Get workflow runs (history)
 */
export async function getWorkflowRuns(
  workflowId: string,
  limit: number = 50
): Promise<WorkflowRun[]> {
  await requireOrganization();
  const supabase = await createClient();

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (supabase as any)
    .from('workflow_runs')
    .select('*')
    .eq('workflow_id', workflowId)
    .order('created_at', { ascending: false })
    .limit(limit);

  if (error) {
    console.error('Error fetching workflow runs:', error);
    return [];
  }

  return data || [];
}

/**
 * Get a single workflow run with node runs
 */
export async function getWorkflowRun(runId: string): Promise<WorkflowRun | null> {
  await requireOrganization();
  const supabase = await createClient();

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (supabase as any)
    .from('workflow_runs')
    .select(`
      *,
      node_runs:workflow_node_runs(*)
    `)
    .eq('id', runId)
    .single();

  if (error) {
    console.error('Error fetching workflow run:', error);
    return null;
  }

  return data;
}

/**
 * Get workflow logs for a run
 */
export async function getWorkflowLogs(
  runId: string,
  limit: number = 100
): Promise<WorkflowLog[]> {
  await requireOrganization();
  const supabase = await createClient();

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (supabase as any)
    .from('workflow_logs')
    .select('*')
    .eq('run_id', runId)
    .order('created_at', { ascending: true })
    .limit(limit);

  if (error) {
    console.error('Error fetching workflow logs:', error);
    return [];
  }

  return data || [];
}

/**
 * Manually trigger a workflow and execute it
 */
export async function triggerWorkflow(
  workflowId: string,
  triggerData: Record<string, unknown> = {}
): Promise<ActionResult<WorkflowRun & { execution_result?: Record<string, unknown> }>> {
  const org = await requireOrganization();
  const orgId = org.id;
  const supabase = await createClient();

  // Get current user
  const { data: { user } } = await supabase.auth.getUser();

  // Get workflow to verify it exists and is active
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: workflow, error: workflowError } = await (supabase as any)
    .from('workflows')
    .select('*')
    .eq('id', workflowId)
    .single();

  if (workflowError || !workflow) {
    return { success: false, error: 'Workflow non trouve' };
  }

  if (!workflow.is_active) {
    return { success: false, error: 'Workflow inactif' };
  }

  // Import and use the workflow engine
  const { executeWorkflowById } = await import('@/lib/workflows');

  // Execute the workflow
  const executionResult = await executeWorkflowById(
    workflowId,
    orgId,
    triggerData,
    user?.id
  );

  // Get the run record
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: run } = await (supabase as any)
    .from('workflow_runs')
    .select('*')
    .eq('id', executionResult.run_id)
    .single();

  revalidatePath(`/dashboard/workflows/${workflowId}`);

  if (!executionResult.success) {
    return {
      success: false,
      error: executionResult.error || 'Unknown error',
    };
  }

  return {
    success: true,
    data: run ? { ...run, execution_result: executionResult } : undefined,
  };
}

// =====================================================
// WORKFLOW FOLDER ACTIONS
// =====================================================

/**
 * Get all workflow folders
 */
export async function getWorkflowFolders(): Promise<Array<{
  id: string;
  name: string;
  color: string;
  parent_id: string | null;
}>> {
  const org = await requireOrganization();
  const orgId = org.id;
  const supabase = await createClient();

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (supabase as any)
    .from('workflow_folders')
    .select('id, name, color, parent_id')
    .eq('org_id', orgId)
    .order('name');

  if (error) {
    console.error('Error fetching workflow folders:', error);
    return [];
  }

  return data || [];
}

/**
 * Create a workflow folder
 */
export async function createWorkflowFolder(input: {
  name: string;
  color?: string;
  parent_id?: string;
}): Promise<ActionResult<{ id: string; name: string; color: string }>> {
  const org = await requireOrganization();
  const orgId = org.id;
  const supabase = await createClient();

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (supabase as any)
    .from('workflow_folders')
    .insert({
      org_id: orgId,
      name: input.name,
      color: input.color || '#6366f1',
      parent_id: input.parent_id || null,
    })
    .select('id, name, color')
    .single();

  if (error) {
    console.error('Error creating workflow folder:', error);
    return { success: false, error: error.message };
  }

  revalidatePath('/dashboard/workflows');
  return { success: true, data };
}

/**
 * Delete a workflow folder
 */
export async function deleteWorkflowFolder(folderId: string): Promise<ActionResult> {
  await requireOrganization();
  const supabase = await createClient();

  // First, unset folder_id on any workflows in this folder
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  await (supabase as any)
    .from('workflows')
    .update({ folder_id: null })
    .eq('folder_id', folderId);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error } = await (supabase as any)
    .from('workflow_folders')
    .delete()
    .eq('id', folderId);

  if (error) {
    console.error('Error deleting workflow folder:', error);
    return { success: false, error: error.message };
  }

  revalidatePath('/dashboard/workflows');
  return { success: true };
}

// =====================================================
// STATS ACTIONS
// =====================================================

/**
 * Get workflow stats summary
 */
export async function getWorkflowStats(): Promise<{
  total_workflows: number;
  active_workflows: number;
  total_executions: number;
  successful_executions: number;
  failed_executions: number;
}> {
  const org = await requireOrganization();
  const orgId = org.id;
  const supabase = await createClient();

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (supabase as any)
    .from('workflows')
    .select('is_active, total_executions, successful_executions, failed_executions')
    .eq('org_id', orgId);

  if (error) {
    console.error('Error fetching workflow stats:', error);
    return {
      total_workflows: 0,
      active_workflows: 0,
      total_executions: 0,
      successful_executions: 0,
      failed_executions: 0,
    };
  }

  const workflows = data || [];
  return {
    total_workflows: workflows.length,
    active_workflows: workflows.filter((w: Workflow) => w.is_active).length,
    total_executions: workflows.reduce((sum: number, w: Workflow) => sum + w.total_executions, 0),
    successful_executions: workflows.reduce((sum: number, w: Workflow) => sum + w.successful_executions, 0),
    failed_executions: workflows.reduce((sum: number, w: Workflow) => sum + w.failed_executions, 0),
  };
}
