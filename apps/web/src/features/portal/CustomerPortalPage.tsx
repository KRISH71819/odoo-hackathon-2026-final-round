// ── Customer Portal Page ──────────────────────────────────────
// Standalone page — no internal navigation, no JWT.
// Accessed via /portal/:token URL sent to the customer.

import React, { useState } from 'react';
import { useParams } from 'react-router-dom';
import { StatusBadge, NoticeStrip, Spinner } from '../../components/ui';
import { formatCurrency, formatDate, formatPercent } from '../../lib/format';
import {
  usePortalQuotation,
  usePortalThread,
  useAddPortalComment,
  useSubmitCounterOffer,
  useConfirmQuotation,
} from './usePortal';

export default function CustomerPortalPage() {
  const { token } = useParams<{ token: string }>();
  const tk = token ?? '';

  const { data: quoteData, isLoading: quoteLoading, error: quoteError } = usePortalQuotation(tk);
  const { data: threadData, refetch: refetchThread } = usePortalThread(tk);
  const addComment = useAddPortalComment(tk);
  const submitCounterOffer = useSubmitCounterOffer(tk);
  const confirmQuote = useConfirmQuotation(tk);

  const [commentText, setCommentText] = useState('');
  const [isChangeRequest, setIsChangeRequest] = useState(false);
  const [counterDiscountPct, setCounterDiscountPct] = useState('');
  const [counterMessage, setCounterMessage] = useState('');
  const [pageError, setPageError] = useState<string | null>(null);
  const [confirmSuccess, setConfirmSuccess] = useState(false);

  const quote = quoteData?.data;
  const thread = threadData?.data;
  const comments = thread?.comments ?? [];

  const nonNegotiableStatuses = ['CONFIRMED', 'BILLED', 'PAID', 'REJECTED'];
  const isReadOnly = quote && nonNegotiableStatuses.includes(quote.status);
  const isConfirmed = quote?.status === 'CONFIRMED' || quote?.status === 'BILLED' || quote?.status === 'PAID';

  async function handleComment(e: React.FormEvent) {
    e.preventDefault();
    if (!commentText.trim()) return;
    setPageError(null);
    try {
      await addComment.mutateAsync({ message: commentText, isChangeRequest });
      setCommentText('');
      setIsChangeRequest(false);
      refetchThread();
    } catch (err: any) {
      setPageError(err?.message ?? 'Failed to add comment');
    }
  }

  async function handleCounterOffer(e: React.FormEvent) {
    e.preventDefault();
    const pct = parseFloat(counterDiscountPct);
    if (isNaN(pct) || pct < 0 || pct > 100) {
      setPageError('Enter a valid discount percentage (0–100)');
      return;
    }
    setPageError(null);
    try {
      await submitCounterOffer.mutateAsync({
        proposedOrderDiscountBps: Math.round(pct * 100),
        message: counterMessage || undefined,
      });
      setCounterDiscountPct('');
      setCounterMessage('');
    } catch (err: any) {
      setPageError(err?.message ?? 'Counter-offer failed');
    }
  }

  async function handleConfirm() {
    setPageError(null);
    try {
      await confirmQuote.mutateAsync();
      setConfirmSuccess(true);
    } catch (err: any) {
      setPageError(err?.message ?? 'Confirmation failed');
    }
  }

  if (quoteLoading) {
    return (
      <div className="min-h-screen bg-df-bg flex items-center justify-center">
        <Spinner />
      </div>
    );
  }

  if (quoteError || !quote) {
    return (
      <div className="min-h-screen bg-df-bg flex items-center justify-center">
        <div className="max-w-md text-center">
          <h1 className="text-xl font-semibold text-df-text mb-2">Access Denied</h1>
          <p className="text-sm text-df-text-muted">
            This portal link is invalid or has expired. Please contact your sales representative.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-df-bg">
      {/* Minimal portal header — no internal nav */}
      <header className="bg-df-surface border-b border-df-border px-6 py-3">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <span className="text-sm font-semibold text-df-text">DealFlow360 · Customer Portal</span>
          <StatusBadge status={quote.status} />
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-6 py-6 space-y-4">
        {pageError && <NoticeStrip variant="danger">{pageError}</NoticeStrip>}

        {confirmSuccess && (
          <NoticeStrip variant="info">
            ✓ Your quotation has been confirmed. Our team will be in touch shortly.
          </NoticeStrip>
        )}

        {/* Quote Summary */}
        <div className="bg-df-surface border border-df-border rounded-md">
          <div className="px-5 py-4 border-b border-df-border">
            <h1 className="text-base font-semibold text-df-text">
              Quotation {quote.number}
            </h1>
            <p className="text-xs text-df-text-muted mt-0.5">
              Valid until — please review and respond
            </p>
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
                  <div className="flex justify-between text-muted-foreground">
                    <span>Order discount ({quote.orderDiscount.toFixed(1)}%)</span>
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

        {/* Negotiation Thread */}
        {!isReadOnly && (
          <div className="bg-df-surface border border-df-border rounded-md">
            <div className="px-5 py-3 border-b border-df-border">
              <h2 className="text-sm font-medium text-df-text">Discussion</h2>
            </div>
            <div className="p-5">
              {comments.length === 0 ? (
                <p className="text-xs text-df-text-muted mb-4">No messages yet.</p>
              ) : (
                <div className="space-y-3 mb-4 max-h-64 overflow-y-auto">
                  {comments.map((c: any) => (
                    <div key={c.id} className="text-xs">
                      <div className="flex items-center gap-2 mb-0.5">
                        <span className="font-medium text-df-text">{c.user?.name ?? 'Unknown'}</span>
                        {c.isChangeRequest && (
                          <span className="text-neutral-200 border border-neutral-700 bg-neutral-900 rounded px-1.5 py-0.5 text-xs">
                            Change Request
                          </span>
                        )}
                        <span className="text-df-text-muted">{formatDate(c.createdAt)}</span>
                      </div>
                      <p className="text-df-text-muted bg-df-bg rounded px-3 py-2">{c.message}</p>
                    </div>
                  ))}
                </div>
              )}

              <form onSubmit={handleComment} className="space-y-2">
                <textarea
                  className="w-full px-3 py-2 text-xs bg-df-bg border border-df-border rounded text-df-text resize-none focus:outline-none focus:border-df-nav"
                  rows={2}
                  placeholder="Ask a question or request a change…"
                  value={commentText}
                  onChange={(e) => setCommentText(e.target.value)}
                />
                <div className="flex items-center justify-between">
                  <label className="flex items-center gap-1.5 text-xs text-df-text-muted cursor-pointer">
                    <input
                      type="checkbox"
                      className="accent-df-nav"
                      checked={isChangeRequest}
                      onChange={(e) => setIsChangeRequest(e.target.checked)}
                    />
                    Flag as change request
                  </label>
                  <button
                    type="submit"
                    disabled={addComment.isPending || !commentText.trim()}
                    className="px-3 py-1.5 text-xs font-medium bg-df-nav hover:bg-df-nav-hover text-white rounded disabled:opacity-50 transition-colors"
                  >
                    {addComment.isPending ? 'Sending…' : 'Send'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Counter Offer */}
        {!isReadOnly && (
          <div className="bg-df-surface border border-df-border rounded-md">
            <div className="px-5 py-3 border-b border-df-border">
              <h2 className="text-sm font-medium text-df-text">Propose a Counter Discount</h2>
            </div>
            <div className="p-5">
              <NoticeStrip variant="info" className="mb-4 text-xs">
                Entering a discount that exceeds policy limits will automatically re-enter the
                approval process.
              </NoticeStrip>
              <form onSubmit={handleCounterOffer} className="flex flex-wrap items-end gap-3">
                <div>
                  <label className="block text-xs text-df-text-muted mb-1">
                    Order Discount (%)
                  </label>
                  <input
                    type="number"
                    min="0"
                    max="100"
                    step="0.1"
                    className="w-28 px-2 py-1.5 text-xs bg-df-bg border border-df-border rounded text-df-text focus:outline-none focus:border-df-nav"
                    placeholder="e.g. 5"
                    value={counterDiscountPct}
                    onChange={(e) => setCounterDiscountPct(e.target.value)}
                  />
                </div>
                <div className="flex-1 min-w-48">
                  <label className="block text-xs text-df-text-muted mb-1">Message (optional)</label>
                  <input
                    type="text"
                    className="w-full px-2 py-1.5 text-xs bg-df-bg border border-df-border rounded text-df-text focus:outline-none focus:border-df-nav"
                    placeholder="Reason for counter-offer…"
                    value={counterMessage}
                    onChange={(e) => setCounterMessage(e.target.value)}
                  />
                </div>
                <button
                  type="submit"
                  disabled={submitCounterOffer.isPending || !counterDiscountPct}
                  className="px-3 py-1.5 text-xs font-medium bg-df-nav hover:bg-df-nav-hover text-white rounded disabled:opacity-50 transition-colors"
                >
                  {submitCounterOffer.isPending ? 'Submitting…' : 'Submit Counter-Offer'}
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
                <h2 className="text-sm font-medium text-df-text mb-1">Confirm This Quotation</h2>
                <p className="text-xs text-df-text-muted">
                  By confirming, you accept the terms above and authorize DealFlow360 to proceed
                  with fulfillment and billing.
                </p>
              </div>
              <button
                disabled={confirmQuote.isPending}
                onClick={handleConfirm}
                className="shrink-0 px-4 py-2 text-xs font-semibold bg-white text-black hover:bg-neutral-200 rounded disabled:opacity-50 transition-colors shadow"
              >
                {confirmQuote.isPending ? 'Confirming…' : 'Confirm Order'}
              </button>
            </div>
          </div>
        )}

        {isConfirmed && (
          <NoticeStrip variant="info">
            ✓ This quotation has been confirmed (Status: {quote.status}). Thank you!
          </NoticeStrip>
        )}
      </main>
    </div>
  );
}
