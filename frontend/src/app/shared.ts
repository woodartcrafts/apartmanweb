export type Role = "ADMIN" | "RESIDENT";

export type AdminPageKey =
  | "APT_NEW"
  | "APT_LIST"
  | "APT_EDIT"
  | "APT_PASSWORDS"
  | "APT_UPLOAD"
  | "APT_BULK_UPDATE"
  | "APT_HISTORY"
  | "BUILDING_INFO"
  | "BLOCKS"
  | "APT_CLASSES"
  | "APT_TYPES"
  | "APT_DUTIES"
  | "CHARGE_TYPES_LIST"
  | "CHARGE_TYPES_CREATE"
  | "CHARGE_TYPES_EDIT"
  | "CHARGE_TYPES_DELETE"
  | "CHARGES_NEW_CREATE"
  | "CHARGES_BULK_CREATE"
  | "CHARGES_BULK_CORRECT_EDIT"
  | "CHARGES_GAS_CALC_CREATE"
  | "PAYMENT_METHODS_LIST"
  | "PAYMENT_METHODS_CREATE"
  | "PAYMENT_METHODS_EDIT"
  | "PAYMENT_METHODS_DELETE"
  | "PAYMENTS_NEW_CREATE"
  | "PAYMENTS_LIST_LIST"
  | "PAYMENTS_LIST_EDIT"
  | "PAYMENTS_LIST_DELETE"
  | "STATEMENT_VIEW"
  | "STATEMENT_ALL_VIEW"
  | "EXPENSE_ITEMS_LIST"
  | "EXPENSE_ITEMS_CREATE"
  | "EXPENSE_ITEMS_EDIT"
  | "EXPENSE_ITEMS_DELETE"
  | "EXPENSES_NEW_CREATE"
  | "EXPENSES_REPORT_LIST"
  | "EXPENSES_REPORT_EDIT"
  | "EXPENSES_REPORT_DELETE"
  | "REPORTS_SUMMARY"
  | "REPORTS_STAFF_MOBILE_HOME"
  | "REPORTS_OVERDUE"
  | "REPORTS_STAFF_OPEN_AIDAT"
  | "REPORTS_STAFF_OPEN_AIDAT_SEND_EMAIL"
  | "REPORTS_MONTHLY_BALANCE"
  | "REPORTS_MONTHLY_LEDGER"
  | "REPORTS_FRACTIONAL"
  | "REPORTS_REFERENCE_SEARCH"
  | "REPORTS_BANK_MOVEMENTS"
  | "BANKS"
  | "BANK_INITIAL_BALANCES"
  | "BANK_TERM_DEPOSITS_LIST"
  | "BANK_TERM_DEPOSITS_CREATE"
  | "BANK_TERM_DEPOSITS_EDIT"
  | "BANK_TERM_DEPOSITS_DELETE"
  | "BANK_STATEMENT_IMPORT"
  | "BANK_STATEMENT_VIEW"
  | "UPLOAD_BATCHES"
  | "CHECK_CHARGE_CONSISTENCY"
  | "CHECK_DOOR_MISMATCH"
  | "CHECK_BANK_STATEMENT"
  | "CHECK_MANUAL_REVIEW"
  | "SETTINGS_DESC_DOOR"
  | "SETTINGS_DESC_EXPENSE"
  | "RESIDENT_CONTENT"
  | "CORRECTIONS"
  | "UNCLASSIFIED"
  | "MANUAL_CLOSURES"
  | "AUDIT_LOGS"
  | "MEETING"
  | "GUIDE_MANUAL"
  | "USER_ACCESS"
  | "OPENING_ENTRY"
  | "LOGIN_LOGS";

export type AdminPagePermission = {
  visible: boolean;
  read: boolean;
  write: boolean;
  delete: boolean;
};

export type AdminPagePermissionMap = Record<AdminPageKey, AdminPagePermission>;

export type AdminPageDefinition = {
  key: AdminPageKey;
  label: string;
};

export type AdminUserAccessRow = {
  id: string;
  fullName: string;
  email: string;
  phone: string | null;
  role: Role;
  createdAt: string;
  updatedAt: string;
  permissions: AdminPagePermissionMap | null;
};

export type AdminUserAccessListResponse = {
  rows: AdminUserAccessRow[];
  total: number;
  limit: number;
  offset: number;
};

export type LoginLogRow = {
  id: string;
  userId: string | null;
  identifier: string | null;
  userFullName: string | null;
  userRole: string | null;
  ipAddress: string | null;
  success: boolean;
  failReason: string | null;
  createdAt: string;
};

export type LoginLogListResponse = {
  rows: LoginLogRow[];
  total: number;
};

export type UiMessageType = "success" | "error" | "info";

export type LoginResponse = {
  token: string;
  user: {
    id: string;
    email: string;
    phone?: string | null;
    fullName: string;
    role: Role;
    apartmentId: string | null;
    apartmentDoorNo: string | null;
    adminPagePermissions?: AdminPagePermissionMap | null;
  };
};

