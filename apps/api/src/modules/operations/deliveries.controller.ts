import { Body, Controller, Get, Param, Patch, Req, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { PERMISSION_CODES, type DeliveryStatusType } from '@meskot/shared-types';
import { JwtAuthGuard, type RequestWithUser } from '../../common/guards/jwt-auth.guard';
import { PermissionsGuard } from '../../common/guards/permissions.guard';
import { Permissions } from '../../common/decorators/permissions.decorator';
import { DeliveriesService } from './deliveries.service';

@ApiTags('Deliveries')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller('deliveries')
export class DeliveriesController {
  constructor(private readonly deliveriesService: DeliveriesService) {}

  @Get()
  @Permissions(PERMISSION_CODES.DELIVERIES_READ)
  listAll() {
    return this.deliveriesService.listAllDeliveries();
  }

  @Get('assigned')
  @Permissions(PERMISSION_CODES.DELIVERIES_ASSIGNED_READ)
  listAssigned(@Req() req: RequestWithUser) {
    return this.deliveriesService.listAssignedDeliveries(req.user!.sub);
  }

  @Patch(':id/assign')
  @Permissions(PERMISSION_CODES.DELIVERIES_ASSIGN)
  assignAgent(
    @Param('id') id: string,
    @Body() body: { agentId: string },
    @Req() req: RequestWithUser,
  ) {
    return this.deliveriesService.assignAgent(id, body.agentId, req.user!.sub);
  }

  @Patch(':id/status')
  updateStatus(
    @Param('id') id: string,
    @Body()
    body: {
      status: DeliveryStatusType;
      note?: string;
      recipientSignedName?: string;
      codAmountCollected?: number;
    },
    @Req() req: RequestWithUser,
  ) {
    return this.deliveriesService.updateDeliveryStatus(id, body, req.user!);
  }
}
