import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { prisma } from '@signalcraft/database';

@Injectable()
export class TeamsService {
  async listTeams(workspaceId: string) {
    const prismaClient = prisma as any;
    const teams = await prismaClient.team.findMany({
      where: { workspaceId },
      orderBy: { createdAt: 'desc' },
      include: {
        _count: {
          select: { members: true },
        },
      },
    });

    return teams.map((team: any) => ({
      id: team.id,
      name: team.name,
      description: team.description,
      createdBy: team.createdBy,
      createdAt: team.createdAt,
      updatedAt: team.updatedAt,
      memberCount: team._count.members,
    }));
  }

  async getTeam(workspaceId: string, teamId: string) {
    const prismaClient = prisma as any;
    const team = await prismaClient.team.findFirst({
      where: { id: teamId, workspaceId },
      include: {
        members: {
          include: {
            user: {
              select: { id: true, email: true, displayName: true, role: true },
            },
          },
          orderBy: { createdAt: 'asc' },
        },
      },
    });

    if (!team) {
      throw new NotFoundException('Team not found');
    }

    return {
      id: team.id,
      name: team.name,
      description: team.description,
      createdBy: team.createdBy,
      createdAt: team.createdAt,
      updatedAt: team.updatedAt,
      members: team.members.map((member: any) => ({
        id: member.user.id,
        email: member.user.email,
        displayName: member.user.displayName,
        role: member.user.role,
        addedAt: member.createdAt,
      })),
    };
  }

  async createTeam(
    workspaceId: string,
    actorId: string,
    data: { name: string; description?: string },
  ) {
    const prismaClient = prisma as any;
    return prismaClient.team.create({
      data: {
        workspaceId,
        name: data.name,
        description: data.description ?? null,
        createdBy: actorId,
      },
    });
  }

  async updateTeam(
    workspaceId: string,
    teamId: string,
    data: { name?: string; description?: string },
  ) {
    const prismaClient = prisma as any;
    const existing = await prismaClient.team.findFirst({ where: { id: teamId, workspaceId } });
    if (!existing) {
      throw new NotFoundException('Team not found');
    }

    return prismaClient.team.update({
      where: { id: teamId },
      data: {
        name: data.name ?? undefined,
        description: data.description ?? undefined,
      },
    });
  }

  async deleteTeam(workspaceId: string, teamId: string) {
    const prismaClient = prisma as any;
    const existing = await prismaClient.team.findFirst({ where: { id: teamId, workspaceId } });
    if (!existing) {
      throw new NotFoundException('Team not found');
    }

    await prismaClient.team.delete({ where: { id: teamId } });
    return { success: true };
  }

  async addMember(workspaceId: string, teamId: string, userId: string) {
    const prismaClient = prisma as any;
    const team = await prismaClient.team.findFirst({ where: { id: teamId, workspaceId } });
    if (!team) {
      throw new NotFoundException('Team not found');
    }

    const user = await prismaClient.user.findFirst({ where: { id: userId, workspaceId } });
    if (!user) {
      throw new NotFoundException('User not found in workspace');
    }

    const existing = await prismaClient.teamMember.findFirst({ where: { teamId, userId } });
    if (existing) {
      throw new BadRequestException('User is already a member of this team');
    }

    await prismaClient.teamMember.create({
      data: {
        teamId,
        userId,
      },
    });

    return { success: true };
  }

  async listMembers(workspaceId: string, teamId: string) {
    const prismaClient = prisma as any;
    const team = await prismaClient.team.findFirst({ where: { id: teamId, workspaceId } });
    if (!team) {
      throw new NotFoundException('Team not found');
    }

    const members = await prismaClient.teamMember.findMany({
      where: { teamId },
      include: {
        user: {
          select: { id: true, email: true, displayName: true, role: true },
        },
      },
      orderBy: { createdAt: 'asc' },
    });

    return members.map((member: any) => ({
      id: member.user.id,
      email: member.user.email,
      displayName: member.user.displayName,
      role: member.user.role,
      addedAt: member.createdAt,
    }));
  }

  async removeMember(workspaceId: string, teamId: string, userId: string) {
    const prismaClient = prisma as any;
    const team = await prismaClient.team.findFirst({ where: { id: teamId, workspaceId } });
    if (!team) {
      throw new NotFoundException('Team not found');
    }

    const membership = await prismaClient.teamMember.findFirst({ where: { teamId, userId } });
    if (!membership) {
      throw new NotFoundException('Team member not found');
    }

    await prismaClient.teamMember.delete({ where: { id: membership.id } });
    return { success: true };
  }
}