export type StatementItem = {
  chargeId: string;
  periodYear: number;
  periodMonth: number;
  type: string;
  description?: string | null;
  amount: number;
  paidTotal: number;
  remaining: number;
  status: string;
  dueDate: string;
  paidAt?: string | null;
};

export type ApartmentType = "KUCUK" | "BUYUK";
export type OccupancyType = "OWNER" | "TENANT";
export type PaymentMethod = "BANK_TRANSFER" | "CASH" | "CREDIT_CARD" | "OTHER";

export type AccountingStatementItem = {
  movementId: string;
  date: string;
  movementType: "BORC" | "ALACAK";
  description: string;
  debit: number;
  credit: number;
  balance: number;
  chargeId: string | null;
  paymentId: string | null;
  paymentMethod: PaymentMethod | null;
  periodYear: number | null;
  periodMonth: number | null;
};

export type StatementViewMode = "CLASSIC" | "ACCOUNTING";

export type StatementResponse = {
  apartmentId: string;
  apartmentDoorNo?: string | null;
  statement: StatementItem[];
  accountingStatement: AccountingStatementItem[];
};

export type BulkStatementItem = {
  chargeId: string;
  apartmentId: string;
  apartmentDoorNo: string;
  apartmentOwnerName: string | null;
  periodYear: number;
  periodMonth: number;
  type: string;
  description?: string | null;
  amount: number;
  paidTotal: number;
  remaining: number;
  status: string;
  dueDate: string;
};

export type BulkStatementResponse = {
  statement: BulkStatementItem[];
};

export type ReconcileApartmentResponse = {
  apartmentId: string;
  apartmentDoorNo: string;
  chargeCount: number;
  processedPaymentCount: number;
  skippedMixedPaymentCount: number;
  createdPaymentItemCount: number;
  unappliedPaymentCount: number;
  unappliedTotal: number;
  message: string;
};

export type ReconcileAllResponse = {
  apartmentCount: number;
  totals: {
    chargeCount: number;
    processedPaymentCount: number;
    skippedMixedPaymentCount: number;
    createdPaymentItemCount: number;
    unappliedPaymentCount: number;
    unappliedTotal: number;
  };
  results: ReconcileApartmentResponse[];
  message: string;
};

export type MixedPaymentReportRow = {
  paymentId: string;
  paidAt: string;
  method: PaymentMethod;
  totalAmount: number;
  linkedAmount: number;
  note: string | null;
  apartmentCount: number;
  apartments: string[];
  allocations: Array<{
    apartmentId: string;
    apartmentDoorNo: string;
    blockName: string;
    amount: number;
  }>;
};

export type MixedPaymentReportResponse = {
  totalCount: number;
  rows: MixedPaymentReportRow[];
};

export type DoorMismatchReportRow = {
  paymentItemId: string;
  paymentId: string;
  paidAt: string;
  paymentTotal: number;
  allocatedAmount: number;
  paymentDoorNo: string | null;
  linkedDoorNo: string;
  linkedBlockName: string;
  periodYear: number;
  periodMonth: number;
  chargeTypeName: string;
  chargeDescription: string | null;
  paymentNote: string | null;
  sourceFileName: string | null;
  sourceUploadedAt: string | null;
};

export type DoorMismatchReportResponse = {
  totals: {
    bankStatementPaymentItemCount: number;
    mismatchPaymentItemCount: number;
    mismatchPaymentCount: number;
    mismatchAllocatedTotal: number;
  };
  rows: DoorMismatchReportRow[];
};

export type BulkFilterKey =
  | "apartmentDoorNo"
  | "apartmentOwnerName"
  | "period"
  | "type"
  | "description"
  | "dueDate"
  | "amount"
  | "paidTotal"
  | "remaining"
  | "status";

export type BulkFilterSelections = Record<BulkFilterKey, string[]>;

export type ApartmentOption = {
  id: string;
  blockName: string;
  doorNo: string;
  m2: number | null;
  arsaPayi: number | null;
  type: ApartmentType;
  apartmentClassId: string | null;
  apartmentClassCode: string | null;
  apartmentClassName: string | null;
  apartmentDutyId: string | null;
  apartmentDutyCode: string | null;
  apartmentDutyName: string | null;
  hasAidat: boolean;
  hasDogalgaz: boolean;
  hasOtherDues: boolean;
  hasIncome: boolean;
  hasExpenses: boolean;
  ownerFullName: string | null;
  occupancyType: OccupancyType;
  moveInDate: string | null;
  email1: string | null;
  email2: string | null;
  email3: string | null;
  email4: string | null;
  phone1: string | null;
  phone2: string | null;
  phone3: string | null;
  phone4: string | null;
  landlordFullName: string | null;
  landlordPhone: string | null;
  landlordEmail: string | null;
  residentUsers: Array<{
    id: string;
    fullName: string;
    email: string;
    phone: string | null;
    lastPasswordChangedAt: string | null;
    lastPasswordChangeReason: "INITIAL_SEED" | "ADMIN_SET" | "SELF_CHANGE" | null;
    lastPasswordChangedByName: string | null;
    lastPasswordChangedByEmail: string | null;
  }>;
};

