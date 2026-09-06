# DealFlow360 — Enterprise B2B Quote-to-Cash & Governance Platform

> **Odoo Hackathon 2026 — Final Round Submission**  
> *A production-grade, modular B2B sales platform with blended discount risk governance, multi-warehouse fulfillment, hybrid billing, and an AI-powered deal intelligence layer.*

---

## ⏱️ 30-Second Elevator Pitch

> *"DealFlow360 eliminates the biggest revenue leak in B2B enterprise sales: rogue discounts and disconnected operations. Sales reps routinely distribute small discounts across many lines to slip under approval thresholds — our **blended risk engine** catches this transparently.*
>
> *We built a unified modular platform where every quote follows a strict state machine: live blended discount risk scoring (in %), automated multi-tier approval routing, greedy multi-warehouse fulfillment splitting, hybrid subscription billing with day-accurate proration, an AI-powered "Living Deal Memory" activity log, and a token-isolated customer negotiation portal that auto-triggers re-approval if a counter-offer breaches policy."*

---

## 🚀 Quick Start

### Prerequisites

| Tool | Minimum Version |
|---|---|
| Node.js | ≥ 18.0.0 |
| pnpm | ≥ 8.0.0 |

### One-Command Setup

```bash
# Clone and enter the project
git clone <repo-url>
cd odoo-hackathon-2026-final-round

# Install dependencies, generate Prisma client, run migrations, seed the database
pnpm setup
```

### Run the Development Server

```bash
# Starts both the API (port 3000) and Web (port 5173) in parallel
pnpm dev
```

| Service | URL |
|---|---|
| **Web App (React/Vite)** | http://localhost:5173 |
| **API Server (Express)** | http://localhost:3000 |
| **Prisma Studio (DB GUI)** | `pnpm db:studio` → http://localhost:5555 |

### Demo Accounts

| Role | Email | Password |
|---|---|---|
| Sales Rep | `sarah.chen@dealflow.io` | `password123` |
| Sales Manager | `james.wilson@dealflow.io` | `password123` |
| Finance Ops | `emma.rodriguez@dealflow.io` | `password123` |
| Admin | `admin@dealflow.io` | `password123` |

### Seed the Reviewer Dataset

```bash
# Load a richer, hackathon-scale fixture dataset
pnpm db:seed:reviewer
```

---

## 📋 Phase Breakdown & Progress

```
┌────────────────────────────────────────────────────────────────────────┐
│                          QUOTATION LIFECYCLE                           │
│                                                                        │
│  [ Phase 1 ]           [ Phase 2 ]                    [ Phase 3 ]      │
│  Draft / Auth ──► Risk Engine & Approvals ──► Fulfillment, Portal &   │
│                     (Manager + Finance)       Hybrid Recurring Billing │
└────────────────────────────────────────────────────────────────────────┘
```

### 🔹 Phase 1 — Platform Foundation & Domain Skeleton ✅

- **5-Role RBAC**: `SALES_REP`, `SALES_MANAGER`, `FINANCE_OPS`, `CUSTOMER`, `ADMIN` with middleware-enforced route guards.
- **Unified Relational Schema**: Prisma/SQLite with deterministic seed fixtures (customers, products, price lists, warehouses).
- **Quotation State Machine**: Formally defined lifecycle (`DRAFT → PENDING_APPROVAL → APPROVED / REJECTED → SENT → CONFIRMED`) preventing arbitrary status mutations.
- **Enterprise Dark UI Shell**: High-density dashboard with role-aware navigation.

### 🔹 Phase 2 — Sales Core, Pricing Governance & Approvals ✅

- **Multi-Type Product Catalog**: Hardware, Professional Services, and SaaS Subscriptions with customer-tier pricing.
- **Blended Discount Risk Engine**: Computes line-level discount exposure against category and tier ceilings; displays as a **percentage (%)** score for human readability.
- **Automated Multi-Tier Approval Chains**: Dynamically routes high-risk quotes to Sales Manager; escalates to Finance Ops when risk exceeds configurable thresholds.
- **Append-Only Audit Trail**: Every action is logged immutably with actor role, timestamp, and clean human-readable descriptions.
- **Margin Protection & Upsell Engine**: Real-time margin calculation and margin-aware high-affinity product recommendations.

