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
import { useAuth } from '../../lib/auth';
import { useApprovalAction } from '../approval/useApprovals';
import { UserRole } from '@dealflow360/contracts';


function formatAuditEntry(entry: any): { rolePersonText?: string; messageText: string } {
  let details: any = null;
  if (entry.details) {
    try {
      details = typeof entry.details === 'string' ? JSON.parse(entry.details) : entry.details;
    } catch {
      details = null;
    }
  }

  let rolePerson = '';
  if (details?.role) {
    rolePerson = String(details.role).replace(/_/g, ' ');
  } else if (entry.user?.role) {
    rolePerson = String(entry.user.role).replace(/_/g, ' ');
  }

  const action = (entry.action || '').replace('QUOTATION_', '');

  if (action === 'RETURNED' || entry.action === 'QUOTATION_RETURNED') {
    const reason = details?.reason || entry.reason || 'Returned for revision';
    const stepStr = details?.step ? ` (Step ${details.step})` : '';
    return {
      rolePersonText: rolePerson ? `${rolePerson}${stepStr}` : undefined,
      messageText: `Returned for revision: "${reason}"`,
    };
  }

  if (action === 'REJECTED' || entry.action === 'QUOTATION_REJECTED') {
    const reason = details?.reason || entry.reason || 'Quotation rejected';
    return {
      rolePersonText: rolePerson || undefined,
      messageText: `Rejected: "${reason}"`,
    };
  }

  if (action === 'APPROVED' || entry.action === 'QUOTATION_APPROVED') {
    const stepStr = details?.step ? `Step ${details.step}` : 'Quotation';
    return {
      rolePersonText: rolePerson || undefined,
      messageText: `Approved ${stepStr}`,
    };
  }

  if (action === 'SUBMITTED' || entry.action === 'QUOTATION_SUBMITTED') {
    const risk = details?.riskLevel ? `Risk: ${details.riskLevel}` : '';
    const scorePct = details?.riskScore != null ? ` (${(details.riskScore / 100).toFixed(1)}%)` : '';
    const approvers = details?.requiredApprovers?.length
      ? ` • Required approvers: ${details.requiredApprovers.map((r: string) => r.replace(/_/g, ' ')).join(', ')}`
      : '';
    return {
      rolePersonText: rolePerson || undefined,
      messageText: `Submitted for review • ${risk}${scorePct}${approvers}`,
    };
  }

  if (action === 'UPDATED' || entry.action === 'QUOTATION_UPDATED') {
    if (details?.orderDiscountBps != null) {
      return {
        rolePersonText: rolePerson || undefined,
        messageText: `Order discount changed to ${(details.orderDiscountBps / 100).toFixed(1)}%`,
      };
    }
    if (details?.total != null) {
      return {
        rolePersonText: rolePerson || undefined,
        messageText: `Total updated to $${(details.total / 100).toFixed(2)}`,
      };
    }
    return {
      rolePersonText: rolePerson || undefined,
      messageText: 'Quotation updated',
    };
  }

  if (entry.action === 'LINE_ADDED') {
    return {
      rolePersonText: rolePerson || undefined,
      messageText: `Added product ${details?.productName || ''} (${details?.quantity || 1}x)`,
    };
  }

  if (entry.action === 'LINE_UPDATED') {
    if (details?.lineDiscountBps != null) {
      return {
        rolePersonText: rolePerson || undefined,
        messageText: `${details?.productName || 'Line item'} discount set to ${(details.lineDiscountBps / 100).toFixed(1)}%`,
      };
    }
    return {
      rolePersonText: rolePerson || undefined,
      messageText: `Updated ${details?.productName || 'line item'}`,
    };
  }

  if (entry.action === 'LINE_REMOVED') {
    return {
      rolePersonText: rolePerson || undefined,
      messageText: `Removed line item ${details?.productName || ''}`,
    };
  }

  if (entry.action === 'NEGOTIATION_COMMENT_ADDED') {
    return {
      rolePersonText: rolePerson || undefined,
      messageText: details?.isChangeRequest ? 'Submitted negotiation change request' : 'Added negotiation message',
    };
  }

  if (action === 'CONFIRMED' || entry.action === 'QUOTATION_CONFIRMED') {
    return {
      rolePersonText: rolePerson || undefined,
      messageText: 'Customer confirmed quotation terms',
    };
  }

  if (entry.reason) {
    return { rolePersonText: rolePerson || undefined, messageText: entry.reason };
  }

  if (details && typeof details === 'object') {
    const cleaned = Object.entries(details)
      .filter(([_, v]) => v != null && v !== '')
      .map(([k, v]) => {
        if (k.toLowerCase().includes('discountbps') || k.toLowerCase().includes('riskscore')) {
          return `${k.replace(/bps/i, ' %')}: ${(Number(v) / 100).toFixed(1)}%`;
        }
        return `${k}: ${typeof v === 'object' ? JSON.stringify(v) : v}`;
      })
      .join(' • ');
    return { rolePersonText: rolePerson || undefined, messageText: cleaned || action };
  }

  return { rolePersonText: rolePerson || undefined, messageText: entry.details || action };
}

