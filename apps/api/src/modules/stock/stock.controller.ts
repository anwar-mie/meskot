import { Body, Controller, Get, Post, Query, Req, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { PERMISSION_CODES } from '@meskot/shared-types';
import {
  receiveStockSchema,
  stockAdjustmentSchema,
  type ReceiveStockInput,
  type StockAdjustmentInput,
} from '@meskot/shared-schemas';
import { JwtAuthGuard, type RequestWithUser } from '../../common/guards/jwt-auth.guard';
import { PermissionsGuard } from '../../common/guards/permissions.guard';
import { Permissions } from '../../common/decorators/permissions.decorator';
import { ZodValidationPipe } from '../../common/pipes/zod-validation.pipe';
import { StockService } from './stock.service';

@ApiTags('Inventory & Warehouses')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller()
export class StockController {
  constructor(private readonly stockService: StockService) {}

  @Get('warehouses')
  @Permissions(PERMISSION_CODES.INVENTORY_READ)
  listWarehouses() {
    return this.stockService.listWarehouses();
  }

  @Get('inventory')
  @Permissions(PERMISSION_CODES.INVENTORY_READ)
  listInventory(
    @Query('warehouseId') warehouseId?: string,
    @Query('search') search?: string,
    @Query('status') status?: string,
  ) {
    return this.stockService.listInventory({ warehouseId, search, status });
  }

  @Get('inventory/movements')
  @Permissions(PERMISSION_CODES.INVENTORY_READ)
  listMovements() {
    return this.stockService.listMovements();
  }

  @Post('inventory/receive')
  @Permissions(PERMISSION_CODES.INVENTORY_RECEIVE)
  receiveStock(
    @Body(new ZodValidationPipe(receiveStockSchema)) body: ReceiveStockInput,
    @Req() req: RequestWithUser,
  ) {
    return this.stockService.receiveStock(body, req.user!.sub);
  }

  @Post('inventory/adjustments')
  @Permissions(PERMISSION_CODES.INVENTORY_ADJUST)
  adjustStock(
    @Body(new ZodValidationPipe(stockAdjustmentSchema)) body: StockAdjustmentInput,
    @Req() req: RequestWithUser,
  ) {
    return this.stockService.adjustStock(body, req.user!.sub);
  }
}
