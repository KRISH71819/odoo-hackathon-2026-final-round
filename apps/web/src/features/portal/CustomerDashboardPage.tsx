// ── Customer Dashboard Page ────────────────────────────────────
// Shown when a CUSTOMER logs in via JWT (no portal token needed).
// Lists their quotations and lets them open the full negotiation view.
// Standalone layout — no internal nav sidebar.

import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { LogOut, FileText, ChevronRight, ArrowLeft, MessageSquare, Percent, CheckCircle } from 'lucide-react';
import { useAuth } from '../../lib/auth.js';
import { api } from '../../lib/api-client.js';
import { StatusBadge, NoticeStrip, Spinner } from '../../components/ui.js';
import { formatCurrency, formatDate } from '../../lib/format.js';

// ── Data hooks ──────────────────────────────────────────────────

function useCustomerQuotations() {
  return useQuery({
    queryKey: ['customer-quotations'],
    queryFn: () => api.get<{ data: any[] }>('/portal/customer-jwt/quotations').then(r => r.data),
  });
}

function useCustomerQuotationDetail(id: string | null) {
  return useQuery({
    queryKey: ['customer-quotation', id],
    queryFn: () => api.get<{ data: any }>(`/portal/customer-jwt/quotations/${id}`).then(r => r.data),
    enabled: !!id,
  });
}

function useAddComment(quotationId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: { message: string; isChangeRequest: boolean }) =>
      api.post(`/portal/customer-jwt/quotations/${quotationId}/comments`, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['customer-quotation', quotationId] }),
  });
}

function useCounterOffer(quotationId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: { proposedOrderDiscountBps: number; message?: string }) =>
      api.post(`/portal/customer-jwt/quotations/${quotationId}/counter-offer`, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['customer-quotation', quotationId] });
      qc.invalidateQueries({ queryKey: ['customer-quotations'] });
    },
  });
}

function useConfirm(quotationId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => api.post(`/portal/customer-jwt/quotations/${quotationId}/confirm`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['customer-quotation', quotationId] });
      qc.invalidateQueries({ queryKey: ['customer-quotations'] });
    },
  });
}

// ── Quotation Detail View ───────────────────────────────────────

