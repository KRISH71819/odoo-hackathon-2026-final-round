// ── chooseFulfillmentSplit ───────────────────────────────────
// Pure function: given quotation lines and warehouse stock, returns
// an allocation plan. Never mutates DB; caller persists the result.
//
// Algorithm (pragmatic hackathon version per blueprint):
//  1. For each line, try to fulfill from a single warehouse with
//     lowest shippingCostWeight that has sufficient available stock.
//  2. If no single warehouse can fulfill it, greedily allocate from
//     warehouses ordered by (shippingCostWeight ASC, availableQty DESC)
//     to minimize shipment count first, then cost.
//  3. Remaining unfilled quantity becomes a backorder allocation.

export interface StockRecord {
  warehouseId: string;
  warehouseName: string;
  shippingCostWeight: number;
  availableQty: number; // quantity - reservedQuantity
}

export interface LineInput {
  quotationLineId: string;
  productId: string;
  quantity: number;
  stockByWarehouse: StockRecord[];
}

export interface AllocationResult {
  quotationLineId: string;
  warehouseId: string;
  warehouseName: string;
  allocatedQty: number;
  isBackorder: boolean;
  shippingCostWeight: number;
}

export function chooseFulfillmentSplit(lines: LineInput[]): AllocationResult[] {
  const allocations: AllocationResult[] = [];

  for (const line of lines) {
    let remaining = line.quantity;
    const sorted = [...line.stockByWarehouse].sort(
      (a, b) => a.shippingCostWeight - b.shippingCostWeight || b.availableQty - a.availableQty,
    );

    // Try single-warehouse fulfillment first
    const singleWarehouse = sorted.find((s) => s.availableQty >= remaining);
    if (singleWarehouse) {
      allocations.push({
        quotationLineId: line.quotationLineId,
        warehouseId: singleWarehouse.warehouseId,
        warehouseName: singleWarehouse.warehouseName,
        allocatedQty: remaining,
        isBackorder: false,
        shippingCostWeight: singleWarehouse.shippingCostWeight,
      });
      continue;
    }

    // Greedy multi-warehouse allocation
    for (const stock of sorted) {
      if (remaining <= 0) break;
      if (stock.availableQty <= 0) continue;
      const allocQty = Math.min(stock.availableQty, remaining);
      allocations.push({
        quotationLineId: line.quotationLineId,
        warehouseId: stock.warehouseId,
        warehouseName: stock.warehouseName,
        allocatedQty: allocQty,
        isBackorder: false,
        shippingCostWeight: stock.shippingCostWeight,
      });
      remaining -= allocQty;
    }

    // Backorder for any remaining qty
    if (remaining > 0) {
      // Use cheapest warehouse as the backorder source (or first if none)
      const backorderWarehouse = sorted[0];
      if (backorderWarehouse) {
        allocations.push({
          quotationLineId: line.quotationLineId,
          warehouseId: backorderWarehouse.warehouseId,
          warehouseName: backorderWarehouse.warehouseName,
          allocatedQty: remaining,
          isBackorder: true,
          shippingCostWeight: backorderWarehouse.shippingCostWeight,
        });
      }
    }
  }

  return allocations;
}
