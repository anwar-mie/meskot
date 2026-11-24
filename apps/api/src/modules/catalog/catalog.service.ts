import { Injectable, NotFoundException } from '@nestjs/common';
import { ProductStatus } from '@meskot/database';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class CatalogService {
  constructor(private readonly prisma: PrismaService) {}

  async listCategories() {
    return this.prisma.category.findMany({
      where: { isActive: true, deletedAt: null },
      orderBy: [{ sortOrder: 'asc' }, { nameEn: 'asc' }],
    });
  }

  async listProducts(params: { category?: string; search?: string; featured?: boolean }) {
    const products = await this.prisma.product.findMany({
      where: {
        status: ProductStatus.PUBLISHED,
        archivedAt: null,
        ...(params.featured ? { isFeatured: true } : {}),
        ...(params.category ? { category: { slug: params.category } } : {}),
        ...(params.search
          ? {
              OR: [
                { nameEn: { contains: params.search, mode: 'insensitive' } },
                { nameAm: { contains: params.search, mode: 'insensitive' } },
                { brand: { contains: params.search, mode: 'insensitive' } },
              ],
            }
          : {}),
      },
      include: {
        category: true,
        images: { orderBy: { sortOrder: 'asc' } },
        variants: {
          where: { isActive: true, archivedAt: null },
          include: { inventoryItems: true },
        },
      },
      orderBy: [{ isFeatured: 'desc' }, { createdAt: 'desc' }],
    });

    return products.map((product) => ({
      ...product,
      variants: product.variants.map((variant) => {
        const available = variant.inventoryItems.reduce(
          (sum, inv) => sum + Math.max(0, inv.onHand - inv.reserved),
          0,
        );
        return {
          ...variant,
          availableQuantity: available,
        };
      }),
    }));
  }

  async getProductBySlug(slug: string) {
    const product = await this.prisma.product.findFirst({
      where: { slug, status: ProductStatus.PUBLISHED, archivedAt: null },
      include: {
        category: true,
        images: { orderBy: { sortOrder: 'asc' } },
        variants: {
          where: { isActive: true, archivedAt: null },
          include: {
            inventoryItems: true,
            attributes: { include: { attributeValue: { include: { attribute: true } } } },
          },
        },
      },
    });

    if (!product) {
      throw new NotFoundException('Product not found');
    }

    return {
      ...product,
      variants: product.variants.map((variant) => ({
        ...variant,
        availableQuantity: variant.inventoryItems.reduce(
          (sum, inv) => sum + Math.max(0, inv.onHand - inv.reserved),
          0,
        ),
      })),
    };
  }
}
