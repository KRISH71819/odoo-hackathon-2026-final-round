import { z } from 'zod';
import { ProductCategory } from './enums.js';

// ── Product ──────────────────────────────────────────────────

export const CreateProductSchema = z.object({
  name: z.string().min(1).max(200),
  category: z.nativeEnum(ProductCategory),
  sku: z.string().min(1).max(50),
  description: z.string().max(1000).default(''),
  unitPrice: z.number().int().min(0), // cents
  costPrice: z.number().int().min(0), // cents
  taxRate: z.number().int().min(0).max(10000), // basis points
  unit: z.string().default('unit'),
  currencyCode: z.string().length(3).default('USD'),
  isActive: z.boolean().default(true),
});

export type CreateProductInput = z.infer<typeof CreateProductSchema>;

export const UpdateProductSchema = CreateProductSchema.partial();
export type UpdateProductInput = z.infer<typeof UpdateProductSchema>;

export const ProductFilterSchema = z.object({
  category: z.nativeEnum(ProductCategory).optional(),
  search: z.string().optional(),
  isActive: z.coerce.boolean().optional(),
});

export type ProductFilter = z.infer<typeof ProductFilterSchema>;

// ── Product Variant ──────────────────────────────────────────

export const CreateVariantSchema = z.object({
  name: z.string().min(1).max(200),
  extraPrice: z.number().int().min(0).default(0), // cents
});

export type CreateVariantInput = z.infer<typeof CreateVariantSchema>;

// ── Price List ───────────────────────────────────────────────

export const CreatePriceListSchema = z.object({
  name: z.string().min(1).max(200),
  customerTier: z.string(),
  currencyCode: z.string().length(3).default('USD'),
  isActive: z.boolean().default(true),
});

export type CreatePriceListInput = z.infer<typeof CreatePriceListSchema>;

export const CreatePriceListItemSchema = z.object({
  productId: z.string(),
  overridePrice: z.number().int().min(0), // cents
});

export type CreatePriceListItemInput = z.infer<typeof CreatePriceListItemSchema>;
