import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { ProductStatus } from '@meskot/database';
import type { CreateProductInput, UpdateProductInput } from '@meskot/shared-schemas';
import { PrismaService } from '../../prisma/prisma.service';

function slugify(value: string): string {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');
}

@Injectable()
export class CatalogService {
  constructor(private readonly prisma: PrismaService) {}

  async listCategories() {
    return this.prisma.category.findMany({
      where: { isActive: true, deletedAt: null },
      orderBy: [{ sortOrder: 'asc' }, { nameEn: 'asc' }],
    });
  }

  async listProducts(params: {
    category?: string;
    search?: string;
    featured?: boolean;
    inStock?: boolean;
    minPrice?: number;
    maxPrice?: number;
    sort?: string;
  }) {
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
                { descriptionEn: { contains: params.search, mode: 'insensitive' } },
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

    let mapped = products.map((product) => {
      const variants = product.variants.map((variant) => {
        const availableQuantity = variant.inventoryItems.reduce(
          (sum, inv) => sum + Math.max(0, inv.onHand - inv.reserved),
          0,
        );
        return {
          id: variant.id,
          sku: variant.sku,
          nameEn: variant.nameEn,
          nameAm: variant.nameAm,
          price: Number(variant.price),
          compareAtPrice: variant.compareAtPrice ? Number(variant.compareAtPrice) : null,
          isActive: variant.isActive,
          availableQuantity,
        };
      });

      const minVariantPrice =
        variants.length > 0 ? Math.min(...variants.map((v) => v.price)) : 0;
      const totalAvailable = variants.reduce((sum, v) => sum + v.availableQuantity, 0);

      return {
        id: product.id,
        slug: product.slug,
        nameEn: product.nameEn,
        nameAm: product.nameAm,
        subtitleEn: product.subtitleEn,
        descriptionEn: product.descriptionEn,
        brand: product.brand,
        status: product.status,
        isFeatured: product.isFeatured,
        category: product.category,
        images: product.images,
        minPrice: minVariantPrice,
        totalAvailable,
        variants,
      };
    });

    if (params.inStock) {
      mapped = mapped.filter((p) => p.totalAvailable > 0);
    }
    if (typeof params.minPrice === 'number' && !Number.isNaN(params.minPrice)) {
      mapped = mapped.filter((p) => p.minPrice >= params.minPrice!);
    }
    if (typeof params.maxPrice === 'number' && !Number.isNaN(params.maxPrice)) {
      mapped = mapped.filter((p) => p.minPrice <= params.maxPrice!);
    }

    if (params.sort === 'price_asc') {
      mapped.sort((a, b) => a.minPrice - b.minPrice);
    } else if (params.sort === 'price_desc') {
      mapped.sort((a, b) => b.minPrice - a.minPrice);
    }

    return mapped;
  }

