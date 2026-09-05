// ── Quotation Builder Page ───────────────────────────────────
// The core builder UI with lines, totals, risk, and upsell.

import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuotation, useAddLine, useUpdateQuotation, useRemoveLine, useSubmitQuote, useUpsellSuggestions, useAuditTrail, useDeleteQuote, useLiveRisk } from './useQuotations';
import { useProducts } from '../catalog/useCatalog';
import { PageHeader, StatusBadge, PrimaryButton, SecondaryButton, DangerButton, SuccessButton, Panel, NoticeStrip, Spinner, Input, Select, formatCents, formatBps } from '../../components/ui';
import { api } from '../../lib/api';
import { useSuggestFulfillmentPlan, useQuotationFulfillmentPlan } from '../fulfillment/useFulfillment';

export default function QuotationBuilderPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { data: quoteData, isLoading } = useQuotation(id!);
  const { data: productsData } = useProducts();
  const { data: suggestionsData } = useUpsellSuggestions(id!);
  const { data: auditData } = useAuditTrail(id!);
  const { data: liveRiskData, isLoading: riskLoading } = useLiveRisk(id!);

  const addLine = useAddLine();
  const updateQuotation = useUpdateQuotation();
  const removeLine = useRemoveLine();
  const submitQuote = useSubmitQuote();
  const deleteQuote = useDeleteQuote();
  const suggestFulfillment = useSuggestFulfillmentPlan();
  const { data: existingPlanData } = useQuotationFulfillmentPlan(id!);

  const [selectedProductId, setSelectedProductId] = useState('');
  const [quantity, setQuantity] = useState(1);
  const [lineDiscount, setLineDiscount] = useState(0);
  const [selectedVariantId, setSelectedVariantId] = useState('');
  const [dismissedSuggestions, setDismissedSuggestions] = useState<string[]>([]);
  const [orderDiscount, setOrderDiscount] = useState<number | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitSuccess, setSubmitSuccess] = useState(false);

  if (isLoading) return <Spinner />;

  const quote = quoteData?.data;
  if (!quote) return <div className="text-center text-charcoal-400 py-12">Quotation not found</div>;

  const products = productsData?.data || [];
  const suggestions = (suggestionsData?.data || []).filter((s: any) => !dismissedSuggestions.includes(s.id));
  const auditTrail = auditData?.data || [];
  const isEditable = quote.status === 'DRAFT' || quote.status === 'REVISION';

  // Live risk: use the fresh risk data when available, fall back to saved risk on quote
  const liveRisk = liveRiskData?.data;
  const displayRiskLevel = liveRisk?.riskLevel ?? quote.riskLevel;
  const displayRiskScore = liveRisk?.riskScore ?? quote.riskScore;
  const displayRiskReasons = liveRisk?.reasons ?? [];

  const handleAddLine = async () => {
    if (!selectedProductId) return;
    await addLine.mutateAsync({
      quotationId: id!,
      data: { productId: selectedProductId, variantId: selectedVariantId || undefined, quantity, lineDiscountBps: lineDiscount * 100 },
    });
    setSelectedProductId('');
    setQuantity(1);
    setLineDiscount(0);
    setSelectedVariantId('');
  };

  const handleSubmit = async () => {
    if (!confirm('Submit this quotation for approval? Lines cannot be edited while pending.')) return;
    setSubmitError(null);
    try {
      await submitQuote.mutateAsync(id!);
      setSubmitSuccess(true);
      // Stay on this page — the quote will refresh showing the new PENDING status
    } catch (err: any) {
      setSubmitError(err?.message ?? 'Submission failed');
    }
  };

  const handleDeleteDraft = async () => {
    if (!confirm('Delete this draft quotation? This cannot be undone.')) return;
    try {
      await deleteQuote.mutateAsync(id!);
      navigate('/quotations');
    } catch (err: any) {
      alert('Could not delete: ' + (err?.message || 'Error'));
    }
  };

  const handleOpenPortal = async () => {
    try {
      const res = await api.post<any>(`/portal/token/${quote.id}`);
      const token = res.data?.token;
      if (token) {
        window.open(`/portal/${token}`, '_blank');
      }
    } catch (e: any) {
      alert('Could not generate portal link: ' + (e?.message || 'Error'));
    }
  };


  const handleGenerateFulfillment = async () => {
    try {
      const res = await suggestFulfillment.mutateAsync(quote.id);
      const planId = res?.data?.id;
      if (planId) navigate(`/fulfillment/${planId}`);
    } catch (e: any) {
      alert('Could not generate fulfillment plan: ' + (e?.message || 'Error'));
    }
  };
  return (
    <div>
      <PageHeader title={quote.title}>
        <StatusBadge status={quote.status} className="text-sm px-3 py-1" />
        {(quote.status === 'APPROVED' || quote.status === 'FULFILLMENT_READY' || quote.status === 'SENT_TO_CUSTOMER') && (
          <SecondaryButton onClick={handleOpenPortal}>🔗 Send / Open Customer Portal</SecondaryButton>
        )}
        {(quote.status === 'APPROVED' || quote.status === 'FULFILLMENT_READY') && (
          <PrimaryButton onClick={handleGenerateFulfillment} disabled={suggestFulfillment.isPending}>
            {existingPlanData?.data ? 'Regenerate Fulfillment Plan' : 'Generate Fulfillment Plan'}
          </PrimaryButton>
        )}
        {existingPlanData?.data?.id && (
          <SecondaryButton onClick={() => navigate(`/fulfillment/${existingPlanData.data.id}`)}>
            📦 View Fulfillment Plan
          </SecondaryButton>
        )}
        {['CONFIRMED', 'BILLED', 'PAID'].includes(quote.status) && (
          <SecondaryButton onClick={() => navigate(`/billing/${quote.id}`)}>
            💳 Billing Schedule
          </SecondaryButton>
        )}
        {['BILLED', 'PAID'].includes(quote.status) && (
          <SecondaryButton onClick={() => navigate('/invoices')}>
            🧾 Invoices
          </SecondaryButton>
        )}
        <SecondaryButton onClick={() => navigate('/quotations')}>← Back</SecondaryButton>
      </PageHeader>

      {/* Success/Error Notices */}
      {submitSuccess && (
        <NoticeStrip variant="info" className="mb-4">
          ✓ Quotation submitted for approval. Status updated to {quote.status.replace(/_/g, ' ')}.
        </NoticeStrip>
      )}
      {submitError && (
        <NoticeStrip variant="danger" className="mb-4">
          ✗ {submitError}
        </NoticeStrip>
      )}

      {/* Quote Info */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
        <Panel>
          <p className="text-xs text-charcoal-400">Customer</p>
          <p className="font-medium">{quote.customer?.name}</p>
          <StatusBadge status={quote.customer?.tier || 'STANDARD'} className="mt-1" />
        </Panel>
        <Panel>
          <p className="text-xs text-charcoal-400">Sales Rep</p>
          <p className="font-medium">{quote.salesRep?.name}</p>
        </Panel>
        <Panel>
          <p className="text-xs text-charcoal-400">
            Risk Level {riskLoading && isEditable && <span className="text-xs text-charcoal-500"> (recalculating…)</span>}
          </p>
          <div className="flex items-center gap-2">
            <StatusBadge status={displayRiskLevel ?? 'NONE'} className="text-sm" />
            {displayRiskScore > 0 && <span className="text-xs text-charcoal-400">Score: {displayRiskScore} bps</span>}
          </div>
          {displayRiskReasons.length > 0 && (
            <ul className="mt-1 space-y-0.5">
              {displayRiskReasons.map((r: string, i: number) => (
                <li key={i} className="text-xs text-charcoal-400">• {r}</li>
              ))}
            </ul>
          )}
        </Panel>
      </div>

      {/* Risk Warning */}
      {(displayRiskLevel === 'MEDIUM' || displayRiskLevel === 'HIGH') && (
        <NoticeStrip variant={displayRiskLevel === 'HIGH' ? 'danger' : 'warning'}>
          ⚠ This quotation has {displayRiskLevel?.toLowerCase()} discount risk. It will require{' '}
          {displayRiskLevel === 'HIGH' ? 'manager and finance' : 'manager'} approval.
        </NoticeStrip>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mt-4">
        {/* Lines Table — 2/3 width */}
        <div className="lg:col-span-2">
          <Panel title="Quotation Lines">
            <div className="overflow-x-auto">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Product</th>
                    <th>Category</th>
                    <th className="text-right">Qty</th>
                    <th className="text-right">Unit Price</th>
                    <th className="text-right">Discount</th>
                    <th className="text-right">Subtotal</th>
                    <th className="text-right">Tax</th>
                    <th className="text-right">Total</th>
                    <th className="text-right">Margin</th>
                    {isEditable && <th></th>}
                  </tr>
                </thead>
                <tbody>
                  {quote.lines.map((line: any) => (
                    <tr key={line.id}>
                      <td className="font-medium">{line.productName}</td>
                      <td><StatusBadge status={line.productCategory} /></td>
                      <td className="text-right">{line.quantity}</td>
                      <td className="text-right font-mono">{formatCents(line.unitPrice)}</td>
                      <td className="text-right">{formatBps(line.discountBps ?? line.lineDiscountBps)}</td>
                      <td className="text-right font-mono">{formatCents(line.afterDiscount ?? (line.subtotal - Math.floor(line.subtotal * ((line.discountBps ?? line.lineDiscountBps ?? 0) / 10000))))}</td>
                      <td className="text-right text-charcoal-400">{formatCents(line.taxAmount)}</td>
                      <td className="text-right font-mono font-medium">{formatCents(line.total)}</td>
                      <td className={`text-right ${line.marginPercent >= 2000 ? 'text-success' : line.marginPercent >= 1000 ? 'text-warning' : 'text-danger'}`}>
                        {formatBps(line.marginPercent)}
                      </td>
                      {isEditable && (
                        <td>
                          <button
                            onClick={() => removeLine.mutate({ quotationId: id!, lineId: line.id })}
                            className="text-danger text-xs hover:underline"
                          >
                            ✕
                          </button>
                        </td>
                      )}
                    </tr>
                  ))}
                  {quote.lines.length === 0 && (
                    <tr><td colSpan={isEditable ? 10 : 9} className="text-center text-charcoal-400 py-6">No lines yet. Add products below.</td></tr>
                  )}
                </tbody>
              </table>
            </div>

            {/* Add Line Form */}
            {isEditable && (
              <div className="flex gap-2 mt-3 items-end">
                <div className="flex-1">
                  <Select label="Product" value={selectedProductId} onChange={(e) => setSelectedProductId(e.target.value)}>
                    <option value="">Select product...</option>
                    {products.map((p: any) => (
                      <option key={p.id} value={p.id}>{p.name} — {formatCents(p.unitPrice)}</option>
                    ))}
                  </Select>
                </div>
                {selectedProductId && (products.find((p: any) => p.id === selectedProductId)?.variants?.length ?? 0) > 0 && (
                  <div className="w-40">
                    <Select label="Variant" value={selectedVariantId} onChange={(e) => setSelectedVariantId(e.target.value)}>
                      <option value="">Base</option>
                      {(products.find((p: any) => p.id === selectedProductId)?.variants || []).map((v: any) => (
                        <option key={v.id} value={v.id}>{v.attribute}: {v.value} (+{formatCents(v.extraPrice)})</option>
                      ))}
                    </Select>
                  </div>
                )}
                <div className="w-20">
                  <Input label="Qty" type="number" min={1} value={quantity} onChange={(e) => setQuantity(parseInt(e.target.value) || 1)} />
                </div>
                <div className="w-24">
                  <Input label="Discount %" type="number" min={0} max={100} step={0.1} value={lineDiscount} onChange={(e) => setLineDiscount(parseFloat(e.target.value) || 0)} />
                </div>
                <PrimaryButton onClick={handleAddLine} disabled={!selectedProductId || addLine.isPending}>
                  Add
                </PrimaryButton>
              </div>
            )}
          </Panel>

          {/* Audit Trail */}
          {auditTrail.length > 0 && (
            <Panel title="Audit Trail" className="mt-4">
              <div className="space-y-2 max-h-48 overflow-y-auto">
                {auditTrail.map((entry: any) => (
                  <div key={entry.id} className="flex items-start gap-2 text-xs">
                    <span className="text-charcoal-500 whitespace-nowrap">{new Date(entry.createdAt).toLocaleString()}</span>
                    <span className="font-medium text-charcoal-300">{entry.user?.name}</span>
                    <StatusBadge status={entry.action.replace('QUOTATION_', '')} />
                    {entry.details && <span className="text-charcoal-400 truncate">{entry.details}</span>}
                  </div>
                ))}
              </div>
            </Panel>
          )}
        </div>

        {/* Right Sidebar — Totals + Actions + Upsell */}
        <div className="space-y-4">
          {/* Totals Panel */}
          <Panel title="Totals">
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-charcoal-400">Subtotal</span>
                <span className="font-mono">{formatCents(quote.subtotal)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-charcoal-400">Discount</span>
                <span className="font-mono text-danger">-{formatCents(quote.totalDiscount)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-charcoal-400">Tax</span>
                <span className="font-mono">{formatCents(quote.taxTotal ?? quote.totalTax)}</span>
              </div>
              <div className="border-t border-charcoal-600 my-2" />
              <div className="flex justify-between text-base font-semibold">
                <span>Total</span>
                <span className="font-mono">{formatCents(quote.total ?? quote.grandTotal)}</span>
              </div>
              <div className="border-t border-charcoal-700 my-2" />
              <div className="flex justify-between">
                <span className="text-charcoal-400">Cost</span>
                <span className="font-mono text-charcoal-400">{formatCents(quote.totalCost ?? quote.lines?.reduce((sum: number, l: any) => sum + (l.costPrice || 0) * (l.quantity || 1), 0))}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-charcoal-400">Margin</span>
                <span className={`font-mono ${(quote.marginPercent ?? 0) >= 2000 ? 'text-success' : (quote.marginPercent ?? 0) >= 1000 ? 'text-warning' : 'text-danger'}`}>
                  {formatCents(quote.totalMargin ?? (((quote.subtotal || 0) - (quote.totalDiscount || 0)) - (quote.lines?.reduce((sum: number, l: any) => sum + (l.costPrice || 0) * (l.quantity || 1), 0) || 0)))} ({formatBps(quote.marginPercent)})
                </span>
              </div>

              {/* Margin Bar */}
              <div className="mt-3">
                <div className="h-2 bg-charcoal-700 rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full ${quote.marginPercent >= 2000 ? 'bg-success' : quote.marginPercent >= 1000 ? 'bg-warning' : 'bg-danger'}`}
                    style={{ width: `${Math.min(100, quote.marginPercent / 100)}%` }}
                  />
                </div>
              </div>
            </div>
          </Panel>

          {/* Actions */}
          {isEditable && quote.lines.length > 0 && (
            <Panel>
              <div className="mb-3">
                <Input
                  label="Order Discount %"
                  type="number" min={0} max={100} step={0.1}
                  value={orderDiscount ?? ((quote.orderDiscountBps || 0) / 100)}
                  onChange={(e) => setOrderDiscount(parseFloat(e.target.value) || 0)}
                  onBlur={() => updateQuotation.mutate({ id: quote.id, data: { orderDiscountBps: Math.round((orderDiscount ?? 0) * 100) } })}
                />
              </div>
              <SuccessButton className="w-full" onClick={handleSubmit} disabled={submitQuote.isPending}>
                {submitQuote.isPending ? 'Submitting…' : 'Submit for Approval'}
              </SuccessButton>
            </Panel>
          )}

          {/* Delete Draft */}
          {quote.status === 'DRAFT' && (
            <Panel>
              <DangerButton className="w-full" onClick={handleDeleteDraft} disabled={deleteQuote.isPending}>
                {deleteQuote.isPending ? 'Deleting…' : '🗑 Delete Draft'}
              </DangerButton>
            </Panel>
          )}

          {/* Upsell Suggestions Panel — always shown when editable */}
          {isEditable && (
            <Panel title="💡 Suggestions">
              {suggestions.length === 0 ? (
                <p className="text-xs text-charcoal-500">
                  {quote.lines.length === 0
                    ? 'Add products to see suggestions.'
                    : 'No upsell suggestions configured for current products.'}
                </p>
              ) : (
                <div className="space-y-3">
                  {suggestions.map((s: any) => (
                    <div key={s.id} className="bg-charcoal-900 border border-charcoal-700 rounded p-3">
                      <div className="flex justify-between items-start mb-1">
                        <span className="font-medium text-sm">{s.suggestedProduct.name}</span>
                        {s.isPromotion && <span className="text-xs bg-warning/20 text-warning px-1.5 py-0.5 rounded">PROMO</span>}
                      </div>
                      <p className="text-xs text-charcoal-400 mb-2">{s.reason}</p>
                      <div className="text-xs text-charcoal-500 mb-2">From: {s.sourceProductName}</div>
                      <div className="flex items-center justify-between">
                        <span className="text-xs text-success">
                          +{formatCents(s.estimatedMarginDelta)} margin
                        </span>
                        <div className="flex gap-1">
                          <button
                            onClick={() => addLine.mutate({ quotationId: id!, data: { productId: s.suggestedProduct.id, quantity: 1, lineDiscountBps: 0 } })}
                            className="text-xs bg-accent/20 text-accent px-2 py-1 rounded hover:bg-accent/30"
                          >
                            Add
                          </button>
                          <button
                            onClick={() => setDismissedSuggestions((prev) => [...prev, s.id])}
                            className="text-xs text-charcoal-500 px-2 py-1 hover:text-charcoal-300"
                          >
                            Dismiss
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </Panel>
          )}

          {/* Approval Requests */}
          {quote.approvalRequests?.length > 0 && (
            <Panel title="Approval Steps">
              <div className="space-y-2">
                {quote.approvalRequests.map((ar: any) => (
                  <div key={ar.id} className="flex items-center justify-between text-sm">
                    <div className="flex items-center gap-2">
                      <span className="text-charcoal-400">Step {ar.step}:</span>
                      <span>{ar.role.replace('_', ' ')}</span>
                    </div>
                    <StatusBadge status={ar.status} />
                  </div>
                ))}
              </div>
            </Panel>
          )}
        </div>
      </div>
    </div>
  );
}

