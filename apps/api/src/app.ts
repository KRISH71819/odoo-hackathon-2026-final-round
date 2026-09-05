// ── DealFlow360 API – Express Application ──

import express from 'express';
import cors from 'cors';
import { errorMiddleware } from './middleware/error.middleware.js';
import { requestLogger } from './middleware/logger.middleware.js';
import { authRoutes } from './modules/auth/auth.routes.js';
import { catalogRoutes } from './modules/catalog/catalog.routes.js';
import { salesRoutes } from './modules/sales/sales.routes.js';
import { governanceRoutes } from './modules/governance/governance.routes.js';
import { fulfillmentRoutes } from './modules/fulfillment/fulfillment.routes.js';
import { billingRoutes } from './modules/billing/billing.routes.js';
import { portalRoutes } from './modules/portal/portal.routes.js';
import { insightsRoutes } from './modules/insights/insights.routes.js';

const app = express();

// ── Global Middleware ──
app.use(cors({ origin: true, credentials: true }));
app.use(express.json({ limit: '1mb' }));
app.use(requestLogger);

// ── Health Check ──
app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// ── Module Routes ──
app.use('/api/auth', authRoutes);
app.use('/api/catalog', catalogRoutes);
app.use('/api/sales', salesRoutes);
app.use('/api/governance', governanceRoutes);
app.use('/api/fulfillment', fulfillmentRoutes);
app.use('/api/billing', billingRoutes);
app.use('/api/portal', portalRoutes);
app.use('/api/insights', insightsRoutes);

// ── Top-level API route mounts for direct frontend access ──
app.use('/api', catalogRoutes);
app.use('/api', salesRoutes);
app.use('/api', governanceRoutes);
app.use('/api', authRoutes);
app.use('/api', insightsRoutes);

// ── Error Handler (must be last) ──
app.use(errorMiddleware);

export { app };
