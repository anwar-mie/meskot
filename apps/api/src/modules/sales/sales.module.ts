import { Module } from '@nestjs/common';
import { CartController } from './cart.controller';
import { CartService } from './cart.service';
import { AddressesController } from './addresses.controller';
import { AddressesService } from './addresses.service';
import { OrdersController } from './orders.controller';
import { OrdersService } from './orders.service';

@Module({
  controllers: [CartController, AddressesController, OrdersController],
  providers: [CartService, AddressesService, OrdersService],
  exports: [CartService, AddressesService, OrdersService],
})
export class SalesModule {}
