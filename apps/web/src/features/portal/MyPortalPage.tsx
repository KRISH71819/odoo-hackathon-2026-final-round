import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../lib/auth.js';
import { api } from '../../lib/api.js';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Panel, StatusBadge, Spinner, PrimaryButton, SecondaryButton, formatCents } from '../../components/ui.js';

export default function MyPortalPage() {
  const { user, isAuthenticated, isLoading: authLoading, logout } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const [requestItems, setRequestItems] = useState('');
  const [requestMessage, setRequestMessage] = useState('');
  const [requestSent, setRequestSent] = useState(false);
  const [requestNumber, setRequestNumber] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      navigate('/login', { replace: true });
    }
  }, [authLoading, isAuthenticated, navigate]);

  const { data: quotesData, isLoading } = useQuery({
    queryKey: ['my-quotes'],
    queryFn: () => api.get<any>('/quotations?myQuotes=true'),
    enabled: isAuthenticated,
  });

  const quotes = quotesData?.data || [];

  const handleLogout = () => { logout(); navigate('/login'); };

  const handleSubmitRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!requestItems.trim()) return;
    setIsSubmitting(true);
    setSubmitError(null);
    try {
      const res = await api.post<any>('/portal/quote-request', {
        items: requestItems.trim(),
        notes: requestMessage.trim() || undefined,
      });
      setRequestSent(true);
      setRequestNumber(res.data?.number || 'Draft');
      setRequestItems('');
      setRequestMessage('');
      queryClient.invalidateQueries({ queryKey: ['my-quotes'] });
    } catch (err: any) {
      setSubmitError(err?.message || 'Failed to send quote request');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleOpenQuote = async (quote: any) => {
    try {
      if (quote.portalToken) {
        navigate(`/portal/${quote.portalToken}`);
        return;
      }
      const res = await api.get<any>(`/portal/token/${quote.id}`);
      if (res.data?.token) {
        navigate(`/portal/${res.data.token}`);
      }
    } catch (err: any) {
      alert(err?.message || 'Unable to open quotation portal');
    }
  };

  return (
    <div className="min-h-screen bg-charcoal-950 p-4">
      <div className="max-w-4xl mx-auto space-y-6">
        <div className="flex items-center justify-between py-4">
          <div>
            <h1 className="text-xl font-bold text-charcoal-100">Customer Portal</h1>
            <div className="flex items-center gap-2 mt-0.5">
              <p className="text-sm text-charcoal-400">Welcome, {user?.name}</p>
              <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold bg-amber-500/10 text-amber-500 border border-amber-500/20">
                {user?.tier || 'BRONZE'} TIER
              </span>
            </div>
          </div>
          <SecondaryButton onClick={handleLogout}>Sign Out</SecondaryButton>
        </div>

        <Panel title="Request Quoted Items">
          <p className="text-sm text-charcoal-400 mb-3">
            Submit your product and service requirements directly to your assigned sales representative.
            Pricing will be tailored according to your <span className="text-amber-400 font-semibold">{user?.tier || 'BRONZE'}</span> tier benefits.
          </p>

          {submitError && (
            <div className="bg-red-500/10 border border-red-500/20 rounded-md px-4 py-3 text-sm text-red-400 mb-3">
              {submitError}
            </div>
          )}

          {requestSent ? (
            <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-md px-4 py-4 text-sm text-emerald-300 space-y-2">
              <div className="font-semibold text-emerald-200 flex items-center gap-2">
                <span>✓</span> Quote Request Submitted ({requestNumber})
              </div>
              <p className="text-xs text-emerald-400/90">
                Your requirement list has reached your sales representative along with your account tier (<span className="font-semibold">{user?.tier || 'BRONZE'}</span>) and contact details.
                You will find it below in your Quotations list once prepared.
              </p>
              <div className="pt-2">
                <button
                  type="button"
                  onClick={() => setRequestSent(false)}
                  className="text-xs text-emerald-300 underline hover:text-emerald-200"
                >
                  + Submit another item request
                </button>
              </div>
            </div>
          ) : (
            <form onSubmit={handleSubmitRequest} className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-charcoal-300 mb-1">
                  Items Needed & Quantities <span className="text-red-400">*</span>
                </label>
                <textarea
                  className="w-full bg-charcoal-800 border border-charcoal-700 rounded px-3 py-2 text-sm text-charcoal-100 placeholder-charcoal-500 resize-none focus:outline-none focus:border-charcoal-500"
                  rows={3}
                  required
                  placeholder="e.g. 10x Enterprise Server, 5x 3-Year Support Licenses..."
                  value={requestItems}
                  onChange={(e) => setRequestItems(e.target.value)}
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-charcoal-300 mb-1">Additional Requirements / Notes</label>
                <textarea
                  className="w-full bg-charcoal-800 border border-charcoal-700 rounded px-3 py-2 text-sm text-charcoal-100 placeholder-charcoal-500 resize-none focus:outline-none focus:border-charcoal-500"
                  rows={2}
                  placeholder="Delivery timeline, budget expectations, configuration options..."
                  value={requestMessage}
                  onChange={(e) => setRequestMessage(e.target.value)}
                />
              </div>
              <PrimaryButton disabled={!requestItems.trim() || isSubmitting}>
                {isSubmitting ? 'Submitting Request...' : 'Send to Sales Representative'}
              </PrimaryButton>
            </form>
          )}
        </Panel>

        <Panel title="Your Quotations">
          {isLoading ? (
            <Spinner />
          ) : quotes.length === 0 ? (
            <div className="text-center py-8 text-charcoal-500 text-sm">
              <p>No quotations available yet.</p>
              <p className="mt-1 text-xs">Submit an item request above to receive a formal quotation from your sales representative.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Quote #</th>
                    <th>Description</th>
                    <th>Status</th>
                    <th className="text-right">Total</th>
                    <th>Updated</th>
                    <th className="text-right">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {quotes.map((q: any) => {
                    const lineCount = q._count?.lines ?? q.lines?.length ?? 0;
                    const hasLines = lineCount > 0;
                    const canReview = ['SENT_TO_CUSTOMER', 'UNDER_NEGOTIATION', 'APPROVED', 'FULFILLMENT_READY'].includes(q.status) || (q.status === 'DRAFT' && hasLines);
                    const isConfirmed = ['CONFIRMED', 'BILLED', 'PAID'].includes(q.status);
                    const isRejected = q.status === 'REJECTED';
                    const isPendingInternal = ['PENDING_MANAGER', 'PENDING_FINANCE', 'REVISION'].includes(q.status) || (q.status === 'DRAFT' && !hasLines);

                    return (
                      <tr key={q.id}>
                        <td className="font-mono text-accent font-semibold">{q.number || 'N/A'}</td>
                        <td className="font-medium text-charcoal-100">{q.title}</td>
                        <td><StatusBadge status={q.status} /></td>
                        <td className="text-right font-mono text-charcoal-100">{formatCents(q.total ?? q.grandTotal ?? 0)}</td>
                        <td className="text-xs text-charcoal-400">{new Date(q.updatedAt).toLocaleDateString()}</td>
                        <td className="text-right">
                          {canReview ? (
                            <button
                              type="button"
                              onClick={() => handleOpenQuote(q)}
                              className="px-3 py-1.5 text-xs font-bold rounded bg-white text-black hover:bg-neutral-200 transition-all shadow-sm hover:scale-[1.02]"
                            >
                              Review & Respond →
                            </button>
                          ) : isConfirmed ? (
                            <button
                              type="button"
                              onClick={() => handleOpenQuote(q)}
                              className="px-2.5 py-1 text-xs font-medium rounded border border-neutral-700 bg-neutral-900 text-neutral-300 hover:bg-neutral-800 transition-colors"
                            >
                              View Confirmed Terms
                            </button>
                          ) : isRejected ? (
                            <button
                              type="button"
                              onClick={() => handleOpenQuote(q)}
                              className="px-2.5 py-1 text-xs font-medium rounded border border-red-500/30 bg-red-950/20 text-red-300 hover:bg-red-900/30 transition-colors"
                            >
                              View Declined
                            </button>
                          ) : isPendingInternal ? (
                            <button
                              type="button"
                              onClick={() => handleOpenQuote(q)}
                              className="px-2.5 py-1 text-xs font-medium rounded border border-amber-500/30 bg-amber-950/20 text-amber-300 hover:bg-amber-900/30 transition-colors"
                            >
                              In Preparation (View)
                            </button>
                          ) : (
                            <button
                              type="button"
                              onClick={() => handleOpenQuote(q)}
                              className="px-2.5 py-1 text-xs font-medium rounded border border-neutral-700 bg-neutral-900 text-neutral-300 hover:bg-neutral-800 transition-colors"
                            >
                              View Details
                            </button>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </Panel>

        <p className="text-center text-xs text-charcoal-600">
          Quotes sent by your representative allow full online review, line-level inquiries, counter-proposals, and one-click term acceptance.
        </p>
      </div>
    </div>
  );
}
