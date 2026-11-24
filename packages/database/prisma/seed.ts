import { PrismaClient, ProductStatus, StockMovementType } from '@prisma/client';
import * as argon2 from 'argon2';

const prisma = new PrismaClient();

const PERMISSIONS = [
  // Catalog
  { code: 'products:read', module: 'catalog', description: 'View all products including drafts' },
  { code: 'products:create', module: 'catalog', description: 'Create products and variants' },
  { code: 'products:update', module: 'catalog', description: 'Edit products, prices and publish status' },
  { code: 'products:archive', module: 'catalog', description: 'Archive products' },
  { code: 'categories:manage', module: 'catalog', description: 'Manage product categories and attributes' },
  // Inventory
  { code: 'inventory:read', module: 'inventory', description: 'View stock levels and movements' },
  { code: 'inventory:receive', module: 'inventory', description: 'Receive incoming stock' },
  { code: 'inventory:adjust', module: 'inventory', description: 'Adjust or transfer warehouse stock' },
  { code: 'warehouses:manage', module: 'inventory', description: 'Create and manage warehouses' },
  // Orders & Customers
  { code: 'orders:read', module: 'orders', description: 'View customer orders' },
  { code: 'orders:update', module: 'orders', description: 'Update order status and process orders' },
  { code: 'customers:read', module: 'customers', description: 'Search and inspect customer records' },
  { code: 'returns:manage', module: 'returns', description: 'Review return requests and restocking' },
  // Payments
  { code: 'payments:read', module: 'payments', description: 'View payment transactions and COD logs' },
  { code: 'payments:reconcile', module: 'payments', description: 'Reconcile COD collections and refunds' },
  // Deliveries
  { code: 'deliveries:read', module: 'deliveries', description: 'View all deliveries' },
  { code: 'deliveries:assign', module: 'deliveries', description: 'Assign delivery agents and manage zones' },
  { code: 'deliveries:assigned:read', module: 'deliveries', description: 'View own assigned deliveries' },
  { code: 'deliveries:assigned:update', module: 'deliveries', description: 'Update status and PoD on assigned deliveries' },
  // Reports & Admin
  { code: 'reports:read', module: 'reports', description: 'View sales, inventory and payment reports' },
  { code: 'users:manage', module: 'identity', description: 'Create employees and suspend accounts' },
  { code: 'roles:manage', module: 'identity', description: 'Manage roles and permissions' },
  { code: 'audit:read', module: 'operations', description: 'View audit logs' },
  { code: 'settings:manage', module: 'operations', description: 'Configure business settings' },
] as const;

const ROLE_DEFINITIONS: Array<{
  code: string;
  name: string;
  description: string;
  permissions: string[];
}> = [
  {
    code: 'SUPER_ADMIN',
    name: 'Super Administrator',
    description: 'Full unrestricted system access',
    permissions: PERMISSIONS.map((p) => p.code),
  },
  {
    code: 'ADMIN',
    name: 'Administrator',
    description: 'Business-wide operational management',
    permissions: PERMISSIONS.map((p) => p.code),
  },
  {
    code: 'PRODUCT_MANAGER',
    name: 'Product Manager',
    description: 'Products, categories, attributes and images',
    permissions: ['products:read', 'products:create', 'products:update', 'products:archive', 'categories:manage', 'inventory:read'],
  },
  {
    code: 'INVENTORY_MANAGER',
    name: 'Inventory Manager',
    description: 'Warehouses, stock receiving, adjustments and transfers',
    permissions: ['inventory:read', 'inventory:receive', 'inventory:adjust', 'warehouses:manage', 'products:read', 'reports:read'],
  },
  {
    code: 'SALES_MANAGER',
    name: 'Sales Manager',
    description: 'Orders, customers, returns and sales operations',
    permissions: ['orders:read', 'orders:update', 'customers:read', 'returns:manage', 'payments:read', 'products:read', 'inventory:read', 'reports:read'],
  },
  {
    code: 'DELIVERY_MANAGER',
    name: 'Delivery Manager',
    description: 'Delivery zones, creation, assignment and monitoring',
    permissions: ['deliveries:read', 'deliveries:assign', 'orders:read', 'payments:read', 'payments:reconcile'],
  },
  {
    code: 'DELIVERY_AGENT',
    name: 'Delivery Agent',
    description: 'Assigned delivery records, status updates and proof of delivery',
    permissions: ['deliveries:assigned:read', 'deliveries:assigned:update'],
  },
  {
    code: 'CUSTOMER',
    name: 'Customer',
    description: 'Storefront shopping, own addresses, orders and reviews',
    permissions: [],
  },
];

