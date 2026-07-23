// lib/inventory.ts — variant and product-level stock validation and decrement via Payload CMS
import config from '@payload-config';
import type { Payload } from 'payload';
import { getPayload } from 'payload';
import {
  computeSalePrice,
  loadPayloadProductDocsByIds,
  normalizeVariantDocs,
  type PayloadProductDoc,
} from '@/lib/payload-products';
import { CartStockError } from '@/lib/cart-error-messages';

export type InventoryLine = {
  productId: string;
  variantSku?: string | null;
  quantity: number;
};

export type ResolvedLinePrice = {
  productId: string;
  variantSku: string | null;
  variantName: string | null;
  unitPrice: number;
  quantity: number;
  productTitle: string;
  productHandle: string;
};

type VariantRow = {
  id: string | number;
  sku: string;
  name: string;
  stock: number;
  price: number;
};

type InventoryAdjustmentLine = {
  productId?: string | null;
  variantSku: string | null;
  quantity: number;
};

function resolveProductStock(doc: PayloadProductDoc): number | null {
  if (typeof doc.stock !== 'number' || !Number.isFinite(doc.stock)) return null;
  return Math.max(0, Math.round(doc.stock));
}

function buildVariantRows(doc: PayloadProductDoc): VariantRow[] {
  const variantDocs = normalizeVariantDocs(doc.variants);
  const basePrice = Math.max(0, Math.round(doc.price));

  return variantDocs.map((variant) => {
    const overridden =
      typeof variant.priceOverride === 'number' && Number.isFinite(variant.priceOverride)
        ? Math.max(0, Math.round(variant.priceOverride))
        : null;
    const stock =
      typeof variant.stock === 'number' && Number.isFinite(variant.stock)
        ? Math.max(0, Math.round(variant.stock))
        : 0;
    const { price } = computeSalePrice(overridden ?? basePrice, doc);
    return {
      id: variant.id ?? variant.sku,
      sku: variant.sku.trim(),
      name: variant.name.trim(),
      stock,
      price,
    };
  });
}

/**
 * Resolve unit prices and validate stock for checkout lines.
 */
export async function resolveCheckoutLines(
  lines: InventoryLine[],
): Promise<
  | { ok: true; rows: ResolvedLinePrice[] }
  | { ok: false; code: string; message: string; params?: { name?: string; stock?: number } }
> {
  const productIds = [...new Set(lines.map((l) => l.productId))];
  const docs = await loadPayloadProductDocsByIds(productIds);
  const docMap = new Map(docs.map((d) => [String(d.id), d]));

  const resolved: ResolvedLinePrice[] = [];

  for (const line of lines) {
    const doc = docMap.get(line.productId);
    if (!doc) {
      return {
        ok: false,
        code: 'PRODUCT_NOT_FOUND',
        message: 'Một sản phẩm trong giỏ hàng không còn tồn tại.',
      };
    }

    const variants = buildVariantRows(doc);
    const slug = doc.slug?.trim() || String(doc.id);
    const title = doc.title.trim();
    const qty = Math.floor(line.quantity);

    if (variants.length > 0) {
      const sku = typeof line.variantSku === 'string' ? line.variantSku.trim() : '';
      if (!sku) {
        return {
          ok: false,
          code: 'VARIANT_REQUIRED',
          message: `Vui lòng chọn biến thể cho "${title}".`,
          params: { name: title },
        };
      }
      const match = variants.find((v) => v.sku === sku);
      if (!match) {
        return {
          ok: false,
          code: 'INVALID_VARIANT',
          message: `Biến thể không hợp lệ cho "${title}".`,
          params: { name: title },
        };
      }
      if (match.stock < qty) {
        if (match.stock <= 0) {
          return {
            ok: false,
            code: 'OUT_OF_STOCK',
            message: `"${match.name}" đã hết hàng.`,
            params: { name: match.name },
          };
        }
        return {
          ok: false,
          code: 'INSUFFICIENT_STOCK',
          message: `"${match.name}" chỉ còn ${match.stock} sản phẩm.`,
          params: { name: match.name, stock: match.stock },
        };
      }
      resolved.push({
        productId: line.productId,
        variantSku: match.sku,
        variantName: match.name,
        unitPrice: match.price,
        quantity: qty,
        productTitle: title,
        productHandle: slug,
      });
    } else {
      if (doc.available === false) {
        return {
          ok: false,
          code: 'PRODUCT_UNAVAILABLE',
          message: `"${title}" hiện không còn bán.`,
          params: { name: title },
        };
      }
      const productStock = resolveProductStock(doc);
      if (productStock !== null && productStock < qty) {
        if (productStock <= 0) {
          return {
            ok: false,
            code: 'OUT_OF_STOCK',
            message: `"${title}" đã hết hàng.`,
            params: { name: title },
          };
        }
        return {
          ok: false,
          code: 'INSUFFICIENT_STOCK',
          message: `"${title}" chỉ còn ${productStock} sản phẩm.`,
          params: { name: title, stock: productStock },
        };
      }
      const { price } = computeSalePrice(doc.price, doc);
      resolved.push({
        productId: line.productId,
        variantSku: null,
        variantName: null,
        unitPrice: price,
        quantity: qty,
        productTitle: title,
        productHandle: slug,
      });
    }
  }

  return { ok: true, rows: resolved };
}

/**
 * Check stock for cart add/update (single product).
 */
