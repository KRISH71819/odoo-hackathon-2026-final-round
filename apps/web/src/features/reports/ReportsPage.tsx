// ── Reports Page (Phase 4) ──
import React, { useState, useCallback } from 'react';
import { PageHeader, Panel, Input, Select, PrimaryButton, SecondaryButton, Spinner, StatusBadge } from '../../components/ui.js';
import { formatCurrency } from '../../lib/format.js';
import { useReports } from './useReports.js';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell,
} from 'recharts';

const STATUS_COLORS: Record<string, string> = {
  DRAFT: '#525252', PENDING_MANAGER: '#a3a3a3', PENDING_FINANCE: '#737373',
  APPROVED: '#ffffff', REJECTED: '#262626', CONFIRMED: '#ffffff',
  BILLED: '#d4d4d4', PAID: '#ffffff', REVISION: '#737373',
};

export default function ReportsPage() {
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [salesRepId, setSalesRepId] = useState('');
  const [status, setStatus] = useState('');

  const filters: Record<string, string> = {};
  if (dateFrom) filters.dateFrom = new Date(dateFrom).toISOString();
  if (dateTo) filters.dateTo = new Date(dateTo).toISOString();
  if (salesRepId) filters.salesRepId = salesRepId;
  if (status) filters.status = status;

  const { data, isLoading } = useReports(filters);
  const report = data?.data;

  const handleExportCSV = useCallback(() => {
    if (!report) return;
    const rows = [
      ['Metric', 'Value'],
      ['Total Revenue', (report.totalRevenue / 100).toFixed(2)],
      ['Open Quotes', report.openQuotes],
      ['Total Quotes', report.totalQuotes],
      ['Avg Discount (BPS)', report.avgDiscountBps],
      ['Avg Cycle (Days)', report.avgCycleDays],
      '',
      ['Status', 'Count'],
      ...Object.entries(report.statusCounts || {}).map(([k, v]) => [k, v]),
      '',
      ['Category', 'Revenue'],
      ...Object.entries(report.categoryCounts || {}).map(([k, v]) => [k, ((v as number) / 100).toFixed(2)]),
      '',
      ['Rep', 'Revenue', 'Deals'],
      ...((report.topReps || []) as any[]).map((r: any) => [r.name, (r.total / 100).toFixed(2), r.count]),
    ];
    const csv = rows.map(r => Array.isArray(r) ? r.join(',') : '').join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = 'dealflow360-report.csv'; a.click();
    URL.revokeObjectURL(url);
  }, [report]);

  const handleExportPDF = useCallback(async () => {
    if (!report) return;
    const { jsPDF } = await import('jspdf');
    const doc = new jsPDF();
    doc.setFontSize(16);
    doc.text('DealFlow360 Sales Report', 14, 20);
    doc.setFontSize(10);
    let y = 35;
    const line = (label: string, value: string) => {
      doc.text(`${label}: ${value}`, 14, y); y += 7;
    };
    line('Total Revenue', formatCurrency(report.totalRevenue));
    line('Open Quotes', String(report.openQuotes));
    line('Total Quotes', String(report.totalQuotes));
    line('Avg Discount', `${(report.avgDiscountBps / 100).toFixed(1)}%`);
    line('Avg Cycle Time', `${report.avgCycleDays} days`);
    y += 5;
    doc.setFontSize(12);
    doc.text('Status Breakdown', 14, y); y += 7;
    doc.setFontSize(10);
    for (const [s, c] of Object.entries(report.statusCounts || {})) {
      line(s.replace(/_/g, ' '), String(c));
    }
    y += 5;
    doc.setFontSize(12);
    doc.text('Top Reps', 14, y); y += 7;
    doc.setFontSize(10);
    for (const r of (report.topReps || []) as any[]) {
      line(r.name, `${formatCurrency(r.total)} (${r.count} deals)`);
    }
    doc.save('dealflow360-report.pdf');
  }, [report]);

  const statusChartData = report ? Object.entries(report.statusCounts || {}).map(([name, value]) => ({
    name: name.replace(/_/g, ' '),
    value: value as number,
    fill: STATUS_COLORS[name] || '#6b7280',
  })) : [];

  const categoryChartData = report ? Object.entries(report.categoryCounts || {}).map(([name, value]) => ({
    name,
    value: (value as number) / 100,
  })) : [];

  return (
    <div>
      <PageHeader title="Reports & Analytics" subtitle="Sales performance metrics with filtering and export">
        <SecondaryButton onClick={handleExportCSV} disabled={!report}>Export CSV</SecondaryButton>
        <PrimaryButton onClick={handleExportPDF} disabled={!report}>Export PDF</PrimaryButton>
      </PageHeader>

      {/* Filter Bar */}
      <Panel className="mb-4">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <Input label="From" type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)} />
          <Input label="To" type="date" value={dateTo} onChange={e => setDateTo(e.target.value)} />
          <Input label="Sales Rep ID" value={salesRepId} onChange={e => setSalesRepId(e.target.value)} placeholder="Optional" />
          <Select label="Status" value={status} onChange={e => setStatus(e.target.value)}>
            <option value="">All</option>
            <option value="DRAFT">Draft</option>
            <option value="APPROVED">Approved</option>
            <option value="CONFIRMED">Confirmed</option>
            <option value="BILLED">Billed</option>
            <option value="PAID">Paid</option>
            <option value="REJECTED">Rejected</option>
          </Select>
        </div>
      </Panel>

      {isLoading ? <Spinner /> : report ? (
        <>
          {/* KPI Cards */}
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-4">
            <Panel>
              <div className="text-center">
                <div className="text-lg font-bold text-foreground">{formatCurrency(report.totalRevenue)}</div>
                <div className="text-xs text-df-text-muted mt-1">Total Revenue</div>
              </div>
            </Panel>
            <Panel>
              <div className="text-center">
                <div className="text-lg font-bold text-foreground">{report.openQuotes}</div>
                <div className="text-xs text-df-text-muted mt-1">Open Quotes</div>
              </div>
            </Panel>
            <Panel>
              <div className="text-center">
                <div className="text-lg font-bold text-foreground">{report.totalQuotes}</div>
                <div className="text-xs text-df-text-muted mt-1">Total Quotes</div>
              </div>
            </Panel>
            <Panel>
              <div className="text-center">
                <div className="text-lg font-bold text-foreground">{(report.avgDiscountBps / 100).toFixed(1)}%</div>
                <div className="text-xs text-df-text-muted mt-1">Avg Discount</div>
              </div>
            </Panel>
            <Panel>
              <div className="text-center">
                <div className="text-lg font-bold text-foreground">{report.avgCycleDays}d</div>
                <div className="text-xs text-df-text-muted mt-1">Avg Cycle</div>
              </div>
            </Panel>
          </div>

          {/* Charts */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-4">
            <Panel title="Quotes by Status">
              {statusChartData.length > 0 ? (
                <ResponsiveContainer width="100%" height={250}>
                  <BarChart data={statusChartData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#262626" />
                    <XAxis dataKey="name" tick={{ fill: '#a3a3a3', fontSize: 10 }} angle={-20} textAnchor="end" height={60} />
                    <YAxis tick={{ fill: '#a3a3a3', fontSize: 10 }} />
                    <Tooltip contentStyle={{ background: '#0a0a0a', border: '1px solid #262626', borderRadius: 6, fontSize: 12, color: '#ffffff' }} />
                    <Bar dataKey="value" radius={[4, 4, 0, 0]}>
                      {statusChartData.map((entry, i) => (
                        <Cell key={i} fill={entry.fill} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              ) : <p className="text-xs text-df-text-muted">No data</p>}
            </Panel>

            <Panel title="Revenue by Category">
              {categoryChartData.length > 0 ? (
                <ResponsiveContainer width="100%" height={250}>
                  <BarChart data={categoryChartData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#262626" />
                    <XAxis dataKey="name" tick={{ fill: '#a3a3a3', fontSize: 10 }} />
                    <YAxis tick={{ fill: '#a3a3a3', fontSize: 10 }} tickFormatter={(v: number) => `$${v.toLocaleString()}`} />
                    <Tooltip contentStyle={{ background: '#0a0a0a', border: '1px solid #262626', borderRadius: 6, fontSize: 12, color: '#ffffff' }} formatter={(v: any) => `$${Number(v).toLocaleString()}`} />
                    <Bar dataKey="value" fill="#ffffff" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              ) : <p className="text-xs text-df-text-muted">No data</p>}
            </Panel>
          </div>

          {/* Top Reps */}
          <Panel title="Top Sales Reps">
            {(report.topReps || []).length === 0 ? (
              <p className="text-xs text-df-text-muted">No data</p>
            ) : (
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-df-border text-left text-df-text-muted">
                    <th className="pb-2 pr-3">#</th>
                    <th className="pb-2 pr-3">Rep</th>
                    <th className="pb-2 pr-3">Revenue</th>
                    <th className="pb-2">Deals</th>
                  </tr>
                </thead>
                <tbody className="text-df-text">
                  {(report.topReps as any[]).map((r: any, i: number) => (
                    <tr key={r.id} className="border-b border-df-border/30">
                      <td className="py-2 pr-3 text-df-text-muted">{i + 1}</td>
                      <td className="py-2 pr-3">{r.name}</td>
                      <td className="py-2 pr-3">{formatCurrency(r.total)}</td>
                      <td className="py-2">{r.count}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </Panel>
        </>
      ) : null}
    </div>
  );
}