### 🔹 Phase 3 — Fulfillment, Hybrid Billing & Customer Portal ✅

- **Smart Multi-Warehouse Fulfillment**: Pure domain algorithm (`chooseFulfillmentSplit.ts`) greedily minimizes shipment count and transit cost. Handles partial allocations and automated backorders with concurrency-safe stock checks.
- **Hybrid Billing Engine**: Hardware one-time lines and SaaS subscription lines coexist on the same order. Deterministic calendar proration (`calculateProration.ts`) handles mid-cycle quantity/plan adjustments.
- **Token-Isolated Customer Portal**: Scoped via `X-Portal-Token` (7-day TTL). Zero exposure to internal pricing or other customer records.
- **Closed-Loop Re-Approval**: If a customer's counter-offer breaches discount policy, the system automatically revokes ready status and re-enters the Manager/Finance approval chain.

---

## 🤖 AI Usage — Living Deal Memory

The platform includes a **"Living Deal Memory"** layer — an AI-driven contextual intelligence module built on top of the append-only audit trail.

### How It Works (No API Key Required)

The AI layer is **100% local and zero-cost**. It works by:

1. **Structured Audit Trail as Prompt Context**: Every action (price change, approval decision, counter-offer, fulfillment event) is logged as a structured object in the audit trail.
2. **Role-Aware Formatting Engine**: The `formatAuditEntry` function in the Quotation Builder translates raw audit records into clean, human-readable sentences based on the actor's role (e.g., *"Finance Ops Emma Rodriguez approved the quote after reviewing the blended risk score"*).
3. **Algorithmic Heuristics as In-Product Intelligence**:
   - **Blended Risk Governance**: Detects distributed discount leaks across multi-line quotes.
   - **Greedy Warehouse Allocation**: Computes optimal fulfillment split as a domain-pure algorithm.
   - **Margin-Aware Upsell**: Recommends product pairings only when deal margin stays protected.
4. **Summary Generation**: The activity feed provides a chronological, role-narrative summary of the deal lifecycle — effectively a "deal story" that any team member can read to get instant context.

> No external LLM API is required. Intelligence is embedded in the domain logic and formatting layer.

---

## 🏗️ Codebase Architecture

The project is a **TypeScript Modular Monolith** managed via a `pnpm` workspace.

```
odoo-hackathon-2026-final-round/
├── apps/
│   ├── api/                    # Express.js REST API
│   │   └── src/
│   │       ├── modules/        # Feature modules (domain-first)
│   │       │   ├── auth/       # JWT auth, bcrypt password hashing
│   │       │   ├── sales/      # Quotation CRUD, state machine transitions
│   │       │   ├── governance/ # Risk engine, approval chain routing
│   │       │   ├── catalog/    # Products, price lists, upsell engine
│   │       │   ├── fulfillment/# Multi-warehouse allocation algorithm
│   │       │   ├── billing/    # Hybrid billing, proration calculator
│   │       │   ├── portal/     # Token-scoped customer portal endpoints
│   │       │   └── insights/   # Reports, analytics aggregations
│   │       ├── middleware/     # RBAC guards, auth middleware
│   │       └── shared/         # Zod schemas, domain types, pure functions
│   │
│   └── web/                    # React + Vite SPA
│       └── src/
│           ├── features/       # Page-level feature modules
│           │   ├── quotation/  # Quotation builder, audit trail display
│           │   ├── approval/   # Approval queues (Manager & Finance)
│           │   ├── fulfillment/# Warehouse allocation UI
│           │   ├── billing/    # Subscription & invoice management
│           │   ├── portal/     # Customer negotiation portal
│           │   ├── catalog/    # Product catalog browser
│           │   ├── customer/   # Customer account management
│           │   ├── reports/    # Analytics & governance reports
│           │   ├── config/     # Admin configuration panel
│           │   └── dashboard/  # Role-aware overview dashboard
│           └── shared/         # API client, auth context, UI components
│
├── prisma/
│   ├── schema.prisma           # Unified DB schema (SQLite)
│   ├── seed.ts                 # Base fixture seed
│   └── seed-reviewer.ts        # Extended reviewer-scale dataset
│
├── packages/                   # Shared internal packages
└── docs/
    └── HANDOFF.md              # Phase handoff notes
```

### Design Principles

The codebase follows the **"Lazy Senior Developer" (Ponytail) ruleset**:

