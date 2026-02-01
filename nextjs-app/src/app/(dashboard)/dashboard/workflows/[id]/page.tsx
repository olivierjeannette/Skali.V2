import { notFound } from 'next/navigation';
import { getWorkflow } from '@/actions/workflows';
import { WorkflowEditorPage } from './workflow-editor-page';

export const metadata = {
  title: 'Editeur de workflow | Skali Prog',
  description: 'Editez votre workflow',
};

interface WorkflowPageProps {
  params: Promise<{ id: string }>;
}

export default async function WorkflowPage({ params }: WorkflowPageProps) {
  const { id } = await params;
  const workflow = await getWorkflow(id);

  if (!workflow) {
    notFound();
  }

  return <WorkflowEditorPage workflow={workflow} />;
}
