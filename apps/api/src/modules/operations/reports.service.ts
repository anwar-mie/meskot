import { Injectable } from '@nestjs/common';
import { OrderStatus, PaymentStatus, RefundStatus } from '@meskot/database';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class ReportsService {
  constructor(private readonly prisma: PrismaService) {}

  async getSalesOverview() {
    const [orders, inventoryItems, refunds] = await Promise.all([
      this.prisma.order.findMany({
        include: { payments: true },
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.inventoryItem.findMany(),
      this.prisma.refund.findMany({
        where: { status: { in: [RefundStatus.APPROVED, RefundStatus.COMPLETED] } },
      }),
    ]);

    const paidOrders = orders.filter((o) =>
      o.payments.some((p) =>
        ([PaymentStatus.PAID, PaymentStatus.COD_RECONCILED] as PaymentStatus[]).includes(p.status),
      ),
    );
    const paidRevenue = paidOrders.reduce((sum, o) => sum + Number(o.grandTotal), 0);
    const totalGrossSales = orders
      .filter((o) => o.status !== OrderStatus.CANCELLED)
      .reduce((sum, o) => sum + Number(o.grandTotal), 0);
    const awaitingConfirmation = orders.filter((o) =>
      ([OrderStatus.PENDING_PAYMENT, OrderStatus.CONFIRMED] as OrderStatus[]).includes(o.status),
    ).length;
    const unpaidCount = orders.length - paidOrders.length;
    const averagePaidOrder = paidOrders.length > 0 ? paidRevenue / paidOrders.length : 0;
    const refundsIssued = refunds.reduce((sum, r) => sum + Number(r.amount), 0);
    const lowStockVariants = inventoryItems.filter(
      (i) => Math.max(0, i.onHand - i.reserved) <= i.lowStockThreshold,
    ).length;

    // Last 7 days daily revenue buckets
    const today = new Date();
    const dailyRevenue: Array<{ date: string; label: string; amount: number }> = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date(today);
      d.setDate(today.getDate() - i);
      const isoDate = d.toISOString().slice(0, 10);
      const label = d.toLocaleDateString('en-US', { day: 'numeric', month: 'short' });
      const dayTotal = paidOrders
        .filter((o) => o.createdAt.toISOString().slice(0, 10) === isoDate)
        .reduce((sum, o) => sum + Number(o.grandTotal), 0);
      dailyRevenue.push({ date: isoDate, label, amount: dayTotal });
    }

    const byPaymentMethod = {
      online: orders.filter((o) => o.paymentMethod !== 'COD').length,
      cod: orders.filter((o) => o.paymentMethod === 'COD').length,
    };

    return {
      paidRevenue,
      totalGrossSales,
      ordersPlaced: orders.length,
      paidOrdersCount: paidOrders.length,
      unpaidCount,
      awaitingConfirmation,
      averagePaidOrder,
      refundsIssued,
      refundedCount: refunds.length,
      lowStockVariants,
      dailyRevenue,
      byPaymentMethod,
    };
  }

  async listAuditLogs(limit = 50) {
    return this.prisma.auditLog.findMany({
      take: limit,
      orderBy: { createdAt: 'desc' },
      include: {
        actor: { select: { id: true, fullName: true, email: true } },
      },
    });
  }
}
