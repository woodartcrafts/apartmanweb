export type Role = "ADMIN" | "RESIDENT";

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
  email1: string | null;
  email2: string | null;
  email3: string | null;
  phone1: string | null;
  phone2: string | null;
  phone3: string | null;
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
  source: "MANUAL" | "BANK_STATEMENT_UPLOAD" | "PAYMENT_UPLOAD";
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
  source: "MANUAL" | "BANK_STATEMENT_UPLOAD" | "CHARGE_DISTRIBUTION";
  createdByUserId: string | null;
  createdByName: string | null;
  createdByEmail: string | null;
};

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
    aidatMuafCount: number;
    dogalgazMuafCount: number;
    aidatMuafApartments: string[];
    dogalgazMuafApartments: string[];
    managers: string[];
    dutyAssignments: Array<{
      dutyName: string;
      apartment: string;
    }>;
  };
  latestUploadBatches: Array<{
    id: string;
    kind: UploadBatchKind;
    fileName: string;
    uploadedAt: string;
    totalRows: number;
    createdPaymentCount: number;
    createdExpenseCount: number;
    skippedCount: number;
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

export type PaymentSourceFilter = "" | "MANUAL" | "BANK_STATEMENT_UPLOAD" | "PAYMENT_UPLOAD";
export type ExpenseSourceFilter = "" | "MANUAL" | "BANK_STATEMENT_UPLOAD" | "CHARGE_DISTRIBUTION";

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

  if (text.includes("manuel incelemeye birakildi") && text.includes("exact eslesme yok")) {
    return "Birden fazla acik borc oldugu halde tekil exact eslesme bulunamadi; odeme otomatik kapatilmayip manuel incelemeye alindi.";
  }
  if (text.includes("manuel incelemeye birakildi") && text.includes("birden fazla exact")) {
    return "Birden fazla exact eslesme oldugu icin yanlis tahakkuk kapanmasi engellendi; manuel secim gerekli.";
  }
  if (text.includes("manual_review")) {
    return "Sistem bu odemeyi riskli buldugu icin otomatik dagitmadan manuel incelemeye birakti.";
  }

  if (text.includes("acik borc yoktu") && text.includes("dagitimsiz kaydedildi")) {
    return "Odeme kaydi olusturuldu ancak acik borc olmadigi icin herhangi bir tahakkuga dagitilmadi.";
  }
  if (text.includes("ayni dosya referansi kabul edildi")) {
    return "Ayni dosyada tekrar eden referans, banka masrafi istisnasi nedeniyle kaydedildi.";
  }
  if (text.includes("mevcut gider referansi tekrarina izin verildi")) {
    return "Bu satir banka masrafi istisnasi ile tekrar referansla kaydedildi.";
  }

  return "Bilgi notu: satir kaydedildi ancak dikkat gerektiren bir durum var.";
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
