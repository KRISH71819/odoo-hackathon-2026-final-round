// ── Catalog Service ──────────────────────────────────────────
// Product and price-list management. CRUD + price resolution.
// No business logic beyond price resolution ladder.

import prisma from '../../shared/prisma.js';
import { AppError } from '../../shared/errors.js';
import type { CreateProductInput, UpdateProductInput, ProductFilter, CreatePriceListInput, CreatePriceListItemInput } from '@dealflow360/contracts';

// ── Products ─────────────────────────────────────────────────

export async function getProducts(filter: ProductFilter, page: number, limit: number) {
  const where: Record<string, unknown> = {};
  if (filter.category) where.category = filter.category;
  if (filter.isActive !== undefined) where.isActive = filter.isActive;
  if (filter.search) {
    where.OR = [
      { name: { contains: filter.search } },
      { sku: { contains: filter.search } },
    ];
  }

  const [data, total] = await Promise.all([
    prisma.product.findMany({
      where,
      include: { variants: true },
      skip: (page - 1) * limit,
      take: limit,
      orderBy: { name: 'asc' },
    }),
    prisma.product.count({ where }),
  ]);

  return { data, pagination: { page, limit, total, totalPages: Math.ceil(total / limit) } };
}

export async function getProductById(id: string) {
  const product = await prisma.product.findUnique({
    where: { id },
    include: { variants: true, priceListItems: { include: { priceList: true } } },
  });
  if (!product) throw new AppError(404, 'NOT_FOUND', 'Product not found');
  return product;
}

export async function createProduct(input: CreateProductInput) {
  return prisma.product.create({
    data: {
      ...input,
      type: (input as any).type ?? 'HARDWARE',
    },
  });
}

export async function updateProduct(id: string, input: UpdateProductInput) {
  await getProductById(id); // ensure exists
  return prisma.product.update({ where: { id }, data: input });
}

// ── Price Lists ──────────────────────────────────────────────

export async function getPriceLists() {
  return prisma.priceList.findMany({
    include: { items: { include: { product: true } } },
    orderBy: { name: 'asc' },
  });
}

export async function createPriceList(input: CreatePriceListInput) {
  return prisma.priceList.create({ data: input });
}

export async function addPriceListItem(priceListId: string, input: CreatePriceListItemInput) {
  return prisma.priceListItem.upsert({
    where: { priceListId_productId: { priceListId, productId: input.productId } },
    update: { unitPrice: input.overridePrice },
    create: { priceListId, productId: input.productId, unitPrice: input.overridePrice },
  });
}

// ── Price Resolution ─────────────────────────────────────────

/**
 * Resolve effective price for a product given customer tier.
 * Ladder: PriceListItem override → base Product price.
 * ponytail: no multi-currency conversion. Add when needed.
 */
export async function resolveEffectivePrice(
  productId: string,
  customerTier: string,
): Promise<{ unitPrice: number; costPrice: number; taxRate: number }> {
  const product = await prisma.product.findUnique({ where: { id: productId } });
  if (!product) throw new AppError(404, 'NOT_FOUND', 'Product not found');

  // Check for tier-specific price override
  const priceList = await prisma.priceList.findFirst({
    where: { customerTier, isActive: true },
    include: {
      items: { where: { productId } },
    },
  });

  const unitPrice = priceList?.items?.[0]?.unitPrice ?? product.unitPrice;

  return { unitPrice, costPrice: product.costPrice, taxRate: product.taxRate };
}
