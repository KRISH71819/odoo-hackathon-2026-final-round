// Customer My Portal – logged-in customer dashboard
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../lib/auth.js';
import { api } from '../../lib/api.js';
import { useQuery } from '@tanstack/react-query';
import { Panel, StatusBadge, Spinner, PrimaryButton, SecondaryButton, formatCents } from '../../components/ui.js';

export default function MyPortalPage() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [requestItems, setRequestItems] = useState('');
  const [requestMessage, setRequestMessage] = useState('');
  const [requestSent, setRequestSent] = useState(false);

  const { data: quotesData, isLoading } = useQuery({
    queryKey: ['my-quotes'],
    queryFn: () => api.get<any>('/quotations?myQuotes=true'),
  });

  const quotes = (quotesData?.data || []).filter((q: any) =>
    ['SENT_TO_CUSTOMER', 'UNDER_NEGOTIATION', 'CONFIRMED', 'BILLED', 'PAID', 'APPROVED', 'FULFILLMENT_READY'].includes(q.status)
  );

  const handleLogout = () => { logout(); navigate('/login'); };

  return (
    <div className="min-h-screen bg-charcoal-950 p-4">
      <div className="max-w-4xl mx-auto space-y-6">
        <div className="flex items-center justify-between py-4">
          <div>
            <h1 className="text-xl font-bold text-charcoal-100">My Portal</h1>
            <p className="text-sm text-charcoal-400">Welcome, {user?.name}</p>
          </div>
          <SecondaryButton onClick={handleLogout}>Sign Out</SecondaryButton>
        </div>

        <Panel title="Request Quoted Items">
          <p className="text-sm text-charcoal-400 mb-3">Need specific products or a custom quote? Your sales representative will be in touch.</p>
          {requestSent ? (
            <div className="bg-success/10 border border-success/20 rounded-md px-4 py-3 text-sm text-success">
              Your request has been received. Your sales rep will be in touch shortly.
            </div>
          ) : (
            <div className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-charcoal-300 mb-1">Items Needed</label>
                <textarea
                  className="w-full bg-charcoal-800 border border-charcoal-700 rounded px-3 py-2 text-sm text-charcoal-100 placeholder-charcoal-500 resize-none focus:outline-none focus:border-charcoal-500"
                  rows={3}
                  placeholder="e.g. 10x Enterprise Server, 5x 3-Year Support Licenses..."
                  value={requestItems}
                  onChange={(e) => setRequestItems(e.target.value)}
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-charcoal-300 mb-1">Additional Notes</label>
                <textarea
                  className="w-full bg-charcoal-800 border border-charcoal-700 rounded px-3 py-2 text-sm text-charcoal-100 placeholder-charcoal-500 resize-none focus:outline-none focus:border-charcoal-500"
                  rows={2}
                  placeholder="Deadline, budget constraints, preferences..."
                  value={requestMessage}
                  onChange={(e) => setRequestMessage(e.target.value)}
                />
              </div>
              <PrimaryButton disabled={!requestItems.trim()} onClick={() => setRequestSent(true)}>Submit Request</PrimaryButton>
            </div>
          )}
        </Panel>

        <Panel title="Your Quotations">
          {isLoading ? (
            <Spinner />
          ) : quotes.length === 0 ? (
            <div className="text-center py-8 text-charcoal-500 text-sm">
              <p>No quotations available yet.</p>
              <p className="mt-1 text-xs">Your sales representative will share a secure quote link when ready.</p>
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
                  </tr>
                </thead>
                <tbody>
                  {quotes.map((q: any) => (
                    <tr key={q.id}>
                      <td className="font-mono text-accent font-semibold">{q.number || 'N/A'}</td>
                      <td className="font-medium">{q.title}</td>
                      <td><StatusBadge status={q.status} /></td>
                      <td className="text-right font-mono">{formatCents(q.total ?? q.grandTotal)}</td>
                      <td className="text-xs text-charcoal-400">{new Date(q.updatedAt).toLocaleDateString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Panel>

        <p className="text-center text-xs text-charcoal-600">To review and accept a quote, use the secure link sent by your sales representative.</p>
      </div>
    </div>
  );
}
