// ── Product List Page ────────────────────────────────────────

import React, { useState } from 'react';
import { useProducts, useCreateProduct } from './useCatalog';
import { PageHeader, StatusBadge, PrimaryButton, Input, Select, Spinner, Panel, formatCents, formatBps } from '../../components/ui';
import { ProductCategory } from '@dealflow360/contracts';

export default function ProductListPage() {
  const [category, setCategory] = useState('');
  const [search, setSearch] = useState('');
  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState({ name: '', sku: '', category: ProductCategory.HARDWARE, unitPrice: 0, costPrice: 0, taxRate: 0, description: '' });
  const createProduct = useCreateProduct();

  const params: Record<string, string> = {};
  if (category) params.category = category;
  if (search) params.search = search;

  const { data, isLoading } = useProducts(Object.keys(params).length > 0 ? params : undefined);
  const products = data?.data || [];

  return (
    <div>
      <PageHeader title="Products">
        <PrimaryButton onClick={() => setShowCreate(true)}>+ New Product</PrimaryButton>
      </PageHeader>

      {showCreate && (
        <Panel title="New Product" className="mb-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <Input label="Name" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} />
            <Input label="SKU" value={form.sku} onChange={e => setForm({ ...form, sku: e.target.value })} />
            <Select label="Category" value={form.category} onChange={e => setForm({ ...form, category: e.target.value as ProductCategory })}>{Object.values(ProductCategory).map(c => <option key={c} value={c}>{c}</option>)}</Select>
            <Input label="Price (cents)" type="number" value={form.unitPrice} onChange={e => setForm({ ...form, unitPrice: Number(e.target.value) })} />
            <Input label="Cost (cents)" type="number" value={form.costPrice} onChange={e => setForm({ ...form, costPrice: Number(e.target.value) })} />
            <Input label="Tax (bps)" type="number" value={form.taxRate} onChange={e => setForm({ ...form, taxRate: Number(e.target.value) })} />
          </div>
          <div className="flex gap-2 mt-3">
            <PrimaryButton disabled={createProduct.isPending || !form.name || !form.sku} onClick={async () => { await createProduct.mutateAsync({ ...form, unit: 'unit', currencyCode: 'USD', isActive: true }); setShowCreate(false); }}>Create</PrimaryButton>
            <button className="text-xs text-df-text-muted" onClick={() => setShowCreate(false)}>Cancel</button>
          </div>
        </Panel>
      )}

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
