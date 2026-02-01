// =====================================================
// API ROUTE: WORKFLOW TRIGGER
// POST /api/workflows/trigger
// Manually trigger a workflow or handle webhook triggers
// =====================================================

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { triggerWorkflowsByEvent, executeWorkflowById, type TriggerPayload } from '@/lib/workflows';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      workflow_id,
      org_id,
      trigger_type,
      trigger_data = {},
      member_id,
      subscription_id,
      class_id,
      workout_id,
    } = body;

    // Validate required fields
    if (!org_id) {
      return NextResponse.json(
        { error: 'org_id is required' },
        { status: 400 }
      );
    }

    // Option 1: Trigger a specific workflow by ID
    if (workflow_id) {
      const supabase = await createClient();
      const { data: { user } } = await supabase.auth.getUser();

      const result = await executeWorkflowById(
        workflow_id,
        org_id,
        trigger_data,
        user?.id
      );

      return NextResponse.json(result);
    }

    // Option 2: Trigger workflows by event type
    if (trigger_type) {
      const payload: TriggerPayload = {
        trigger_type,
        data: trigger_data,
        member_id,
        subscription_id,
        class_id,
        workout_id,
      };

      const results = await triggerWorkflowsByEvent(org_id, payload);

      return NextResponse.json({
        success: true,
        workflows_triggered: results.length,
        results,
      });
    }

    return NextResponse.json(
      { error: 'Either workflow_id or trigger_type is required' },
      { status: 400 }
    );
  } catch (error) {
    console.error('Workflow trigger error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    );
  }
}
