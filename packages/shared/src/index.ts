export type WorkspaceRole = 'owner' | 'admin' | 'member';

export interface WorkspaceRef {
  id: string;
  name: string;
}

export interface UserRef {
  id: string;
  email: string;
  displayName: string | null;
}
