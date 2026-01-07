import { Body, Controller, Get, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { AuthService } from './auth.service';
import { RegisterDto } from './auth.dto';
import { ClerkAuthGuard } from './clerk-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) { }

  @Post('register')
  async register(@Body() payload: RegisterDto) {
    return this.authService.register(payload);
  }

  @ApiBearerAuth()
  @UseGuards(ClerkAuthGuard)
  @Get('me')
  async me(@CurrentUser() user: { clerkId: string }) {
    return this.authService.getUserByClerkId(user.clerkId);
  }

  @ApiBearerAuth()
  @UseGuards(ClerkAuthGuard)
  @Get('workspace')
  async workspace(@CurrentUser() user: { clerkId: string }) {
    return this.authService.getWorkspaceForUser(user.clerkId);
  }

  @ApiBearerAuth()
  @UseGuards(ClerkAuthGuard)
  @Post('link-to-demo')
  async linkToDemo(@CurrentUser() user: { clerkId: string; claims?: any }) {
    const email = user.claims?.email || `${user.clerkId}@signalcraft.local`;
    const displayName = user.claims?.name || user.claims?.first_name || undefined;
    return this.authService.linkToDemoWorkspace(user.clerkId, email, displayName);
  }
}
