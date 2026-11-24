import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import type { AddCartItemInput, UpdateCartItemInput } from '@meskot/shared-schemas';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class CartService {
  constructor(private readonly prisma: PrismaService) {}

  private async ensureCustomerProfile(userId: string) {
    let profile = await this.prisma.customerProfile.findUnique({ where: { userId } });
    if (!profile) {
      const user = await this.prisma.user.findUnique({ where: { id: userId } });
      profile = await this.prisma.customerProfile.create({
        data: { userId, defaultPhone: user?.phone ?? null },
      });
    }
    return profile;
  }

  private async getOrCreateCart(customerProfileId: string) {
    let cart = await this.prisma.cart.findFirst({
      where: { customerProfileId },
      orderBy: { updatedAt: 'desc' },
    });
    if (!cart) {
      cart = await this.prisma.cart.create({ data: { customerProfileId } });
    }
    return cart;
  }

  async getCart(userId: string) {
    const profile = await this.ensureCustomerProfile(userId);
    const cart = await this.getOrCreateCart(profile.id);

    const items = await this.prisma.cartItem.findMany({
      where: { cartId: cart.id },
      include: {
        variant: {
          include: {
            product: {
              include: { images: { orderBy: { sortOrder: 'asc' }, take: 1 } },
            },
            inventoryItems: true,
          },
        },
      },
      orderBy: { createdAt: 'asc' },
    });

    const mapped = items.map((item) => {
      const unitPrice = Number(item.variant.price);
      const availableQuantity = item.variant.inventoryItems.reduce(
        (sum, inv) => sum + Math.max(0, inv.onHand - inv.reserved),
        0,
      );
      return {
        id: item.id,
        variantId: item.variantId,
        sku: item.variant.sku,
        productSlug: item.variant.product.slug,
        productName: item.variant.product.nameEn,
        variantName: item.variant.nameEn,
        imageUrl: item.variant.product.images[0]?.url ?? null,
        unitPrice,
        quantity: item.quantity,
        lineTotal: unitPrice * item.quantity,
        availableQuantity,
      };
    });

    const subtotal = mapped.reduce((sum, i) => sum + i.lineTotal, 0);
    const totalCount = mapped.reduce((sum, i) => sum + i.quantity, 0);

    return {
      id: cart.id,
      itemCount: totalCount,
      subtotal,
      currency: 'ETB',
      items: mapped,
    };
  }

  async addItem(userId: string, input: AddCartItemInput) {
    const profile = await this.ensureCustomerProfile(userId);
    const cart = await this.getOrCreateCart(profile.id);

    const variant = await this.prisma.productVariant.findUnique({
      where: { id: input.variantId },
      include: { inventoryItems: true, product: true },
    });
    if (!variant || !variant.isActive || variant.archivedAt || variant.product.status !== 'PUBLISHED') {
      throw new NotFoundException('Product variant is no longer available');
    }

    const available = variant.inventoryItems.reduce(
      (sum, inv) => sum + Math.max(0, inv.onHand - inv.reserved),
      0,
    );

    const existing = await this.prisma.cartItem.findUnique({
      where: { cartId_variantId: { cartId: cart.id, variantId: input.variantId } },
    });
    const nextQty = (existing?.quantity ?? 0) + input.quantity;
    if (nextQty > available) {
      throw new BadRequestException(`Only ${available} unit(s) available for ${variant.sku}`);
    }

    await this.prisma.cartItem.upsert({
      where: { cartId_variantId: { cartId: cart.id, variantId: input.variantId } },
      update: { quantity: nextQty },
      create: { cartId: cart.id, variantId: input.variantId, quantity: nextQty },
    });

    return this.getCart(userId);
  }

  async updateItem(userId: string, itemId: string, input: UpdateCartItemInput) {
    const profile = await this.ensureCustomerProfile(userId);
    const item = await this.prisma.cartItem.findFirst({
      where: { id: itemId, cart: { customerProfileId: profile.id } },
      include: { variant: { include: { inventoryItems: true } } },
    });
    if (!item) throw new NotFoundException('Cart item not found');

    if (input.quantity === 0) {
      await this.prisma.cartItem.delete({ where: { id: itemId } });
      return this.getCart(userId);
    }

    const available = item.variant.inventoryItems.reduce(
      (sum, inv) => sum + Math.max(0, inv.onHand - inv.reserved),
      0,
    );
    if (input.quantity > available) {
      throw new BadRequestException(`Only ${available} unit(s) available`);
    }

    await this.prisma.cartItem.update({
      where: { id: itemId },
      data: { quantity: input.quantity },
    });

    return this.getCart(userId);
  }

  async removeItem(userId: string, itemId: string) {
    const profile = await this.ensureCustomerProfile(userId);
    await this.prisma.cartItem.deleteMany({
      where: { id: itemId, cart: { customerProfileId: profile.id } },
    });
    return this.getCart(userId);
  }
}
