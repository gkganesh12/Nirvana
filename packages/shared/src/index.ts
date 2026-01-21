export type WorkspaceRole = 'OWNER' | 'ADMIN' | 'MEMBER';

export interface WorkspaceRef {
  id: string;
  name: string;
}

export interface UserRef {
  id: string;
  email: string;
  displayName: string | null;
}

export type AlertSeverity = 'INFO' | 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';

export interface NormalizedAlert {
  source: string;
  sourceEventId: string;
  project: string;
  environment: string;
  severity: AlertSeverity;
  fingerprint: string;
  title: string;
  description: string;
  tags: Record<string, string>;
  occurredAt: Date;
  link: string | null;
  // Impact Estimation
  userCount: number | null;
}

// Export routing types
export * from './routing.types';
