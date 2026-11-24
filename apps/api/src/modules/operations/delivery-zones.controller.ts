import { Body, Controller, Get, Param, Patch, Post, Req, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { PERMISSION_CODES } from '@meskot/shared-types';
import { JwtAuthGuard, type RequestWithUser } from '../../common/guards/jwt-auth.guard';
import { PermissionsGuard } from '../../common/guards/permissions.guard';
import { Permissions } from '../../common/decorators/permissions.decorator';
import { DeliveryZonesService } from './delivery-zones.service';

@ApiTags('Staff Delivery Zones')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller('staff/delivery-zones')
export class DeliveryZonesController {
  constructor(private readonly zonesService: DeliveryZonesService) {}

  @Get()
  @Permissions(PERMISSION_CODES.DELIVERIES_READ)
  listZones() {
    return this.zonesService.listZones();
  }

  @Post()
  @Permissions(PERMISSION_CODES.DELIVERIES_ASSIGN)
  createZone(
    @Body()
    body: {
      name: string;
      city?: string;
      fee: number;
      freeDeliveryThreshold?: number | null;
      estimatedDaysMin?: number;
      estimatedDaysMax?: number;
    },
    @Req() req: RequestWithUser,
  ) {
    return this.zonesService.createZone(body, req.user!.sub);
  }

  @Patch(':id')
  @Permissions(PERMISSION_CODES.DELIVERIES_ASSIGN)
  updateZone(
    @Param('id') id: string,
    @Body()
    body: {
      name?: string;
      city?: string;
      fee?: number;
      freeDeliveryThreshold?: number | null;
      estimatedDaysMin?: number;
      estimatedDaysMax?: number;
      isActive?: boolean;
    },
    @Req() req: RequestWithUser,
  ) {
    return this.zonesService.updateZone(id, body, req.user!.sub);
  }
}
