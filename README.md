# DealFlow360 — Enterprise B2B Quote-to-Cash & Governance Platform

> **Hackathon Pitch & Project Overview Guide**  
> *Ready-to-speak pitch, architecture overview, and progress status through Phase 3.*

---

## ⏱️ 30-Second Elevator Pitch (Say this to the Judge)

> *"DealFlow360 solves one of the biggest leaks in B2B enterprise sales: rogue discounts and disconnected operations. In most companies, sales reps offer heavy discounts across multiple lines to close deals, warehouse fulfillment is chaotic, and customer negotiation happens over messy email chains with zero governance.*
>
> *We built a unified, modular enterprise platform where every quote follows a strict state machine: live blended discount risk calculation, automated multi-tier approval routing, greedy multi-warehouse fulfillment splitting, hybrid subscription billing with proration, and a token-isolated customer negotiation portal that automatically re-triggers approval if a customer's counter-offer exceeds risk limits."*

---

## 🤖 How We Used AI (What Judges Look For)

Judges evaluate whether AI was used purposefully rather than as a naive code generator. Here is our exact AI strategy:

1. **Contract-First Agentic Architecture ("Ponytail" Decision Ladder)**:
   - AI was constrained by strict domain boundaries, strict TypeScript interfaces, and Zod schemas before any code was written.
   - Applied ruthless YAGNI: no bloated dependencies, pure domain functions (`calculateBlendedRisk`, `chooseFulfillmentSplit`, `calculateProration`) decoupled from HTTP and database layers.
2. **In-Product Intelligence & Algorithmic Heuristics**:
   - **Blended Risk Governance**: Solves the "distributed discount leak" where a rep gives 4% off across 10 items to slip under a 5% cap. The algorithm computes blended multi-line exposure.
   - **Greedy Warehouse Allocation**: Computes the optimal fulfillment split across warehouses based on live inventory and shipping cost weights to minimize shipment count.
   - **Margin-Aware Upsell Engine**: Recommends high-affinity pairings dynamically only when deal margin thresholds remain protected.
3. **Automated Verification & Zero-Drift Gates**:
   - AI generated comprehensive test suites for each phase before handoff (27+ backend domain and integration tests).
   - Zero database drift: all state transitions run within atomic Prisma `$transaction` blocks with idempotency and optimistic concurrency controls.

---

## 📋 Phase Breakdown & Progress

```
  ┌────────────────────────────────────────────────────────────────────────┐
  │                           QUOTATION LIFECYCLE                          │
  │                                                                        │
  │  [ Phase 1 ]           [ Phase 2 ]                    [ Phase 3 ]       │
  │  Draft / Auth ──► Risk Engine & Approvals ──► Fulfillment, Portal &   │
  │                     (Manager + Finance)       Hybrid Recurring Billing │
  └────────────────────────────────────────────────────────────────────────┘
```

### 🔹 Phase 1: Platform Foundation & Domain Skeleton
- **Role-Based Access Control (RBAC)**: 5 segregated roles (`SALES_REP`, `SALES_MANAGER`, `FINANCE_OPS`, `CUSTOMER`, `ADMIN`).
- **Relational Schema & Seed**: Unified Prisma/SQLite database schema with deterministic seed fixtures (customers, products, price lists, warehouses).
- **Quotation State Machine**: Formally defined lifecycle preventing arbitrary status mutations (`docs/STATE_MACHINE.md`).
- **Enterprise Dark UI Shell**: Clean, high-density dashboard UI matching enterprise workflows without visual clutter.

### 🔹 Phase 2: Sales Core, Pricing Governance & Approvals
- **Multi-Type Catalog**: Support for Hardware, Professional Services, and Subscriptions with customer tier pricing.
- **Blended Discount Risk Engine**: Evaluates line-level limits against category and customer-tier ceilings; computes blended risk score.
- **Automated Approval Chains**: Dynamically routes high-risk quotes to Sales Manager, and escalates to Finance when risk exceeds thresholds.
- **Auditability & Margin Protection**: Append-only audit trail logging every action, with real-time margin calculation and rules-based upsell suggestions.

### 🔹 Phase 3: Fulfillment, Hybrid Billing & Customer Portal *(Just Completed)*
- **Smart Multi-Warehouse Fulfillment**:
  - Pure domain allocation algorithm (`chooseFulfillmentSplit.ts`) greedily minimizes shipment count and transit cost.
  - Handles partial allocation and automated backorders; provides manager overrides with concurrency-safe stock checks.
- **Hybrid Billing Engine**:
  - Coexists one-time hardware lines and recurring SaaS subscription lines on the same order.
  - Deterministic calendar proration (`calculateProration.ts`) for mid-cycle quantity/plan adjustments and partial credit notes.
- **Customer Negotiation Portal**:
  - Restricted, token-scoped access (`X-Portal-Token` with 7-day TTL) keeping internal pricing and other customer records completely isolated.
  - Live customer counter-offer negotiation: customer can propose discounts and request line changes.
- **Closed-Loop Re-Approval**: If the customer's counter-offer breaches discount policy, the system automatically revokes ready status and pushes the quote back into manager/finance approval!

---

## 🏆 Key Technical Facts for Judges

| Criteria | Implementation Fact |
|---|---|
| **Architecture** | TypeScript Modular Monolith (Express API + React/Vite + Prisma + SQLite). |
| **Data Integrity** | State-machine transitions, atomic `$transaction` boundaries, and optimistic concurrency on mutations. |
| **Security** | Role-based middleware, token-isolated customer portal (zero cross-tenant exposure), append-only audit trail. |
| **Financial Accuracy** | Integer/minor units math for currency and proration to eliminate floating-point precision errors. |
| **Test Coverage** | 27 passing automated tests (`phase2.test.ts`, `phase3.test.ts`) validating core business rules and edge cases. |

---

## 🗣️ Quick 2-Minute Judge Conversation Script

**Judge:** *"Hi! What are you building here?"*  
**You:**  
> *"We're building **DealFlow360**, a B2B enterprise quote-to-cash platform with built-in risk governance.*  
> *In Phase 1, we set up the core platform: enterprise RBAC with 5 roles, relational schema, and the quotation state machine.*  
> *In Phase 2, we built the governance engine—when a sales rep creates a quote, our blended risk algorithm calculates if discounts breach category or tier ceilings, and automatically routes it through Manager or Finance approval chains.*  
> *We just finished Phase 3: once approved, our fulfillment algorithm splits stock across warehouses to minimize shipping costs, sets up hybrid subscription billing with day-accurate proration, and gives the customer a secure portal to negotiate. If the customer counter-offers a risky discount, our system automatically catches it and re-enters the approval loop before confirmation!"*

**Judge:** *"How did you use AI in this project?"*  
**You:**  
> *"We used AI under strict architectural constraints. Instead of letting AI blindly scaffold bloated code, we used a 'Decision Ladder' approach: AI generates pure domain algorithms—like the blended risk engine and greedy warehouse splitter—and writes automated test suites against edge cases. Every phase has automated verification gates with zero database drift."*
