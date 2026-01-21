import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString } from 'class-validator';

export class AcceptInvitationDto {
    @ApiProperty({ example: 'inv_abc123xyz' })
    @IsString()
    @IsNotEmpty()
    token!: string;
}
