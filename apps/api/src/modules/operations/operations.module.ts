import { Module } from '@nestjs/common';
import { StaffOrdersController } from './staff-orders.controller';
import { StaffOrdersService } from './staff-orders.service';
import { DeliveriesController } from './deliveries.controller';
import { DeliveriesService } from './deliveries.service';
import { ReturnsController } from './returns.controller';
import { ReturnsService } from './returns.service';
import { ReportsController } from './reports.controller';
import { ReportsService } from './reports.service';

@Module({
  controllers: [
    StaffOrdersController,
    DeliveriesController,
    ReturnsController,
    ReportsController,
  ],
  providers: [StaffOrdersService, DeliveriesService, ReturnsService, ReportsService],
})
export class OperationsModule {}
