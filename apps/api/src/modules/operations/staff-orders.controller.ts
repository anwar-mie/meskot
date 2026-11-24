import { Body, Controller, Get, Param, Patch, Query, Req, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import {
  PERMISSION_CODES,
  type OrderStatusType,
  type PaymentStatusType,
} from '@meskot/shared-types';
import { JwtAuthGuard, type RequestWithUser } from '../../common/guards/jwt-auth.guard';
import { PermissionsGuard } from '../../common/guards/permissions.guard';
import { Permissions } from '../../common/decorators/permissions.decorator';
import { StaffOrdersService } from './staff-orders.service';

@ApiTags('Staff Orders')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller('staff')
export class StaffOrdersController {
  constructor(private readonly staffOrdersService: StaffOrdersService) {}

  @Get('orders')
  @Permissions(PERMISSION_CODES.ORDERS_READ)
  listOrders(
    @Query('search') search?: string,
    @Query('status') status?: string,
    @Query('paymentStatus') paymentStatus?: string,
  ) {
    return this.staffOrdersService.listOrders({ search, status, paymentStatus });
  }

  @Patch('orders/:id/status')
  @Permissions(PERMISSION_CODES.ORDERS_UPDATE)
  updateStatus(
    @Param('id') id: string,
    @Body() body: { status: OrderStatusType },
    @Req() req: RequestWithUser,
  ) {
    return this.staffOrdersService.updateOrderStatus(id, body.status, req.user!.sub);
  }

  @Patch('payments/:id/status')
  @Permissions(PERMISSION_CODES.PAYMENTS_RECONCILE)
  updatePaymentStatus(
    @Param('id') id: string,
    @Body() body: { status: PaymentStatusType },
    @Req() req: RequestWithUser,
  ) {
    return this.staffOrdersService.reconcileCodPayment(id, body.status, req.user!.sub);
  }
}
