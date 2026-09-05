-- CreateTable
CREATE TABLE "UpsellRule" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "sourceProductId" TEXT NOT NULL,
    "suggestedProductId" TEXT NOT NULL,
    "reason" TEXT NOT NULL DEFAULT '',
    "minMarginBps" INTEGER NOT NULL DEFAULT 0,
    "isPromotion" BOOLEAN NOT NULL DEFAULT false,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "UpsellRule_sourceProductId_fkey" FOREIGN KEY ("sourceProductId") REFERENCES "Product" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "UpsellRule_suggestedProductId_fkey" FOREIGN KEY ("suggestedProductId") REFERENCES "Product" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_ApprovalAction" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "approvalRequestId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "reason" TEXT NOT NULL DEFAULT '',
    "stepIndex" INTEGER NOT NULL DEFAULT 0,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ApprovalAction_approvalRequestId_fkey" FOREIGN KEY ("approvalRequestId") REFERENCES "ApprovalRequest" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "ApprovalAction_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
INSERT INTO "new_ApprovalAction" ("action", "approvalRequestId", "createdAt", "id", "reason", "stepIndex", "userId") SELECT "action", "approvalRequestId", "createdAt", "id", "reason", "stepIndex", "userId" FROM "ApprovalAction";
DROP TABLE "ApprovalAction";
ALTER TABLE "new_ApprovalAction" RENAME TO "ApprovalAction";
CREATE INDEX "ApprovalAction_approvalRequestId_idx" ON "ApprovalAction"("approvalRequestId");
CREATE TABLE "new_ApprovalRequest" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "quotationId" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "step" INTEGER NOT NULL DEFAULT 1,
    "role" TEXT NOT NULL DEFAULT 'SALES_MANAGER',
    "currentStep" INTEGER NOT NULL DEFAULT 0,
    "totalSteps" INTEGER NOT NULL DEFAULT 1,
    "decidedAt" DATETIME,
    "comment" TEXT NOT NULL DEFAULT '',
    "reason" TEXT NOT NULL DEFAULT '',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "ApprovalRequest_quotationId_fkey" FOREIGN KEY ("quotationId") REFERENCES "Quotation" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_ApprovalRequest" ("createdAt", "currentStep", "id", "quotationId", "status", "totalSteps", "updatedAt") SELECT "createdAt", "currentStep", "id", "quotationId", "status", "totalSteps", "updatedAt" FROM "ApprovalRequest";
DROP TABLE "ApprovalRequest";
ALTER TABLE "new_ApprovalRequest" RENAME TO "ApprovalRequest";
CREATE INDEX "ApprovalRequest_quotationId_idx" ON "ApprovalRequest"("quotationId");
CREATE INDEX "ApprovalRequest_status_idx" ON "ApprovalRequest"("status");
CREATE TABLE "new_ApprovalThreshold" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "riskLevel" TEXT NOT NULL DEFAULT 'LOW',
    "minRiskScore" REAL NOT NULL DEFAULT 0,
    "maxRiskScore" REAL NOT NULL DEFAULT 0,
    "requiredApprovers" TEXT NOT NULL,
    "description" TEXT NOT NULL DEFAULT ''
);
INSERT INTO "new_ApprovalThreshold" ("description", "id", "maxRiskScore", "minRiskScore", "requiredApprovers") SELECT "description", "id", "maxRiskScore", "minRiskScore", "requiredApprovers" FROM "ApprovalThreshold";
DROP TABLE "ApprovalThreshold";
ALTER TABLE "new_ApprovalThreshold" RENAME TO "ApprovalThreshold";
CREATE TABLE "new_AuditLog" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "quotationId" TEXT,
    "entityType" TEXT NOT NULL DEFAULT 'Quotation',
    "entityId" TEXT NOT NULL DEFAULT '',
    "action" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "details" TEXT NOT NULL DEFAULT '',
    "changes" TEXT NOT NULL DEFAULT '{}',
    "reason" TEXT NOT NULL DEFAULT '',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "AuditLog_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "AuditLog_quotationId_fkey" FOREIGN KEY ("quotationId") REFERENCES "Quotation" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_AuditLog" ("action", "changes", "createdAt", "entityId", "entityType", "id", "reason", "userId") SELECT "action", "changes", "createdAt", "entityId", "entityType", "id", "reason", "userId" FROM "AuditLog";