export type ResidentPasswordHistoryRow = {
  id: string;
  userId: string;
  userFullName: string;
  userEmail: string;
  reason: "INITIAL_SEED" | "ADMIN_SET" | "SELF_CHANGE";
  changedAt: string;
  changedByUserId: string | null;
  changedByName: string | null;
  changedByEmail: string | null;
};

export type BlockDefinition = {
  id: string;
  name: string;
  apartmentCount: number;
};

export type ApartmentClassDefinition = {
  id: string;
  code: string;
  name: string;
  isActive: boolean;
  apartmentCount: number;
};

export type ApartmentTypeDefinition = {
  id: string;
  code: string;
  name: string;
  isActive: boolean;
  apartmentCount: number;
};

export type ApartmentDutyDefinition = {
  id: string;
  code: string;
  name: string;
  isActive: boolean;
  apartmentCount: number;
};

export type BankBranchDefinition = {
  id: string;
  bankId: string;
  bankName: string;
  name: string;
  branchCode: string | null;
  accountName: string | null;
  accountNumber: string | null;
  iban: string | null;
  phone: string | null;
  email: string | null;
  address: string | null;
  representativeName: string | null;
  representativePhone: string | null;
  representativeEmail: string | null;
  notes: string | null;
  isActive: boolean;
};

export type BankDefinition = {
  id: string;
  name: string;
  isActive: boolean;
  branchCount: number;
  branches: BankBranchDefinition[];
};

export type BankTermDepositRow = {
  id: string;
  bankId: string;
  bankName: string;
  branchId: string | null;
  branchName: string | null;
  principalAmount: number;
  annualInterestRate: number;
  withholdingTaxRate: number;
  startDate: string;
  endDate: string;
  notes: string | null;
  isActive: boolean;
  updatedAt: string;
  dayCount: number;
  grossInterest: number;
  withholdingAmount: number;
  netInterest: number;
  netMaturityAmount: number;
};

export type BulkPricingMode = "UNIFORM" | "BY_TYPE";

export type ChargeTypeDefinition = {
  id: string;
  code: string;
  name: string;
  payerTarget: "OWNER" | "TENANT";
  isActive: boolean;
};

export type PaymentMethodDefinition = {
  id: string;
  code: PaymentMethod;
  name: string;
  isActive: boolean;
};

export type ExpenseItemDefinition = {
  id: string;
  code: string;
  name: string;
  isActive: boolean;
};

export type ChargeCorrectionRow = {
  id: string;
  apartmentId: string;
  chargeTypeId: string;
  chargeTypeName: string;
  periodYear: number;
  periodMonth: number;
  amount: number;
  dueDate: string;
  description: string | null;
  status: string;
};

export type DistributedInvoiceRow = {
  chargeTypeId: string;
  chargeTypeName: string;
  chargeTypeCode: string;
  periodYear: number;
  periodMonth: number;
  dueDate: string;
  description: string | null;
  invoiceFileName: string;
  createdAt: string;
  chargeCount: number;
  totalAmount: number;
  linkedPaymentCount: number;
  canDelete: boolean;
};

export type DistributedInvoiceChargeDetailRow = {
  id: string;
  apartmentId: string;
  blockName: string;
  doorNo: string;
  apartmentType: ApartmentType;
  ownerFullName: string | null;
  chargeTypeId: string;
  chargeTypeCode: string;
  chargeTypeName: string;
  periodYear: number;
  periodMonth: number;
  amount: number;
  dueDate: string;
  description: string | null;
  linkedPaymentCount: number;
};

export type PaymentItemCorrectionRow = {
  paymentItemId: string;
  paymentId: string;
  chargeId: string;
  chargeTypeName: string;
  periodYear: number;
  periodMonth: number;
  amount: number;
  paidAt: string;
  method: PaymentMethod;
  note: string | null;
  isReconcileLocked: boolean;
};

export type PaymentListRow = {
  id: string;
  paidAt: string;
  totalAmount: number;
  method: PaymentMethod;
  note: string | null;
  reference: string | null;
  description: string | null;
  createdAt: string;
  source: "MANUAL" | "BANK_STATEMENT_UPLOAD" | "PAYMENT_UPLOAD" | "GMAIL";
  createdByUserId: string | null;
  createdByName: string | null;
  createdByEmail: string | null;
  apartments: string[];
  apartmentId: string | null;
};