export default function QuotationBuilderPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const approvalAction = useApprovalAction();
  const { data: quoteData, isLoading } = useQuotation(id!);
  const isAssignedSalesRep = user?.role === UserRole.SALES_REP && quoteData?.data?.salesRepId === user?.id;
  const isSalesRep = isAssignedSalesRep || user?.role === UserRole.ADMIN;
  const canOperateFulfillment = user?.role === UserRole.FINANCE_OPS || user?.role === UserRole.ADMIN;
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
  const [approvalReason, setApprovalReason] = useState('');
  const [governanceLoading, setGovernanceLoading] = useState(false);
  const [staffReplyText, setStaffReplyText] = useState('');
  const [isSendingReply, setIsSendingReply] = useState(false);
  const [portalNotice, setPortalNotice] = useState<string | null>(null);
  const [copiedPortalLink, setCopiedPortalLink] = useState(false);
  const [isSendingPortal, setIsSendingPortal] = useState(false);

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

  const handleSendToCustomer = async () => {
    setIsSendingPortal(true);
    try {
      const res = await api.post<any>(`/portal/token/${quote.id}`);
      const token = res.data?.token;
      await queryClient.invalidateQueries({ queryKey: ['quotation', id] });
      await queryClient.invalidateQueries({ queryKey: ['quotations'] });
      if (token) {
        const portalUrl = `${window.location.origin}/portal/${token}`;
        setPortalNotice(`Quotation sent to customer! Secure portal link: ${portalUrl}`);
      }
    } catch (e: any) {
      alert('Could not send quotation: ' + (e?.message || 'Error'));
    } finally {
      setIsSendingPortal(false);
    }
  };

  const handleCopyPortalLink = async () => {
    try {
      let token: string | null = null;
      try {
        const res = await api.get<any>(`/portal/token/${quote.id}`);
        token = res.data?.token;
      } catch {
        const res = await api.post<any>(`/portal/token/${quote.id}`);
        token = res.data?.token;
      }
      if (token) {
        const portalUrl = `${window.location.origin}/portal/${token}`;
        await navigator.clipboard.writeText(portalUrl);
        setCopiedPortalLink(true);
        setTimeout(() => setCopiedPortalLink(false), 3000);
      }
    } catch (e: any) {
      alert('Could not copy portal link: ' + (e?.message || 'Error'));
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

  // Active approval request matching current quote stage and user role
  const activeApproval = quote.approvalRequests?.find((ar: any) => {
    if (ar.status !== 'PENDING') return false;
    if (quote.status === 'PENDING_MANAGER' && (ar.role === 'SALES_MANAGER' || ar.role === 'MANAGER')) return true;
    if (quote.status === 'PENDING_FINANCE' && (ar.role === 'FINANCE' || ar.role === 'FINANCE_OPS')) return true;
    return false;
  });

  const canApprove = Boolean(
    activeApproval && (
      user?.role === UserRole.ADMIN ||
      (quote.status === 'PENDING_MANAGER' && user?.role === UserRole.SALES_MANAGER) ||
      (quote.status === 'PENDING_FINANCE' && user?.role === UserRole.FINANCE_OPS)
    )
  );

  const handleGovernanceAction = async (actionType: 'APPROVE' | 'REJECT' | 'RETURN_FOR_REVISION') => {
    if (!activeApproval?.id) return;
    if ((actionType === 'REJECT' || actionType === 'RETURN_FOR_REVISION') && !approvalReason.trim()) {
      alert(`A reason is required to ${actionType === 'REJECT' ? 'reject' : 'return for revision'}.`);
      return;
    }
    setGovernanceLoading(true);
    try {
      await approvalAction.mutateAsync({
        id: activeApproval.id,
        data: { action: actionType, reason: approvalReason.trim() || undefined },
      });
      setApprovalReason('');
      await queryClient.invalidateQueries({ queryKey: ['quotation', id] });
      await queryClient.invalidateQueries({ queryKey: ['quotations'] });
      await queryClient.invalidateQueries({ queryKey: ['approvals'] });
    } catch (err: any) {
      alert('Governance action failed: ' + (err?.message || 'Error'));
    } finally {
      setGovernanceLoading(false);
    }
  };

  return (
    <div>
      <PageHeader title={quote.title}>
        <StatusBadge status={quote.status} className="text-sm px-3 py-1" />
        {(['APPROVED', 'FULFILLMENT_READY'].includes(quote.status) &&
          (isSalesRep || user?.role === UserRole.SALES_MANAGER)) && (
          <SecondaryButton onClick={handleSendToCustomer} disabled={isSendingPortal}>
            {isSendingPortal ? 'Sending…' : '📤 Send Quotation to Customer'}
          </SecondaryButton>
        )}
        {(['SENT_TO_CUSTOMER', 'UNDER_NEGOTIATION'].includes(quote.status) &&
          (isSalesRep || user?.role === UserRole.SALES_MANAGER)) && (
          <SecondaryButton onClick={handleCopyPortalLink}>
            {copiedPortalLink ? '✓ Portal Link Copied' : '🔗 Copy Customer Portal Link'}
          </SecondaryButton>
        )}
        {canOperateFulfillment && (quote.status === 'APPROVED' || quote.status === 'FULFILLMENT_READY') && (
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

      {portalNotice && (
        <NoticeStrip variant="info" className="mb-4 flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-success/40 bg-success/10 text-success">
          <div className="flex items-center gap-2 overflow-hidden">
            <span>✓</span>
            <span className="font-mono text-xs truncate">{portalNotice}</span>
          </div>
          <button
            onClick={() => {
              const parts = portalNotice.split('link: ');
              const url = parts[1] || portalNotice;
              if (url) {
                navigator.clipboard.writeText(url);
                setCopiedPortalLink(true);
                setTimeout(() => setCopiedPortalLink(false), 3000);
              }
            }}
            className="px-2.5 py-1 bg-charcoal-800 hover:bg-charcoal-700 text-xs text-charcoal-200 rounded border border-charcoal-600 shrink-0 font-medium"
          >
            {copiedPortalLink ? '✓ Copied!' : 'Copy Link'}
          </button>
        </NoticeStrip>
      )}

      {/* Visual Lifecycle Stepper */}
      <div className="bg-charcoal-900 border border-charcoal-700 rounded-lg p-3 mb-4 overflow-x-auto">
        <div className="flex items-center justify-between min-w-[720px] gap-2 text-xs">
          {[
            { key: 'DRAFT', label: '1. Draft', active: quote.status === 'DRAFT' || quote.status === 'REVISION', done: !['DRAFT', 'REVISION', 'REJECTED'].includes(quote.status) },
            { key: 'PENDING_MANAGER', label: '2. Manager Review', active: quote.status === 'PENDING_MANAGER', done: ['PENDING_FINANCE', 'APPROVED', 'FULFILLMENT_READY', 'SENT_TO_CUSTOMER', 'UNDER_NEGOTIATION', 'CONFIRMED', 'BILLED', 'PAID'].includes(quote.status) },
            { key: 'PENDING_FINANCE', label: '3. Finance Review', active: quote.status === 'PENDING_FINANCE', done: ['APPROVED', 'FULFILLMENT_READY', 'SENT_TO_CUSTOMER', 'UNDER_NEGOTIATION', 'CONFIRMED', 'BILLED', 'PAID'].includes(quote.status) },
            { key: 'APPROVED', label: '4. Approved', active: quote.status === 'APPROVED', done: ['FULFILLMENT_READY', 'SENT_TO_CUSTOMER', 'UNDER_NEGOTIATION', 'CONFIRMED', 'BILLED', 'PAID'].includes(quote.status) },
            { key: 'OPERATIONS', label: '5. Fulfillment & Portal', active: ['FULFILLMENT_READY', 'SENT_TO_CUSTOMER', 'UNDER_NEGOTIATION'].includes(quote.status), done: ['CONFIRMED', 'BILLED', 'PAID'].includes(quote.status) },
            { key: 'CONFIRMED', label: '6. Confirmed & Billed', active: ['CONFIRMED', 'BILLED', 'PAID'].includes(quote.status), done: ['BILLED', 'PAID'].includes(quote.status) },
          ].map((stage, idx, arr) => (
            <React.Fragment key={stage.key}>
              <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded font-medium transition-all ${
                stage.active
                  ? 'bg-accent/20 border border-accent text-accent font-semibold shadow-sm'
                  : stage.done
                  ? 'bg-success/10 border border-success/30 text-success'
                  : 'bg-charcoal-800/50 border border-charcoal-700/50 text-charcoal-500'
              }`}>
                <span>{stage.done ? '✓' : stage.active ? '●' : '○'}</span>
                <span>{stage.label}</span>
              </div>
              {idx < arr.length - 1 && (
                <div className={`h-0.5 flex-1 ${stage.done ? 'bg-success/50' : 'bg-charcoal-700'}`} />
              )}
            </React.Fragment>
          ))}
        </div>
      </div>

      {/* State Notices */}
      {quote.status === 'REJECTED' && (
        <NoticeStrip variant="danger" className="mb-4">
          ✕ REJECTED: This quotation was rejected during governance approval and cannot be modified or advanced.
        </NoticeStrip>
      )}
      {quote.status === 'REVISION' && (
        <NoticeStrip variant="warning" className="mb-4">
          ↩ RETURNED FOR REVISION: The reviewer requested adjustments. You can now modify the line items and re-submit for approval.
        </NoticeStrip>
      )}

      {/* Governance Review Action Box (Visible to authorized approvers for current stage) */}
      {canApprove && (
        <div className="bg-charcoal-800 border-2 border-accent/70 rounded-lg p-4 mb-4 shadow-lg">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-2">
            <div className="flex items-center gap-2">
              <span className="text-sm font-semibold text-white">
                ⚖️ Governance Decision Required
              </span>
              <span className="text-xs bg-accent/20 text-accent px-2 py-0.5 rounded font-medium">
                {quote.status === 'PENDING_MANAGER' ? 'Sales Manager Step' : 'Finance Head Step'}
              </span>
            </div>
            <span className="text-xs text-charcoal-300">
              Risk: <strong className={displayRiskLevel === 'HIGH' ? 'text-danger' : 'text-warning'}>{displayRiskLevel}</strong> ({(displayRiskScore / 100).toFixed(1)}%)
            </span>
          </div>
          <p className="text-xs text-charcoal-400 mb-3">
            {quote.status === 'PENDING_MANAGER'
              ? 'As Sales Manager, review quotation discounts and margin. Approve to advance, return for revision, or reject.'
              : 'As Finance Head, conduct financial review on this high-risk quotation. Your decision will finalize approval or return to the sales team.'}
          </p>
          <div className="flex flex-col sm:flex-row items-center gap-3">
            <div className="flex-1 w-full">
              <Input
                placeholder="Reason or feedback (required for reject / return for revision)..."
                value={approvalReason}
                onChange={(e) => setApprovalReason(e.target.value)}
              />
            </div>
            <div className="flex items-center gap-2 w-full sm:w-auto">
              <SuccessButton
                onClick={() => handleGovernanceAction('APPROVE')}
                disabled={governanceLoading}
                className="flex-1 sm:flex-initial"
              >
                {governanceLoading ? 'Processing…' : '✓ Approve'}
              </SuccessButton>
              <SecondaryButton
                onClick={() => handleGovernanceAction('RETURN_FOR_REVISION')}
                disabled={governanceLoading}
                className="flex-1 sm:flex-initial text-warning hover:bg-warning/10"
              >
                ↩ Return for Revision
              </SecondaryButton>
              <DangerButton
                onClick={() => handleGovernanceAction('REJECT')}
                disabled={governanceLoading}
                className="flex-1 sm:flex-initial"
              >
                ✗ Reject
              </DangerButton>
            </div>
          </div>
        </div>
      )}

      {!canApprove && (quote.status === 'PENDING_MANAGER' || quote.status === 'PENDING_FINANCE') && (
        <NoticeStrip variant="info" className="mb-4">
          ⏳ Awaiting Governance Approval:{' '}
          {quote.status === 'PENDING_MANAGER'
            ? 'Quotation is currently under review by Sales Manager.'
            : 'Manager approved! High-risk deal is currently under secondary review by Finance Head.'}
        </NoticeStrip>
      )}

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
            {displayRiskScore > 0 && <span className="text-xs text-charcoal-400">Score: {(displayRiskScore / 100).toFixed(1)}%</span>}
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
              isSalesRep ? (
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
              ) : (
                <p className="text-xs text-charcoal-400 mt-3 italic">
                  Line editing is restricted to Sales Representatives.
                </p>
              )
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
              {isSalesRep && <form onSubmit={handleSendStaffReply} className="flex gap-2">
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
              </form>}
            </Panel>
          )}

          {/* Audit Trail */}
          {auditTrail.length > 0 && (
            <Panel title="Audit Trail" className="mt-4">
              <div className="space-y-1.5 max-h-56 overflow-y-auto pr-1">
                {auditTrail.map((entry: any) => {
                  const { rolePersonText, messageText } = formatAuditEntry(entry);
                  return (
                    <div key={entry.id} className="flex flex-wrap items-center gap-2 text-xs py-1.5 border-b border-charcoal-800/60 last:border-b-0">
                      <span className="text-charcoal-500 whitespace-nowrap">{new Date(entry.createdAt).toLocaleString()}</span>
                      <span className="font-semibold text-charcoal-200">{entry.user?.name}</span>
                      {rolePersonText && (
                        <span className="px-1.5 py-0.5 rounded text-[10px] uppercase font-bold tracking-wider bg-accent/15 text-accent border border-accent/25">
                          {rolePersonText}
                        </span>
                      )}
                      <StatusBadge status={entry.action.replace('QUOTATION_', '')} />
                      <span className="text-charcoal-300 flex-1">{messageText}</span>
                    </div>
                  );
                })}
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
          {isEditable && (
            isSalesRep ? (
              <>
                {quote.lines.length > 0 && (
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
              </>
            ) : (
              <Panel>
                <p className="text-xs text-charcoal-400 italic">
                  Only the assigned Sales Representative can modify discounts or submit this quotation for approval.
                </p>
              </Panel>
            )
          )}

          {/* Upsell Suggestions Panel — always shown when editable */}
          {isEditable && isSalesRep && (
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

