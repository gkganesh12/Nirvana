import { WorkflowBuilder } from '@/components/workflows/workflow-builder';

interface PageProps {
  params: {
    id: string;
  };
}

export default function EditWorkflowPage({ params }: PageProps) {
  return (
    <div className="flex-1 space-y-4 p-8 pt-6">
      <WorkflowBuilder workflowId={params.id} />
    </div>
  );
}