- **Separation of Concerns**: Pure domain functions (`calculateBlendedRisk`, `chooseFulfillmentSplit`, `calculateProration`) are completely decoupled from HTTP and database layers — fully unit-testable.
- **Fewest Files Possible**: Logic is co-located with its domain; no unnecessary abstraction layers.
- **Boring Over Clever**: Straightforward, readable TypeScript. No over-engineered patterns.
- **Deletion Over Addition**: Zero speculative code. Every function exists because a test requires it.

---

## 🛠️ Tech Stack

| Layer | Technology | Rationale |
|---|---|---|
| **Frontend** | React 18 + TypeScript | Component model ideal for complex, stateful UI |
| **Build Tool** | Vite | Fast HMR, modern ESM bundling |
| **Styling** | Tailwind CSS | Utility-first, zero runtime CSS-in-JS overhead |
| **API Server** | Express.js + TypeScript | Minimal overhead, maximum control over routing/middleware |
| **ORM** | Prisma 6 | Type-safe database access, migration management |
| **Database** | SQLite (via Prisma) | Zero-config, file-based — perfect for self-contained hackathon demo |
| **Auth** | JWT (jsonwebtoken) + bcrypt | Industry-standard stateless auth; portal uses separate token scope |
| **Validation** | Zod | Runtime schema validation at API trust boundaries |
| **Testing** | Vitest | Fast, ESM-native unit and integration tests |
| **Package Manager** | pnpm + workspaces | Efficient monorepo dependency management |
| **Language** | TypeScript 5.5 (strict) | End-to-end type safety from DB schema to UI |

---

## 🏆 Key Technical Facts for Judges

| Criteria | Implementation Detail |
|---|---|
| **Architecture** | TypeScript Modular Monolith — Express API + React/Vite + Prisma + SQLite |
| **Data Integrity** | State-machine transitions, atomic Prisma `$transaction` blocks, optimistic concurrency on mutations |
| **Security** | Role-based middleware, `X-Portal-Token` scoped customer isolation, append-only audit trail, zero cross-tenant exposure |
| **Financial Accuracy** | Integer minor-unit math for all currency and proration calculations — no floating-point errors |
| **Risk Display** | Discount risk displayed as **percentage (%)** throughout — widely understood, not basis points |
| **Test Coverage** | 47 passing automated tests validating core business rules and edge cases |
| **AI Layer** | Zero-cost, no-API-key Living Deal Memory — intelligence embedded in domain algorithms and role-aware formatting |

---

## 🧪 Running Tests

```bash
# Run full test suite (47 tests)
pnpm test

# Type-check entire monorepo
pnpm typecheck
```

---

## 🗄️ Database Commands

```bash
pnpm db:generate      # Regenerate Prisma client after schema changes
pnpm db:migrate       # Run pending migrations
pnpm db:seed          # Seed base fixture data
pnpm db:seed:reviewer # Load reviewer-scale dataset
pnpm db:reset         # Reset DB and re-seed (destructive)
pnpm db:studio        # Open Prisma Studio GUI
```

---

## 🗣️ Judge Conversation Script

**Judge:** *"What are you building?"*

> *"DealFlow360 is a B2B enterprise quote-to-cash platform with built-in risk governance. Most sales teams lose revenue to distributed discounting — reps give 4% off across 10 items to slip under a 5% approval threshold. Our blended risk engine catches this and routes it for approval automatically, showing the risk as a clear percentage rather than opaque internal metrics.*
>
> *In Phase 3, once approved, our fulfillment algorithm splits stock across warehouses to minimize shipping costs, hybrid billing handles one-time and recurring lines together with day-accurate proration, and customers get a secure portal to negotiate. If they counter-offer a risky discount, the system auto-revokes approval and re-enters the governance loop."*

**Judge:** *"How did you use AI?"*

> *"We built what we call a 'Living Deal Memory' — every action on a deal is logged structurally, and our role-aware formatting layer turns those records into clean, human-readable deal narratives. The intelligence is in the domain algorithms themselves: the blended risk engine, the greedy warehouse splitter, and the margin-aware upsell recommender. No external API required — it's zero-cost, always-on, embedded intelligence."*

---

## 📄 License

Built for the **Odoo Hackathon 2026 — Final Round**. All rights reserved.
