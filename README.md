# DealFlow360

**Intelligent B2B Sales Operations Platform** — End-to-end quotation lifecycle management with risk-aware governance, multi-warehouse fulfillment, subscription billing, and deal health analytics.

## Quick Start

```bash
# 1. Install dependencies
pnpm install

# 2. Generate Prisma client + run migrations + seed demo data
pnpm setup

# 3. Start both API and frontend in development mode
pnpm dev
```

This starts:
- **API server**: http://localhost:3001 (Express)
- **Frontend**: http://localhost:5173 (Vite)

## Demo Accounts

All accounts use password: `password123`

| Role | Email | Access |
|------|-------|--------|
| Admin | admin@dealflow.com | Full access |
| Sales Rep | rep@dealflow.com | Quotations, customers |
| Sales Manager | manager@dealflow.com | + Approvals, reports |
| Finance/Ops | finance@dealflow.com | + Billing, approvals |
| Customer | customer@acme.com | Portal only |

## Project Structure

```
├── apps/
│   ├── api/          # Express backend (Port 3001)
│   └── web/          # React + Vite frontend (Port 5173)
├── packages/
│   └── contracts/    # Shared enums, types, Zod schemas
├── prisma/
│   ├── schema.prisma # Full domain model
│   └── seed.ts       # Deterministic demo data
├── docs/
│   ├── ARCHITECTURE.md
│   ├── API_CONTRACT.md
│   ├── STATE_MACHINE.md
│   └── HANDOFF.md
└── pnpm-workspace.yaml
```

## Scripts

| Script | Description |
|--------|-------------|
| `pnpm dev` | Start API + Web in parallel |
| `pnpm dev:api` | Start only the API server |
| `pnpm dev:web` | Start only the frontend |
| `pnpm db:reset` | Reset DB + re-seed |
| `pnpm db:studio` | Open Prisma Studio (DB browser) |
| `pnpm build` | Build all packages |
| `pnpm typecheck` | Type-check all packages |

## Phase Roadmap

- **Phase 1** ✅ — Foundation (auth, RBAC, DB schema, seed, UI shell, docs)
- **Phase 2** 🔜 — Catalog + Quotation Builder + Governance (discount rules, risk scoring, multi-step approvals)
- **Phase 3** 🔜 — Operations (fulfillment split, subscriptions, customer portal negotiation)
- **Phase 4** 🔜 — Intelligence (deal health, anomaly detection, reporting, export)

## Documentation

See the [`docs/`](./docs/) directory for detailed architecture and API documentation.