async function main() {
  console.log('Seeding market. e-commerce database...');

  // 1. Permissions
  const permissionMap = new Map<string, string>();
  for (const perm of PERMISSIONS) {
    const record = await prisma.permission.upsert({
      where: { code: perm.code },
      update: { module: perm.module, description: perm.description },
      create: perm,
    });
    permissionMap.set(perm.code, record.id);
  }

  // 2. Roles & RolePermissions
  const roleMap = new Map<string, string>();
  for (const roleDef of ROLE_DEFINITIONS) {
    const role = await prisma.role.upsert({
      where: { code: roleDef.code },
      update: { name: roleDef.name, description: roleDef.description, isSystem: true },
      create: {
        code: roleDef.code,
        name: roleDef.name,
        description: roleDef.description,
        isSystem: true,
      },
    });
    roleMap.set(roleDef.code, role.id);

    for (const permCode of roleDef.permissions) {
      const permId = permissionMap.get(permCode);
      if (!permId) continue;
      await prisma.rolePermission.upsert({
        where: { roleId_permissionId: { roleId: role.id, permissionId: permId } },
        update: {},
        create: { roleId: role.id, permissionId: permId },
      });
    }
  }

  // 3. Default Users (password: "Password123!" for local development)
  const devPasswordHash = await argon2.hash('Password123!', { type: argon2.argon2id });

  const adminUser = await prisma.user.upsert({
    where: { email: 'meron@market.et' },
    update: {},
    create: {
      email: 'meron@market.et',
      phone: '+251911000001',
      fullName: 'Meron Tadesse',
      passwordHash: devPasswordHash,
      emailVerifiedAt: new Date(),
      phoneVerifiedAt: new Date(),
    },
  });
  await prisma.userRole.upsert({
    where: { userId_roleId: { userId: adminUser.id, roleId: roleMap.get('SUPER_ADMIN')! } },
    update: {},
    create: { userId: adminUser.id, roleId: roleMap.get('SUPER_ADMIN')! },
  });

  const agentUser = await prisma.user.upsert({
    where: { email: 'dawit.delivery@market.et' },
    update: {},
    create: {
      email: 'dawit.delivery@market.et',
      phone: '+251911000002',
      fullName: 'Dawit Bekele',
      passwordHash: devPasswordHash,
      phoneVerifiedAt: new Date(),
    },
  });
  await prisma.userRole.upsert({
    where: { userId_roleId: { userId: agentUser.id, roleId: roleMap.get('DELIVERY_AGENT')! } },
    update: {},
    create: { userId: agentUser.id, roleId: roleMap.get('DELIVERY_AGENT')! },
  });

  const customerUser = await prisma.user.upsert({
    where: { email: 'selam@example.com' },
    update: {},
    create: {
      email: 'selam@example.com',
      phone: '+251911000003',
      fullName: 'Selamawit Girma',
      passwordHash: devPasswordHash,
      emailVerifiedAt: new Date(),
      phoneVerifiedAt: new Date(),
    },
  });
  await prisma.userRole.upsert({
    where: { userId_roleId: { userId: customerUser.id, roleId: roleMap.get('CUSTOMER')! } },
    update: {},
    create: { userId: customerUser.id, roleId: roleMap.get('CUSTOMER')! },
  });
  await prisma.customerProfile.upsert({
    where: { userId: customerUser.id },
    update: {},
    create: {
      userId: customerUser.id,
      defaultPhone: '+251911000003',
    },
  });

  // 4. Warehouses
  const mainWarehouse = await prisma.warehouse.upsert({
    where: { code: 'ADD-MAIN' },
    update: {},
    create: {
      code: 'ADD-MAIN',
      name: 'Addis Ababa Main Warehouse',
      city: 'Addis Ababa',
      address: 'Bole Sub-City, Woreda 03, Cameroon St',
      isDefault: true,
    },
  });

  await prisma.warehouse.upsert({
    where: { code: 'ADD-KAZ' },
    update: {},
    create: {
      code: 'ADD-KAZ',
      name: 'Kazanchis Fulfilment Hub',
      city: 'Addis Ababa',
      address: 'Kirkos Sub-City, Kazanchis',
      isDefault: false,
    },
  });

  // 5. Delivery Zones
  const zones = [
    { name: 'Addis Ababa - Bole & Kirkos', city: 'Addis Ababa', fee: 150, freeDeliveryThreshold: 5000, estimatedDaysMin: 1, estimatedDaysMax: 1 },
    { name: 'Addis Ababa - Yeka & Arada', city: 'Addis Ababa', fee: 180, freeDeliveryThreshold: 5000, estimatedDaysMin: 1, estimatedDaysMax: 2 },
    { name: 'Addis Ababa - Nifas Silk & Kolfe', city: 'Addis Ababa', fee: 220, freeDeliveryThreshold: 6000, estimatedDaysMin: 1, estimatedDaysMax: 2 },
    { name: 'Regional - Adama / Hawassa / Bahir Dar', city: 'Regional', fee: 450, freeDeliveryThreshold: 12000, estimatedDaysMin: 2, estimatedDaysMax: 4 },
  ];
  for (const zone of zones) {
    await prisma.deliveryZone.upsert({
      where: { name: zone.name },
      update: {},
      create: zone,
    });
  }

  // 6. Categories (matching Figma 01 Home)
  const categoriesData = [
    { slug: 'home-living', nameEn: 'Home & living', nameAm: 'ቤት እና ኑሮ', descriptionEn: 'Make room for better', sortOrder: 1 },
    { slug: 'electronics', nameEn: 'Electronics', nameAm: 'ኤሌክትሮኒክስ', descriptionEn: 'For work and play', sortOrder: 2 },
    { slug: 'fashion-accessories', nameEn: 'Fashion & accessories', nameAm: 'ፋሽን እና መለዋወጫዎች', descriptionEn: 'Made for your everyday', sortOrder: 3 },
    { slug: 'beauty-care', nameEn: 'Beauty & care', nameAm: 'ውበት እና እንክብካቤ', descriptionEn: 'A moment for yourself', sortOrder: 4 },
  ];
  const categoryMap = new Map<string, string>();
  for (const cat of categoriesData) {
    const record = await prisma.category.upsert({
      where: { slug: cat.slug },
      update: {},
      create: cat,
    });
    categoryMap.set(cat.slug, record.id);
  }

  // 7. Featured Products & Variants (matching Figma 01 Home)
  const productsData = [
    {
      slug: 'woven-everyday-tote',
      categorySlug: 'fashion-accessories',
      nameEn: 'Woven everyday tote',
      nameAm: 'የዕለት ተዕለት የተሸመነ ቦርሳ',
      subtitleEn: 'Handcrafted natural cotton blend with reinforced straps',
      descriptionEn: 'A durable, thoughtfully woven tote designed for daily errands, laptops, and market trips.',
      brand: 'market. Studio',
      variants: [
        { sku: 'MKT-TOTE-NAT-01', nameEn: 'Natural / Standard', price: 1250, costPrice: 700, stock: 24 },
        { sku: 'MKT-TOTE-OLV-01', nameEn: 'Forest Olive / Standard', price: 1350, costPrice: 750, stock: 12 },
      ],
    },
    {
      slug: 'studio-wireless-headphones',
      categorySlug: 'electronics',
      nameEn: 'Studio wireless headphones',
      nameAm: 'ስቱዲዮ ገመድ አልባ የጆሮ ማዳመጫ',
      subtitleEn: 'Active noise cancellation with 40-hour battery life',
      descriptionEn: 'Balanced acoustic profile with soft memory-foam cushions and USB-C fast charging.',
      brand: 'SoundCraft',
      variants: [
        { sku: 'MKT-HP-BLK-01', nameEn: 'Matte Black', price: 4850, costPrice: 3100, stock: 15 },
        { sku: 'MKT-HP-SND-01', nameEn: 'Warm Sand', price: 4850, costPrice: 3100, stock: 4 },
      ],
    },
    {
      slug: 'terracotta-vase',
      categorySlug: 'home-living',
      nameEn: 'Terracotta vase',
      nameAm: 'የሸክላ አበባ ማስቀመጫ',
      subtitleEn: 'Wheel-thrown matte ceramic finished by local artisans',
      descriptionEn: 'Warm earthy texture that elevates dried botanicals or fresh seasonal stems.',
      brand: 'Addis Clay',
      variants: [
        { sku: 'MKT-VASE-MED-01', nameEn: 'Medium (24cm)', price: 980, costPrice: 520, stock: 18 },
        { sku: 'MKT-VASE-LRG-01', nameEn: 'Large (32cm)', price: 1450, costPrice: 780, stock: 3 },
      ],
    },
    {
      slug: 'handloom-cotton-throw',
      categorySlug: 'home-living',
      nameEn: 'Handloom cotton throw',
      nameAm: 'በእጅ የተሸመነ የጥጥ ብርድ ልብስ',
      subtitleEn: '100% Ethiopian combed cotton in a breathable waffle weave',
      descriptionEn: 'Soft, lightweight throw blanket woven for cool Addis Ababa evenings.',
      brand: 'Sheba Loom',
      variants: [
        { sku: 'MKT-THRW-CRM-01', nameEn: 'Warm Cream (140x200cm)', price: 2150, costPrice: 1200, stock: 20 },
      ],
    },
  ];

  for (const prod of productsData) {
    const product = await prisma.product.upsert({
      where: { slug: prod.slug },
      update: {},
      create: {
        slug: prod.slug,
        categoryId: categoryMap.get(prod.categorySlug)!,
        nameEn: prod.nameEn,
        nameAm: prod.nameAm,
        subtitleEn: prod.subtitleEn,
        descriptionEn: prod.descriptionEn,
        brand: prod.brand,
        status: ProductStatus.PUBLISHED,
        isFeatured: true,
      },
    });

    for (const v of prod.variants) {
      const variant = await prisma.productVariant.upsert({
        where: { sku: v.sku },
        update: {},
        create: {
          productId: product.id,
          sku: v.sku,
          nameEn: v.nameEn,
          price: v.price,
          costPrice: v.costPrice,
        },
      });

      const existingInv = await prisma.inventoryItem.findUnique({
        where: {
          warehouseId_variantId: {
            warehouseId: mainWarehouse.id,
            variantId: variant.id,
          },
        },
      });

      if (!existingInv) {
        await prisma.inventoryItem.create({
          data: {
            warehouseId: mainWarehouse.id,
            variantId: variant.id,
            onHand: v.stock,
            reserved: 0,
            lowStockThreshold: 5,
          },
        });

        await prisma.stockMovement.create({
          data: {
            warehouseId: mainWarehouse.id,
            variantId: variant.id,
            type: StockMovementType.RECEIVE,
            quantityDelta: v.stock,
            unitCost: v.costPrice,
            reason: 'Initial opening stock seed',
            referenceType: 'SEED',
            actorId: adminUser.id,
          },
        });
      }
    }
  }

  // 8. Default Business Settings
  const settings = [
    { key: 'stock_reservation_ttl_minutes', value: 15 },
    { key: 'max_cod_delivery_attempts', value: 3 },
    { key: 'return_window_days', value: 7 },
    { key: 'vat_inclusive', value: true },
    { key: 'vat_rate_percent', value: 15 },
  ];
  for (const setting of settings) {
    await prisma.businessSetting.upsert({
      where: { key: setting.key },
      update: {},
      create: setting,
    });
  }

  console.log('Seed completed successfully.');
  console.log('Dev credentials (password: Password123!):');
  console.log('  Admin:    meron@market.et');
  console.log('  Delivery: dawit.delivery@market.et');
  console.log('  Customer: selam@example.com');
}

main()
  .catch((err) => {
    console.error('Seed failed:', err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
