// ── DealFlow360 Shared Enums ──
// Single source of truth for all status and type enums.
// Do NOT duplicate these in frontend or backend code.

export enum UserRole {
  ADMIN = 'ADMIN',
  SALES_REP = 'SALES_REP',
  SALES_MANAGER = 'SALES_MANAGER',
  FINANCE_OPS = 'FINANCE_OPS',
  CUSTOMER = 'CUSTOMER',
}

export enum QuotationStatus {
  DRAFT = 'DRAFT',
  PENDING_MANAGER = 'PENDING_MANAGER',
  PENDING_FINANCE = 'PENDING_FINANCE',
  APPROVED = 'APPROVED',
  FULFILLMENT_READY = 'FULFILLMENT_READY',
  SENT_TO_CUSTOMER = 'SENT_TO_CUSTOMER',
  UNDER_NEGOTIATION = 'UNDER_NEGOTIATION',
  CONFIRMED = 'CONFIRMED',
  BILLED = 'BILLED',
  PAID = 'PAID',
  REJECTED = 'REJECTED',
  REVISION = 'REVISION',
}

export enum ApprovalActionType {
  APPROVE = 'APPROVE',
  REJECT = 'REJECT',
  RETURN_FOR_REVISION = 'RETURN_FOR_REVISION',
}

export enum ApprovalRequestStatus {
  PENDING = 'PENDING',
  APPROVED = 'APPROVED',
  REJECTED = 'REJECTED',
  RETURNED = 'RETURNED',
}

export enum FulfillmentStatus {
  PENDING = 'PENDING',
  ALLOCATED = 'ALLOCATED',
  PARTIALLY_ALLOCATED = 'PARTIALLY_ALLOCATED',
  BACKORDERED = 'BACKORDERED',
  SHIPPED = 'SHIPPED',
  DELIVERED = 'DELIVERED',
}

export enum InvoiceStatus {
  DRAFT = 'DRAFT',
  SENT = 'SENT',
  PARTIALLY_PAID = 'PARTIALLY_PAID',
  PAID = 'PAID',
  CANCELLED = 'CANCELLED',
}

export enum BillingInterval {
  MONTHLY = 'MONTHLY',
  QUARTERLY = 'QUARTERLY',
  YEARLY = 'YEARLY',
}

export enum ProductType {
  HARDWARE = 'HARDWARE',
  SERVICE = 'SERVICE',
  SUBSCRIPTION = 'SUBSCRIPTION',
}

export enum ProductCategory {
  HARDWARE = 'HARDWARE',
  SOFTWARE = 'SOFTWARE',
  SERVICE = 'SERVICE',
  SUBSCRIPTION = 'SUBSCRIPTION',
  ACCESSORY = 'ACCESSORY',
}

export enum CustomerTier {
  BRONZE = 'BRONZE',
  SILVER = 'SILVER',
  GOLD = 'GOLD',
}

export enum RiskLevel {
  NONE = 'NONE',
  LOW = 'LOW',
  MEDIUM = 'MEDIUM',
  HIGH = 'HIGH',
}

export enum AlertType {
  STALLED_DEAL = 'STALLED_DEAL',
  DISCOUNT_ANOMALY = 'DISCOUNT_ANOMALY',
  DELIVERY_SLIPPAGE = 'DELIVERY_SLIPPAGE',
}

export enum AlertSeverity {
  INFO = 'INFO',
  WARNING = 'WARNING',
  CRITICAL = 'CRITICAL',
}