export type ExpenseReportRow = {
  id: string;
  expenseItemId: string;
  distributionChargeTypeId?: string;
  distributionPeriodYear?: number;
  distributionPeriodMonth?: number;
  distributionMatchDescription?: string | null;
  distributionDueDate?: string;
  distributionInvoiceDate?: string | null;
  distributionPeriodStartDate?: string | null;
  distributionPeriodEndDate?: string | null;
  expenseItemName: string;
  spentAt: string;
  amount: number;
  paymentMethod: PaymentMethod;
  description: string | null;
  reference: string | null;
  createdAt: string;
  source: "MANUAL" | "BANK_STATEMENT_UPLOAD" | "GMAIL" | "CHARGE_DISTRIBUTION";
  createdByUserId: string | null;
  createdByName: string | null;
  createdByEmail: string | null;
};

export type UnclassifiedPaymentRow = PaymentListRow;

export type UnclassifiedExpenseRow = ExpenseReportRow;

export type AdminActionLogRow = {
  id: string;
  createdAt: string;
  undoUntil: string | null;
  undoneAt: string | null;
  actionType: "EDIT" | "DELETE" | "UNDO";
  entityType: "PAYMENT" | "EXPENSE";
  entityId: string;
  actorUserId: string | null;
  actorName: string | null;
  actorEmail: string | null;
  canUndo: boolean;
  before: unknown;
  after: unknown;
};

export type UploadBatchKind = "PAYMENT_UPLOAD" | "BANK_STATEMENT_UPLOAD";

export type UploadBatchRow = {
  id: string;
  kind: UploadBatchKind;
  fileName: string;
  uploadedAt: string;
  uploadedByUserId: string | null;
  uploadedByName: string | null;
  uploadedByEmail: string | null;
  totalRows: number;
  createdPaymentCount: number;
  createdExpenseCount: number;
  skippedCount: number;
  manualReviewCount: number;
  unclassifiedCount: number;
  splitPaymentLineCount: number;
};

export type UploadBatchUploader = {
  id: string;
  fullName: string;
  email: string;
};

export type ApartmentChangeLogRow = {
  id: string;
  apartmentId: string;
  changedAt: string;
  changedByUserId: string | null;
  changedByName: string | null;
  changedByEmail: string | null;
  action: "CREATE" | "UPDATE" | "BULK_UPDATE_CLASS";
  note: string | null;
  changedFields: string[];
  before: Record<string, unknown>;
  after: Record<string, unknown>;
};

export type UploadBatchDetailsResponse = {
  batch: {
    id: string;
    kind: UploadBatchKind;
    fileName: string;
    uploadedAt: string;
    uploadedByName: string | null;
    uploadedByEmail: string | null;
    totalRows: number;
    createdPaymentCount: number;
    createdExpenseCount: number;
    skippedCount: number;
  };
  payments: Array<{
    id: string;
    paidAt: string;
    totalAmount: number;
    method: PaymentMethod;
    reference: string | null;
    note: string | null;
    apartmentLabels: string[];
  }>;
  expenses: Array<{
    id: string;
    spentAt: string;
    amount: number;
    paymentMethod: PaymentMethod;
    expenseItemName: string;
    description: string | null;
    reference: string | null;
  }>;
};

export type ReportsSummaryResponse = {
  snapshotAt: string;
  bankBalance: {
    estimatedBalance: number;
    latestStatementClosingBalance: number | null;
    isEstimatedBalanceMatchingLatestStatement: boolean | null;
    statementBalanceDelta: number | null;
    statementMatchBatchId: string | null;
    statementMatchFileName: string | null;
    statementMatchUploadedAt: string | null;
    totalBankIn: number;
    totalBankOut: number;
    latestMovementAt: string | null;
  };
  collectionsAndExpenses: {
    totalCollections: number;
    totalExpenses: number;
    netCollections: number;
  };
  receivables: {
    openChargeCount: number;
    openRemainingTotal: number;
    overdueChargeCount: number;
    overdueApartmentCount: number;
    overdueRemainingTotal: number;
    monthEndUpcomingTotal: number;
    upcoming30DaysTotal: number;
    oldestOverdueDate: string | null;
  };
  occupancy: {
    apartmentCount: number;
    residentUserCount: number;
  };
  apartmentOverview: {
    totalApartmentCount: number;
    kucukApartmentCount: number;
    buyukApartmentCount: number;
    apartmentClassCount: number;
    apartmentClassBreakdown: Array<{
      className: string;
      count: number;
    }>;
    ownerCount: number;
    tenantCount: number;
    managers: string[];
    dutyAssignments: Array<{
      dutyName: string;
      apartment: string;
    }>;
  };
  latestBankMovements: Array<{
    id: string;
    occurredAt: string;
    movementType: "PAYMENT" | "EXPENSE";
    amount: number;
    description: string;
  }>;
  latestUploadBatches: Array<{
    id: string;
    kind: UploadBatchKind;
    fileName: string;
    uploadedAt: string;
    totalRows: number;
    createdPaymentCount: number;
    createdExpenseCount: number;
    skippedCount: number;
    manualReviewCount: number;
    unclassifiedCount: number;
  }>;
  topExpenses: Array<{
    id: string;
    expenseItemName: string;
    totalAmount: number;
    expenseCount: number;
    latestSpentAt: string | null;
  }>;
  topOverdueApartments: Array<{
    apartmentId: string;
    apartmentLabel: string;
    remainingTotal: number;
    overdueChargeCount: number;
  }>;
};

