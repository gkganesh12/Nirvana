import { cn } from '@/lib/utils';

export function ErrorMessage({ message, className }: { message: string; className?: string }) {
  return (
    <div className={cn('rounded-md border border-destructive/40 bg-destructive/10 px-4 py-3 text-sm text-destructive', className)}>
      {message}
    </div>
  );
}
