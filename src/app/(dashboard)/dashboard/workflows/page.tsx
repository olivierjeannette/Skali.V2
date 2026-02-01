import { Suspense } from 'react';
import { getWorkflows, getWorkflowTemplates, getWorkflowStats } from '@/actions/workflows';
import { WorkflowsManager } from './workflows-manager';

export const metadata = {
  title: 'Workflows | Skali Prog',
  description: 'Gerez vos automatisations',
};

export default async function WorkflowsPage() {
  const [workflows, templates, stats] = await Promise.all([
    getWorkflows(),
    getWorkflowTemplates(),
    getWorkflowStats(),
  ]);

  return (
    <Suspense fallback={<WorkflowsLoading />}>
      <WorkflowsManager
        initialWorkflows={workflows}
        templates={templates}
        stats={stats}
      />
    </Suspense>
  );
}

function WorkflowsLoading() {
  return (
    <div className="p-6">
      <div className="animate-pulse space-y-4">
        <div className="h-8 bg-gray-200 rounded w-48" />
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-24 bg-gray-200 rounded-lg" />
          ))}
        </div>
        <div className="h-96 bg-gray-200 rounded-lg" />
      </div>
    </div>
  );
}