export type OverduePaymentsReportRow = {
  chargeId: string;
  blockName: string;
  apartmentDoorNo: string;
  apartmentOwnerName: string | null;
  chargeTypeName: string;
  periodYear: number;
  periodMonth: number;
  dueDate: string;
  amount: number;
  paidTotal: number;
  remaining: number;
  overdueDays: number;
  description: string | null;
  lastPaymentAt: string | null;
};

export type OverduePaymentsReportResponse = {
  snapshotAt: string;
  totals: {
    rowCount: number;
    totalAmount: number;
    totalPaid: number;
    totalRemaining: number;
  };
  rows: OverduePaymentsReportRow[];
};

export type StaffOpenAidatReportRow = {
  chargeId: string;
  apartmentId: string;
  blockName: string;
  apartmentDoorNo: string;
  apartmentOwnerName: string | null;
  chargeTypeName: string;
  periodYear: number;
  periodMonth: number;
  dueDate: string;
  amount: number;
  paidTotal: number;
  remaining: number;
  overdueDays: number;
  description: string | null;
};

export type StaffOpenAidatReportResponse = {
  snapshotAt: string;
  apartment: {
    apartmentId: string;
    blockName: string;
    apartmentDoorNo: string;
    apartmentOwnerName: string | null;
  };
  totals: {
    rowCount: number;
    totalAmount: number;
    totalPaid: number;
    totalRemaining: number;
  };
  rows: StaffOpenAidatReportRow[];
};

export type FractionalClosureReportRow = {
  chargeId: string;
  apartmentId: string;
  blockName: string;
  apartmentDoorNo: string;
  apartmentOwnerName: string | null;
  chargeTypeName: string;
  periodYear: number;
  periodMonth: number;
  dueDate: string;
  amount: number;
  paidTotal: number;
  remaining: number;
  description: string | null;
  lastPaymentAt: string | null;
  sourceMonth: string | null;
};

export type FractionalClosureReportResponse = {
  snapshotAt: string;
  criteria: {
    openPartialOnly: boolean;
  };
  totals: {
    rowCount: number;
    totalAmount: number;
    totalPaid: number;
    totalRemaining: number;
  };
  rows: FractionalClosureReportRow[];
};

export type BankReconciliationRow = {
  id: string;
  occurredAt: string;
  entryType: "IN" | "OUT";
  amount: number;
  description: string | null;
  reference: string | null;
  isOpeningBalance: boolean;
  source: "MANUAL" | "BANK_STATEMENT_UPLOAD" | "PAYMENT_UPLOAD";
  fileName: string | null;
};

export type BankReconciliationReportResponse = {
  snapshotAt: string;
  criteria: {
    from: string | null;
    to: string | null;
    limit: number;
  };
  totals: {
    totalIn: number;
    totalOut: number;
    net: number;
    openingBalance: number;
    startingBalance: number;
    openingDate: string | null;
    paymentCount: number;
    expenseCount: number;
    movementCount: number;
  };
  rows: BankReconciliationRow[];
};

export type MonthlyLedgerPrintRow = {
  seqNo: number;
  id: string;
  date: string;
  description: string;
  reference: string | null;
  amount: number;
};

export type MonthlyLedgerPrintMonth = {
  month: number;
  incomeRows: MonthlyLedgerPrintRow[];
  expenseRows: MonthlyLedgerPrintRow[];
  incomeMonthTotal: number;
  expenseMonthTotal: number;
  incomeCarryInTotal: number;
  expenseCarryInTotal: number;
  incomeCumulativeTotal: number;
  expenseCumulativeTotal: number;
  monthNet: number;
  closingBankBalance: number;
};

export type MonthlyLedgerPrintResponse = {
  snapshotAt: string;
  criteria: {
    year: number;
    paymentMethod: PaymentMethod;
  };
  opening: {
    openingBalance: number;
    previousIncomeTotal: number;
    previousExpenseTotal: number;
    openingBeforeYear: number;
    openingInYear: number;
  };
  totals: {
    incomeYearTotal: number;
    expenseYearTotal: number;
    yearNet: number;
    yearEndBankBalance: number;
  };
  months: MonthlyLedgerPrintMonth[];
};

export type ChargeConsistencyWarningRow = {
  code:
    | "MISSING_CHARGE"
    | "DUPLICATE_CHARGE"
    | "AMOUNT_MISMATCH"
    | "DUE_DATE_NOT_MONTH_END"
    | "NONPOSITIVE_AMOUNT"
    | "EXEMPT_APARTMENT_HAS_CHARGE";
  severity: "WARN";
  message: string;
  apartmentId: string;
  blockName: string;
  apartmentDoorNo: string;
  apartmentType: ApartmentType;
  apartmentOwnerName: string | null;
  residentNames: string[];
  periodYear: number;
  periodMonth: number;
  chargeId: string | null;
  chargeTypeName: string | null;
  actualAmount: number | null;
  expectedAmount: number | null;
  actualDueDate: string | null;
  expectedDueDate: string | null;
};

