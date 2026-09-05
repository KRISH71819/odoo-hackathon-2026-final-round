import React, { useState, useRef } from 'react';
import { useParams, Link } from 'react-router-dom';
import { StatusBadge, NoticeStrip, Spinner } from '../../components/ui';
import { formatCurrency, formatDate, formatPercent } from '../../lib/format';
import {
  usePortalQuotation,
  usePortalThread,
  useAddPortalComment,
  useSubmitCounterOffer,
  useConfirmQuotation,
  useRejectQuotation,
} from './usePortal';

export default function CustomerPortalPage() {
  const { token } = useParams<{ token: string }>();
  const tk = token ?? '';

  const { data: quoteData, isLoading: quoteLoading, error: quoteError } = usePortalQuotation(tk);
  const { data: threadData, refetch: refetchThread } = usePortalThread(tk);
  const addComment = useAddPortalComment(tk);
  const submitCounterOffer = useSubmitCounterOffer(tk);
  const confirmQuote = useConfirmQuotation(tk);
  const rejectQuote = useRejectQuotation(tk);

  const commentInputRef = useRef<HTMLTextAreaElement | null>(null);

  const [commentText, setCommentText] = useState('');
  const [targetLine, setTargetLine] = useState<any | null>(null);
  const [isChangeRequest, setIsChangeRequest] = useState(false);
  const [counterDiscountPct, setCounterDiscountPct] = useState('');
  const [counterMessage, setCounterMessage] = useState('');
  const [pageError, setPageError] = useState<string | null>(null);
  const [confirmSuccess, setConfirmSuccess] = useState(false);
  const [rejectSuccess, setRejectSuccess] = useState(false);
  const [showRejectForm, setShowRejectForm] = useState(false);
  const [rejectReason, setRejectReason] = useState('');

  const quote = quoteData?.data;
  const thread = threadData?.data;
  const comments = thread?.comments ?? [];

  const nonNegotiableStatuses = ['DRAFT', 'PENDING_MANAGER', 'PENDING_FINANCE', 'REVISION', 'APPROVED', 'CONFIRMED', 'BILLED', 'PAID', 'REJECTED'];
  const isReadOnly = quote && nonNegotiableStatuses.includes(quote.status);
  const isConfirmed = quote?.status === 'CONFIRMED' || quote?.status === 'BILLED' || quote?.status === 'PAID';
  const isRejected = quote?.status === 'REJECTED' || rejectSuccess;

  // Live calculation for proposed counter discount
  const proposedPct = parseFloat(counterDiscountPct);
  const isValidProposedPct = !isNaN(proposedPct) && proposedPct > 0 && proposedPct <= 100;
  const estDiscountCents = isValidProposedPct && quote ? Math.round((quote.subtotal || 0) * (proposedPct / 100)) : 0;
  const estTotalCents = isValidProposedPct && quote ? Math.max(0, (quote.subtotal || 0) - estDiscountCents + (quote.taxTotal || 0)) : 0;

  function handleAskLineQuestion(line: any) {
    setTargetLine(line);
    setIsChangeRequest(false);
    setCommentText(`[Line Item: ${line.productName}] `);
    setTimeout(() => {
      commentInputRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      commentInputRef.current?.focus();
    }, 50);
  }

  async function handleComment(e: React.FormEvent) {
    e.preventDefault();
    if (!commentText.trim()) return;
    setPageError(null);
    try {
      await addComment.mutateAsync({ message: commentText, isChangeRequest });
      setCommentText('');
      setTargetLine(null);
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

  async function handleReject() {
    setPageError(null);
    try {
      await rejectQuote.mutateAsync({ reason: rejectReason.trim() || undefined });
      setRejectSuccess(true);
      setShowRejectForm(false);
    } catch (err: any) {
      setPageError(err?.message ?? 'Failed to decline quotation');
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
          <div className="mt-4">
            <Link to="/my-portal" className="text-xs text-primary hover:underline">
              ← Return to My Portal
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-df-bg">
      {/* Minimal portal header */}
      <header className="bg-df-surface border-b border-df-border px-6 py-3">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link to="/my-portal" className="text-xs text-df-text-muted hover:text-df-text flex items-center gap-1 transition-colors">
              ← Back to My Portal
            </Link>
            <span className="text-xs text-neutral-600">|</span>
            <span className="text-sm font-semibold text-df-text">DealFlow360 · Customer Portal</span>
          </div>
          <div className="flex items-center gap-2">
            {quote.customer?.tier && (
              <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold bg-amber-500/10 text-amber-500 border border-amber-500/20">
                {quote.customer.tier} TIER
              </span>
            )}
            <StatusBadge status={quote.status} />
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-6 py-6 space-y-4">
        {pageError && <NoticeStrip variant="danger">{pageError}</NoticeStrip>}

        {confirmSuccess && (
          <NoticeStrip variant="info">
            ✓ Your quotation terms have been confirmed and accepted. Fulfillment and billing schedules have been initiated.
          </NoticeStrip>
        )}

        {/* Quote Summary */}
        {quote.status === 'DRAFT' && (
          <div className="bg-amber-500/10 border border-amber-500/30 rounded-lg p-4 text-xs text-amber-200 shadow-sm">
            <div className="font-semibold text-sm mb-1 flex items-center gap-2 text-amber-300">
              <span>⏳</span> Quote Request Received & Under Sales Review
            </div>
            <p className="text-neutral-300 leading-relaxed">
              Your requested items have reached sales representative <strong>{quote.salesRep?.name || 'our sales team'}</strong>. We are applying your <strong>{quote.customer?.tier || 'Bronze'}</strong> tier discount structure and preparing official pricing for you. You can ask questions or add notes in the inquiry box below.
            </p>
          </div>
        )}

        <div className="bg-df-surface border border-df-border rounded-md">
          <div className="px-5 py-4 border-b border-df-border flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-base font-semibold text-df-text">
                  Quotation {quote.number}
                </h1>
                {quote.customer?.tier && (
                  <span className="text-xs px-2 py-0.5 rounded font-medium bg-amber-500/10 text-amber-500 border border-amber-500/20">
                    {quote.customer.tier} Tier Pricing Applied
                  </span>
                )}
              </div>
              <p className="text-xs text-df-text-muted mt-0.5">
                {quote.title} · Customer: {quote.customer?.name}
              </p>
            </div>
            {quote.salesRep?.name && (
              <div className="text-xs text-df-text-muted">
                Sales Rep: <span className="text-df-text font-medium">{quote.salesRep.name}</span>
              </div>
            )}
          </div>
          <div className="p-5">
            {(!quote.lines || quote.lines.length === 0) ? (
              <div className="py-8 text-center bg-df-bg/50 rounded-lg border border-dashed border-df-border mb-4">
                <p className="text-sm font-medium text-df-text mb-1">Pricing Compilation In Progress</p>
                <p className="text-xs text-df-text-muted max-w-md mx-auto">
                  Your sales representative is actively reviewing your requirements and adding quoted line items. Line details, discounts, and final totals will appear here once returned by your representative.
                </p>
              </div>
            ) : (
              <table className="w-full text-xs mb-4">
                <thead>
                  <tr className="border-b border-df-border text-df-text-muted">
                    <th className="text-left py-2 pr-4 font-medium">Product / Line Item</th>
                    <th className="text-right py-2 pr-4 font-medium">Qty</th>
                    <th className="text-right py-2 pr-4 font-medium">Unit Price</th>
                    <th className="text-right py-2 pr-4 font-medium">Discount</th>
                    <th className="text-right py-2 pr-4 font-medium">Total</th>
                    {!isReadOnly && <th className="text-right py-2 font-medium">Line Inquiries</th>}
                  </tr>
                </thead>
                <tbody>
                  {(quote.lines ?? []).map((line: any) => (
                    <tr key={line.id} className="border-b border-df-border/50">
                      <td className="py-2.5 pr-4 text-df-text">
                        <div className="font-medium">{line.productName}</div>
                        {line.description && <div className="text-[11px] text-df-text-muted">{line.description}</div>}
                      </td>
                      <td className="py-2.5 pr-4 text-right text-df-text-muted">{line.quantity}</td>
                      <td className="py-2.5 pr-4 text-right font-mono">{formatCurrency(line.unitPrice)}</td>
                      <td className="py-2.5 pr-4 text-right text-df-text-muted">
                        {line.lineDiscount > 0 ? `${line.lineDiscount.toFixed(1)}%` : '—'}
                      </td>
                      <td className="py-2.5 pr-4 text-right font-mono font-medium">{formatCurrency(line.total)}</td>
                      {!isReadOnly && (
                        <td className="py-2.5 text-right">
                          <button
                            type="button"
                            onClick={() => handleAskLineQuestion(line)}
                            className="px-2 py-0.5 text-[11px] font-medium rounded border border-neutral-700 bg-neutral-900 text-neutral-300 hover:bg-neutral-800 transition-colors"
                          >
                            Ask Question
                          </button>
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            )}

            <div className="flex justify-end">
              <div className="text-xs space-y-1 w-56">
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
                <div className="flex justify-between border-t border-df-border pt-1 font-semibold text-df-text text-sm">
                  <span>Grand Total</span>
                  <span className="font-mono">{formatCurrency(quote.total)}</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Quotation Action & Decision Section */}
        {!isConfirmed && !isRejected && !isReadOnly && quote.lines && quote.lines.length > 0 && (
          <div className="bg-df-surface border-2 border-emerald-500/30 rounded-lg p-5 shadow-lg bg-emerald-950/10 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <div className="flex items-center gap-2">
                  <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
                  <h2 className="text-base font-bold text-df-text">Review & Respond to Quotation</h2>
                </div>
                <p className="text-xs text-df-text-muted mt-1">
                  Ready to proceed? Confirming authorizes DealFlow360 to immediately transition this quote into fulfillment and generate your billing schedule.
                </p>
                <div className="text-xs font-mono font-semibold text-emerald-300 mt-1">
                  Final Quoted Total: {formatCurrency(quote.total)}
                </div>
              </div>
              <div className="flex flex-wrap items-center gap-2 shrink-0">
                <button
                  type="button"
                  onClick={() => setShowRejectForm((prev) => !prev)}
                  className="px-4 py-2.5 text-xs font-semibold rounded-lg border border-red-500/30 bg-red-950/30 text-red-300 hover:bg-red-900/40 hover:border-red-500/50 transition-colors"
                >
                  {showRejectForm ? 'Cancel' : '✗ Decline Quotation'}
                </button>
                <button
                  disabled={confirmQuote.isPending}
                  onClick={handleConfirm}
                  className="px-5 py-2.5 text-sm font-bold bg-white text-black hover:bg-neutral-200 rounded-lg disabled:opacity-50 transition-all shadow-md hover:scale-[1.02] flex items-center justify-center gap-2"
                >
                  {confirmQuote.isPending ? 'Confirming...' : '✓ Confirm Final Terms (1-Click)'}
                </button>
              </div>
            </div>

            {showRejectForm && (
              <div className="pt-4 border-t border-red-500/20 bg-red-950/20 -mx-5 -mb-5 p-5 rounded-b-lg space-y-3">
                <div className="text-xs text-red-200 font-semibold flex items-center gap-1.5">
                  <span>⚠️</span> Please confirm you wish to decline this quotation
                </div>
                <div>
                  <label className="block text-[11px] text-neutral-300 mb-1">
                    Reason for declining (optional):
                  </label>
                  <textarea
                    className="w-full px-3 py-2 text-xs bg-df-bg border border-red-500/30 rounded text-df-text placeholder-neutral-500 focus:outline-none focus:border-red-400 resize-none"
                    rows={2}
                    placeholder="e.g. Budget constraints, selected alternative solution, terms not aligned..."
                    value={rejectReason}
                    onChange={(e) => setRejectReason(e.target.value)}
                  />
                </div>
                <div className="flex items-center justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setShowRejectForm(false)}
                    className="px-3 py-1.5 text-xs font-medium rounded border border-neutral-700 bg-neutral-900 text-neutral-300 hover:bg-neutral-800 transition-colors"
                  >
                    Keep Quote Open
                  </button>
                  <button
                    type="button"
                    disabled={rejectQuote.isPending}
                    onClick={handleReject}
                    className="px-4 py-1.5 text-xs font-bold rounded bg-red-600 hover:bg-red-500 text-white disabled:opacity-50 transition-colors shadow-sm"
                  >
                    {rejectQuote.isPending ? 'Declining…' : 'Confirm Decline Quotation'}
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {isConfirmed && (
          <NoticeStrip variant="info">
            ✓ This quotation has been confirmed (Status: {quote.status}). Thank you for partnering with DealFlow360!
          </NoticeStrip>
        )}

        {isRejected && (
          <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-4 text-xs text-red-300 shadow-sm">
            <div className="font-semibold text-sm mb-1 flex items-center gap-2 text-red-200">
              <span>✗</span> Quotation Declined / Rejected
            </div>
            <p className="text-neutral-300 leading-relaxed">
              This quotation has been declined. If you would like to reconsider or need adjusted items, pricing, or terms, please contact your sales representative.
            </p>
          </div>
        )}

        {/* Negotiation Thread & Line Inquiries */}
        {!isReadOnly && (
          <div className="bg-df-surface border border-df-border rounded-md">
            <div className="px-5 py-3 border-b border-df-border flex items-center justify-between">
              <h2 className="text-sm font-medium text-df-text">Questions & Change Requests</h2>
              <span className="text-[11px] text-df-text-muted">Communicate directly with your sales representative</span>
            </div>
            <div className="p-5">
              {comments.length === 0 ? (
                <p className="text-xs text-df-text-muted mb-4">No inquiries or notes yet. You can ask questions or request adjustments below.</p>
              ) : (
                <div className="space-y-3 mb-4 max-h-64 overflow-y-auto">
                  {comments.map((c: any) => {
                    const isAuthorCustomer = c.user?.role === 'CUSTOMER' || !c.user?.role;
                    return (
                      <div key={c.id} className="text-xs">
                        <div className="flex items-center gap-2 mb-1 flex-wrap">
                          <span className="font-medium text-df-text">{c.user?.name ?? 'Unknown'}</span>
                          <span className={`text-[10px] px-1.5 py-0.2 rounded font-semibold uppercase tracking-wider ${
                            isAuthorCustomer
                              ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                              : 'bg-accent/20 text-accent border border-accent/30'
                          }`}>
                            {isAuthorCustomer ? `Customer (${quote.customer?.tier || 'Bronze'})` : 'Sales Representative'}
                          </span>
                          {c.isChangeRequest && (
                            <span className="text-amber-300 border border-amber-700/50 bg-amber-950/40 rounded px-1.5 py-0.5 text-xs">
                              Change Request
                            </span>
                          )}
                          {c.proposedDiscount != null && (
                            <span className="text-emerald-300 border border-emerald-700/50 bg-emerald-950/40 rounded px-1.5 py-0.5 text-xs font-mono">
                              Counter: {(c.proposedDiscount * 100).toFixed(1)}% Off
                            </span>
                          )}
                          <span className="text-df-text-muted">{formatDate(c.createdAt)}</span>
                        </div>
                        <p className={`rounded px-3 py-2 whitespace-pre-line leading-relaxed ${
                          isAuthorCustomer ? 'text-df-text-muted bg-df-bg' : 'text-neutral-200 bg-neutral-900 border border-neutral-800'
                        }`}>
                          {c.message}
                        </p>
                      </div>
                    );
                  })}
                </div>
              )}

              {/* Quick Suggestion Chips */}
              <div className="flex flex-wrap items-center gap-2 mb-2 pt-1 border-t border-df-border/40">
                <span className="text-[11px] text-df-text-muted">Quick requests:</span>
                <button
                  type="button"
                  onClick={() => {
                    setIsChangeRequest(true);
                    setCommentText('Request change: Could we increase/decrease quantity on ');
                    commentInputRef.current?.focus();
                  }}
                  className="text-[11px] px-2 py-0.5 rounded border border-neutral-700 bg-neutral-900 hover:bg-neutral-800 text-neutral-300 transition-colors"
                >
                  + Adjust Quantity
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setIsChangeRequest(true);
                    setCommentText('Request change: Can you provide an alternative product option for ');
                    commentInputRef.current?.focus();
                  }}
                  className="text-[11px] px-2 py-0.5 rounded border border-neutral-700 bg-neutral-900 hover:bg-neutral-800 text-neutral-300 transition-colors"
                >
                  + Alternative Item
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setIsChangeRequest(true);
                    setCommentText('Request change: Expedited delivery schedule required.');
                    commentInputRef.current?.focus();
                  }}
                  className="text-[11px] px-2 py-0.5 rounded border border-neutral-700 bg-neutral-900 hover:bg-neutral-800 text-neutral-300 transition-colors"
                >
                  + Delivery Schedule
                </button>
              </div>

              {targetLine && (
                <div className="flex items-center justify-between bg-primary/10 border border-primary/20 rounded px-2.5 py-1 text-xs text-primary mb-2">
                  <span>Question on: <strong>{targetLine.productName}</strong></span>
                  <button
                    type="button"
                    onClick={() => {
                      setTargetLine(null);
                      setCommentText('');
                    }}
                    className="text-muted-foreground hover:text-foreground text-xs"
                  >
                    × Cancel tag
                  </button>
                </div>
              )}

              <form onSubmit={handleComment} className="space-y-2">
                <textarea
                  ref={commentInputRef}
                  className="w-full px-3 py-2 text-xs bg-df-bg border border-df-border rounded text-df-text resize-none focus:outline-none focus:border-df-nav"
                  rows={2}
                  placeholder="Ask a line-level question or describe requested changes..."
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
                    Flag as change request (notifies sales rep to revise quotation)
                  </label>
                  <button
                    type="submit"
                    disabled={addComment.isPending || !commentText.trim()}
                    className="px-3 py-1.5 text-xs font-medium bg-df-nav hover:bg-df-nav-hover text-white rounded disabled:opacity-50 transition-colors"
                  >
                    {addComment.isPending ? 'Sending…' : 'Send Inquiry'}
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
              <h2 className="text-sm font-medium text-df-text">Counter a Discount</h2>
            </div>
            <div className="p-5">
              <NoticeStrip variant="info" className="mb-4 text-xs">
                Propose an overall discount percentage. Your counter-offer will be sent directly to your sales representative.
              </NoticeStrip>
              <form onSubmit={handleCounterOffer} className="space-y-3">
                <div className="flex flex-wrap items-end gap-3">
                  <div>
                    <label className="block text-xs text-df-text-muted mb-1">
                      Proposed Order Discount (%)
                    </label>
                    <input
                      type="number"
                      min="0"
                      max="100"
                      step="0.5"
                      className="w-28 px-2 py-1.5 text-xs bg-df-bg border border-df-border rounded text-df-text focus:outline-none focus:border-df-nav"
                      placeholder="e.g. 8"
                      value={counterDiscountPct}
                      onChange={(e) => setCounterDiscountPct(e.target.value)}
                    />
                  </div>
                  <div className="flex-1 min-w-48">
                    <label className="block text-xs text-df-text-muted mb-1">Reason / Explanation (optional)</label>
                    <input
                      type="text"
                      className="w-full px-2 py-1.5 text-xs bg-df-bg border border-df-border rounded text-df-text focus:outline-none focus:border-df-nav"
                      placeholder="e.g. Volume commitment, annual pre-pay, competitive offer..."
                      value={counterMessage}
                      onChange={(e) => setCounterMessage(e.target.value)}
                    />
                  </div>
                  <button
                    type="submit"
                    disabled={submitCounterOffer.isPending || !counterDiscountPct}
                    className="px-4 py-1.5 text-xs font-medium bg-df-nav hover:bg-df-nav-hover text-white rounded disabled:opacity-50 transition-colors"
                  >
                    {submitCounterOffer.isPending ? 'Submitting…' : 'Submit Counter-Offer'}
                  </button>
                </div>

                {isValidProposedPct && (
                  <div className="text-xs text-neutral-300 bg-neutral-900 border border-neutral-800 rounded px-3 py-2 flex items-center gap-4">
                    <div>
                      Estimated New Total:{' '}
                      <span className="font-mono font-semibold text-white">{formatCurrency(estTotalCents)}</span>
                    </div>
                    <div className="text-emerald-400">
                      Savings: <span className="font-mono font-semibold">{formatCurrency(estDiscountCents)}</span>
                    </div>
                  </div>
                )}
              </form>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