  async getProductBySlug(slug: string) {
    const product = await this.prisma.product.findFirst({
      where: { slug, status: ProductStatus.PUBLISHED, archivedAt: null },
      include: {
        category: true,
        images: { orderBy: { sortOrder: 'asc' } },
        reviews: {
          where: { isPublished: true },
          take: 10,
          orderBy: { createdAt: 'desc' },
          include: { customerProfile: { include: { user: { select: { fullName: true } } } } },
        },
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
        id: variant.id,
        sku: variant.sku,
        nameEn: variant.nameEn,
        nameAm: variant.nameAm,
        price: Number(variant.price),
        compareAtPrice: variant.compareAtPrice ? Number(variant.compareAtPrice) : null,
        isActive: variant.isActive,
        availableQuantity: variant.inventoryItems.reduce(
          (sum, inv) => sum + Math.max(0, inv.onHand - inv.reserved),
          0,
        ),
      })),
    };
  }

  async listStaffProducts(search?: string, status?: string) {
    const products = await this.prisma.product.findMany({
      where: {
        ...(status && status !== 'ALL' ? { status: status as ProductStatus } : {}),
        ...(search
          ? {
              OR: [
                { nameEn: { contains: search, mode: 'insensitive' } },
                { variants: { some: { sku: { contains: search, mode: 'insensitive' } } } },
              ],
            }
          : {}),
      },
      include: {
        category: true,
        images: { orderBy: { sortOrder: 'asc' }, take: 1 },
        variants: { include: { inventoryItems: true } },
      },
      orderBy: { updatedAt: 'desc' },
    });

    return products.map((product) => ({
      id: product.id,
      slug: product.slug,
      nameEn: product.nameEn,
      nameAm: product.nameAm,
      status: product.status,
      isFeatured: product.isFeatured,
      category: product.category,
      primaryImage: product.images[0]?.url ?? null,
      variantCount: product.variants.length,
      minPrice:
        product.variants.length > 0
          ? Math.min(...product.variants.map((v) => Number(v.price)))
          : 0,
      totalAvailable: product.variants.reduce(
        (sum, v) =>
          sum +
          v.inventoryItems.reduce((s, inv) => s + Math.max(0, inv.onHand - inv.reserved), 0),
        0,
      ),
      updatedAt: product.updatedAt,
    }));
  }

  async getStaffProductById(id: string) {
    const product = await this.prisma.product.findUnique({
      where: { id },
      include: {
        category: true,
        images: { orderBy: { sortOrder: 'asc' } },
        variants: { include: { inventoryItems: true } },
      },
    });
    if (!product) throw new NotFoundException('Product not found');

    return {
      ...product,
      variants: product.variants.map((v) => ({
        id: v.id,
        sku: v.sku,
        nameEn: v.nameEn,
        nameAm: v.nameAm,
        price: Number(v.price),
        compareAtPrice: v.compareAtPrice ? Number(v.compareAtPrice) : null,
        costPrice: v.costPrice ? Number(v.costPrice) : null,
        isActive: v.isActive,
        availableQuantity: v.inventoryItems.reduce(
          (sum, inv) => sum + Math.max(0, inv.onHand - inv.reserved),
          0,
        ),
      })),
    };
  }

  async createProduct(input: CreateProductInput, actorId: string) {
    const slug = input.slug ? slugify(input.slug) : slugify(input.nameEn);
    const existingSlug = await this.prisma.product.findUnique({ where: { slug } });
    if (existingSlug) {
      throw new ConflictException(`Product slug "${slug}" already exists`);
    }

    const skus = input.variants.map((v) => v.sku);
    const existingSku = await this.prisma.productVariant.findFirst({
      where: { sku: { in: skus } },
    });
    if (existingSku) {
      throw new ConflictException(`SKU "${existingSku.sku}" already exists`);
    }

    const defaultWarehouse = await this.prisma.warehouse.findFirst({
      where: { isDefault: true, isActive: true },
    });

    const product = await this.prisma.$transaction(async (tx) => {
      const created = await tx.product.create({
        data: {
          categoryId: input.categoryId,
          slug,
          nameEn: input.nameEn,
          nameAm: input.nameAm,
          subtitleEn: input.subtitleEn,
          descriptionEn: input.descriptionEn,
          brand: input.brand,
          status: input.status,
          isFeatured: input.isFeatured,
          isReturnable: input.isReturnable,
          ...(input.imageUrl
            ? {
                images: {
                  create: {
                    url: input.imageUrl,
                    altText: input.nameEn,
                    isPrimary: true,
                    sortOrder: 0,
                  },
                },
              }
            : {}),
          variants: {
            create: input.variants.map((v) => ({
              sku: v.sku,
              nameEn: v.nameEn,
              nameAm: v.nameAm,
              price: v.price,
              compareAtPrice: v.compareAtPrice ?? null,
              costPrice: v.costPrice ?? null,
              isActive: v.isActive,
            })),
          },
        },
        include: { variants: true, images: true },
      });

      if (defaultWarehouse) {
        await tx.inventoryItem.createMany({
          data: created.variants.map((v) => ({
            warehouseId: defaultWarehouse.id,
            variantId: v.id,
            onHand: 0,
            reserved: 0,
          })),
        });
      }

      await tx.auditLog.create({
        data: {
          actorId,
          action: 'PRODUCT_CREATED',
          entityType: 'Product',
          entityId: created.id,
          afterData: { nameEn: created.nameEn, status: created.status, skus },
        },
      });

      return created;
    });

    return product;
  }

  async updateProduct(id: string, input: UpdateProductInput, actorId: string) {
    const existing = await this.prisma.product.findUnique({
      where: { id },
      include: { variants: true },
    });
    if (!existing) throw new NotFoundException('Product not found');

    const updated = await this.prisma.$transaction(async (tx) => {
      const prod = await tx.product.update({
        where: { id },
        data: {
          ...(input.categoryId ? { categoryId: input.categoryId } : {}),
          ...(input.nameEn ? { nameEn: input.nameEn } : {}),
          ...(input.nameAm !== undefined ? { nameAm: input.nameAm } : {}),
          ...(input.subtitleEn !== undefined ? { subtitleEn: input.subtitleEn } : {}),
          ...(input.descriptionEn !== undefined ? { descriptionEn: input.descriptionEn } : {}),
          ...(input.brand !== undefined ? { brand: input.brand } : {}),
          ...(input.status ? { status: input.status } : {}),
          ...(input.isFeatured !== undefined ? { isFeatured: input.isFeatured } : {}),
          ...(input.isReturnable !== undefined ? { isReturnable: input.isReturnable } : {}),
        },
      });

      if (input.variants && input.variants.length > 0) {
        const defaultWarehouse = await tx.warehouse.findFirst({
          where: { isDefault: true, isActive: true },
        });
        for (const v of input.variants) {
          if (v.id) {
            await tx.productVariant.update({
              where: { id: v.id },
              data: {
                sku: v.sku,
                nameEn: v.nameEn,
                nameAm: v.nameAm,
                price: v.price,
                compareAtPrice: v.compareAtPrice ?? null,
                costPrice: v.costPrice ?? null,
                isActive: v.isActive,
              },
            });
          } else {
            const createdVariant = await tx.productVariant.create({
              data: {
                productId: id,
                sku: v.sku,
                nameEn: v.nameEn,
                nameAm: v.nameAm,
                price: v.price,
                compareAtPrice: v.compareAtPrice ?? null,
                costPrice: v.costPrice ?? null,
                isActive: v.isActive,
              },
            });
            if (defaultWarehouse) {
              await tx.inventoryItem.create({
                data: {
                  warehouseId: defaultWarehouse.id,
                  variantId: createdVariant.id,
                  onHand: 0,
                  reserved: 0,
                },
              });
            }
          }
        }
      }

      await tx.auditLog.create({
        data: {
          actorId,
          action: 'PRODUCT_UPDATED',
          entityType: 'Product',
          entityId: id,
          beforeData: { nameEn: existing.nameEn, status: existing.status },
          afterData: { nameEn: prod.nameEn, status: prod.status },
        },
      });

      return prod;
    });

    return updated;
  }

  async archiveProduct(id: string, actorId: string) {
    const existing = await this.prisma.product.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException('Product not found');

    const archived = await this.prisma.product.update({
      where: { id },
      data: { status: ProductStatus.ARCHIVED, archivedAt: new Date() },
    });

    await this.prisma.auditLog.create({
      data: {
        actorId,
        action: 'PRODUCT_ARCHIVED',
        entityType: 'Product',
        entityId: id,
      },
    });

    return archived;
  }
}
