// ── Invoice Detail Page (Phase 4) ──
import React, { useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { PageHeader, Panel, StatusBadge, PrimaryButton, SuccessButton, Input, Spinner, NoticeStrip } from '../../components/ui.js';
import { formatCurrency, formatDate, formatDateTime } from '../../lib/format.js';
import { useInvoice, useRecordPayment } from './useInvoices.js';
import { useAuth } from '../../lib/auth.js';

export default function InvoiceDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { data, isLoading } = useInvoice(id!);
  const recordPayment = useRecordPayment();
  const { user } = useAuth();
  const [payAmount, setPayAmount] = useState('');
  const [payRef, setPayRef] = useState('');

  if (isLoading) return <Spinner />;
  const invoice = data?.data;
  if (!invoice) return <NoticeStrip variant="danger">Invoice not found</NoticeStrip>;

  const canPay = ['FINANCE_OPS', 'ADMIN'].includes(user?.role ?? '') && invoice.status !== 'PAID' && invoice.status !== 'CANCELLED';
  const totalPaid = (invoice.payments ?? []).reduce((s: number, p: any) => s + p.amount, 0);

  const handlePay = () => {
    const amt = Math.round(Number(payAmount) * 100); // dollars → cents
    if (amt <= 0) return;
    recordPayment.mutate({ invoiceId: id!, amount: amt, reference: payRef });
    setPayAmount('');
    setPayRef('');
  };

  return (
    <div>
      <PageHeader title={`Invoice ${invoice.number}`} subtitle={`Status: ${invoice.status}`}>
        <Link to="/invoices"><PrimaryButton>← Back</PrimaryButton></Link>
      </PageHeader>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Invoice Info */}
        <Panel title="Invoice Details" className="lg:col-span-2">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-xs">
            <div>
              <span className="text-df-text-muted">Status</span>
              <div className="mt-1"><StatusBadge status={invoice.status} /></div>
            </div>
            <div>
              <span className="text-df-text-muted">Total</span>
              <div className="mt-1 font-semibold text-df-text">{formatCurrency(invoice.total)}</div>
            </div>
            <div>
              <span className="text-df-text-muted">Paid</span>
              <div className="mt-1 font-semibold text-df-text">{formatCurrency(totalPaid)}</div>
            </div>
            <div>
              <span className="text-df-text-muted">Due Date</span>
              <div className="mt-1 text-df-text">{invoice.dueDate ? formatDate(invoice.dueDate) : '—'}</div>
            </div>
          </div>

          {/* Linked Quotation */}
          {invoice.quotation && (
            <div className="mt-4 pt-3 border-t border-df-border">
              <span className="text-xs text-df-text-muted">Quotation: </span>
              <Link to={`/quotations/${invoice.quotation.id}`} className="text-xs text-df-nav hover:underline">
                {invoice.quotation.number} — {invoice.quotation.customer?.name}
              </Link>
            </div>
          )}

          {/* Line Items */}
          {invoice.quotation?.lines?.length > 0 && (
            <div className="mt-4 pt-3 border-t border-df-border">
              <h3 className="text-xs font-medium text-df-text-muted mb-2">Line Items</h3>
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-df-border text-left text-df-text-muted">
                    <th className="pb-1 pr-3">Product</th>
                    <th className="pb-1 pr-3">Qty</th>
                    <th className="pb-1 pr-3">Price</th>
                    <th className="pb-1">Total</th>
                  </tr>
                </thead>
                <tbody className="text-df-text">
                  {invoice.quotation.lines.map((l: any) => (
                    <tr key={l.id} className="border-b border-df-border/30">
                      <td className="py-1 pr-3">{l.productName}</td>
                      <td className="py-1 pr-3">{l.quantity}</td>
                      <td className="py-1 pr-3">{formatCurrency(l.unitPrice)}</td>
                      <td className="py-1">{formatCurrency(l.total)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Panel>

        {/* Payment Panel */}
        <div className="space-y-4">
          {canPay && (
            <Panel title="Record Payment">
              <div className="space-y-3">
                <Input
                  label="Amount ($)"
                  type="number"
                  min="0.01"
                  step="0.01"
                  value={payAmount}
                  onChange={(e) => setPayAmount(e.target.value)}
                  placeholder={`Remaining: ${((invoice.total - totalPaid) / 100).toFixed(2)}`}
                />
                <Input
                  label="Reference"
                  value={payRef}
                  onChange={(e) => setPayRef(e.target.value)}
                  placeholder="e.g. Wire transfer #123"
                />
                <SuccessButton
                  onClick={handlePay}
                  disabled={recordPayment.isPending || !payAmount}
                  className="w-full"
                >
                  {recordPayment.isPending ? 'Processing...' : 'Record Payment'}
                </SuccessButton>
              </div>
            </Panel>
          )}

          {/* Payment History */}
          <Panel title="Payment History">
            {(invoice.payments ?? []).length === 0 ? (
              <p className="text-xs text-df-text-muted">No payments recorded</p>
            ) : (
              <div className="space-y-2">
                {invoice.payments.map((p: any) => (
                  <div key={p.id} className="flex items-center justify-between py-1 border-b border-df-border/30 text-xs">
                    <div>
                      <span className="text-df-text">{formatCurrency(p.amount)}</span>
                      <span className="text-df-text-muted ml-2">{p.method}</span>
                    </div>
                    <span className="text-df-text-muted">{formatDateTime(p.paidAt)}</span>
                  </div>
                ))}
              </div>
            )}
          </Panel>

          {/* Credit Notes */}
          {(invoice.creditNotes ?? []).length > 0 && (
            <Panel title="Credit Notes">
              <div className="space-y-2">
                {invoice.creditNotes.map((cn: any) => (
                  <div key={cn.id} className="flex items-center justify-between py-1 border-b border-df-border/30 text-xs">
                    <div>
                      <span className="text-df-danger">{formatCurrency(cn.amount)}</span>
                      <span className="text-df-text-muted ml-2">{cn.reason}</span>
                    </div>
                    <span className="text-df-text-muted">{formatDate(cn.createdAt)}</span>
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
