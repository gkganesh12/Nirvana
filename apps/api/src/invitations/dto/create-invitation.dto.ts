import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsEnum, IsNotEmpty } from 'class-validator';
import { WorkspaceRole } from '@signalcraft/database';

export class CreateInvitationDto {
    @ApiProperty({ example: 'colleague@example.com' })
    @IsEmail()
    @IsNotEmpty()
    email!: string;

    @ApiProperty({ enum: WorkspaceRole, default: WorkspaceRole.MEMBER })
    @IsEnum(WorkspaceRole)
    role: WorkspaceRole = WorkspaceRole.MEMBER;
}
