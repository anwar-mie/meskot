import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { StockMovementType } from '@meskot/database';
import type { ReceiveStockInput, StockAdjustmentInput } from '@meskot/shared-schemas';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class StockService {
  constructor(private readonly prisma: PrismaService) {}

  async listWarehouses() {
    return this.prisma.warehouse.findMany({
      where: { isActive: true, deletedAt: null },
      orderBy: [{ isDefault: 'desc' }, { name: 'asc' }],
    });
  }

  async listInventory(params: { warehouseId?: string; search?: string; status?: string }) {
    const items = await this.prisma.inventoryItem.findMany({
      where: {
        ...(params.warehouseId ? { warehouseId: params.warehouseId } : {}),
        ...(params.search
          ? {
              variant: {
                OR: [
                  { sku: { contains: params.search, mode: 'insensitive' } },
                  { nameEn: { contains: params.search, mode: 'insensitive' } },
                  { product: { nameEn: { contains: params.search, mode: 'insensitive' } } },
                ],
              },
            }
          : {}),
      },
      include: {
        warehouse: true,
        variant: {
          include: {
            product: { select: { id: true, nameEn: true, slug: true, status: true } },
          },
        },
      },
      orderBy: { updatedAt: 'desc' },
    });

    const mapped = items.map((item) => {
      const available = Math.max(0, item.onHand - item.reserved);
      const stockStatus: 'OUT_OF_STOCK' | 'LOW_STOCK' | 'IN_STOCK' =
        available === 0
          ? 'OUT_OF_STOCK'
          : available <= item.lowStockThreshold
            ? 'LOW_STOCK'
            : 'IN_STOCK';

      return {
        id: item.id,
        warehouseId: item.warehouseId,
        warehouseName: item.warehouse.name,
        warehouseCode: item.warehouse.code,
        variantId: item.variantId,
        sku: item.variant.sku,
        variantName: item.variant.nameEn,
        productId: item.variant.product.id,
        productName: item.variant.product.nameEn,
        onHand: item.onHand,
        reserved: item.reserved,
        available,
        lowStockThreshold: item.lowStockThreshold,
        stockStatus,
      };
    });

    const summary = {
      totalUnits: mapped.reduce((sum, i) => sum + i.onHand, 0),
      inStockVariants: mapped.filter((i) => i.stockStatus === 'IN_STOCK').length,
      lowStockCount: mapped.filter((i) => i.stockStatus === 'LOW_STOCK').length,
      outOfStockCount: mapped.filter((i) => i.stockStatus === 'OUT_OF_STOCK').length,
    };

    const filtered =
      params.status && params.status !== 'ALL'
        ? mapped.filter((i) => i.stockStatus === params.status)
        : mapped;

    return { summary, items: filtered };
  }

  async listMovements(limit = 30) {
    return this.prisma.stockMovement.findMany({
      take: limit,
      orderBy: { createdAt: 'desc' },
      include: {
        warehouse: { select: { code: true, name: true } },
        variant: {
          select: {
            sku: true,
            nameEn: true,
            product: { select: { nameEn: true } },
          },
        },
        actor: { select: { fullName: true } },
      },
    });
  }

  async receiveStock(input: ReceiveStockInput, actorId: string) {
    const [warehouse, variant] = await Promise.all([
      this.prisma.warehouse.findUnique({ where: { id: input.warehouseId } }),
      this.prisma.productVariant.findUnique({ where: { id: input.variantId } }),
    ]);
    if (!warehouse) throw new NotFoundException('Warehouse not found');
    if (!variant) throw new NotFoundException('Product variant not found');

    return this.prisma.$transaction(async (tx) => {
      const inv = await tx.inventoryItem.upsert({
        where: {
          warehouseId_variantId: {
            warehouseId: input.warehouseId,
            variantId: input.variantId,
          },
        },
        update: {
          onHand: { increment: input.quantity },
        },
        create: {
          warehouseId: input.warehouseId,
          variantId: input.variantId,
          onHand: input.quantity,
          reserved: 0,
        },
      });

      const reasonText = input.notes ? `${input.reason} — ${input.notes}` : input.reason;

      const movement = await tx.stockMovement.create({
        data: {
          warehouseId: input.warehouseId,
          variantId: input.variantId,
          type: StockMovementType.RECEIVE,
          quantityDelta: input.quantity,
          unitCost: input.unitCost ?? variant.costPrice ?? null,
          reason: reasonText,
          referenceType: input.supplierReference ? 'PURCHASE_RECEIPT' : 'MANUAL',
          referenceId: input.supplierReference ?? null,
          actorId,
        },
      });

      await tx.auditLog.create({
        data: {
          actorId,
          action: 'STOCK_RECEIVED',
          entityType: 'InventoryItem',
          entityId: inv.id,
          afterData: {
            sku: variant.sku,
            warehouse: warehouse.code,
            quantityAdded: input.quantity,
            newOnHand: inv.onHand,
            reference: input.supplierReference,
          },
        },
      });

      return {
        inventory: {
          ...inv,
          available: Math.max(0, inv.onHand - inv.reserved),
        },
        movement,
      };
    });
  }

  async adjustStock(input: StockAdjustmentInput, actorId: string) {
    const delta = input.direction === 'ADD' ? input.quantity : -input.quantity;

    return this.prisma.$transaction(async (tx) => {
      const existing = await tx.inventoryItem.findUnique({
        where: {
          warehouseId_variantId: {
            warehouseId: input.warehouseId,
            variantId: input.variantId,
          },
        },
        include: { variant: true, warehouse: true },
      });

      if (!existing) {
        throw new NotFoundException('Inventory record not found for this warehouse and variant');
      }

      const nextOnHand = existing.onHand + delta;
      if (nextOnHand < existing.reserved) {
        throw new BadRequestException(
          `Cannot reduce on-hand stock below reserved quantity (${existing.reserved}).`,
        );
      }

      const updated = await tx.inventoryItem.update({
        where: { id: existing.id },
        data: { onHand: nextOnHand },
      });

      const reasonText = input.notes ? `${input.reason} — ${input.notes}` : input.reason;

      const movement = await tx.stockMovement.create({
        data: {
          warehouseId: input.warehouseId,
          variantId: input.variantId,
          type:
            delta > 0 ? StockMovementType.ADJUSTMENT_IN : StockMovementType.ADJUSTMENT_OUT,
          quantityDelta: delta,
          reason: reasonText,
          referenceType: 'MANUAL',
          actorId,
        },
      });

      await tx.auditLog.create({
        data: {
          actorId,
          action: 'STOCK_ADJUSTED',
          entityType: 'InventoryItem',
          entityId: updated.id,
          beforeData: { onHand: existing.onHand, reserved: existing.reserved },
          afterData: {
            sku: existing.variant.sku,
            warehouse: existing.warehouse.code,
            onHand: updated.onHand,
            reserved: updated.reserved,
            delta,
            reason: reasonText,
          },
        },
      });

      return {
        inventory: {
          ...updated,
          available: Math.max(0, updated.onHand - updated.reserved),
        },
        movement,
      };
    });
  }
}