DROP TABLE "AuditLog";
ALTER TABLE "new_AuditLog" RENAME TO "AuditLog";
CREATE INDEX "AuditLog_quotationId_idx" ON "AuditLog"("quotationId");
CREATE INDEX "AuditLog_entityType_entityId_idx" ON "AuditLog"("entityType", "entityId");
CREATE INDEX "AuditLog_userId_idx" ON "AuditLog"("userId");
CREATE INDEX "AuditLog_createdAt_idx" ON "AuditLog"("createdAt");
CREATE TABLE "new_CategoryDiscountRule" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "category" TEXT NOT NULL,
    "maxDiscountPercent" REAL NOT NULL DEFAULT 0,
    "maxDiscountBps" INTEGER NOT NULL DEFAULT 0,
    "description" TEXT NOT NULL DEFAULT ''
);
INSERT INTO "new_CategoryDiscountRule" ("category", "description", "id", "maxDiscountPercent") SELECT "category", "description", "id", "maxDiscountPercent" FROM "CategoryDiscountRule";
DROP TABLE "CategoryDiscountRule";
ALTER TABLE "new_CategoryDiscountRule" RENAME TO "CategoryDiscountRule";
CREATE UNIQUE INDEX "CategoryDiscountRule_category_key" ON "CategoryDiscountRule"("category");
CREATE TABLE "new_DiscountRule" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "customerTier" TEXT NOT NULL,
    "maxDiscountPercent" REAL NOT NULL DEFAULT 0,
    "maxDiscountBps" INTEGER NOT NULL DEFAULT 0,
    "description" TEXT NOT NULL DEFAULT ''
);
INSERT INTO "new_DiscountRule" ("customerTier", "description", "id", "maxDiscountPercent") SELECT "customerTier", "description", "id", "maxDiscountPercent" FROM "DiscountRule";
DROP TABLE "DiscountRule";
ALTER TABLE "new_DiscountRule" RENAME TO "DiscountRule";
CREATE UNIQUE INDEX "DiscountRule_customerTier_key" ON "DiscountRule"("customerTier");
CREATE TABLE "new_Product" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "sku" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "type" TEXT NOT NULL DEFAULT 'HARDWARE',
    "description" TEXT NOT NULL DEFAULT '',
    "unitPrice" INTEGER NOT NULL,
    "costPrice" INTEGER NOT NULL DEFAULT 0,
    "taxRate" REAL NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);
INSERT INTO "new_Product" ("category", "costPrice", "createdAt", "description", "id", "isActive", "name", "sku", "taxRate", "type", "unitPrice", "updatedAt") SELECT "category", "costPrice", "createdAt", "description", "id", "isActive", "name", "sku", "taxRate", "type", "unitPrice", "updatedAt" FROM "Product";
DROP TABLE "Product";
ALTER TABLE "new_Product" RENAME TO "Product";
CREATE UNIQUE INDEX "Product_sku_key" ON "Product"("sku");
CREATE INDEX "Product_category_idx" ON "Product"("category");
CREATE INDEX "Product_type_idx" ON "Product"("type");
CREATE INDEX "Product_sku_idx" ON "Product"("sku");
CREATE TABLE "new_Quotation" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "number" TEXT NOT NULL,
    "title" TEXT NOT NULL DEFAULT 'New Quotation',
    "customerId" TEXT NOT NULL,
    "salesRepId" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'DRAFT',
    "subtotal" INTEGER NOT NULL DEFAULT 0,
    "taxTotal" INTEGER NOT NULL DEFAULT 0,
    "total" INTEGER NOT NULL DEFAULT 0,
    "orderDiscount" REAL NOT NULL DEFAULT 0,
    "orderDiscountBps" INTEGER NOT NULL DEFAULT 0,
    "totalDiscount" INTEGER NOT NULL DEFAULT 0,
    "marginPercent" REAL NOT NULL DEFAULT 0,
    "riskScore" REAL NOT NULL DEFAULT 0,
    "riskLevel" TEXT NOT NULL DEFAULT 'NONE',
    "version" INTEGER NOT NULL DEFAULT 1,
    "notes" TEXT NOT NULL DEFAULT '',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Quotation_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Quotation_salesRepId_fkey" FOREIGN KEY ("salesRepId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
