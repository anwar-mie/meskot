import { Queue, Worker } from 'bullmq';
import { OrderStatus, prisma, StockReservationStatus } from '@meskot/database';

const connection = {
  host: process.env.REDIS_HOST ?? 'localhost',
  port: Number(process.env.REDIS_PORT ?? 6379),
  password: process.env.REDIS_PASSWORD || undefined,
};

const QUEUE_NAME = 'inventory-reservations';

async function releaseExpiredReservations() {
  const now = new Date();
  const expired = await prisma.stockReservation.findMany({
    where: {
      status: StockReservationStatus.ACTIVE,
      expiresAt: { lte: now },
    },
    take: 50,
  });

  for (const res of expired) {
    await prisma.$transaction(async (tx) => {
      const updated = await tx.stockReservation.updateMany({
        where: { id: res.id, status: StockReservationStatus.ACTIVE },
        data: { status: StockReservationStatus.EXPIRED, releasedAt: new Date() },
      });

      if (updated.count === 0) return;

      await tx.inventoryItem.update({
        where: {
          warehouseId_variantId: {
            warehouseId: res.warehouseId,
            variantId: res.variantId,
          },
        },
        data: {
          reserved: { decrement: res.quantity },
        },
      });

      await tx.order.updateMany({
        where: { id: res.orderId, status: OrderStatus.PENDING_PAYMENT },
        data: {
          status: OrderStatus.CANCELLED,
          cancelledAt: new Date(),
          cancellationReason: 'Online payment reservation expired',
        },
      });
    });
  }

  return expired.length;
}

async function bootstrap() {
  const queue = new Queue(QUEUE_NAME, { connection });
  await queue.upsertJobScheduler(
    'expire-reservations-scheduler',
    { every: 60_000 },
    { name: 'expire-reservations', data: {} },
  );

  const worker = new Worker(
    QUEUE_NAME,
    async (job) => {
      if (job.name === 'expire-reservations') {
        const count = await releaseExpiredReservations();
        if (count > 0) {
          console.log(`[worker] Released ${count} expired stock reservations`);
        }
      }
    },
    { connection },
  );

  worker.on('failed', (job, err) => {
    console.error(`[worker] Job ${job?.id} failed:`, err);
  });

  console.log('[worker] BullMQ worker started for queue:', QUEUE_NAME);
}

bootstrap().catch((err) => {
  console.error('[worker] Fatal startup error:', err);
  process.exit(1);
});
