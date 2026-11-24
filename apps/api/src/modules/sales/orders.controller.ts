import {
  Body,
  Controller,
  Get,
  Headers,
  Param,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiHeader, ApiTags } from '@nestjs/swagger';
import {
  cancelOrderSchema,
  createOrderSchema,
  type CancelOrderInput,
  type CreateOrderInput,
} from '@meskot/shared-schemas';
import { JwtAuthGuard, type RequestWithUser } from '../../common/guards/jwt-auth.guard';
import { ZodValidationPipe } from '../../common/pipes/zod-validation.pipe';
import { OrdersService } from './orders.service';

@ApiTags('Orders')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('orders')
export class OrdersController {
  constructor(private readonly ordersService: OrdersService) {}

  @Post()
  @ApiHeader({ name: 'Idempotency-Key', required: true })
  createOrder(
    @Body(new ZodValidationPipe(createOrderSchema)) body: CreateOrderInput,
    @Headers('idempotency-key') idempotencyKey: string,
    @Req() req: RequestWithUser,
  ) {
    return this.ordersService.createOrder(req.user!.sub, body, idempotencyKey);
  }

  @Get()
  listOrders(@Req() req: RequestWithUser) {
    return this.ordersService.listCustomerOrders(req.user!.sub);
  }

  @Get(':orderNumber')
  getOrder(@Param('orderNumber') orderNumber: string, @Req() req: RequestWithUser) {
    return this.ordersService.getCustomerOrder(req.user!.sub, orderNumber);
  }

  @Post(':orderNumber/cancel')
  cancelOrder(
    @Param('orderNumber') orderNumber: string,
    @Body(new ZodValidationPipe(cancelOrderSchema)) body: CancelOrderInput,
    @Req() req: RequestWithUser,
  ) {
    return this.ordersService.cancelCustomerOrder(req.user!.sub, orderNumber, body.reason);
  }
}