export type ChargeConsistencyReportResponse = {
  snapshotAt: string;
  criteria: {
    periodYear: number;
    periodMonths: number[];
    chargeTypeId: string | null;
    apartmentType: ApartmentType | null;
    expectedBuyukAmount: number | null;
    expectedKucukAmount: number | null;
    requireMonthEndDueDate: boolean;
    includeMissing: boolean;
  };
  totals: {
    totalApartmentCount: number;
    targetApartmentCount: number;
    excludedApartmentCount: number;
    scannedChargeCount: number;
    warningCount: number;
    byCode: Record<string, number>;
  };
  excludedApartments: Array<{
    apartmentId: string;
    blockName: string;
    apartmentDoorNo: string;
    apartmentType: ApartmentType;
    apartmentDutyName: string | null;
    reason: string;
  }>;
  rows: ChargeConsistencyWarningRow[];
};

export type ApartmentMonthlyBalanceMatrixMonth = {
  month: number;
  monthEnd: string;
};

export type ApartmentMonthlyBalanceMatrixRow = {
  apartmentId: string;
  blockName: string;
  apartmentDoorNo: string;
  occupant: string;
  monthBalances: number[];
  yearEndBalance: number;
  hasPartialMonth: boolean;
};

export type ApartmentMonthlyBalanceMatrixReportResponse = {
  snapshotAt: string;
  criteria: {
    year: number;
  };
  months: ApartmentMonthlyBalanceMatrixMonth[];
  totals: {
    apartmentCount: number;
    monthlyTotals: number[];
    yearEndTotal: number;
  };
  rows: ApartmentMonthlyBalanceMatrixRow[];
};

export type ReferenceMovementSearchRow = {
  movementId: string;
  movementType: "PAYMENT" | "EXPENSE";
  expenseItemId?: string;
  occurredAt: string;
  amount: number;
  method: PaymentMethod | null;
  reference: string | null;
  description: string | null;
  source: "MANUAL" | "BANK_STATEMENT_UPLOAD" | "PAYMENT_UPLOAD" | "CHARGE_DISTRIBUTION";
  apartmentDoorNos: string[];
  fileName: string | null;
};

export type ReferenceMovementSearchResponse = {
  snapshotAt: string;
  criteria: {
    reference: string;
  };
  totals: {
    movementCount: number;
    paymentCount: number;
    expenseCount: number;
    paymentTotal: number;
    expenseTotal: number;
    net: number;
  };
  rows: ReferenceMovementSearchRow[];
};

export type ManualReviewMatchRow = {
  paymentId: string;
  paidAt: string;
  createdAt: string;
  totalAmount: number;
  method: PaymentMethod;
  source: "MANUAL" | "BANK_STATEMENT_UPLOAD" | "PAYMENT_UPLOAD";
  importBatchId: string | null;
  importFileName: string | null;
  importUploadedAt: string | null;
  note: string | null;
  doorNo: string | null;
  reference: string | null;
  description: string | null;
  reasonCode: "NO_EXACT_MATCH" | "MULTIPLE_EXACT_MATCH" | "UNKNOWN";
  reasonCount: number | null;
  apartmentLabels: string[];
};

export type ManualReviewMatchesReportResponse = {
  totalCount: number;
  rows: ManualReviewMatchRow[];
};

export type DescriptionDoorRule = {
  id: string;
  keyword: string;
  normalizedKeyword: string;
  doorNo: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
};

export type DescriptionExpenseRule = {
  id: string;
  keyword: string;
  normalizedKeyword: string;
  expenseItemId: string;
  expenseItemCode: string;
  expenseItemName: string;
  expenseItemIsActive: boolean;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
};

export type PaymentSourceFilter = "" | "MANUAL" | "BANK_STATEMENT_UPLOAD" | "PAYMENT_UPLOAD" | "GMAIL";
export type ExpenseSourceFilter = "" | "MANUAL" | "BANK_STATEMENT_UPLOAD" | "GMAIL" | "CHARGE_DISTRIBUTION";

export type AdminMenuKey = "DR" | "TH" | "OD" | "EK" | "RP" | "GD" | "BN" | "SD";

export type BankStatementPreviewRow = {
  rowNo: number;
  occurredAt: string;
  amount: number;
  entryType: "PAYMENT" | "EXPENSE";
  isAutoSplit?: boolean;
  splitSourceRowNo?: number | null;
  doorNo: string | null;
  expenseItemId: string | null;
  description: string;
  reference: string | null;
  txType: string | null;
  paymentMethod: PaymentMethod;
};

export type SkippedRowInfo = {
  rowNo: number | null;
  raw: string;
  explanation: string;
};

export type ImportInfoNote = {
  rowNo: number | null;
  raw: string;
  explanation: string;
};

