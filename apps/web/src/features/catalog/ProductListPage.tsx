// ── Product List Page ────────────────────────────────────────

import React, { useState } from 'react';
import { useProducts } from './useCatalog';
import { PageHeader, StatusBadge, PrimaryButton, Input, Select, Spinner, Panel, formatCents, formatBps } from '../../components/ui';
import { ProductCategory } from '@dealflow360/contracts';

export default function ProductListPage() {
  const [category, setCategory] = useState('');
  const [search, setSearch] = useState('');

  const params: Record<string, string> = {};
  if (category) params.category = category;
  if (search) params.search = search;

  const { data, isLoading } = useProducts(Object.keys(params).length > 0 ? params : undefined);
  const products = data?.data || [];

  return (
    <div>
      <PageHeader title="Products">
        <PrimaryButton>+ New Product</PrimaryButton>
      </PageHeader>

      {/* Filters */}
      <div className="flex gap-3 mb-4">
        <div className="w-48">
          <Select value={category} onChange={(e) => setCategory(e.target.value)}>
            <option value="">All Categories</option>
            {Object.values(ProductCategory).map((c) => (
              <option key={c} value={c}>{c}</option>
            ))}
          </Select>
        </div>
        <div className="w-64">
          <Input
            placeholder="Search products..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </div>

      {/* Table */}
      {isLoading ? <Spinner /> : (
        <Panel>
          <div className="overflow-x-auto">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Product</th>
                  <th>SKU</th>
                  <th>Category</th>
                  <th className="text-right">Price</th>
                  <th className="text-right">Cost</th>
                  <th className="text-right">Margin</th>
                  <th className="text-right">Tax</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {products.map((p: any) => {
                  const margin = p.unitPrice - p.costPrice;
                  const marginPct = p.unitPrice > 0 ? Math.floor(margin * 10000 / p.unitPrice) : 0;
                  return (
                    <tr key={p.id} className="cursor-pointer">
                      <td className="font-medium">{p.name}</td>
                      <td className="text-charcoal-400 font-mono text-xs">{p.sku}</td>
                      <td><StatusBadge status={p.category} /></td>
                      <td className="text-right">{formatCents(p.unitPrice)}</td>
                      <td className="text-right text-charcoal-400">{formatCents(p.costPrice)}</td>
                      <td className={`text-right ${marginPct >= 3000 ? 'text-success' : marginPct >= 1500 ? 'text-warning' : 'text-danger'}`}>
                        {formatBps(marginPct)}
                      </td>
                      <td className="text-right text-charcoal-400">{formatBps(p.taxRate)}</td>
                      <td>{p.isActive ? <StatusBadge status="APPROVED" /> : <StatusBadge status="DRAFT" />}</td>
                    </tr>
                  );
                })}
                {products.length === 0 && (
                  <tr><td colSpan={8} className="text-center text-charcoal-400 py-8">No products found</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </Panel>
      )}
    </div>
  );
}
