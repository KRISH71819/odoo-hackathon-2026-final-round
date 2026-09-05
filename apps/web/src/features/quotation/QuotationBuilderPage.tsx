// ── Quotation Builder Page ───────────────────────────────────
// The core builder UI with lines, totals, risk, and upsell.

import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { useQuotation, useAddLine, useUpdateLine, useUpdateQuotation, useRemoveLine, useSubmitQuote, useUpsellSuggestions, useAuditTrail, useDeleteQuote, useLiveRisk } from './useQuotations';
import { useProducts } from '../catalog/useCatalog';
import { PageHeader, StatusBadge, PrimaryButton, SecondaryButton, DangerButton, SuccessButton, Panel, NoticeStrip, Spinner, Input, Select, formatCents, formatBps } from '../../components/ui';
import { api } from '../../lib/api';
import { useSuggestFulfillmentPlan, useQuotationFulfillmentPlan } from '../fulfillment/useFulfillment';

export default function QuotationBuilderPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { data: quoteData, isLoading } = useQuotation(id!);
  const { data: productsData } = useProducts();
  const { data: suggestionsData } = useUpsellSuggestions(id!);
  const { data: auditData } = useAuditTrail(id!);
  const { data: liveRiskData, isLoading: riskLoading } = useLiveRisk(id!);

  const addLine = useAddLine();
  const updateLine = useUpdateLine();
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
  const [staffReplyText, setStaffReplyText] = useState('');
  const [isSendingReply, setIsSendingReply] = useState(false);

  // Line inline-editing state
  const [editingLineId, setEditingLineId] = useState<string | null>(null);
  const [editQuantity, setEditQuantity] = useState<number>(1);
  const [editDiscountPct, setEditDiscountPct] = useState<number>(0);

  if (isLoading) return <Spinner />;

  const quote = quoteData?.data;
  if (!quote) return <div className="text-center text-charcoal-400 py-12">Quotation not found</div>;

  const products = productsData?.data || [];
  const suggestions = (suggestionsData?.data || []).filter((s: any) => !dismissedSuggestions.includes(s.id));
  const auditTrail = auditData?.data || [];
  const isEditable = quote.status === 'DRAFT' || quote.status === 'REVISION';

  // Parse customer requirements
  const isCustomerRequest = Boolean(quote.notes?.includes('[CUSTOMER QUOTE REQUEST]') || quote.title?.startsWith('Quote Request:'));
  let requestedItemsText = '';
  let customerNotesText = '';
  if (quote.notes) {
    const itemsMatch = quote.notes.match(/Requested Items:\n([\s\S]*?)(?=\n\nAdditional Notes:|$)/);
    if (itemsMatch) requestedItemsText = itemsMatch[1].trim();
    const notesMatch = quote.notes.match(/Additional Notes:\n([\s\S]*?)$/);
    if (notesMatch) customerNotesText = notesMatch[1].trim();
  }

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

  const handleStartEditLine = (line: any) => {
    setEditingLineId(line.id);
    setEditQuantity(line.quantity || 1);
    setEditDiscountPct((line.discountBps ?? line.lineDiscountBps ?? 0) / 100);
  };

  const handleCancelEditLine = () => {
    setEditingLineId(null);
  };

  const handleSaveLine = async (lineId: string) => {
    try {
      await updateLine.mutateAsync({
        quotationId: id!,
        lineId,
        data: {
          quantity: Math.max(1, Math.round(Number(editQuantity))),
          lineDiscountBps: Math.round(Math.max(0, Math.min(100, Number(editDiscountPct))) * 100),
        },
      });
      setEditingLineId(null);
    } catch (err: any) {
      alert('Failed to update line: ' + (err?.message || 'Error'));
    }
  };

  const handleSubmit = async () => {
    const isRevision = quote.status === 'REVISION';
    const msg = isRevision
      ? 'Re-submit this quotation for approval? Approvers will review the revised item discounts and terms.'
      : 'Submit this quotation for approval? Lines cannot be edited while pending.';
    if (!confirm(msg)) return;
    setSubmitError(null);
    try {
      await submitQuote.mutateAsync(id!);
      setSubmitSuccess(true);
      setEditingLineId(null);
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
      queryClient.invalidateQueries({ queryKey: ['quotation', id] });
      if (token) {
        window.open(`/portal/${token}`, '_blank');
      }
    } catch (e: any) {
      alert('Could not generate portal link: ' + (e?.message || 'Error'));
    }
  };

  const handleSendStaffReply = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!staffReplyText.trim()) return;
    setIsSendingReply(true);
    try {
      await api.post(`/quotations/${id}/comments`, { message: staffReplyText.trim() });
      setStaffReplyText('');
      queryClient.invalidateQueries({ queryKey: ['quotation', id] });
    } catch (err: any) {
      alert('Failed to send reply: ' + (err?.message || 'Error'));
    } finally {
      setIsSendingReply(false);
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
        {(['APPROVED', 'FULFILLMENT_READY', 'SENT_TO_CUSTOMER', 'UNDER_NEGOTIATION'].includes(quote.status) ||
          (quote.status === 'DRAFT' && quote.lines?.length > 0)) && (
          <SecondaryButton onClick={handleOpenPortal}>
            {quote.status === 'SENT_TO_CUSTOMER' ? '🔗 Open Customer Portal' : '📤 Send Quotation to Customer'}
          </SecondaryButton>
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

      {/* Customer Requirement & Item List Card */}
      {isCustomerRequest && (
        <div className="mb-4 bg-gradient-to-r from-amber-950/40 via-charcoal-900 to-charcoal-900 border border-amber-500/40 rounded-xl p-4 shadow-lg">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-amber-500/20 mb-3">
            <div className="flex items-center gap-2.5">
              <span className="text-2xl">📋</span>
              <div>
                <h3 className="text-sm font-bold text-amber-300 uppercase tracking-wide">
                  Customer Requirement & Requested Items
                </h3>
                <p className="text-xs text-charcoal-400">
                  Direct submission from customer portal awaiting line items & pricing from sales representative
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs text-charcoal-400">Customer Tier:</span>
              <span className={`px-2.5 py-1 rounded text-xs font-bold uppercase tracking-wider ${
                quote.customer?.tier === 'PLATINUM'
                  ? 'bg-purple-500/20 text-purple-300 border border-purple-500/40'
                  : quote.customer?.tier === 'GOLD'
                  ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                  : quote.customer?.tier === 'SILVER'
                  ? 'bg-slate-400/20 text-slate-200 border border-slate-400/40'
                  : 'bg-amber-700/20 text-amber-400 border border-amber-700/40'
              }`}>
                {quote.customer?.tier || 'BRONZE'} TIER
              </span>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
            <div className="bg-charcoal-950/60 rounded-lg p-3 border border-amber-500/20">
              <div className="font-semibold text-amber-200 mb-1.5 flex items-center gap-1.5">
                <span>📦</span> Requested Items / Requirements:
              </div>
              <p className="text-charcoal-100 whitespace-pre-line leading-relaxed font-mono text-[11px] bg-charcoal-900/90 p-3 rounded border border-charcoal-800">
                {requestedItemsText || quote.notes}
              </p>
            </div>

            <div className="space-y-3">
              <div className="bg-charcoal-950/60 rounded-lg p-3 border border-amber-500/20">
                <div className="font-semibold text-charcoal-300 mb-1 flex items-center gap-1.5">
                  <span>👤</span> Customer Details:
                </div>
                <p className="text-charcoal-100 font-medium">{quote.customer?.name}</p>
                <p className="text-charcoal-400 text-[11px]">{quote.customer?.email}</p>
              </div>

              {customerNotesText && customerNotesText !== 'None' && (
                <div className="bg-charcoal-950/60 rounded-lg p-3 border border-amber-500/20">
                  <div className="font-semibold text-charcoal-300 mb-1 flex items-center gap-1.5">
                    <span>💬</span> Additional Notes:
                  </div>
                  <p className="text-charcoal-200 whitespace-pre-line text-[11px]">{customerNotesText}</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Revision Notice Banner */}
      {(() => {
        const returnAudits = auditTrail.filter((a: any) => a.action === 'QUOTATION_RETURNED');
        const latestReturnAudit = returnAudits[0];
        let returnMeta: { role?: string; reason?: string; step?: number } = {};
        if (latestReturnAudit?.details) {
          try {
            returnMeta = JSON.parse(latestReturnAudit.details);
          } catch {}
        }
        const revisionRole = returnMeta.role || (quote.approvalRequests?.find((r: any) => r.status === 'PENDING')?.role) || 'SALES_MANAGER';
        const revisionRoleDisplay = revisionRole === 'FINANCE' || revisionRole === 'FINANCE_OPS' ? 'Finance Head' : 'Sales Manager';
        const revisionReason = returnMeta.reason || latestReturnAudit?.reason || 'Please adjust specific item discounts or terms to comply with approval policy.';
        const revisionUserName = latestReturnAudit?.user?.name;
        const revisionTimestamp = latestReturnAudit?.createdAt ? new Date(latestReturnAudit.createdAt).toLocaleString() : null;

        return quote.status === 'REVISION' ? (
          <div className="mb-4 rounded-xl border border-amber-500/40 bg-gradient-to-r from-amber-500/15 via-amber-500/5 to-charcoal-900 p-4 text-charcoal-100 shadow-lg shadow-amber-950/20">
            <div className="flex items-start gap-3.5">
              <div className="p-2.5 rounded-lg bg-amber-500/20 text-amber-400 text-2xl flex-shrink-0">
                🔄
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <h3 className="font-semibold text-amber-300 text-base">Quotation Returned for Revision</h3>
                  <span className="text-xs px-2 py-0.5 rounded-full font-medium bg-amber-500/20 text-amber-300 border border-amber-500/30">
                    Editable Revision Mode
                  </span>
                  {revisionTimestamp && <span className="text-xs text-charcoal-400">• {revisionTimestamp}</span>}
                </div>
                <p className="text-xs text-charcoal-300 mt-1">
                  Returned by <span className="font-semibold text-white">{revisionUserName ? `${revisionUserName} (${revisionRoleDisplay})` : revisionRoleDisplay}</span>
                </p>
                <div className="mt-2.5 p-3 rounded-lg bg-charcoal-950/90 border border-amber-500/30 text-sm">
                  <span className="text-amber-400 font-medium text-xs uppercase tracking-wider block mb-1">
                    Reviewer's Revision Instructions:
                  </span>
                  <p className="text-charcoal-100 italic">"{revisionReason}"</p>
                </div>
                <p className="text-xs text-charcoal-400 mt-2">
                  💡 <span className="text-charcoal-200 font-medium">Full Edit Access:</span> You can adjust item-specific discounts and quantities directly in the table below, add/remove items, or modify order discounts. Click <span className="text-accent font-medium">🔄 Re-submit for Approval</span> when ready.
                </p>
              </div>
            </div>
          </div>
        ) : null;
      })()}

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
                    {isEditable && <th className="text-right">Actions</th>}
                  </tr>
                </thead>
                <tbody>
                  {quote.lines.map((line: any) => {
                    const isEditing = editingLineId === line.id;
                    const previewQty = Math.max(1, editQuantity);
                    const previewDiscountPct = Math.max(0, Math.min(100, editDiscountPct));
                    const previewSubtotal = line.unitPrice * previewQty;
                    const previewDiscountAmt = Math.round(previewSubtotal * (previewDiscountPct / 100));
                    const previewAfterDiscount = previewSubtotal - previewDiscountAmt;
                    const previewTax = Math.round(previewAfterDiscount * ((line.taxRate || 0) / 10000));
                    const previewTotal = previewAfterDiscount + previewTax;
                    const previewCost = (line.costPrice || 0) * previewQty;
                    const previewMarginBps = previewAfterDiscount > 0
                      ? Math.round(((previewAfterDiscount - previewCost) / previewAfterDiscount) * 10000)
                      : 0;

                    return (
                      <tr key={line.id} className={isEditing ? 'bg-charcoal-800/80 ring-1 ring-accent/30' : undefined}>
                        <td className="font-medium">
                          <div>{line.productName}</div>
                          {isEditing && <span className="text-[10px] text-accent font-mono">Editing line</span>}
                        </td>
                        <td><StatusBadge status={line.productCategory} /></td>
                        <td className="text-right">
                          {isEditing ? (
                            <input
                              type="number"
                              min={1}
                              className="w-16 bg-charcoal-900 border border-accent rounded px-2 py-1 text-right text-xs text-charcoal-100 font-mono focus:outline-none"
                              value={editQuantity}
                              onChange={(e) => setEditQuantity(Math.max(1, parseInt(e.target.value) || 1))}
                            />
                          ) : (
                            line.quantity
                          )}
                        </td>
                        <td className="text-right font-mono">{formatCents(line.unitPrice)}</td>
                        <td className="text-right">
                          {isEditing ? (
                            <div className="flex flex-col items-end gap-1">
                              <div className="flex items-center gap-1">
                                <input
                                  type="number"
                                  min={0}
                                  max={100}
                                  step={0.1}
                                  className="w-16 bg-charcoal-900 border border-accent rounded px-1.5 py-0.5 text-right text-xs text-accent font-mono font-bold focus:outline-none"
                                  value={editDiscountPct}
                                  onChange={(e) => setEditDiscountPct(parseFloat(e.target.value) || 0)}
                                />
                                <span className="text-xs text-charcoal-400">%</span>
                              </div>
                              <div className="flex items-center gap-1">
                                {[0, 5, 10, 15, 20].map((preset) => (
                                  <button
                                    key={preset}
                                    type="button"
                                    onClick={() => setEditDiscountPct(preset)}
                                    className={`text-[9px] px-1 py-0.2 rounded border transition-colors ${
                                      editDiscountPct === preset
                                        ? 'bg-accent/30 text-accent border-accent font-bold'
                                        : 'bg-charcoal-800 text-charcoal-400 border-charcoal-700 hover:text-charcoal-200'
                                    }`}
                                  >
                                    {preset}%
                                  </button>
                                ))}
                              </div>
                            </div>
                          ) : (
                            formatBps(line.discountBps ?? line.lineDiscountBps)
                          )}
                        </td>
                        <td className="text-right font-mono">
                          {isEditing ? (
                            <span className="text-accent font-semibold">{formatCents(previewAfterDiscount)}</span>
                          ) : (
                            formatCents(line.afterDiscount ?? (line.subtotal - Math.floor(line.subtotal * ((line.discountBps ?? line.lineDiscountBps ?? 0) / 10000))))
                          )}
                        </td>
                        <td className="text-right text-charcoal-400">
                          {isEditing ? formatCents(previewTax) : formatCents(line.taxAmount)}
                        </td>
                        <td className="text-right font-mono font-medium">
                          {isEditing ? (
                            <span className="text-accent">{formatCents(previewTotal)}</span>
                          ) : (
                            formatCents(line.total)
                          )}
                        </td>
                        <td className={`text-right ${
                          (isEditing ? previewMarginBps : line.marginPercent) >= 2000
                            ? 'text-success'
                            : (isEditing ? previewMarginBps : line.marginPercent) >= 1000
                            ? 'text-warning'
                            : 'text-danger'
                        }`}>
                          {formatBps(isEditing ? previewMarginBps : line.marginPercent)}
                        </td>
                        {isEditable && (
                          <td className="text-right">
                            {isEditing ? (
                              <div className="flex items-center justify-end gap-1.5">
                                <button
                                  onClick={() => handleSaveLine(line.id)}
                                  disabled={updateLine.isPending}
                                  className="px-2 py-1 text-xs font-semibold rounded bg-success hover:bg-success/90 text-white transition-all disabled:opacity-50"
                                >
                                  {updateLine.isPending ? '…' : '✓ Save'}
                                </button>
                                <button
                                  onClick={handleCancelEditLine}
                                  className="px-2 py-1 text-xs rounded border border-charcoal-700 text-charcoal-400 hover:text-charcoal-200 hover:bg-charcoal-800 transition-all"
                                >
                                  ✕
                                </button>
                              </div>
                            ) : (
                              <div className="flex items-center justify-end gap-1.5">
                                <button
                                  onClick={() => handleStartEditLine(line)}
                                  className="px-2 py-1 text-xs font-medium rounded bg-charcoal-800 border border-charcoal-700 text-accent hover:bg-accent/10 hover:border-accent/30 transition-all flex items-center gap-1"
                                  title="Edit item quantity & specific discount"
                                >
                                  ✏ Edit
                                </button>
                                <button
                                  onClick={() => removeLine.mutate({ quotationId: id!, lineId: line.id })}
                                  className="text-charcoal-400 hover:text-danger text-xs px-1.5 py-1 rounded hover:bg-danger/10 transition-all"
                                  title="Remove item"
                                >
                                  ✕
                                </button>
                              </div>
                            )}
                          </td>
                        )}
                      </tr>
                    );
                  })}
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

          {/* Customer Inquiries & Negotiation Thread */}
          {quote.negotiationThread?.comments && quote.negotiationThread.comments.length > 0 && (
            <Panel title="💬 Customer Inquiries & Negotiation Thread" className="mt-4">
              <div className="space-y-2.5 max-h-64 overflow-y-auto mb-3 pr-1">
                {quote.negotiationThread.comments.map((c: any) => {
                  const isCustomer = c.user?.role === 'CUSTOMER';
                  return (
                    <div
                      key={c.id}
                      className={`p-3 rounded-lg border text-xs ${
                        isCustomer
                          ? 'bg-charcoal-900/90 border-charcoal-700'
                          : 'bg-accent/10 border-accent/30'
                      }`}
                    >
                      <div className="flex items-center justify-between gap-2 mb-1">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="font-semibold text-charcoal-100">{c.user?.name || 'User'}</span>
                          <span
                            className={`px-1.5 py-0.2 rounded text-[9px] font-bold uppercase tracking-wider ${
                              isCustomer
                                ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                                : 'bg-accent/20 text-accent border border-accent/30'
                            }`}
                          >
                            {isCustomer ? `${c.user?.tier || 'BRONZE'} CUSTOMER` : 'SALES REP'}
                          </span>
                          {c.isChangeRequest && (
                            <span className="px-1.5 py-0.2 rounded text-[9px] font-bold bg-amber-950/60 text-amber-400 border border-amber-600/40">
                              Change Request
                            </span>
                          )}
                          {c.proposedDiscount != null && (
                            <span className="px-1.5 py-0.2 rounded text-[9px] font-bold bg-emerald-950/60 text-emerald-400 border border-emerald-600/40">
                              Proposed Discount: {(c.proposedDiscount * 100).toFixed(1)}%
                            </span>
                          )}
                        </div>
                        <span className="text-charcoal-500 text-[10px] whitespace-nowrap">
                          {new Date(c.createdAt).toLocaleDateString()} {new Date(c.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>
                      <p className="text-charcoal-300 whitespace-pre-line leading-relaxed text-[11px]">{c.message}</p>
                    </div>
                  );
                })}
              </div>

              {/* Staff Reply Form */}
              <form onSubmit={handleSendStaffReply} className="flex gap-2">
                <input
                  type="text"
                  placeholder="Reply to customer inquiry, change request, or counter-offer..."
                  className="flex-1 px-3 py-1.5 text-xs bg-charcoal-900 border border-charcoal-700 rounded text-charcoal-100 placeholder-charcoal-500 focus:outline-none focus:border-accent"
                  value={staffReplyText}
                  onChange={(e) => setStaffReplyText(e.target.value)}
                />
                <button
                  type="submit"
                  disabled={isSendingReply || !staffReplyText.trim()}
                  className="px-3 py-1.5 text-xs font-semibold rounded bg-accent text-white hover:bg-accent/90 disabled:opacity-50 transition-colors whitespace-nowrap"
                >
                  {isSendingReply ? 'Sending…' : 'Send Reply'}
                </button>
              </form>
            </Panel>
          )}

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
              {submitError && (
                <div className="mb-2 p-2 rounded bg-danger/10 border border-danger/30 text-danger text-xs">
                  {submitError}
                </div>
              )}
              <SuccessButton className="w-full" onClick={handleSubmit} disabled={submitQuote.isPending}>
                {submitQuote.isPending
                  ? 'Submitting…'
                  : quote.status === 'REVISION'
                  ? '🔄 Re-submit for Approval'
                  : 'Submit for Approval'}
              </SuccessButton>
              {quote.status === 'REVISION' && (
                <p className="text-[11px] text-charcoal-400 text-center mt-2">
                  Re-submitting recalculates discount risk & updates the approval chain.
                </p>
              )}
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