export type ImportSummary = {
  title: string;
  totalRows: number;
  savedCount: number;
  skippedCount: number;
  savedLabel?: string;
  detailText?: string;
};

export type InitialBalanceDefaultsResponse = {
  defaultOpeningDate: string;
  entries: Array<{
    id: string;
    bankName: string;
    branchName: string | null;
    openingBalance: number;
    openingDate: string;
  }>;
};

export type InitialBalanceApplyResponse = {
  appliedEntryCount: number;
  deletedOpeningPayments: number;
  createdOpeningPayments: number;
  totalOpeningBalance: number;
};

export type ResidentAnnouncementItem = {
  id: string;
  title: string;
  content: string;
  publishAt: string;
  expiresAt: string | null;
  createdAt: string;
};

export type ResidentPollOptionItem = {
  id: string;
  text: string;
  sortOrder: number;
  voteCount: number;
};

export type ResidentPollItem = {
  id: string;
  title: string;
  description: string | null;
  allowMultiple: boolean;
  startsAt: string;
  endsAt: string | null;
  createdAt: string;
  myOptionIds: string[];
  totalVotes: number;
  options: ResidentPollOptionItem[];
};

export type ResidentEngagementResponse = {
  snapshotAt: string;
  announcements: ResidentAnnouncementItem[];
  polls: ResidentPollItem[];
};

export type ResidentExpenseReportTopItem = {
  expenseItemId: string;
  expenseItemName: string;
  totalAmount: number;
  expenseCount: number;
};

export type ResidentExpenseReportRow = {
  id: string;
  expenseItemId: string;
  expenseItemName: string;
  spentAt: string;
  amount: number;
  paymentMethod: PaymentMethod;
  description: string | null;
  reference: string | null;
  createdAt: string;
};

export type ResidentExpenseReportResponse = {
  from: string | null;
  to: string | null;
  totalAmount: number;
  totalCount: number;
  topItems: ResidentExpenseReportTopItem[];
  rows: ResidentExpenseReportRow[];
};

export type AdminResidentAnnouncementRow = {
  id: string;
  title: string;
  content: string;
  isActive: boolean;
  publishAt: string;
  expiresAt: string | null;
  createdById: string | null;
  createdAt: string;
  updatedAt: string;
};

export type AdminResidentPollRow = {
  id: string;
  title: string;
  description: string | null;
  isActive: boolean;
  allowMultiple: boolean;
  startsAt: string;
  endsAt: string | null;
  createdById: string | null;
  createdAt: string;
  updatedAt: string;
  totalVotes: number;
  options: Array<{
    id: string;
    text: string;
    sortOrder: number;
    isActive: boolean;
    voteCount: number;
  }>;
};

export const apiBase = import.meta.env.VITE_API_BASE_URL ?? "http://localhost:3000";
export const tokenStorageKey = "apartmanweb_token";
export const userStorageKey = "apartmanweb_user";
export const monthOptions = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12];
export const paymentMethodEnumOptions: PaymentMethod[] = ["BANK_TRANSFER", "CASH", "CREDIT_CARD", "OTHER"];

export function formatTry(amount: number): string {
  return new Intl.NumberFormat("tr-TR", {
    style: "currency",
    currency: "TRY",
    maximumFractionDigits: 2,
  }).format(amount);
}

export function dateInputToIso(value: string): string {
  return new Date(`${value}T00:00:00.000Z`).toISOString();
}

export function isoToDateInput(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "";
  }
  return date.toISOString().slice(0, 10);
}

export function formatDateTr(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "-";
  }
  return new Intl.DateTimeFormat("tr-TR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(date);
}