INSERT INTO "new_Quotation" ("createdAt", "customerId", "id", "marginPercent", "notes", "number", "orderDiscount", "riskLevel", "riskScore", "salesRepId", "status", "subtotal", "taxTotal", "total", "updatedAt", "version") SELECT "createdAt", "customerId", "id", "marginPercent", "notes", "number", "orderDiscount", "riskLevel", "riskScore", "salesRepId", "status", "subtotal", "taxTotal", "total", "updatedAt", "version" FROM "Quotation";
DROP TABLE "Quotation";
ALTER TABLE "new_Quotation" RENAME TO "Quotation";
CREATE UNIQUE INDEX "Quotation_number_key" ON "Quotation"("number");
CREATE INDEX "Quotation_status_idx" ON "Quotation"("status");
CREATE INDEX "Quotation_customerId_idx" ON "Quotation"("customerId");
CREATE INDEX "Quotation_salesRepId_idx" ON "Quotation"("salesRepId");
CREATE INDEX "Quotation_createdAt_idx" ON "Quotation"("createdAt");
CREATE TABLE "new_QuotationLine" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "quotationId" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "variantId" TEXT,
    "productName" TEXT NOT NULL DEFAULT '',
    "productCategory" TEXT NOT NULL DEFAULT 'HARDWARE',
    "description" TEXT NOT NULL DEFAULT '',
    "quantity" INTEGER NOT NULL DEFAULT 1,
    "unitPrice" INTEGER NOT NULL,
    "lineDiscount" REAL NOT NULL DEFAULT 0,
    "discountBps" INTEGER NOT NULL DEFAULT 0,
    "discountAmount" INTEGER NOT NULL DEFAULT 0,
    "afterDiscount" INTEGER NOT NULL DEFAULT 0,
    "taxRate" INTEGER NOT NULL DEFAULT 0,
    "subtotal" INTEGER NOT NULL DEFAULT 0,
    "taxAmount" INTEGER NOT NULL DEFAULT 0,
    "total" INTEGER NOT NULL DEFAULT 0,
    "costPrice" INTEGER NOT NULL DEFAULT 0,
    "marginPercent" REAL NOT NULL DEFAULT 0,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    CONSTRAINT "QuotationLine_quotationId_fkey" FOREIGN KEY ("quotationId") REFERENCES "Quotation" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "QuotationLine_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "QuotationLine_variantId_fkey" FOREIGN KEY ("variantId") REFERENCES "ProductVariant" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_QuotationLine" ("costPrice", "description", "id", "lineDiscount", "marginPercent", "productId", "quantity", "quotationId", "sortOrder", "subtotal", "taxAmount", "total", "unitPrice", "variantId") SELECT "costPrice", "description", "id", "lineDiscount", "marginPercent", "productId", "quantity", "quotationId", "sortOrder", "subtotal", "taxAmount", "total", "unitPrice", "variantId" FROM "QuotationLine";
DROP TABLE "QuotationLine";
ALTER TABLE "new_QuotationLine" RENAME TO "QuotationLine";
CREATE INDEX "QuotationLine_quotationId_idx" ON "QuotationLine"("quotationId");
CREATE TABLE "new_User" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "role" TEXT NOT NULL DEFAULT 'SALES_REP',
    "tier" TEXT NOT NULL DEFAULT 'BRONZE',
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);
INSERT INTO "new_User" ("createdAt", "email", "id", "isActive", "name", "passwordHash", "role", "updatedAt") SELECT "createdAt", "email", "id", "isActive", "name", "passwordHash", "role", "updatedAt" FROM "User";
DROP TABLE "User";
ALTER TABLE "new_User" RENAME TO "User";
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");
CREATE INDEX "User_email_idx" ON "User"("email");
CREATE INDEX "User_role_idx" ON "User"("role");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