function QuotationDetail({ id, onBack }: { id: string; onBack: () => void }) {
  const { data: quote, isLoading } = useCustomerQuotationDetail(id);
  const addComment = useAddComment(id);
  const counterOffer = useCounterOffer(id);
  const confirm = useConfirm(id);

  const [commentText, setCommentText] = useState('');
  const [isChangeRequest, setIsChangeRequest] = useState(false);
  const [counterPct, setCounterPct] = useState('');
  const [counterMsg, setCounterMsg] = useState('');
  const [pageErr, setPageErr] = useState<string | null>(null);
  const [confirmed, setConfirmed] = useState(false);

  if (isLoading) return <div className="flex items-center justify-center p-12"><Spinner /></div>;
  if (!quote) return <NoticeStrip variant="danger">Quotation not found.</NoticeStrip>;

  const nonNeg = ['CONFIRMED', 'BILLED', 'PAID', 'REJECTED'];
  const isReadOnly = nonNeg.includes(quote.status);
  const isConfirmed = ['CONFIRMED', 'BILLED', 'PAID'].includes(quote.status);

  async function handleComment(e: React.FormEvent) {
    e.preventDefault();
    if (!commentText.trim()) return;
    setPageErr(null);
    try {
      await addComment.mutateAsync({ message: commentText, isChangeRequest });
      setCommentText('');
      setIsChangeRequest(false);
    } catch (err: any) { setPageErr(err?.message ?? 'Failed to send comment'); }
  }

  async function handleCounterOffer(e: React.FormEvent) {
    e.preventDefault();
    const pct = parseFloat(counterPct);
    if (isNaN(pct) || pct < 0 || pct > 100) { setPageErr('Enter a valid discount % (0–100)'); return; }
    setPageErr(null);
    try {
      await counterOffer.mutateAsync({ proposedOrderDiscountBps: Math.round(pct * 100), message: counterMsg || undefined });
      setCounterPct('');
      setCounterMsg('');
    } catch (err: any) { setPageErr(err?.message ?? 'Counter-offer failed'); }
  }

  async function handleConfirm() {
    setPageErr(null);
    try {
      await confirm.mutateAsync();
      setConfirmed(true);
    } catch (err: any) { setPageErr(err?.message ?? 'Confirmation failed'); }
  }

  return (
    <div className="space-y-4">
      {/* Back */}
      <button onClick={onBack} className="flex items-center gap-1.5 text-xs text-df-text-muted hover:text-df-text transition-colors">
        <ArrowLeft className="w-3.5 h-3.5" />
        Back to My Quotations
      </button>

      {pageErr && <NoticeStrip variant="danger">{pageErr}</NoticeStrip>}
      {(confirmed || isConfirmed) && (
        <NoticeStrip variant="info">
          <span className="flex items-center gap-2"><CheckCircle className="w-4 h-4" /> Quotation confirmed. Our team will be in touch shortly.</span>
        </NoticeStrip>
      )}

      {/* Quote card */}
      <div className="bg-df-surface border border-df-border rounded-md">
        <div className="px-5 py-4 border-b border-df-border flex items-center justify-between">
          <div>
            <h2 className="text-base font-semibold text-df-text">Quotation {quote.number}</h2>
            <p className="text-xs text-df-text-muted mt-0.5">Review the terms below and respond</p>
          </div>
          <StatusBadge status={quote.status} />
        </div>
        <div className="p-5">
          <table className="w-full text-xs mb-4">
            <thead>
              <tr className="border-b border-df-border text-df-text-muted">
                <th className="text-left py-2 pr-4 font-medium">Product</th>
                <th className="text-right py-2 pr-4 font-medium">Qty</th>
                <th className="text-right py-2 pr-4 font-medium">Unit Price</th>
                <th className="text-right py-2 pr-4 font-medium">Discount</th>
                <th className="text-right py-2 font-medium">Total</th>
              </tr>
            </thead>
            <tbody>
              {(quote.lines ?? []).map((line: any) => (
                <tr key={line.id} className="border-b border-df-border/50">
                  <td className="py-2 pr-4 text-df-text">{line.productName}</td>
                  <td className="py-2 pr-4 text-right text-df-text-muted">{line.quantity}</td>
                  <td className="py-2 pr-4 text-right font-mono">{formatCurrency(line.unitPrice)}</td>
                  <td className="py-2 pr-4 text-right text-df-text-muted">
                    {line.lineDiscount > 0 ? `${line.lineDiscount.toFixed(1)}%` : '—'}
                  </td>
                  <td className="py-2 text-right font-mono">{formatCurrency(line.total)}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <div className="flex justify-end">
            <div className="text-xs space-y-1 w-48">
              <div className="flex justify-between">
                <span className="text-df-text-muted">Subtotal</span>
                <span className="font-mono">{formatCurrency(quote.subtotal)}</span>
              </div>
              {quote.orderDiscount > 0 && (
                <div className="flex justify-between text-df-text-muted">
                  <span>Order discount ({quote.orderDiscount?.toFixed(1)}%)</span>
                  <span className="font-mono">−{formatCurrency(quote.totalDiscount)}</span>
                </div>
              )}
              <div className="flex justify-between">
                <span className="text-df-text-muted">Tax</span>
                <span className="font-mono">{formatCurrency(quote.taxTotal)}</span>
              </div>
              <div className="flex justify-between border-t border-df-border pt-1 font-semibold text-df-text">
                <span>Total</span>
                <span className="font-mono">{formatCurrency(quote.total)}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Comments / line questions */}
      {!isReadOnly && (
        <div className="bg-df-surface border border-df-border rounded-md">
          <div className="px-5 py-3 border-b border-df-border flex items-center gap-2">
            <MessageSquare className="w-4 h-4 text-df-nav" />
            <h3 className="text-sm font-medium text-df-text">Questions & Change Requests</h3>
          </div>
          <div className="p-5">
            <form onSubmit={handleComment} className="space-y-2">
              <textarea
                className="w-full px-3 py-2 text-xs bg-df-bg border border-df-border rounded text-df-text resize-none focus:outline-none focus:border-df-nav"
                rows={3}
                placeholder="Ask a line-level question or request a change…"
                value={commentText}
                onChange={e => setCommentText(e.target.value)}
              />
              <div className="flex items-center justify-between">
                <label className="flex items-center gap-1.5 text-xs text-df-text-muted cursor-pointer">
                  <input type="checkbox" className="accent-df-nav" checked={isChangeRequest}
                    onChange={e => setIsChangeRequest(e.target.checked)} />
                  Flag as change request
                </label>
                <button type="submit"
                  disabled={addComment.isPending || !commentText.trim()}
                  className="px-3 py-1.5 text-xs font-medium bg-df-nav hover:bg-df-nav-hover text-white rounded disabled:opacity-50 transition-colors">
                  {addComment.isPending ? 'Sending…' : 'Send'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Counter-offer */}
      {!isReadOnly && (
        <div className="bg-df-surface border border-df-border rounded-md">
          <div className="px-5 py-3 border-b border-df-border flex items-center gap-2">
            <Percent className="w-4 h-4 text-df-nav" />
            <h3 className="text-sm font-medium text-df-text">Propose a Counter Discount</h3>
          </div>
          <div className="p-5">
            <NoticeStrip variant="info" className="mb-4 text-xs">
              Requesting a discount above policy limits will automatically re-trigger the sales approval process.
            </NoticeStrip>
            <form onSubmit={handleCounterOffer} className="flex flex-wrap items-end gap-3">
              <div>
                <label className="block text-xs text-df-text-muted mb-1">Order Discount (%)</label>
                <input type="number" min="0" max="100" step="0.1"
                  className="w-28 px-2 py-1.5 text-xs bg-df-bg border border-df-border rounded text-df-text focus:outline-none focus:border-df-nav"
                  placeholder="e.g. 5" value={counterPct} onChange={e => setCounterPct(e.target.value)} />
              </div>
              <div className="flex-1 min-w-48">
                <label className="block text-xs text-df-text-muted mb-1">Message (optional)</label>
                <input type="text"
                  className="w-full px-2 py-1.5 text-xs bg-df-bg border border-df-border rounded text-df-text focus:outline-none focus:border-df-nav"
                  placeholder="Reason for counter-offer…" value={counterMsg} onChange={e => setCounterMsg(e.target.value)} />
              </div>
              <button type="submit" disabled={counterOffer.isPending || !counterPct}
                className="px-3 py-1.5 text-xs font-medium bg-df-nav hover:bg-df-nav-hover text-white rounded disabled:opacity-50 transition-colors">
                {counterOffer.isPending ? 'Submitting…' : 'Submit Counter-Offer'}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Confirm */}
      {!isConfirmed && !isReadOnly && (
        <div className="bg-df-surface border border-df-border rounded-md p-5">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h3 className="text-sm font-medium text-df-text mb-1">Confirm This Quotation</h3>
              <p className="text-xs text-df-text-muted">
                By confirming, you accept the terms above and authorize DealFlow360 to proceed with fulfillment and billing.
              </p>
            </div>
            <button disabled={confirm.isPending} onClick={handleConfirm}
              className="shrink-0 px-4 py-2 text-xs font-semibold bg-white text-black hover:bg-neutral-200 rounded disabled:opacity-50 transition-colors shadow">
              {confirm.isPending ? 'Confirming…' : 'Confirm Order ✓'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Main Customer Dashboard ─────────────────────────────────────

export default function CustomerDashboardPage() {
  const { user, logout } = useAuth();
  const { data: quotations, isLoading } = useCustomerQuotations();
  const [selectedId, setSelectedId] = useState<string | null>(null);

  return (
    <div className="min-h-screen bg-df-bg">
      {/* Minimal header */}
      <header className="bg-df-surface border-b border-df-border px-6 py-3">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="text-sm font-semibold text-df-text">DealFlow360</span>
            <span className="text-xs text-df-text-muted">· Customer Portal</span>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-xs text-df-text-muted">{user?.name}</span>
            <button onClick={logout}
              className="flex items-center gap-1.5 text-xs text-df-text-muted hover:text-df-text transition-colors">
              <LogOut className="w-3.5 h-3.5" />
              Sign out
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-6 py-6 space-y-4">
        {selectedId ? (
          <QuotationDetail id={selectedId} onBack={() => setSelectedId(null)} />
        ) : (
          <>
            <div>
              <h1 className="text-base font-semibold text-df-text">My Quotations</h1>
              <p className="text-xs text-df-text-muted mt-0.5">
                Review your quotations, ask questions, propose changes, or confirm final terms.
              </p>
            </div>

            {isLoading && (
              <div className="flex justify-center py-12"><Spinner /></div>
            )}

            {!isLoading && (!quotations || quotations.length === 0) && (
              <div className="bg-df-surface border border-df-border rounded-md p-8 text-center">
                <FileText className="w-8 h-8 text-df-text-muted mx-auto mb-2" />
                <p className="text-sm text-df-text-muted">No quotations yet.</p>
                <p className="text-xs text-df-text-muted mt-1">
                  Your sales representative will send you a quotation to review here.
                </p>
              </div>
            )}

            {quotations && quotations.length > 0 && (
              <div className="bg-df-surface border border-df-border rounded-md divide-y divide-df-border">
                {quotations.map((q: any) => (
                  <button
                    key={q.id}
                    onClick={() => setSelectedId(q.id)}
                    className="w-full px-5 py-4 flex items-center justify-between hover:bg-df-bg transition-colors text-left"
                  >
                    <div className="flex items-center gap-4">
                      <FileText className="w-4 h-4 text-df-nav shrink-0" />
                      <div>
                        <p className="text-sm font-medium text-df-text">{q.number}</p>
                        <p className="text-xs text-df-text-muted mt-0.5">
                          {q.lines?.length ?? 0} line{q.lines?.length !== 1 ? 's' : ''} · Updated {formatDate(q.updatedAt)}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="text-right">
                        <p className="text-sm font-mono font-medium text-df-text">{formatCurrency(q.total)}</p>
                        <StatusBadge status={q.status} />
                      </div>
                      <ChevronRight className="w-4 h-4 text-df-text-muted" />
                    </div>
                  </button>
                ))}
              </div>
            )}
          </>
        )}
      </main>
    </div>
  );
}