export function formatDateTimeTr(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "-";
  }
  return new Intl.DateTimeFormat("tr-TR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

export function isoToDateTimeInput(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "";
  }
  const pad = (num: number) => String(num).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(
    date.getMinutes()
  )}`;
}

export function dateTimeInputToIso(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return new Date().toISOString();
  }
  return date.toISOString();
}

export function explainSkippedError(raw: string): string {
  const text = raw.toLocaleLowerCase("tr");

  if (text.includes("acik borc yok")) {
    return "Bu dairede acik tahakkuk bulunamadigi icin odeme dagitilamadi.";
  }
  if (text.includes("ayni dosyada tekrar referans")) {
    return "Ayni referans bu dosyada birden fazla kez gectigi icin tekrar kayit engellendi.";
  }
  if (text.includes("daha once islenmis") && text.includes("referans")) {
    return "Bu referans daha once kaydedildigi icin cift kayit olusmasin diye atlandi.";
  }
  if (text.includes("gider kalemi secilmedi") || (text.includes("gider kalemi") && text.includes("bulunamadi"))) {
    return "Gider kalemi bulunamadigi icin satir gider olarak kaydedilemedi.";
  }
  if (text.includes("daire no gerekli")) {
    return "Tahsilat satirinda daire no bos oldugu icin kayit yapilamadi.";
  }
  if (text.includes("daire bulunamadi")) {
    return "Aciklamadan bulunan daire numarasi sistemde olmadigi icin satir atlandi.";
  }
  if (text.includes("beklenmeyen hata")) {
    return "Satir islenirken teknik bir hata olustu; loglardan detay kontrol edilebilir.";
  }

  return "Bu satir, veri kurallarina uymadigi icin kaydedilmedi.";
}

export function mapSkippedErrors(errors: string[]): SkippedRowInfo[] {
  return errors.map((raw) => {
    const match = raw.match(/satir\s+(\d+)/i);
    return {
      rowNo: match ? Number(match[1]) : null,
      raw,
      explanation: explainSkippedError(raw),
    };
  });
}

export function explainInfoMessage(raw: string): string {
  const text = raw.toLocaleLowerCase("tr");

  const parseInfoContext = (): { doorNo: string | null; amountText: string | null } => {
    const bracketDoorMatch = raw.match(/\[\s*DAIRE\s*:\s*([^\]|]+)\s*\|/i);
    const fallbackDoorMatch = raw.match(/manuel incelemeye birakildi\s*\(([^)]+)\)/i);
    const genericDoorMatch = raw.match(/\(([^)]+)\)(?!.*\([^)]+\))/);
    const amountMatch = raw.match(/\|\s*TUTAR\s*:\s*([0-9]+(?:\.[0-9]{1,2})?)\s*\]/i);
    const overpaymentAmountMatch = raw.match(/,\s*([0-9]+(?:\.[0-9]{1,2})?)\s+tutar\s+dagitimsiz\s+birakildi/i);

    const normalize = (value: string | undefined): string | null => {
      if (!value) {
        return null;
      }
      const cleaned = value.trim();
      if (!cleaned || cleaned === "-") {
        return null;
      }
      return cleaned;
    };

    return {
      doorNo: normalize(bracketDoorMatch?.[1] ?? fallbackDoorMatch?.[1] ?? genericDoorMatch?.[1]),
      amountText: normalize(amountMatch?.[1] ?? overpaymentAmountMatch?.[1]),
    };
  };

  const infoContext = parseInfoContext();
  const details = [
    infoContext.doorNo ? `Daire: ${infoContext.doorNo}` : null,
    infoContext.amountText ? `Tutar: ${infoContext.amountText}` : null,
  ]
    .filter(Boolean)
    .join(" | ");
  const detailsSuffix = details ? ` (${details})` : "";
  const withDetails = (message: string): string => `${message}${detailsSuffix}`;

  if (text.includes("manuel incelemeye birakildi") && text.includes("exact eslesme yok")) {
    return withDetails("Birden fazla acik borc oldugu halde tekil exact eslesme bulunamadi; odeme otomatik kapatilmayip manuel incelemeye alindi.");
  }
  if (text.includes("manuel incelemeye birakildi") && text.includes("birden fazla exact")) {
    return withDetails("Birden fazla exact eslesme oldugu icin yanlis tahakkuk kapanmasi engellendi; manuel secim gerekli.");
  }
  if (text.includes("manual_review")) {
    return withDetails("Sistem bu odemeyi riskli buldugu icin otomatik dagitmadan manuel incelemeye birakti.");
  }
  if (text.includes("birden fazla exact eslesmede en eski tahakkuk secildi")) {
    return withDetails("Birden fazla birebir eslesme oldugu icin sistem en eski acik borcu secerek otomatik dagitim yapti.");
  }

  if (text.includes("acik borc yoktu") && text.includes("dagitimsiz kaydedildi")) {
    return withDetails("Odeme kaydi olusturuldu ancak acik borc olmadigi icin herhangi bir tahakkuga dagitilmadi.");
  }
  if (text.includes("odeme acik borcu asti") && text.includes("dagitimsiz birakildi")) {
    return withDetails("Odeme mevcut acik borclara dagitildi; borcu asan kalan tutar dagitimsiz kaydedildi.");
  }
  if (text.includes("acik borcun tamamini karsiladi") && text.includes("tahakkuklar kapatildi")) {
    return withDetails("Odeme, dairenin tum acik tahakkuklarini otomatik kapatti.");
  }
  if (text.includes("ayni dosya referansi kabul edildi")) {
    return withDetails("Ayni dosyada tekrar eden referans, banka masrafi istisnasi nedeniyle kaydedildi.");
  }
  if (text.includes("mevcut gider referansi tekrarina izin verildi")) {
    return withDetails("Bu satir banka masrafi istisnasi ile tekrar referansla kaydedildi.");
  }

  return withDetails("Bilgi notu: satir kaydedildi ancak dikkat gerektiren bir durum var.");
}

export function mapImportInfos(infos: string[]): ImportInfoNote[] {
  return infos.map((raw) => {
    const match = raw.match(/satir\s+(\d+)/i);
    return {
      rowNo: match ? Number(match[1]) : null,
      raw,
      explanation: explainInfoMessage(raw),
    };
  });
}
