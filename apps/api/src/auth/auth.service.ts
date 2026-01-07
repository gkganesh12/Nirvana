import { Injectable } from '@nestjs/common';
import { prisma, WorkspaceRole } from '@signalcraft/database';
import { RegisterDto } from './auth.dto';

@Injectable()
export class AuthService {
  async register(payload: RegisterDto) {
    const workspace = await prisma.workspace.create({
      data: {
        name: payload.workspaceName,
      },
    });

    const user = await prisma.user.create({
      data: {
        workspaceId: workspace.id,
        clerkId: payload.clerkId,
        email: payload.email,
        displayName: payload.displayName ?? null,
        role: WorkspaceRole.OWNER,
      },
    });

    return { workspace, user };
  }

  async getUserByClerkId(clerkId: string) {
    return prisma.user.findUnique({
      where: { clerkId },
    });
  }

  async getWorkspaceForUser(clerkId: string) {
    const user = await prisma.user.findUnique({
      where: { clerkId },
      include: { workspace: true },
    });
    return user?.workspace ?? null;
  }

  async upsertFromClerk(event: {
    data: {
      id: string;
      first_name?: string | null;
      last_name?: string | null;
      email_addresses?: Array<{ email_address: string; id: string }>;
      primary_email_address_id?: string | null;
    };
  }) {
    const clerkId = event.data.id;
    const primaryEmail =
      event.data.email_addresses?.find(
        (email) => email.id === event.data.primary_email_address_id,
      )?.email_address ?? event.data.email_addresses?.[0]?.email_address;

    const displayName = [event.data.first_name, event.data.last_name]
      .filter(Boolean)
      .join(' ')
      .trim();

    const existing = await prisma.user.findUnique({ where: { clerkId } });
    if (existing) {
      return existing;
    }

    const workspaceName = displayName ? `${displayName}'s Workspace` : 'SignalCraft Workspace';

    const workspace = await prisma.workspace.create({
      data: { name: workspaceName },
    });

    return prisma.user.create({
      data: {
        workspaceId: workspace.id,
        clerkId,
        email: primaryEmail ?? `user_${clerkId}@signalcraft.local`,
        displayName: displayName || null,
        role: WorkspaceRole.OWNER,
      },
    });
  }

  /**
   * Link an authenticated Clerk user to the demo workspace (first workspace found)
   * This is useful for testing with seeded data
   */
  async linkToDemoWorkspace(clerkId: string, email: string, displayName?: string) {
    // Check if user already exists
    const existingUser = await prisma.user.findUnique({ where: { clerkId } });
    if (existingUser) {
      return {
        message: 'User already linked to a workspace',
        user: existingUser,
        isNew: false,
      };
    }

    // Find the first workspace (demo workspace from seed)
    const demoWorkspace = await prisma.workspace.findFirst({
      orderBy: { createdAt: 'asc' },
    });

    if (!demoWorkspace) {
      throw new Error('No workspace found. Please run the seed script first.');
    }

    // Create user linked to the demo workspace
    const user = await prisma.user.create({
      data: {
        workspaceId: demoWorkspace.id,
        clerkId,
        email,
        displayName: displayName || null,
        role: WorkspaceRole.OWNER,
      },
    });

    return {
      message: 'Successfully linked to demo workspace',
      user,
      workspace: demoWorkspace,
      isNew: true,
    };
  }
}
