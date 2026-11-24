import { Body, Controller, Get, Patch, Req, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { PERMISSION_CODES } from '@meskot/shared-types';
import { JwtAuthGuard, type RequestWithUser } from '../../common/guards/jwt-auth.guard';
import { PermissionsGuard } from '../../common/guards/permissions.guard';
import { Permissions } from '../../common/decorators/permissions.decorator';
import { SettingsService } from './settings.service';

@ApiTags('Business Settings')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller('settings')
export class SettingsController {
  constructor(private readonly settingsService: SettingsService) {}

  @Get()
  @Permissions(PERMISSION_CODES.SETTINGS_MANAGE)
  getSettings() {
    return this.settingsService.getSettings();
  }

  @Patch()
  @Permissions(PERMISSION_CODES.SETTINGS_MANAGE)
  updateSettings(@Body() body: Record<string, unknown>, @Req() req: RequestWithUser) {
    return this.settingsService.updateSettings(body, req.user!.sub);
  }
}
