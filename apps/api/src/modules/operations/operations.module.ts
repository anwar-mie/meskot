import { Module } from '@nestjs/common';
import { StaffOrdersController } from './staff-orders.controller';
import { StaffOrdersService } from './staff-orders.service';
import { DeliveriesController } from './deliveries.controller';
import { DeliveriesService } from './deliveries.service';
import { ReturnsController } from './returns.controller';
import { ReturnsService } from './returns.service';
import { ReportsController } from './reports.controller';
import { ReportsService } from './reports.service';
import { CustomersController } from './customers.controller';
import { CustomersService } from './customers.service';
import { DeliveryZonesController } from './delivery-zones.controller';
import { DeliveryZonesService } from './delivery-zones.service';
import { SettingsController } from './settings.controller';
import { SettingsService } from './settings.service';

@Module({
  controllers: [
    StaffOrdersController,
    DeliveriesController,
    ReturnsController,
    ReportsController,
    CustomersController,
    DeliveryZonesController,
    SettingsController,
  ],
  providers: [
    StaffOrdersService,
    DeliveriesService,
    ReturnsService,
    ReportsService,
    CustomersService,
    DeliveryZonesService,
    SettingsService,
  ],
})
export class OperationsModule {}
