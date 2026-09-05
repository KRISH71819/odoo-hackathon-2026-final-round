// ── DealFlow360 – Placeholder Page Component ──
// Used for all feature routes that will be implemented in Phases 2-4.

import React from 'react';
import { PageHeader, Panel, NoticeStrip, StatusBadge } from '../../components/ui.js';

interface PlaceholderPageProps {
  title: string;
  phase: number;
  description: string;
  features?: string[];
}

export function PlaceholderPage({ title, phase, description, features }: PlaceholderPageProps) {
  return (
    <div>
      <PageHeader
        title={title}
        actions={<StatusBadge label={`Phase ${phase}`} variant="info" />}
      />

      <NoticeStrip variant="warning">
        This module will be implemented in Phase {phase}. The route and navigation are ready.
      </NoticeStrip>

      <Panel title="Module Overview" className="mt-4">
        <p className="text-sm text-df-text-muted mb-4">{description}</p>
        {features && features.length > 0 && (
          <div>
            <h3 className="text-xs font-medium text-df-text-dim uppercase tracking-wider mb-2">
              Planned Features
            </h3>
            <ul className="space-y-1.5">
              {features.map((f) => (
                <li key={f} className="flex items-start gap-2 text-sm text-df-text-muted">
                  <span className="text-df-text-dim mt-0.5">•</span>
                  {f}
                </li>
              ))}
            </ul>
          </div>
        )}
      </Panel>
    </div>
  );
}
