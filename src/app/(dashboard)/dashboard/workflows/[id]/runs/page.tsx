import { Suspense } from 'react';
import { getWorkflow, getWorkflowRuns } from '@/actions/workflows';
import { notFound } from 'next/navigation';
import { WorkflowRunsPage } from './workflow-runs-page';

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function Page({ params }: PageProps) {
  const { id } = await params;
  const [workflow, runs] = await Promise.all([
    getWorkflow(id),
    getWorkflowRuns(id, 100),
  ]);

  if (!workflow) {
    notFound();
  }

  return (
    <Suspense fallback={<div className="p-8">Chargement...</div>}>
      <WorkflowRunsPage workflow={workflow} runs={runs} />
    </Suspense>
  );
}