export async function assertCartLineStock(
  productId: string,
  variantSku: string | null | undefined,
  quantity: number,
): Promise<void> {
  const result = await resolveCheckoutLines([
    { productId, variantSku: variantSku ?? null, quantity },
  ]);
  if (!result.ok) {
    throw new CartStockError(result.code, result.params);
  }
}

/**
 * Decrement Payload variant or product stock for paid / committed orders.
 */
export async function decrementOrderInventory(
  items: InventoryAdjustmentLine[],
  payloadInstance?: Payload,
): Promise<void> {
  const payload = payloadInstance ?? (await getPayload({ config }));

  const skus = items
    .map((i) => (typeof i.variantSku === 'string' ? i.variantSku.trim() : ''))
    .filter((s) => s.length > 0);

  if (skus.length > 0) {
    const result = await payload.find({
      collection: 'product-variants',
      where: { sku: { in: skus } },
      limit: skus.length,
      pagination: false,
      depth: 0,
    });

    const docs = Array.isArray(result.docs) ? result.docs : [];
    const qtyBySku = new Map<string, number>();
    for (const item of items) {
      const sku = typeof item.variantSku === 'string' ? item.variantSku.trim() : '';
      if (!sku) continue;
      qtyBySku.set(sku, (qtyBySku.get(sku) ?? 0) + item.quantity);
    }

    for (const doc of docs) {
      const sku = typeof doc.sku === 'string' ? doc.sku.trim() : '';
      const deduct = qtyBySku.get(sku);
      if (!deduct || !doc.id) continue;
      const current =
        typeof doc.stock === 'number' && Number.isFinite(doc.stock)
          ? Math.max(0, Math.round(doc.stock))
          : 0;
      const next = Math.max(0, current - deduct);
      await payload.update({
        collection: 'product-variants',
        id: doc.id,
        data: { stock: next },
      });
    }
  }

  const productQty = new Map<string, number>();
  for (const item of items) {
    const sku = typeof item.variantSku === 'string' ? item.variantSku.trim() : '';
    if (sku.length > 0) continue;
    const productId =
      typeof item.productId === 'string' && item.productId.trim().length > 0
        ? item.productId.trim()
        : '';
    if (!productId) continue;
    productQty.set(productId, (productQty.get(productId) ?? 0) + item.quantity);
  }

  if (productQty.size === 0) return;

  const productIds = [...productQty.keys()];
  const productDocs = await loadPayloadProductDocsByIds(productIds);
  for (const doc of productDocs) {
    const productId = String(doc.id);
    const deduct = productQty.get(productId);
    if (!deduct) continue;
    const variants = normalizeVariantDocs(doc.variants);
    if (variants.length > 0) continue;

    const current = resolveProductStock(doc);
    if (current === null) continue;

    await payload.update({
      collection: 'products',
      id: doc.id,
      // stock field added in Products collection — regenerate types with payload:types
      data: { stock: Math.max(0, current - deduct) } as Record<string, unknown>,
    });
  }
}

/**
 * Restock variant or product quantities when an order is cancelled after inventory was adjusted.
 */
export async function restockOrderInventory(
  items: InventoryAdjustmentLine[],
  payloadInstance?: Payload,
): Promise<void> {
  const payload = payloadInstance ?? (await getPayload({ config }));

  const skus = items
    .map((i) => (typeof i.variantSku === 'string' ? i.variantSku.trim() : ''))
    .filter((s) => s.length > 0);

  if (skus.length > 0) {
    const result = await payload.find({
      collection: 'product-variants',
      where: { sku: { in: skus } },
      limit: skus.length,
      pagination: false,
      depth: 0,
    });

    const docs = Array.isArray(result.docs) ? result.docs : [];
    const qtyBySku = new Map<string, number>();
    for (const item of items) {
      const sku = typeof item.variantSku === 'string' ? item.variantSku.trim() : '';
      if (!sku) continue;
      qtyBySku.set(sku, (qtyBySku.get(sku) ?? 0) + item.quantity);
    }

    for (const doc of docs) {
      const sku = typeof doc.sku === 'string' ? doc.sku.trim() : '';
      const add = qtyBySku.get(sku);
      if (!add || !doc.id) continue;
      const current =
        typeof doc.stock === 'number' && Number.isFinite(doc.stock)
          ? Math.max(0, Math.round(doc.stock))
          : 0;
      await payload.update({
        collection: 'product-variants',
        id: doc.id,
        data: { stock: current + add },
      });
    }
  }

  const productQty = new Map<string, number>();
  for (const item of items) {
    const sku = typeof item.variantSku === 'string' ? item.variantSku.trim() : '';
    if (sku.length > 0) continue;
    const productId =
      typeof item.productId === 'string' && item.productId.trim().length > 0
        ? item.productId.trim()
        : '';
    if (!productId) continue;
    productQty.set(productId, (productQty.get(productId) ?? 0) + item.quantity);
  }

  if (productQty.size === 0) return;

  const productIds = [...productQty.keys()];
  const productDocs = await loadPayloadProductDocsByIds(productIds);
  for (const doc of productDocs) {
    const productId = String(doc.id);
    const add = productQty.get(productId);
    if (!add) continue;
    const variants = normalizeVariantDocs(doc.variants);
    if (variants.length > 0) continue;

    const current = resolveProductStock(doc);
    if (current === null) continue;

    await payload.update({
      collection: 'products',
      id: doc.id,
      data: { stock: current + add } as Record<string, unknown>,
    });
  }
}
