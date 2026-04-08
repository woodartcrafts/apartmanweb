import { lazy, Suspense, useEffect, useMemo, useRef, useState } from "react";
import type { FormEvent, KeyboardEvent as ReactKeyboardEvent, MouseEvent as ReactMouseEvent } from "react";
import { Navigate, NavLink, Route, Routes, useLocation, useNavigate } from "react-router-dom";
import {
  apiBase,
  dateInputToIso,
  dateTimeInputToIso,
  formatDateTimeTr,
  formatDateTr,
  formatTry,
  isoToDateInput,
  isoToDateTimeInput,
  mapImportInfos,
  mapSkippedErrors,
  monthOptions,
  userStorageKey,
  type AccountingStatementItem,
  type AdminActionLogRow,
  type ApartmentClassDefinition,
  type ApartmentDutyDefinition,
  type ApartmentTypeDefinition,
  type ApartmentOption,
  type ApartmentType,
  type BankBranchDefinition,
  type BankDefinition,
  type BankTermDepositRow,
  type BankStatementPreviewRow,
  type BlockDefinition,
  type BulkFilterKey,
  type BulkFilterSelections,
  type BulkPricingMode,
  type BulkStatementItem,
  type BulkStatementResponse,
  type ChargeCorrectionRow,
  type ChargeConsistencyReportResponse,
  type ChargeConsistencyWarningRow,
  type ChargeTypeDefinition,
  type FractionalClosureReportResponse,
  type FractionalClosureReportRow,
  type DescriptionDoorRule,
  type DescriptionExpenseRule,
  type DoorMismatchReportResponse,
  type DoorMismatchReportRow,
  type DistributedInvoiceChargeDetailRow,
  type DistributedInvoiceRow,
  type ExpenseItemDefinition,
  type ExpenseReportRow,
  type ExpenseSourceFilter,
  type ImportInfoNote,
  type ImportSummary,
  type InitialBalanceApplyResponse,
  type InitialBalanceDefaultsResponse,
  type LoginResponse,
  type MixedPaymentReportRow,
  type MixedPaymentReportResponse,
  type ManualReviewMatchRow,
  type ManualReviewMatchesReportResponse,
  type OccupancyType,
  type OverduePaymentsReportRow,
  type OverduePaymentsReportResponse,
  type BankReconciliationReportResponse,
  type BankReconciliationRow,
  type ApartmentMonthlyBalanceMatrixReportResponse,
  type ApartmentMonthlyBalanceMatrixRow,
  type ReferenceMovementSearchResponse,
  type ReferenceMovementSearchRow,
  type PaymentItemCorrectionRow,
  type PaymentListRow,
  type PaymentMethod,
  type PaymentMethodDefinition,
  type PaymentSourceFilter,
  type ReconcileApartmentResponse,
  type ResidentAnnouncementItem,
  type ResidentExpenseReportResponse,
  type ResidentEngagementResponse,
  type ResidentPollItem,
  type ReportsSummaryResponse,
  type SkippedRowInfo,
  type StatementItem,
  type StatementResponse,
  type StatementViewMode,
  type StaffOpenAidatReportResponse,
  type StaffOpenAidatReportRow,
  type UploadBatchKind,
  type UploadBatchDetailsResponse,
  type UploadBatchRow,
  type UploadBatchUploader,
  type UnclassifiedExpenseRow,
  type UnclassifiedPaymentRow,
} from "./app/shared";
const ApartmentTypeManagementPage = lazy(() =>
  import("./components/admin/ApartmentTypeManagementPage").then((module) => ({
    default: module.ApartmentTypeManagementPage,
  }))
);
const ApartmentClassManagementPage = lazy(() =>
  import("./components/admin/ApartmentClassManagementPage").then((module) => ({
    default: module.ApartmentClassManagementPage,
  }))
);
const ApartmentDutyManagementPage = lazy(() =>
  import("./components/admin/ApartmentDutyManagementPage").then((module) => ({
    default: module.ApartmentDutyManagementPage,
  }))
);
const BuildingInfoPage = lazy(() =>
  import("./components/admin/BuildingInfoPage").then((module) => ({
    default: module.BuildingInfoPage,
  }))
);
const BlockManagementPage = lazy(() =>
  import("./components/admin/BlockManagementPage").then((module) => ({
    default: module.BlockManagementPage,
  }))
);
const ApartmentBulkUpdatePage = lazy(() =>
  import("./components/admin/ApartmentBulkUpdatePage").then((module) => ({
    default: module.ApartmentBulkUpdatePage,
  }))
);
const ApartmentFormPage = lazy(() =>
  import("./components/admin/ApartmentFormPage").then((module) => ({
    default: module.ApartmentFormPage,
  }))
);
const ApartmentPasswordManagementPage = lazy(() =>
  import("./components/admin/ApartmentPasswordManagementPage").then((module) => ({
    default: module.ApartmentPasswordManagementPage,
  }))
);
const ApartmentListPage = lazy(() =>
  import("./components/admin/ApartmentListPage").then((module) => ({
    default: module.ApartmentListPage,
  }))
);
const ResidentContentAdminPage = lazy(() =>
  import("./components/admin/ResidentContentAdminPage").then((module) => ({
    default: module.ResidentContentAdminPage,
  }))
);
const CorrectionsPage = lazy(() =>
  import("./components/admin/CorrectionsPage").then((module) => ({
    default: module.CorrectionsPage,
  }))
);
const ManualClosuresPage = lazy(() =>
  import("./components/admin/ManualClosuresPage").then((module) => ({
    default: module.ManualClosuresPage,
  }))
);
const PaymentListPage = lazy(() =>
  import("./components/admin/PaymentListPage").then((module) => ({
    default: module.PaymentListPage,
  }))
);
const ExpenseReportPage = lazy(() =>
  import("./components/admin/ExpenseReportPage").then((module) => ({
    default: module.ExpenseReportPage,
  }))
);
const UploadBatchesPage = lazy(() =>
  import("./components/admin/UploadBatchesPage").then((module) => ({
    default: module.UploadBatchesPage,
  }))
);
const PaymentMethodManagementPage = lazy(() =>
  import("./components/admin/PaymentMethodManagementPage").then((module) => ({
    default: module.PaymentMethodManagementPage,
  }))
);
const PaymentEntryPage = lazy(() =>
  import("./components/admin/PaymentEntryPage").then((module) => ({
    default: module.PaymentEntryPage,
  }))
);
const ChargeEntryPage = lazy(() =>
  import("./components/admin/ChargeEntryPage").then((module) => ({
    default: module.ChargeEntryPage,
  }))
);
const ChargeBulkPage = lazy(() =>
  import("./components/admin/ChargeBulkPage").then((module) => ({
    default: module.ChargeBulkPage,
  }))
);
const ExpenseEntryPage = lazy(() =>
  import("./components/admin/ExpenseEntryPage").then((module) => ({
    default: module.ExpenseEntryPage,
  }))
);
const AuditLogsPage = lazy(() =>
  import("./components/admin/AuditLogsPage").then((module) => ({
    default: module.AuditLogsPage,
  }))
);
const ManualReviewMatchesPage = lazy(() =>
  import("./components/admin/ManualReviewMatchesPage").then((module) => ({
    default: module.ManualReviewMatchesPage,
  }))
);
const StatementPage = lazy(() =>
  import("./components/admin/StatementPage").then((module) => ({
    default: module.StatementPage,
  }))
);
const DoorMismatchReportPage = lazy(() =>
  import("./components/admin/DoorMismatchReportPage").then((module) => ({
    default: module.DoorMismatchReportPage,
  }))
);
const GuideManualPage = lazy(() =>
  import("./components/admin/GuideManualPage").then((module) => ({
    default: module.GuideManualPage,
  }))
);
const ApartmentChangeHistoryPage = lazy(() =>
  import("./components/admin/ApartmentChangeHistoryPage").then((module) => ({
    default: module.ApartmentChangeHistoryPage,
  }))
);
const BankManagementPage = lazy(() =>
  import("./components/admin/BankManagementPage").then((module) => ({
    default: module.BankManagementPage,
  }))
);
const BankStatementViewPage = lazy(() =>
  import("./components/admin/BankStatementViewPage").then((module) => ({
    default: module.BankStatementViewPage,
  }))
);
const MonthlyLedgerPrintPage = lazy(() =>
  import("./components/admin/MonthlyLedgerPrintPage").then((module) => ({
    default: module.MonthlyLedgerPrintPage,
  }))
);
const StaffOpenAidatReportPage = lazy(() =>
  import("./components/admin/StaffOpenAidatReportPage").then((module) => ({
    default: module.StaffOpenAidatReportPage,
  }))
);
const UnclassifiedItemsPage = lazy(() =>
  import("./components/admin/UnclassifiedItemsPage").then((module) => ({
    default: module.UnclassifiedItemsPage,
  }))
);
const MeetingGuidePage = lazy(() =>
  import("./components/admin/MeetingGuidePage").then((module) => ({
    default: module.MeetingGuidePage,
  }))
);

function LazyAdminPageFallback() {
  return (
    <section className="dashboard">
      <div className="card">
        <h3>Sayfa Yukleniyor...</h3>
        <p className="small">Lutfen bekleyin.</p>
      </div>
    </section>
  );
}

function LoginPage({
  onLogin,
  loading,
  message,
}: {
  onLogin: (identifier: string, password: string) => Promise<void>;
  loading: boolean;
  message: string;
}) {
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");

  async function handleSubmit(e: FormEvent<HTMLFormElement>): Promise<void> {
    e.preventDefault();
    await onLogin(identifier, password);
  }

  return (
    <section className="card login-card">
      <h2>Giris</h2>
      <form onSubmit={handleSubmit} className="form-grid">
        <label>
          Telefon veya E-posta
          <input
            data-testid="login-identifier"
            type="text"
            value={identifier}
            onChange={(e) => setIdentifier(e.target.value)}
            placeholder="+90 5xx xxx xx xx veya admin@apartman.local"
            required
          />
        </label>
        <label>
          Sifre
          <input
            data-testid="login-password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="********"
            required
          />
        </label>
        <button data-testid="login-submit" disabled={loading} type="submit" className="btn btn-primary">
          {loading ? "Bekleyin..." : "Giris Yap"}
        </button>
      </form>
      <footer className="status-bar">{message}</footer>
    </section>
  );
}

function AdminPage() {
  const navigate = useNavigate();
  const location = useLocation();
  type BankSystemColumnKey = "date" | "type" | "amount" | "description" | "reference" | "source";
  type BankStatementColumnKey = "date" | "type" | "amount" | "description" | "reference";
  type BankDiffColumnKey =
    | "date"
    | "type"
    | "amount"
    | "systemCount"
    | "statementCount"
    | "systemReference"
    | "statementReference"
    | "diffCount";
  type UploadBatchKindFilter = "" | UploadBatchKind | "GMAIL";
  type OverduePaymentsColumnKey =
    | "block"
    | "doorNo"
    | "owner"
    | "chargeType"
    | "period"
    | "dueDate"
    | "overdueDays"
    | "amount"
    | "paidTotal"
    | "remaining"
    | "description";
  type ReferenceSearchColumnKey =
    | "date"
    | "movementType"
    | "amount"
    | "method"
    | "reference"
    | "apartment"
    | "source"
    | "description"
    | "actions";
  type BankPreviewHeaderFilterKey =
    | "rowNo"
    | "date"
    | "entryType"
    | "amount"
    | "doorNo"
    | "expenseItem"
    | "description"
    | "reference";

  const bankPreviewHeaderFilterKeys: BankPreviewHeaderFilterKey[] = [
    "rowNo",
    "date",
    "entryType",
    "amount",
    "doorNo",
    "expenseItem",
    "description",
    "reference",
  ];

  function getCurrentMonthDateRange(): { from: string; to: string } {
    const toLocalDateInput = (date: Date): string => {
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, "0");
      const day = String(date.getDate()).padStart(2, "0");
      return `${year}-${month}-${day}`;
    };

    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0);
    return {
      from: toLocalDateInput(startOfMonth),
      to: toLocalDateInput(endOfMonth),
    };
  }

  const [statement, setStatement] = useState<StatementItem[]>([]);
  const [accountingStatement, setAccountingStatement] = useState<AccountingStatementItem[]>([]);
  const [statementViewMode, setStatementViewMode] = useState<StatementViewMode>("CLASSIC");
  const [bulkStatement, setBulkStatement] = useState<BulkStatementItem[]>([]);
  const [, setMixedPaymentRows] = useState<MixedPaymentReportRow[]>([]);
  const [, setMixedPaymentTotalCount] = useState(0);
  const [doorMismatchRows, setDoorMismatchRows] = useState<DoorMismatchReportRow[]>([]);
  const [doorMismatchTotals, setDoorMismatchTotals] = useState<DoorMismatchReportResponse["totals"] | null>(null);
  const [doorMismatchLoading, setDoorMismatchLoading] = useState(false);
  const [activeApartmentId, setActiveApartmentId] = useState("");
  const [statementHeaderApartmentId, setStatementHeaderApartmentId] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string>("Admin panel hazir");
  const [toastMessage, setToastMessage] = useState<string>("");
  const [activeBulkFilterKey, setActiveBulkFilterKey] = useState<BulkFilterKey | null>(null);
  const [bulkFilterSelections, setBulkFilterSelections] = useState<BulkFilterSelections>({
    apartmentDoorNo: [],
    apartmentOwnerName: [],
    period: [],
    type: [],
    description: [],
    dueDate: [],
    amount: [],
    paidTotal: [],
    remaining: [],
    status: [],
  });
  const [apartmentOptions, setApartmentOptions] = useState<ApartmentOption[]>([]);
  const [blockOptions, setBlockOptions] = useState<BlockDefinition[]>([]);
  const [apartmentClassOptions, setApartmentClassOptions] = useState<ApartmentClassDefinition[]>([]);
  const [apartmentTypeOptions, setApartmentTypeOptions] = useState<ApartmentTypeDefinition[]>([]);
  const [apartmentDutyOptions, setApartmentDutyOptions] = useState<ApartmentDutyDefinition[]>([]);
  const [chargeTypeOptions, setChargeTypeOptions] = useState<ChargeTypeDefinition[]>([]);
  const [expenseItemOptions, setExpenseItemOptions] = useState<ExpenseItemDefinition[]>([]);
  const [paymentMethodOptions, setPaymentMethodOptions] = useState<PaymentMethodDefinition[]>([]);
  const [, setWelcomeBuildingName] = useState("");
  const [editingApartmentId, setEditingApartmentId] = useState<string | null>(null);
  const [editingApartmentIds, setEditingApartmentIds] = useState<string[]>([]);
  const [editingBlockId, setEditingBlockId] = useState<string | null>(null);
  const [editingChargeTypeId, setEditingChargeTypeId] = useState<string | null>(null);
  const [editingExpenseItemId, setEditingExpenseItemId] = useState<string | null>(null);
  const [editingExpenseId, setEditingExpenseId] = useState<string | null>(null);
  const [editingPaymentMethodId, setEditingPaymentMethodId] = useState<string | null>(null);
  const descriptionDoorRuleFormRef = useRef<HTMLFormElement | null>(null);
  const descriptionExpenseRuleFormRef = useRef<HTMLFormElement | null>(null);
  const crossTabSyncChannelRef = useRef<BroadcastChannel | null>(null);
  const crossTabSyncDebounceRef = useRef<number | null>(null);

  const [apartmentForm, setApartmentForm] = useState({
    blockName: "",
    doorNo: "",
    type: "BUYUK" as ApartmentType,
    apartmentClassId: "",
    apartmentDutyId: "",
    hasAidat: true,
    hasDogalgaz: true,
    hasOtherDues: true,
    hasIncome: true,
    hasExpenses: true,
    ownerFullName: "",
    occupancyType: "OWNER" as OccupancyType,
    email1: "",
    email2: "",
    email3: "",
    phone1: "",
    phone2: "",
    phone3: "",
    landlordFullName: "",
    landlordPhone: "",
    landlordEmail: "",
  });
  const [blockForm, setBlockForm] = useState({
    name: "",
  });
  const [bankOptions, setBankOptions] = useState<BankDefinition[]>([]);
  const [bankForm, setBankForm] = useState({
    name: "",
    isActive: true,
  });
  const [editingBankId, setEditingBankId] = useState<string | null>(null);
  const [bankBranchForm, setBankBranchForm] = useState({
    bankId: "",
    name: "",
    branchCode: "",
    accountName: "",
    accountNumber: "",
    iban: "",
    phone: "",
    email: "",
    address: "",
    representativeName: "",
    representativePhone: "",
    representativeEmail: "",
    notes: "",
    isActive: true,
  });
  const [editingBankBranchId, setEditingBankBranchId] = useState<string | null>(null);
  const [bankTermDepositRows, setBankTermDepositRows] = useState<BankTermDepositRow[]>([]);
  const [bankTermDepositLoading, setBankTermDepositLoading] = useState(false);
  const [editingBankTermDepositId, setEditingBankTermDepositId] = useState<string | null>(null);
  const [bankTermDepositForm, setBankTermDepositForm] = useState({
    bankId: "",
    branchId: "",
    principalAmount: "",
    annualInterestRate: "",
    withholdingTaxRate: "15",
    startDate: new Date().toISOString().slice(0, 10),
    endDate: "",
    notes: "",
    isActive: true,
  });
  const bankTermDepositPrincipalTotal = useMemo(
    () => Number(bankTermDepositRows.reduce((sum, row) => sum + row.principalAmount, 0).toFixed(2)),
    [bankTermDepositRows]
  );
  const activeBankTermDepositCount = useMemo(
    () => bankTermDepositRows.filter((row) => row.isActive).length,
    [bankTermDepositRows]
  );

  const [lastCreatedChargeId, setLastCreatedChargeId] = useState("");
  const [bankStatementFile, setBankStatementFile] = useState<File | null>(null);
  const [bankStatementFileInputKey, setBankStatementFileInputKey] = useState(0);
  const [apartmentUploadFile, setApartmentUploadFile] = useState<File | null>(null);
  const [invoiceUploadFile, setInvoiceUploadFile] = useState<File | null>(null);
  const [expenseDistUploadInputKey, setExpenseDistUploadInputKey] = useState(0);
  const [bankPreviewRows, setBankPreviewRows] = useState<BankStatementPreviewRow[]>([]);
  const [bankPreviewFileName, setBankPreviewFileName] = useState<string>("");
  const [bankPreviewFilterMissingOnly, setBankPreviewFilterMissingOnly] = useState(false);
  const [bankPreviewFilterSplitOnly, setBankPreviewFilterSplitOnly] = useState(false);
  const [activeBankPreviewFilterKey, setActiveBankPreviewFilterKey] = useState<BankPreviewHeaderFilterKey | null>(null);

  function normalizeToastText(value: string): string {
    return value
      .toLowerCase()
      .replaceAll("ı", "i")
      .replaceAll("İ", "i")
      .replaceAll("ş", "s")
      .replaceAll("Ş", "s")
      .replaceAll("ğ", "g")
      .replaceAll("Ğ", "g")
      .replaceAll("ü", "u")
      .replaceAll("Ü", "u")
      .replaceAll("ö", "o")
      .replaceAll("Ö", "o")
      .replaceAll("ç", "c")
      .replaceAll("Ç", "c");
  }
  const [bankPreviewHeaderFilterSelections, setBankPreviewHeaderFilterSelections] = useState<
    Record<BankPreviewHeaderFilterKey, string[]>
  >({
    rowNo: [],
    date: [],
    entryType: [],
    amount: [],
    doorNo: [],
    expenseItem: [],
    description: [],
    reference: [],
  });

  const [expenseDistForm, setExpenseDistForm] = useState({
    chargeTypeId: "",
    invoiceNo: "",
    period: String(new Date().getMonth() + 1),
    invoiceDate: "",
    periodStartDate: "",
    periodEndDate: "",
    dueDate: "",
    billAmount: "",
    selectedApartmentTypes: ["KUCUK", "BUYUK"] as ApartmentType[],
    selectedBlockNames: [] as string[],
    selectedApartmentIds: [] as string[],
    excludedApartmentIds: [] as string[],
    smallCoefficient: "0,765",
    bigCoefficient: "1,02",
    blockCoefficients: {} as Record<string, { KUCUK: string; BUYUK: string }>,
    apartmentCoefficients: {} as Record<string, string>,
    roundingDirection: "DOWN" as "UP" | "DOWN",
    roundingStep: 5,
    description: "",
  });

  const [expenseDistResult, setExpenseDistResult] = useState<{
    periodYear: number;
    periodMonth: number;
    billAmount: number;
    dueDate: string;
    invoiceDate: string;
    periodStartDate: string;
    periodEndDate: string;
    selectedCount: number;
    smallCount: number;
    bigCount: number;
    distributedTotal: number;
    roundingDiff: number;
    rows: Array<{
      apartmentId: string;
      blockName: string;
      doorNo: string;
      type: ApartmentType;
      coefficient: number;
      amount: number;
    }>;
  } | null>(null);

  const [bulkCorrectionForm, setBulkCorrectionForm] = useState({
    periodYear: String(new Date().getFullYear()),
    periodMonths: [] as number[],
    chargeTypeId: "",
    accrualDateFrom: "",
    accrualDateTo: "",
    apartmentType: "ALL" as "ALL" | ApartmentType,
    apartmentIds: [] as string[],
    applyAmount: true,
    pricingMode: "UNIFORM" as BulkPricingMode,
    amount: "",
    amountKucuk: "",
    amountBuyuk: "",
    applyDueDate: true,
    dueDateByMonth: {} as Record<string, string>,
    applyDescription: false,
    description: "",
  });
  const [distributedInvoiceRows, setDistributedInvoiceRows] = useState<DistributedInvoiceRow[]>([]);
  const [deletingDistributedInvoiceKey, setDeletingDistributedInvoiceKey] = useState<string | null>(null);
  const [distributedInvoiceDetailRows, setDistributedInvoiceDetailRows] = useState<DistributedInvoiceChargeDetailRow[]>([]);
  const [distributedInvoiceDetailLoading, setDistributedInvoiceDetailLoading] = useState(false);
  const [savingDistributedInvoiceChargeId, setSavingDistributedInvoiceChargeId] = useState<string | null>(null);

  const [chargeTypeForm, setChargeTypeForm] = useState({
    code: "",
    name: "",
    payerTarget: "OWNER" as "OWNER" | "TENANT",
    isActive: true,
  });
  const [expenseItemForm, setExpenseItemForm] = useState({
    code: "",
    name: "",
    isActive: true,
  });
  const [paymentMethodForm, setPaymentMethodForm] = useState({
    code: "BANK_TRANSFER" as PaymentMethod,
    name: "",
    isActive: true,
  });
  
  const [correctionApartmentId, setCorrectionApartmentId] = useState("");
  const [chargeCorrectionRows, setChargeCorrectionRows] = useState<ChargeCorrectionRow[]>([]);
  const [paymentCorrectionRows, setPaymentCorrectionRows] = useState<PaymentItemCorrectionRow[]>([]);
  const [selectedChargeCorrectionIds, setSelectedChargeCorrectionIds] = useState<string[]>([]);
  const [selectedPaymentCorrectionIds, setSelectedPaymentCorrectionIds] = useState<string[]>([]);
  const [paymentListRows, setPaymentListRows] = useState<PaymentListRow[]>([]);
  const [paymentListError, setPaymentListError] = useState<string>("");
  const [unclassifiedPaymentRows, setUnclassifiedPaymentRows] = useState<UnclassifiedPaymentRow[]>([]);
  const [unclassifiedExpenseRows, setUnclassifiedExpenseRows] = useState<UnclassifiedExpenseRow[]>([]);
  const [unclassifiedPageLoading, setUnclassifiedPageLoading] = useState<boolean>(false);
  const [paymentListFilter, setPaymentListFilter] = useState({
    from: "",
    to: "",
    source: "" as PaymentSourceFilter,
  });
  const [editingPaymentListId, setEditingPaymentListId] = useState<string | null>(null);
  const [editingPaymentListSource, setEditingPaymentListSource] = useState<PaymentListRow["source"] | null>(null);
  const [allowImportedAmountEdit, setAllowImportedAmountEdit] = useState<boolean>(false);
  const [paymentListEditForm, setPaymentListEditForm] = useState({
    paidAt: "",
    amount: "",
    method: "BANK_TRANSFER" as PaymentMethod,
    description: "",
    reference: "",
    apartmentId: "",
  });
  const [expenseReportRows, setExpenseReportRows] = useState<ExpenseReportRow[]>([]);
  const [expenseReportError, setExpenseReportError] = useState<string>("");
  const [expenseReportFilter, setExpenseReportFilter] = useState({
    from: "",
    to: "",
    sources: [] as Array<Exclude<ExpenseSourceFilter, "">>,
    expenseItemIds: [] as string[],
    description: "",
  });
  const [expenseReportAutoRefreshEnabled, setExpenseReportAutoRefreshEnabled] = useState(false);
  const [expenseReportSort, setExpenseReportSort] = useState<{
    key: "spentAt" | "expenseItemName" | "paymentMethod" | "amount" | "description";
    direction: "asc" | "desc";
  }>({
    key: "spentAt",
    direction: "desc",
  });
  const [editingExpenseReportId, setEditingExpenseReportId] = useState<string | null>(null);
  const [expenseReportEditForm, setExpenseReportEditForm] = useState({
    expenseItemId: "",
    spentAt: "",
    amount: "",
    paymentMethod: "CASH" as PaymentMethod,
    description: "",
    reference: "",
  });
  const [uploadBatchRows, setUploadBatchRows] = useState<UploadBatchRow[]>([]);
  const [bankStatementViewRows, setBankStatementViewRows] = useState<BankReconciliationRow[]>([]);
  const [bankStatementViewOpeningBalance, setBankStatementViewOpeningBalance] = useState(0);
  const [bankStatementViewFilter, setBankStatementViewFilter] = useState(() => getCurrentMonthDateRange());
  const [uploadBatchUploaders, setUploadBatchUploaders] = useState<UploadBatchUploader[]>([]);
  const [reportsSummary, setReportsSummary] = useState<ReportsSummaryResponse | null>(null);
  const [reportsSummaryLoading, setReportsSummaryLoading] = useState(false);
  const [bankReconciliationFilter, setBankReconciliationFilter] = useState({ from: "", to: "" });
  const [bankReconciliationRows, setBankReconciliationRows] = useState<BankReconciliationRow[]>([]);
  const [bankReconciliationTotals, setBankReconciliationTotals] =
    useState<BankReconciliationReportResponse["totals"] | null>(null);
  const [bankReconciliationLoading, setBankReconciliationLoading] = useState(false);
  const [bankSystemColumnVisibility, setBankSystemColumnVisibility] = useState<Record<BankSystemColumnKey, boolean>>({
    date: true,
    type: true,
    amount: true,
    description: true,
    reference: true,
    source: true,
  });
  const [bankStatementColumnVisibility, setBankStatementColumnVisibility] = useState<Record<BankStatementColumnKey, boolean>>({
    date: true,
    type: true,
    amount: true,
    description: true,
    reference: true,
  });
  const [bankDiffColumnVisibility, setBankDiffColumnVisibility] = useState<Record<BankDiffColumnKey, boolean>>({
    date: true,
    type: true,
    amount: true,
    systemCount: true,
    statementCount: true,
    systemReference: true,
    statementReference: true,
    diffCount: true,
  });
  const [warningPanel, setWarningPanel] = useState<{ title: string; message: string; items: string[] } | null>(null);
  const [initialBalanceReplaceExisting, setInitialBalanceReplaceExisting] = useState(true);
  const [initialBalanceRows, setInitialBalanceRows] = useState<
    Array<{ id: string; bankName: string; branchName: string; openingBalance: string; openingDate: string; isEditing: boolean }>
  >([
    {
      id: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
      bankName: "",
      branchName: "",
      openingBalance: "",
      openingDate: new Date().toISOString().slice(0, 10),
      isEditing: true,
    },
  ]);
  const [overduePaymentsRows, setOverduePaymentsRows] = useState<OverduePaymentsReportRow[]>([]);
  const [overduePaymentsTotals, setOverduePaymentsTotals] = useState<OverduePaymentsReportResponse["totals"] | null>(null);
  const [overduePaymentsLoading, setOverduePaymentsLoading] = useState(false);
  const [staffOpenAidatSelectedApartmentId, setStaffOpenAidatSelectedApartmentId] = useState("");
  const [staffOpenAidatRows, setStaffOpenAidatRows] = useState<StaffOpenAidatReportRow[]>([]);
  const [staffOpenAidatTotals, setStaffOpenAidatTotals] =
    useState<StaffOpenAidatReportResponse["totals"] | null>(null);
  const [staffOpenAidatApartment, setStaffOpenAidatApartment] =
    useState<StaffOpenAidatReportResponse["apartment"] | null>(null);
  const [staffOpenAidatLatestUploadRows, setStaffOpenAidatLatestUploadRows] = useState<UploadBatchRow[]>([]);
  const [staffOpenAidatLoading, setStaffOpenAidatLoading] = useState(false);
  const [manualReviewMatchesRows, setManualReviewMatchesRows] = useState<ManualReviewMatchRow[]>([]);
  const [manualReviewMatchesTotalCount, setManualReviewMatchesTotalCount] = useState(0);
  const [manualReviewMatchesLoading, setManualReviewMatchesLoading] = useState(false);
  const [manualReviewMatchesFilter, setManualReviewMatchesFilter] = useState({
    from: "",
    to: "",
    doorNo: "",
  });
  const [fractionalClosureRows, setFractionalClosureRows] = useState<FractionalClosureReportRow[]>([]);
  const [fractionalClosureLoading, setFractionalClosureLoading] = useState(false);
  const [overduePaymentsColumnVisibility, setOverduePaymentsColumnVisibility] = useState<
    Record<OverduePaymentsColumnKey, boolean>
  >({
    block: true,
    doorNo: true,
    owner: true,
    chargeType: true,
    period: true,
    dueDate: true,
    overdueDays: true,
    amount: true,
    paidTotal: true,
    remaining: true,
    description: true,
  });
  const [chargeConsistencyRows, setChargeConsistencyRows] = useState<ChargeConsistencyWarningRow[]>([]);
  const [chargeConsistencyTotals, setChargeConsistencyTotals] =
    useState<ChargeConsistencyReportResponse["totals"] | null>(null);
  const [chargeConsistencyExcludedApartments, setChargeConsistencyExcludedApartments] =
    useState<ChargeConsistencyReportResponse["excludedApartments"]>([]);
  const [chargeConsistencyLoading, setChargeConsistencyLoading] = useState(false);
  const [apartmentBalanceMatrixYear, setApartmentBalanceMatrixYear] = useState(String(new Date().getFullYear()));
  const [apartmentBalanceMatrixRows, setApartmentBalanceMatrixRows] = useState<ApartmentMonthlyBalanceMatrixRow[]>([]);
  const [apartmentBalanceMatrixMonths, setApartmentBalanceMatrixMonths] =
    useState<ApartmentMonthlyBalanceMatrixReportResponse["months"]>([]);
  const [apartmentBalanceMatrixTotals, setApartmentBalanceMatrixTotals] =
    useState<ApartmentMonthlyBalanceMatrixReportResponse["totals"] | null>(null);
  const [apartmentBalanceMatrixSnapshotAt, setApartmentBalanceMatrixSnapshotAt] = useState<string | null>(null);
  const [apartmentBalanceMatrixLoading, setApartmentBalanceMatrixLoading] = useState(false);
  const [referenceSearchValue, setReferenceSearchValue] = useState("");
  const [referenceSearchRows, setReferenceSearchRows] = useState<ReferenceMovementSearchRow[]>([]);
  const [referenceSearchTotals, setReferenceSearchTotals] =
    useState<ReferenceMovementSearchResponse["totals"] | null>(null);
  const [referenceSearchLoading, setReferenceSearchLoading] = useState(false);
  const [referenceSearchColumnVisibility, setReferenceSearchColumnVisibility] = useState<
    Record<ReferenceSearchColumnKey, boolean>
  >({
    date: true,
    movementType: true,
    amount: true,
    method: true,
    reference: true,
    apartment: true,
    source: true,
    description: true,
    actions: true,
  });
  const [editingReferenceMovementKey, setEditingReferenceMovementKey] = useState<string | null>(null);
  const [referenceEditForm, setReferenceEditForm] = useState<{
    occurredAt: string;
    amount: string;
    method: PaymentMethod;
    description: string;
    reference: string;
    expenseItemId: string;
    apartmentId: string;
  }>({
    occurredAt: "",
    amount: "",
    method: "BANK_TRANSFER",
    description: "",
    reference: "",
    expenseItemId: "",
    apartmentId: "",
  });
  const [chargeConsistencyForm, setChargeConsistencyForm] = useState({
    periodYear: String(new Date().getFullYear()),
    periodMonths: [...monthOptions] as number[],
    chargeTypeId: "",
    apartmentType: "ALL" as "ALL" | ApartmentType,
    expectedBuyukAmount: "",
    expectedKucukAmount: "",
    requireMonthEndDueDate: true,
    includeMissing: true,
  });
  const [chargeConsistencySelectedCodes, setChargeConsistencySelectedCodes] = useState<
    ChargeConsistencyWarningRow["code"][]
  >([]);
  const [chargeConsistencyViewMode, setChargeConsistencyViewMode] = useState<"MERGED" | "RAW">("MERGED");
  const [overduePaymentsFilter, setOverduePaymentsFilter] = useState({
    from: "",
    to: "",
    blockIds: [] as string[],
    doorNos: [] as string[],
    chargeTypeId: "",
  });
  const [deletingUploadBatchId, setDeletingUploadBatchId] = useState<string | null>(null);
  const [deletingUploadBatchFileName, setDeletingUploadBatchFileName] = useState<string>("");
  const [apiConnectionOk, setApiConnectionOk] = useState<boolean>(true);
  const [uploadBatchFilter, setUploadBatchFilter] = useState({
    from: "",
    to: "",
    uploadedByUserId: "",
      kind: "" as UploadBatchKindFilter,
    limit: "200",
    offset: "0",
  });
  const [descriptionDoorRules, setDescriptionDoorRules] = useState<DescriptionDoorRule[]>([]);
  const [editingDescriptionDoorRuleId, setEditingDescriptionDoorRuleId] = useState<string | null>(null);
  const [descriptionDoorRuleForm, setDescriptionDoorRuleForm] = useState({
    keyword: "",
    doorNo: "",
    isActive: true,
  });
  const [descriptionExpenseRules, setDescriptionExpenseRules] = useState<DescriptionExpenseRule[]>([]);
  const [editingDescriptionExpenseRuleId, setEditingDescriptionExpenseRuleId] = useState<string | null>(null);
  const [descriptionExpenseRuleForm, setDescriptionExpenseRuleForm] = useState({
    keyword: "",
    expenseItemId: "",
    isActive: true,
  });

  const overdueBlockValues = useMemo(() => blockOptions.map((x) => x.id), [blockOptions]);
  const overdueSelectedBlockNames = useMemo(
    () => new Set(blockOptions.filter((x) => overduePaymentsFilter.blockIds.includes(x.id)).map((x) => x.name)),
    [blockOptions, overduePaymentsFilter.blockIds]
  );
  const overdueDoorValues = useMemo(() => {
    const shouldFilterByBlock = overduePaymentsFilter.blockIds.length > 0;
    const values = apartmentOptions
      .filter((apt) => !shouldFilterByBlock || overdueSelectedBlockNames.has(apt.blockName))
      .map((apt) => apt.doorNo.trim())
      .filter((x) => x.length > 0);

    return [...new Set(values)].sort((a, b) => a.localeCompare(b, "tr", { numeric: true }));
  }, [apartmentOptions, overduePaymentsFilter.blockIds, overdueSelectedBlockNames]);
  const allOverdueBlocksSelected =
    overdueBlockValues.length > 0 && overduePaymentsFilter.blockIds.length === overdueBlockValues.length;
  const allOverdueDoorsSelected =
    overdueDoorValues.length > 0 && overduePaymentsFilter.doorNos.length === overdueDoorValues.length;
  const overdueBlockSummary =
    overduePaymentsFilter.blockIds.length === 0
      ? "Tum bloklar"
      : allOverdueBlocksSelected
        ? "Hepsi"
        : `${overduePaymentsFilter.blockIds.length} secili`;
  const overdueDoorSummary =
    overduePaymentsFilter.doorNos.length === 0
      ? "Tum daireler"
      : allOverdueDoorsSelected
        ? "Hepsi"
        : `${overduePaymentsFilter.doorNos.length} secili`;
  const [lastSkippedRows, setLastSkippedRows] = useState<SkippedRowInfo[]>([]);
  const [lastSkippedTitle, setLastSkippedTitle] = useState<string>("");
  const [lastImportInfos, setLastImportInfos] = useState<ImportInfoNote[]>([]);
  const [lastImportInfoTitle, setLastImportInfoTitle] = useState<string>("");
  const [lastImportSummary, setLastImportSummary] = useState<ImportSummary | null>(null);
  const manualReviewImportInfos = useMemo(
    () =>
      lastImportInfos.filter((item) => {
        const text = item.raw.toLocaleLowerCase("tr");
        return text.includes("manuel incelemeye birakildi") || text.includes("manual_review");
      }),
    [lastImportInfos]
  );
  const [actionLogs, setActionLogs] = useState<AdminActionLogRow[]>([]);
  const adminSubnavRef = useRef<HTMLDivElement | null>(null);
  const skipNextExpenseReportAutoRefreshRef = useRef(false);
  const sortedLatestBankMovements = useMemo(() => {
    if (!reportsSummary) {
      return [];
    }

    return [...reportsSummary.latestBankMovements].sort((a, b) => {
      const aTime = new Date(a.occurredAt).getTime();
      const bTime = new Date(b.occurredAt).getTime();

      if (Number.isFinite(aTime) && Number.isFinite(bTime)) {
        const aDate = new Date(aTime);
        const bDate = new Date(bTime);
        const aDay = new Date(aDate.getFullYear(), aDate.getMonth(), aDate.getDate()).getTime();
        const bDay = new Date(bDate.getFullYear(), bDate.getMonth(), bDate.getDate()).getTime();

        if (bDay !== aDay) {
          return bDay - aDay;
        }

        if (bTime !== aTime) {
          return bTime - aTime;
        }
      }

      return b.description.localeCompare(a.description, "tr");
    });
  }, [reportsSummary]);

  function closeAdminSubnavMenus(): void {
    const root = adminSubnavRef.current;
    if (!root) {
      return;
    }

    const detailsElements = Array.from(
      root.querySelectorAll<HTMLDetailsElement>(".admin-subnav-dropdown")
    );

    for (const details of detailsElements) {
      details.open = false;
    }
  }

  const totals = useMemo(() => {
    const amount = statement.reduce((sum, row) => sum + row.amount, 0);
    const paid = statement.reduce((sum, row) => sum + row.paidTotal, 0);
    return { amount, paid, remaining: amount - paid };
  }, [statement]);

  const overdueStatementTotals = useMemo(() => {
    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
    let overdueRemaining = 0;
    let overdueCount = 0;

    for (const row of statement) {
      if (row.remaining <= 0) {
        continue;
      }

      const dueAt = new Date(row.dueDate).getTime();
      if (!Number.isFinite(dueAt) || dueAt >= todayStart) {
        continue;
      }

      overdueRemaining += row.remaining;
      overdueCount += 1;
    }

    return {
      remaining: Number(overdueRemaining.toFixed(2)),
      count: overdueCount,
    };
  }, [statement]);

  const sortedStatement = useMemo(
    () =>
      [...statement].sort((a, b) => {
        const dueDiff = new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime();
        if (dueDiff !== 0) {
          return dueDiff;
        }
        return a.chargeId.localeCompare(b.chargeId);
      }),
    [statement]
  );

  const accountingTotals = useMemo(() => {
    const debit = accountingStatement.reduce((sum, row) => sum + row.debit, 0);
    const credit = accountingStatement.reduce((sum, row) => sum + row.credit, 0);
    return { debit, credit, balance: debit - credit };
  }, [accountingStatement]);

  const sortedAccountingStatement = useMemo(
    () =>
      [...accountingStatement].sort((a, b) => {
        const dateDiff = new Date(a.date).getTime() - new Date(b.date).getTime();
        if (dateDiff !== 0) {
          return dateDiff;
        }
        return a.movementId.localeCompare(b.movementId);
      }),
    [accountingStatement]
  );

  const activeApartmentHeaderText = useMemo(() => {
    if (!statementHeaderApartmentId) {
      return "";
    }

    const selectedApartment = apartmentOptions.find((apt) => apt.id === statementHeaderApartmentId);
    if (!selectedApartment) {
      return "";
    }

    return `${selectedApartment.doorNo} - ${selectedApartment.ownerFullName ?? "Adsiz"}`;
  }, [statementHeaderApartmentId, apartmentOptions]);

  const sortedBulkStatement = useMemo(
    () =>
      [...bulkStatement].sort((a, b) => {
        const doorCompare = a.apartmentDoorNo.localeCompare(b.apartmentDoorNo, "tr", { numeric: true });
        if (doorCompare !== 0) {
          return doorCompare;
        }

        const ownerCompare = (a.apartmentOwnerName ?? "").localeCompare(b.apartmentOwnerName ?? "", "tr");
        if (ownerCompare !== 0) {
          return ownerCompare;
        }

        if (a.periodYear !== b.periodYear) {
          return a.periodYear - b.periodYear;
        }

        return a.periodMonth - b.periodMonth;
      }),
    [bulkStatement]
  );

  const bankPreviewRowsWithFlags = useMemo(() => {
    const validDoorNos = new Set(
      apartmentOptions
        .flatMap((apt) => [apt.doorNo, normalizeDoorNoForMatch(apt.doorNo)])
        .filter(Boolean)
    );

    return bankPreviewRows.map((row, sourceIndex) => {
      const isMissing =
        (row.entryType === "PAYMENT" && !(row.doorNo ?? "").trim()) ||
        (row.entryType === "EXPENSE" && !row.expenseItemId);
      const splitDoorNos = resolveSplitDoorNos(row, validDoorNos);
      const isSplitCandidate = row.isAutoSplit !== true && splitDoorNos.length >= 2;

      return { row, sourceIndex, isMissing, isSplitCandidate };
    });
  }, [bankPreviewRows, apartmentOptions]);

  const hasBankPreviewMissingRows = useMemo(
    () => bankPreviewRowsWithFlags.some((row) => row.isMissing),
    [bankPreviewRowsWithFlags]
  );

  const bankPreviewSplitCandidateCount = useMemo(
    () => bankPreviewRowsWithFlags.filter((row) => row.isSplitCandidate && !row.row.isAutoSplit).length,
    [bankPreviewRowsWithFlags]
  );

  const bankComparisonDifferenceRows = useMemo(() => {
    type DiffEntryType = "GIRIS" | "CIKIS";
    type DiffBaseRow = {
      dateKey: string;
      dateMs: number;
      entryType: DiffEntryType;
      amount: number;
      reference: string | null;
    };
    type DiffAggregateRow = {
      key: string;
      dateKey: string;
      entryType: DiffEntryType;
      amount: number;
      systemCount: number;
      statementCount: number;
      systemReferences: string[];
      statementReferences: string[];
      diffCount: number;
    };

    const toDateKey = (value: string): string => {
      const date = new Date(value);
      if (Number.isNaN(date.getTime())) {
        return "-";
      }
      const y = date.getFullYear();
      const m = String(date.getMonth() + 1).padStart(2, "0");
      const d = String(date.getDate()).padStart(2, "0");
      return `${y}-${m}-${d}`;
    };

    const parseDateMs = (value: string): number => {
      const ms = new Date(value).getTime();
      return Number.isFinite(ms) ? ms : Number.NaN;
    };

    const withinToleranceDays = (aMs: number, bMs: number, maxDays: number): boolean => {
      if (!Number.isFinite(aMs) || !Number.isFinite(bMs)) {
        return false;
      }
      return Math.abs(aMs - bMs) <= maxDays * 24 * 60 * 60 * 1000;
    };

    const systemRows: DiffBaseRow[] = bankReconciliationRows
      .filter((row) => !row.isOpeningBalance)
      .map((row) => ({
        dateKey: toDateKey(row.occurredAt),
        dateMs: parseDateMs(row.occurredAt),
        entryType: row.entryType === "IN" ? "GIRIS" : "CIKIS",
        amount: Number(Number(row.amount).toFixed(2)),
        reference: (row.reference ?? "").trim() || null,
      }));

    const previewRowsForDiff: BankStatementPreviewRow[] = (() => {
      const passthroughRows: BankStatementPreviewRow[] = [];
      const splitGroups = new Map<number, BankStatementPreviewRow[]>();

      for (const row of bankPreviewRows) {
        if (row.isAutoSplit === true && row.splitSourceRowNo != null) {
          const group = splitGroups.get(row.splitSourceRowNo);
          if (group) {
            group.push(row);
          } else {
            splitGroups.set(row.splitSourceRowNo, [row]);
          }
          continue;
        }

        passthroughRows.push(row);
      }

      const mergedSplitRows: BankStatementPreviewRow[] = [];
      for (const groupRows of splitGroups.values()) {
        if (groupRows.length === 0) {
          continue;
        }

        const first = groupRows[0];
        const totalAmount = groupRows.reduce((sum, row) => sum + Number(row.amount), 0);
        const mergedReferenceValues = [...new Set(groupRows.map((row) => (row.reference ?? "").trim()).filter(Boolean))];

        mergedSplitRows.push({
          ...first,
          amount: Number(totalAmount.toFixed(2)),
          reference: mergedReferenceValues.length > 0 ? mergedReferenceValues.join(", ") : null,
          isAutoSplit: false,
          splitSourceRowNo: null,
        });
      }

      return [...passthroughRows, ...mergedSplitRows];
    })();

    const statementRows: DiffBaseRow[] = previewRowsForDiff.map((row) => ({
      dateKey: toDateKey(row.occurredAt),
      dateMs: parseDateMs(row.occurredAt),
      entryType: row.entryType === "PAYMENT" ? "GIRIS" : "CIKIS",
      amount: Number(Number(row.amount).toFixed(2)),
      reference: (row.reference ?? "").trim() || null,
    }));

    const MATCH_DAY_TOLERANCE = 15;
    const toBucketKey = (row: DiffBaseRow): string => `${row.entryType}|${row.amount.toFixed(2)}`;

    const systemBuckets = new Map<string, DiffBaseRow[]>();
    const statementBuckets = new Map<string, DiffBaseRow[]>();

    for (const row of systemRows) {
      const key = toBucketKey(row);
      const list = systemBuckets.get(key);
      if (list) {
        list.push(row);
      } else {
        systemBuckets.set(key, [row]);
      }
    }

    for (const row of statementRows) {
      const key = toBucketKey(row);
      const list = statementBuckets.get(key);
      if (list) {
        list.push(row);
      } else {
        statementBuckets.set(key, [row]);
      }
    }

    const unmatchedSystemRows: DiffBaseRow[] = [];
    const unmatchedStatementRows: DiffBaseRow[] = [];
    const allBucketKeys = new Set<string>([...systemBuckets.keys(), ...statementBuckets.keys()]);

    for (const bucketKey of allBucketKeys) {
      const systemBucket = [...(systemBuckets.get(bucketKey) ?? [])];
      const statementBucket = [...(statementBuckets.get(bucketKey) ?? [])];

      if (systemBucket.length === 0) {
        unmatchedStatementRows.push(...statementBucket);
        continue;
      }
      if (statementBucket.length === 0) {
        unmatchedSystemRows.push(...systemBucket);
        continue;
      }

      // Pass 1: exact date matches first to avoid order-based false positives.
      const systemByDate = new Map<string, DiffBaseRow[]>();
      for (const row of systemBucket) {
        const list = systemByDate.get(row.dateKey);
        if (list) {
          list.push(row);
        } else {
          systemByDate.set(row.dateKey, [row]);
        }
      }

      const remainingStatementAfterExact: DiffBaseRow[] = [];
      for (const row of statementBucket) {
        const candidates = systemByDate.get(row.dateKey);
        if (candidates && candidates.length > 0) {
          candidates.pop();
        } else {
          remainingStatementAfterExact.push(row);
        }
      }

      const remainingSystemAfterExact: DiffBaseRow[] = [];
      for (const rows of systemByDate.values()) {
        if (rows.length > 0) {
          remainingSystemAfterExact.push(...rows);
        }
      }

      // Pass 2: nearest-date matching within tolerance window.
      const systemUsed = new Array<boolean>(remainingSystemAfterExact.length).fill(false);
      remainingStatementAfterExact.sort((a, b) => a.dateMs - b.dateMs);

      for (const statementRow of remainingStatementAfterExact) {
        let bestIndex = -1;
        let bestDistance = Number.POSITIVE_INFINITY;

        for (let i = 0; i < remainingSystemAfterExact.length; i += 1) {
          if (systemUsed[i]) {
            continue;
          }
          const systemRow = remainingSystemAfterExact[i];
          if (!withinToleranceDays(systemRow.dateMs, statementRow.dateMs, MATCH_DAY_TOLERANCE)) {
            continue;
          }

          const distance = Math.abs(systemRow.dateMs - statementRow.dateMs);
          if (distance < bestDistance) {
            bestDistance = distance;
            bestIndex = i;
          }
        }

        if (bestIndex >= 0) {
          systemUsed[bestIndex] = true;
        } else {
          unmatchedStatementRows.push(statementRow);
        }
      }

      for (let i = 0; i < remainingSystemAfterExact.length; i += 1) {
        if (!systemUsed[i]) {
          unmatchedSystemRows.push(remainingSystemAfterExact[i]);
        }
      }
    }

    // Pass 3: split-aware matching.
    // Handles cases where one statement row is saved as two system rows (or vice versa)
    // with the same total amount after manual/auto split operations.
    const systemUsedBySplit = new Array<boolean>(unmatchedSystemRows.length).fill(false);
    const statementUsedBySplit = new Array<boolean>(unmatchedStatementRows.length).fill(false);

    const findBestSystemPairForStatement = (statementRow: DiffBaseRow): [number, number] | null => {
      let bestPair: [number, number] | null = null;
      let bestDistance = Number.POSITIVE_INFINITY;

      for (let i = 0; i < unmatchedSystemRows.length; i += 1) {
        if (systemUsedBySplit[i]) {
          continue;
        }
        const left = unmatchedSystemRows[i];
        if (left.entryType !== statementRow.entryType) {
          continue;
        }
        if (!withinToleranceDays(left.dateMs, statementRow.dateMs, MATCH_DAY_TOLERANCE)) {
          continue;
        }

        for (let j = i + 1; j < unmatchedSystemRows.length; j += 1) {
          if (systemUsedBySplit[j]) {
            continue;
          }
          const right = unmatchedSystemRows[j];
          if (right.entryType !== statementRow.entryType) {
            continue;
          }
          if (!withinToleranceDays(right.dateMs, statementRow.dateMs, MATCH_DAY_TOLERANCE)) {
            continue;
          }

          const total = Number((left.amount + right.amount).toFixed(2));
          if (Math.abs(total - statementRow.amount) > 0.01) {
            continue;
          }

          const distance = Math.abs(left.dateMs - statementRow.dateMs) + Math.abs(right.dateMs - statementRow.dateMs);
          if (distance < bestDistance) {
            bestDistance = distance;
            bestPair = [i, j];
          }
        }
      }

      return bestPair;
    };

    const findBestStatementPairForSystem = (systemRow: DiffBaseRow): [number, number] | null => {
      let bestPair: [number, number] | null = null;
      let bestDistance = Number.POSITIVE_INFINITY;

      for (let i = 0; i < unmatchedStatementRows.length; i += 1) {
        if (statementUsedBySplit[i]) {
          continue;
        }
        const left = unmatchedStatementRows[i];
        if (left.entryType !== systemRow.entryType) {
          continue;
        }
        if (!withinToleranceDays(left.dateMs, systemRow.dateMs, MATCH_DAY_TOLERANCE)) {
          continue;
        }

        for (let j = i + 1; j < unmatchedStatementRows.length; j += 1) {
          if (statementUsedBySplit[j]) {
            continue;
          }
          const right = unmatchedStatementRows[j];
          if (right.entryType !== systemRow.entryType) {
            continue;
          }
          if (!withinToleranceDays(right.dateMs, systemRow.dateMs, MATCH_DAY_TOLERANCE)) {
            continue;
          }

          const total = Number((left.amount + right.amount).toFixed(2));
          if (Math.abs(total - systemRow.amount) > 0.01) {
            continue;
          }

          const distance = Math.abs(left.dateMs - systemRow.dateMs) + Math.abs(right.dateMs - systemRow.dateMs);
          if (distance < bestDistance) {
            bestDistance = distance;
            bestPair = [i, j];
          }
        }
      }

      return bestPair;
    };

    for (let i = 0; i < unmatchedStatementRows.length; i += 1) {
      if (statementUsedBySplit[i]) {
        continue;
      }
      const pair = findBestSystemPairForStatement(unmatchedStatementRows[i]);
      if (!pair) {
        continue;
      }

      const [leftIndex, rightIndex] = pair;
      statementUsedBySplit[i] = true;
      systemUsedBySplit[leftIndex] = true;
      systemUsedBySplit[rightIndex] = true;
    }

    for (let i = 0; i < unmatchedSystemRows.length; i += 1) {
      if (systemUsedBySplit[i]) {
        continue;
      }
      const pair = findBestStatementPairForSystem(unmatchedSystemRows[i]);
      if (!pair) {
        continue;
      }

      const [leftIndex, rightIndex] = pair;
      systemUsedBySplit[i] = true;
      statementUsedBySplit[leftIndex] = true;
      statementUsedBySplit[rightIndex] = true;
    }

    const finalUnmatchedSystemRows = unmatchedSystemRows.filter((_, index) => !systemUsedBySplit[index]);
    const finalUnmatchedStatementRows = unmatchedStatementRows.filter((_, index) => !statementUsedBySplit[index]);

    const aggregateMap = new Map<string, DiffAggregateRow>();
    const ensureAggregate = (row: DiffBaseRow): DiffAggregateRow => {
      const key = `${row.dateKey}|${row.entryType}|${row.amount.toFixed(2)}`;
      const existing = aggregateMap.get(key);
      if (existing) {
        return existing;
      }

      const created: DiffAggregateRow = {
        key,
        dateKey: row.dateKey,
        entryType: row.entryType,
        amount: row.amount,
        systemCount: 0,
        statementCount: 0,
        systemReferences: [],
        statementReferences: [],
        diffCount: 0,
      };
      aggregateMap.set(key, created);
      return created;
    };

    const pushUniqueReference = (list: string[], value: string | null): void => {
      if (!value) {
        return;
      }
      if (!list.includes(value)) {
        list.push(value);
      }
    };

    for (const row of finalUnmatchedSystemRows) {
      const target = ensureAggregate(row);
      target.systemCount += 1;
      pushUniqueReference(target.systemReferences, row.reference);
    }

    for (const row of finalUnmatchedStatementRows) {
      const target = ensureAggregate(row);
      target.statementCount += 1;
      pushUniqueReference(target.statementReferences, row.reference);
    }

    return [...aggregateMap.values()]
      .map((row) => ({
        ...row,
        diffCount: row.statementCount - row.systemCount,
      }))
      .filter((row) => row.diffCount !== 0)
      .sort((a, b) => {
        const absDiff = Math.abs(b.diffCount) - Math.abs(a.diffCount);
        if (absDiff !== 0) {
          return absDiff;
        }

        const dateDiff = b.dateKey.localeCompare(a.dateKey);
        if (dateDiff !== 0) {
          return dateDiff;
        }

        if (a.entryType !== b.entryType) {
          return a.entryType.localeCompare(b.entryType);
        }

        return b.amount - a.amount;
      });
  }, [bankReconciliationRows, bankPreviewRows]);

  const bankSystemVisibleColumnCount = useMemo(
    () => Object.values(bankSystemColumnVisibility).filter(Boolean).length,
    [bankSystemColumnVisibility]
  );

  const bankStatementVisibleColumnCount = useMemo(
    () => Object.values(bankStatementColumnVisibility).filter(Boolean).length,
    [bankStatementColumnVisibility]
  );

  const bankDiffVisibleColumnCount = useMemo(
    () => Object.values(bankDiffColumnVisibility).filter(Boolean).length,
    [bankDiffColumnVisibility]
  );

  const overduePaymentsVisibleColumnCount = useMemo(
    () => Object.values(overduePaymentsColumnVisibility).filter(Boolean).length,
    [overduePaymentsColumnVisibility]
  );

  const referenceSearchVisibleColumnCount = useMemo(
    () => Object.values(referenceSearchColumnVisibility).filter(Boolean).length,
    [referenceSearchColumnVisibility]
  );

  function toggleBankSystemColumn(key: BankSystemColumnKey): void {
    setBankSystemColumnVisibility((prev) => {
      const nextValue = !prev[key];
      if (!nextValue && Object.values(prev).filter(Boolean).length <= 1) {
        return prev;
      }
      return {
        ...prev,
        [key]: nextValue,
      };
    });
  }

  function toggleBankStatementColumn(key: BankStatementColumnKey): void {
    setBankStatementColumnVisibility((prev) => {
      const nextValue = !prev[key];
      if (!nextValue && Object.values(prev).filter(Boolean).length <= 1) {
        return prev;
      }
      return {
        ...prev,
        [key]: nextValue,
      };
    });
  }

  function toggleBankDiffColumn(key: BankDiffColumnKey): void {
    setBankDiffColumnVisibility((prev) => {
      const nextValue = !prev[key];
      if (!nextValue && Object.values(prev).filter(Boolean).length <= 1) {
        return prev;
      }
      return {
        ...prev,
        [key]: nextValue,
      };
    });
  }

  function toggleOverduePaymentsColumn(key: OverduePaymentsColumnKey): void {
    setOverduePaymentsColumnVisibility((prev) => {
      const nextValue = !prev[key];
      if (!nextValue && Object.values(prev).filter(Boolean).length <= 1) {
        return prev;
      }
      return {
        ...prev,
        [key]: nextValue,
      };
    });
  }

  function toggleReferenceSearchColumn(key: ReferenceSearchColumnKey): void {
    setReferenceSearchColumnVisibility((prev) => {
      const nextValue = !prev[key];
      if (!nextValue && Object.values(prev).filter(Boolean).length <= 1) {
        return prev;
      }
      return {
        ...prev,
        [key]: nextValue,
      };
    });
  }

  function getBankPreviewFilterCellValue(row: BankStatementPreviewRow, key: BankPreviewHeaderFilterKey): string {
    switch (key) {
      case "rowNo":
        return String(row.rowNo);
      case "date":
        return formatDateTr(row.occurredAt);
      case "entryType":
        return row.entryType === "PAYMENT" ? "Tahsilat" : "Gider";
      case "amount":
        return formatTry(Number.isFinite(row.amount) ? row.amount : 0);
      case "doorNo":
        return (row.doorNo ?? "").trim() || "-";
      case "expenseItem": {
        if (row.entryType !== "EXPENSE") {
          return "-";
        }
        const item = expenseItemOptions.find((x) => x.id === row.expenseItemId);
        return item?.name ?? "-";
      }
      case "description":
        return row.description.trim() || "-";
      case "reference":
        return (row.reference ?? "").trim() || "-";
      default:
        return "";
    }
  }

  const bankPreviewFilterOptions = useMemo(() => {
    const unique: Record<BankPreviewHeaderFilterKey, Set<string>> = {
      rowNo: new Set<string>(),
      date: new Set<string>(),
      entryType: new Set<string>(),
      amount: new Set<string>(),
      doorNo: new Set<string>(),
      expenseItem: new Set<string>(),
      description: new Set<string>(),
      reference: new Set<string>(),
    };

    for (const item of bankPreviewRowsWithFlags) {
      for (const key of bankPreviewHeaderFilterKeys) {
        unique[key].add(getBankPreviewFilterCellValue(item.row, key));
      }
    }

    const sortValues = (items: Set<string>) =>
      Array.from(items).sort((a, b) => a.localeCompare(b, "tr", { numeric: true }));

    return {
      rowNo: sortValues(unique.rowNo),
      date: sortValues(unique.date),
      entryType: sortValues(unique.entryType),
      amount: sortValues(unique.amount),
      doorNo: sortValues(unique.doorNo),
      expenseItem: sortValues(unique.expenseItem),
      description: sortValues(unique.description),
      reference: sortValues(unique.reference),
    };
  }, [bankPreviewRowsWithFlags, bankPreviewHeaderFilterKeys, expenseItemOptions]);

  const bankPreviewVisibleRows = useMemo(
    () =>
      bankPreviewRowsWithFlags.filter((item) => {
        if (bankPreviewFilterMissingOnly && !item.isMissing) {
          return false;
        }
        if (bankPreviewFilterSplitOnly && !item.isSplitCandidate) {
          return false;
        }
        for (const key of bankPreviewHeaderFilterKeys) {
          const selected = bankPreviewHeaderFilterSelections[key];
          if (selected.length === 0) {
            continue;
          }

          const value = getBankPreviewFilterCellValue(item.row, key);
          if (!selected.includes(value)) {
            return false;
          }
        }
        return true;
      }),
    [
      bankPreviewRowsWithFlags,
      bankPreviewFilterMissingOnly,
      bankPreviewFilterSplitOnly,
      bankPreviewHeaderFilterSelections,
      bankPreviewHeaderFilterKeys,
    ]
  );

  const bankPreviewOverdueDebtByDoorNo = useMemo(() => {
    const debtMap = new Map<string, number>();
    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();

    for (const row of bulkStatement) {
      if (row.remaining <= 0) {
        continue;
      }

      const dueAt = new Date(row.dueDate).getTime();
      if (!Number.isFinite(dueAt) || dueAt >= todayStart) {
        continue;
      }

      const normalizedDoorNo = normalizeDoorNoForMatch(row.apartmentDoorNo);
      if (!normalizedDoorNo) {
        continue;
      }

      debtMap.set(normalizedDoorNo, Number(((debtMap.get(normalizedDoorNo) ?? 0) + row.remaining).toFixed(2)));
    }
    return debtMap;
  }, [bulkStatement]);

  const bankPreviewOpenDebtByDoorNo = useMemo(() => {
    const debtMap = new Map<string, number>();

    for (const row of bulkStatement) {
      if (row.remaining <= 0) {
        continue;
      }

      const normalizedDoorNo = normalizeDoorNoForMatch(row.apartmentDoorNo);
      if (!normalizedDoorNo) {
        continue;
      }

      debtMap.set(normalizedDoorNo, Number(((debtMap.get(normalizedDoorNo) ?? 0) + row.remaining).toFixed(2)));
    }

    return debtMap;
  }, [bulkStatement]);

  const bankPreviewPreSaveWarnings = useMemo(() => {
    const warnings: Array<{ rowNo: number; code: string; message: string }> = [];

    const paymentDoorTotals = new Map<string, number>();
    const paymentDoorLastRowNo = new Map<string, number>();
    for (const item of bankPreviewRowsWithFlags) {
      const row = item.row;
      if (row.entryType !== "PAYMENT") {
        continue;
      }

      const normalizedDoorNo = normalizeDoorNoForMatch(row.doorNo ?? "");
      if (!normalizedDoorNo || !Number.isFinite(row.amount) || row.amount <= 0) {
        continue;
      }

      const nextTotal = (paymentDoorTotals.get(normalizedDoorNo) ?? 0) + row.amount;
      paymentDoorTotals.set(normalizedDoorNo, Number(nextTotal.toFixed(2)));
      paymentDoorLastRowNo.set(normalizedDoorNo, row.rowNo);
    }

    for (const item of bankPreviewRowsWithFlags) {
      const { row, isMissing } = item;

      if (isMissing) {
        warnings.push({ rowNo: row.rowNo, code: "MISSING", message: "Zorunlu alan eksik" });
      }

      if (row.entryType !== "PAYMENT") {
        continue;
      }

      const normalizedDoorNo = normalizeDoorNoForMatch(row.doorNo ?? "");
      const description = row.description.trim();
      const hasLetters = /[a-zA-ZığüşöçİĞÜŞÖÇ]/.test(description);

      if (description.length < 8 || !hasLetters) {
        warnings.push({
          rowNo: row.rowNo,
          code: "WEAK_DESCRIPTION",
          message: "Aciklama anlamsiz veya cok kisa gorunuyor",
        });
      }

      if (row.isAutoSplit !== true && item.isSplitCandidate) {
        warnings.push({
          rowNo: row.rowNo,
          code: "SPLIT_CANDIDATE",
          message: "Birden fazla daire odemesi olabilir, bolme kontrolu onerilir",
        });
      }

      if (!normalizedDoorNo) {
        continue;
      }

      const overdueOpenDebt = bankPreviewOverdueDebtByDoorNo.get(normalizedDoorNo);
      if (overdueOpenDebt === undefined) {
        continue;
      }

      const isLastPaymentRowForDoor = paymentDoorLastRowNo.get(normalizedDoorNo) === row.rowNo;
      if (!isLastPaymentRowForDoor) {
        continue;
      }

      const totalPaymentForDoor = paymentDoorTotals.get(normalizedDoorNo) ?? 0;
      const openDebt = bankPreviewOpenDebtByDoorNo.get(normalizedDoorNo);

      if (openDebt !== undefined && Math.abs(totalPaymentForDoor - openDebt) > 0.01) {
        warnings.push({
          rowNo: row.rowNo,
          code: "CHARGE_NOT_EXACT_CLOSE",
          message: `Odeme tutari tahakkuku birebir kapatmiyor (acik tahakkuk: ${formatTry(openDebt)}, odeme toplami: ${formatTry(totalPaymentForDoor)})`,
        });
      }

      if (overdueOpenDebt <= 0.01 && totalPaymentForDoor > 0.01) {
        warnings.push({
          rowNo: row.rowNo,
          code: "NO_OPEN_DEBT",
          message: "Bu dairede vadesi gecmis acik borc gorunmuyor, odemeyi kontrol edin",
        });
        continue;
      }

      if (totalPaymentForDoor + 0.01 < overdueOpenDebt) {
        warnings.push({
          rowNo: row.rowNo,
          code: "PARTIAL_PAYMENT",
          message: `Kismi/tam kapanmayan odeme adayi (vadesi gecmis acik borc: ${formatTry(overdueOpenDebt)})`,
        });
      } else if (totalPaymentForDoor > overdueOpenDebt + 0.01) {
        warnings.push({
          rowNo: row.rowNo,
          code: "OVERPAYMENT",
          message: `Vadesi gecmis acik borcu asan odeme adayi (acik borc: ${formatTry(overdueOpenDebt)})`,
        });
      }
    }

    const unique = new Map<string, { rowNo: number; code: string; message: string }>();
    for (const warning of warnings) {
      const key = `${warning.rowNo}|${warning.code}|${warning.message}`;
      if (!unique.has(key)) {
        unique.set(key, warning);
      }
    }

    return [...unique.values()].sort((a, b) => a.rowNo - b.rowNo || a.code.localeCompare(b.code));
  }, [bankPreviewRowsWithFlags, bankPreviewOpenDebtByDoorNo, bankPreviewOverdueDebtByDoorNo, formatTry]);

  const expenseReportItemSummary = useMemo(() => {
    const normalizeSummaryItemName = (value: string): string =>
      value
        .replace(/\s*\([A-Z0-9_]+\)\s*$/u, "")
        .replace(/[ğĞ]/g, "g")
        .replace(/[üÜ]/g, "u")
        .replace(/[şŞ]/g, "s")
        .replace(/[ıİ]/g, "i")
        .replace(/[öÖ]/g, "o")
        .replace(/[çÇ]/g, "c")
        .replace(/\s+/g, " ")
        .trim();

    const grouped = new Map<string, { expenseItemName: string; totalAmount: number; rowCount: number }>();

    for (const row of expenseReportRows) {
      const normalizedName = normalizeSummaryItemName(row.expenseItemName);
      const key = normalizedName.toLocaleLowerCase("tr");

      const existing = grouped.get(key);
      if (!existing) {
        grouped.set(key, {
          expenseItemName: normalizedName,
          totalAmount: Number(row.amount),
          rowCount: 1,
        });
        continue;
      }

      existing.totalAmount += Number(row.amount);
      existing.rowCount += 1;
    }

    const rows = [...grouped.values()]
      .map((item) => ({
        ...item,
        totalAmount: Number(item.totalAmount.toFixed(2)),
      }))
      .sort((a, b) => b.totalAmount - a.totalAmount || a.expenseItemName.localeCompare(b.expenseItemName, "tr"));

    const grandTotal = Number(rows.reduce((sum, item) => sum + item.totalAmount, 0).toFixed(2));
    return { rows, grandTotal };
  }, [expenseReportRows]);

  const sortedExpenseReportRows = useMemo(() => {
    const getMethodLabel = (code: PaymentMethod): string =>
      paymentMethodOptions.find((x) => x.code === code)?.name ?? code;

    return [...expenseReportRows].sort((a, b) => {
      let compare = 0;

      switch (expenseReportSort.key) {
        case "spentAt": {
          compare = new Date(a.spentAt).getTime() - new Date(b.spentAt).getTime();
          break;
        }
        case "expenseItemName": {
          compare = a.expenseItemName.localeCompare(b.expenseItemName, "tr", { sensitivity: "base" });
          break;
        }
        case "paymentMethod": {
          compare = getMethodLabel(a.paymentMethod).localeCompare(getMethodLabel(b.paymentMethod), "tr", {
            sensitivity: "base",
          });
          break;
        }
        case "amount": {
          compare = Number(a.amount) - Number(b.amount);
          break;
        }
        case "description": {
          compare = (a.description ?? "").localeCompare(b.description ?? "", "tr", { sensitivity: "base" });
          break;
        }
        default:
          compare = 0;
      }

      if (compare === 0) {
        compare = a.id.localeCompare(b.id);
      }

      return expenseReportSort.direction === "asc" ? compare : -compare;
    });
  }, [expenseReportRows, expenseReportSort, paymentMethodOptions]);

  const toggleExpenseReportSort = (
    key: "spentAt" | "expenseItemName" | "paymentMethod" | "amount" | "description"
  ): void => {
    setExpenseReportSort((prev) => {
      if (prev.key === key) {
        return {
          key,
          direction: prev.direction === "asc" ? "desc" : "asc",
        };
      }

      return {
        key,
        direction: "asc",
      };
    });
  };

  const getExpenseReportSortButtonText = (
    key: "spentAt" | "expenseItemName" | "paymentMethod" | "amount" | "description"
  ): string => {
    if (expenseReportSort.key !== key) {
      return "↕";
    }
    return expenseReportSort.direction === "asc" ? "↑" : "↓";
  };

  const getExpenseReportSortButtonTitle = (
    key: "spentAt" | "expenseItemName" | "paymentMethod" | "amount" | "description"
  ): string => {
    if (expenseReportSort.key !== key) {
      return "Sirala";
    }
    return expenseReportSort.direction === "asc" ? "Artan siralama" : "Azalan siralama";
  };

  const parseDistDecimal = (value: string): number => {
    const raw = value.trim().replace(/\s+/g, "");
    if (!raw) {
      return Number.NaN;
    }

    const hasComma = raw.includes(",");
    const hasDot = raw.includes(".");

    if (hasComma && hasDot) {
      // TR style: 2.180,00 -> 2180.00
      if (raw.lastIndexOf(",") > raw.lastIndexOf(".")) {
        return Number(raw.replace(/\./g, "").replace(/,/g, "."));
      }
      // EN style: 2,180.00 -> 2180.00
      return Number(raw.replace(/,/g, ""));
    }

    if (hasComma) {
      return Number(raw.replace(/,/g, "."));
    }

    return Number(raw);
  };

  const formatDecimalInput = (value: number): string =>
    new Intl.NumberFormat("tr-TR", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(value);

  const expenseDistEffectiveCoefficientScope = useMemo<"BY_TYPE" | "BY_BLOCK" | "BY_APARTMENT">(() => {
    if (expenseDistForm.selectedApartmentIds.length > 0) {
      return "BY_APARTMENT";
    }
    if (expenseDistForm.selectedBlockNames.length > 0) {
      return "BY_BLOCK";
    }
    return "BY_TYPE";
  }, [expenseDistForm.selectedApartmentIds.length, expenseDistForm.selectedBlockNames.length]);

  const expenseDistDraft = useMemo<
    | {
        ready: false;
        message: string;
      }
    | {
        ready: true;
        result: {
          periodYear: number;
          periodMonth: number;
          billAmount: number;
          dueDate: string;
          invoiceDate: string;
          periodStartDate: string;
          periodEndDate: string;
          selectedCount: number;
          smallCount: number;
          bigCount: number;
          distributedTotal: number;
          roundingDiff: number;
          rows: Array<{
            apartmentId: string;
            blockName: string;
            doorNo: string;
            type: ApartmentType;
            coefficient: number;
            amount: number;
          }>;
        };
      }
  >(() => {
    const amount = parseDistDecimal(expenseDistForm.billAmount);
    const smallCoefficient = parseDistDecimal(expenseDistForm.smallCoefficient);
    const bigCoefficient = parseDistDecimal(expenseDistForm.bigCoefficient);
    const nowYear = new Date().getFullYear();
    const rawPeriod = expenseDistForm.period.trim();
    let periodYear = nowYear;
    let periodMonth = Number.NaN;

    if (rawPeriod.includes("-")) {
      const [periodYearPart, periodMonthPart] = rawPeriod.split("-");
      periodYear = Number(periodYearPart);
      periodMonth = Number(periodMonthPart);
    } else {
      periodMonth = Number(rawPeriod);
    }

    const roundToStep = (value: number, step: number, direction: "UP" | "DOWN"): number => {
      if (!Number.isFinite(value) || !Number.isFinite(step) || step <= 0) {
        return value;
      }
      if (direction === "UP") {
        return Math.ceil(value / step) * step;
      }
      return Math.floor(value / step) * step;
    };

    const targetApartments = apartmentOptions.filter((apt) => {
      if (expenseDistForm.excludedApartmentIds.includes(apt.id)) {
        return false;
      }
      const hasTypeFilter = expenseDistForm.selectedApartmentTypes.length > 0;
      if (hasTypeFilter && !expenseDistForm.selectedApartmentTypes.includes(apt.type)) {
        return false;
      }
      if (expenseDistForm.selectedBlockNames.length > 0 && !expenseDistForm.selectedBlockNames.includes(apt.blockName)) {
        return false;
      }
      if (expenseDistForm.selectedApartmentIds.length > 0 && !expenseDistForm.selectedApartmentIds.includes(apt.id)) {
        return false;
      }
      return true;
    });

    const rowsWithCoeff = targetApartments.map((apt) => {
      const defaultByType = apt.type === "KUCUK" ? expenseDistForm.smallCoefficient : expenseDistForm.bigCoefficient;
      const blockOverride = expenseDistForm.blockCoefficients[apt.blockName]?.[apt.type];
      const apartmentOverride = expenseDistForm.apartmentCoefficients[apt.id];
      let rawCoefficient = defaultByType;

      if (expenseDistEffectiveCoefficientScope === "BY_BLOCK") {
        rawCoefficient = blockOverride ?? defaultByType;
      }

      if (expenseDistEffectiveCoefficientScope === "BY_APARTMENT") {
        rawCoefficient = apartmentOverride ?? defaultByType;
      }

      const coeff = parseDistDecimal(rawCoefficient);
      return {
        apartmentId: apt.id,
        blockName: apt.blockName,
        doorNo: apt.doorNo,
        type: apt.type,
        coefficient: coeff,
      };
    });

    const invalidCoeff = rowsWithCoeff.find((row) => !Number.isFinite(row.coefficient) || row.coefficient <= 0);
    if (invalidCoeff) {
      return { ready: false as const, message: "Katsayi degerleri 0'dan buyuk olmalidir" };
    }

    const totalWeight = rowsWithCoeff.reduce((sum, row) => sum + row.coefficient, 0);
    const totalApartmentCount = rowsWithCoeff.length;
    const smallCount = rowsWithCoeff.filter((x) => x.type === "KUCUK").length;
    const bigCount = rowsWithCoeff.filter((x) => x.type === "BUYUK").length;

    if (rowsWithCoeff.length === 0) {
      return { ready: false as const, message: "Secime uygun daire bulunamadi" };
    }

    if (
      !Number.isFinite(amount) ||
      amount <= 0 ||
      !Number.isFinite(periodYear) ||
      periodYear < 2000 ||
      !Number.isFinite(periodMonth) ||
      periodMonth < 1 ||
      periodMonth > 12 ||
      !Number.isFinite(smallCoefficient) ||
      smallCoefficient <= 0 ||
      !Number.isFinite(bigCoefficient) ||
      bigCoefficient <= 0 ||
      totalWeight <= 0 ||
      totalApartmentCount <= 0
    ) {
      return { ready: false as const, message: "Fatura, donem veya katsayi bilgileri gecersiz" };
    }

    // Excel logic: unit base is bill / apartment count (E+F), then multiplied by coefficient.
    const unitAmount = amount / totalApartmentCount;
    const rows = rowsWithCoeff.map((row) => {
      const raw = unitAmount * row.coefficient;
      const rounded = roundToStep(raw, expenseDistForm.roundingStep, expenseDistForm.roundingDirection);
      return {
        ...row,
        amount: Number(rounded.toFixed(2)),
      };
    });
    const distributedTotal = Number(rows.reduce((sum, row) => sum + row.amount, 0).toFixed(2));

    return {
      ready: true as const,
      result: {
        periodYear,
        periodMonth,
        billAmount: amount,
        dueDate: expenseDistForm.dueDate,
        invoiceDate: expenseDistForm.invoiceDate,
        periodStartDate: expenseDistForm.periodStartDate,
        periodEndDate: expenseDistForm.periodEndDate,
        selectedCount: rows.length,
        smallCount,
        bigCount,
        distributedTotal,
        roundingDiff: Number((amount - distributedTotal).toFixed(2)),
        rows,
      },
    };
  }, [
    apartmentOptions,
    expenseDistEffectiveCoefficientScope,
    expenseDistForm.billAmount,
    expenseDistForm.period,
    expenseDistForm.dueDate,
    expenseDistForm.invoiceDate,
    expenseDistForm.periodStartDate,
    expenseDistForm.periodEndDate,
    expenseDistForm.selectedApartmentTypes,
    expenseDistForm.selectedBlockNames,
    expenseDistForm.selectedApartmentIds,
    expenseDistForm.excludedApartmentIds,
    expenseDistForm.smallCoefficient,
    expenseDistForm.bigCoefficient,
    expenseDistForm.blockCoefficients,
    expenseDistForm.apartmentCoefficients,
    expenseDistForm.roundingDirection,
    expenseDistForm.roundingStep
  ]);

  const mergedChargeConsistencyRows = useMemo(() => {
    const grouped = new Map<
      string,
      ChargeConsistencyWarningRow & {
        codes: ChargeConsistencyWarningRow["code"][];
        messages: string[];
      }
    >();

    for (const row of chargeConsistencyRows) {
      const key = `${row.chargeId ?? row.apartmentId}|${row.periodYear}|${row.periodMonth}`;
      const existing = grouped.get(key);

      if (!existing) {
        grouped.set(key, {
          ...row,
          codes: [row.code],
          messages: [row.message],
        });
        continue;
      }

      if (!existing.codes.includes(row.code)) {
        existing.codes.push(row.code);
      }
      if (!existing.messages.includes(row.message)) {
        existing.messages.push(row.message);
      }
      if (existing.expectedAmount === null && row.expectedAmount !== null) {
        existing.expectedAmount = row.expectedAmount;
      }
      if (existing.actualAmount === null && row.actualAmount !== null) {
        existing.actualAmount = row.actualAmount;
      }
      if (!existing.expectedDueDate && row.expectedDueDate) {
        existing.expectedDueDate = row.expectedDueDate;
      }
      if (!existing.actualDueDate && row.actualDueDate) {
        existing.actualDueDate = row.actualDueDate;
      }
      if (row.residentNames.length > existing.residentNames.length) {
        existing.residentNames = row.residentNames;
      }
    }

    return [...grouped.values()];
  }, [chargeConsistencyRows]);

  const rawChargeConsistencyRows = useMemo(
    () =>
      chargeConsistencyRows.map((row) => ({
        ...row,
        codes: [row.code],
        messages: [row.message],
      })),
    [chargeConsistencyRows]
  );

  const chargeConsistencyDisplayRows = useMemo(
    () => (chargeConsistencyViewMode === "RAW" ? rawChargeConsistencyRows : mergedChargeConsistencyRows),
    [chargeConsistencyViewMode, rawChargeConsistencyRows, mergedChargeConsistencyRows]
  );

  const chargeConsistencyCodeOptions = useMemo(() => {
    if (chargeConsistencyDisplayRows.length === 0) {
      return [] as Array<{ code: ChargeConsistencyWarningRow["code"]; count: number; label: string }>;
    }

    const codeCounts = new Map<ChargeConsistencyWarningRow["code"], number>();
    for (const row of chargeConsistencyDisplayRows) {
      for (const code of row.codes) {
        codeCounts.set(code, (codeCounts.get(code) ?? 0) + 1);
      }
    }

    const codes = [...codeCounts.entries()]
      .map(([code, count]) => ({ code, count, label: formatChargeConsistencyCode(code) }))
      .sort((a, b) => {
        if (b.count !== a.count) {
          return b.count - a.count;
        }
        return a.label.localeCompare(b.label, "tr", { sensitivity: "base" });
      });

    return codes;
  }, [chargeConsistencyDisplayRows]);

  const visibleChargeConsistencyRows = useMemo(() => {
    if (chargeConsistencySelectedCodes.length === 0) {
      return chargeConsistencyDisplayRows;
    }

    const selected = new Set(chargeConsistencySelectedCodes);
    return chargeConsistencyDisplayRows.filter((row) => row.codes.some((code) => selected.has(code)));
  }, [chargeConsistencyDisplayRows, chargeConsistencySelectedCodes]);

  const sortedApartmentBalanceMatrixRows = useMemo(
    () =>
      [...apartmentBalanceMatrixRows].sort((a, b) => {
        const doorCompare = a.apartmentDoorNo.localeCompare(b.apartmentDoorNo, "tr", {
          numeric: true,
          sensitivity: "base",
        });
        if (doorCompare !== 0) {
          return doorCompare;
        }

        const blockCompare = a.blockName.localeCompare(b.blockName, "tr", {
          sensitivity: "base",
        });
        if (blockCompare !== 0) {
          return blockCompare;
        }

        return a.occupant.localeCompare(b.occupant, "tr", {
          sensitivity: "base",
        });
      }),
    [apartmentBalanceMatrixRows]
  );

  const expenseDistApartmentSelectionOptions = useMemo(
    () =>
      apartmentOptions.filter((apt) => {
        const hasTypeFilter = expenseDistForm.selectedApartmentTypes.length > 0;
        if (hasTypeFilter && !expenseDistForm.selectedApartmentTypes.includes(apt.type)) {
          return false;
        }

        if (
          expenseDistForm.selectedBlockNames.length > 0 &&
          !expenseDistForm.selectedBlockNames.includes(apt.blockName)
        ) {
          return false;
        }

        return true;
      }),
    [apartmentOptions, expenseDistForm.selectedApartmentTypes, expenseDistForm.selectedBlockNames]
  );

  const expenseDistSelectedApartmentRows = useMemo(
    () =>
      expenseDistApartmentSelectionOptions.filter((apt) =>
        expenseDistForm.selectedApartmentIds.includes(apt.id)
      ),
    [expenseDistApartmentSelectionOptions, expenseDistForm.selectedApartmentIds]
  );

  useEffect(() => {
    const validApartmentIds = new Set(expenseDistApartmentSelectionOptions.map((apt) => apt.id));
    const validAllApartmentIds = new Set(apartmentOptions.map((apt) => apt.id));

    setExpenseDistForm((prev) => {
      const nextSelectedApartmentIds = prev.selectedApartmentIds.filter((id) => validApartmentIds.has(id));
      const nextExcludedApartmentIds = prev.excludedApartmentIds.filter((id) => validAllApartmentIds.has(id));
      if (
        nextSelectedApartmentIds.length === prev.selectedApartmentIds.length &&
        nextExcludedApartmentIds.length === prev.excludedApartmentIds.length
      ) {
        return prev;
      }

      return {
        ...prev,
        selectedApartmentIds: nextSelectedApartmentIds,
        excludedApartmentIds: nextExcludedApartmentIds,
      };
    });
  }, [apartmentOptions, expenseDistApartmentSelectionOptions]);

  function getBulkCellValue(row: BulkStatementItem, key: BulkFilterKey): string {
    switch (key) {
      case "apartmentDoorNo":
        return row.apartmentDoorNo;
      case "apartmentOwnerName":
        return row.apartmentOwnerName ?? "-";
      case "period":
        return `${row.periodMonth}/${row.periodYear}`;
      case "type":
        return row.type;
      case "description":
        return formatBulkStatementDescription(row.description);
      case "dueDate":
        return formatDateTr(row.dueDate);
      case "amount":
        return String(row.amount);
      case "paidTotal":
        return String(row.paidTotal);
      case "remaining":
        return String(row.remaining);
      case "status":
        return row.status;
      default:
        return "";
    }
  }

  function formatBulkStatementDescription(description?: string | null): string {
    if (!description) {
      return "-";
    }

    const parts = description
      .split("|")
      .map((x) => x.trim())
      .filter(Boolean);

    if (parts.length === 0) {
      return "-";
    }

    const title = parts[0] ?? "";
    const invoiceAmountPart = parts.find((part) => /^fatura\s+tutar[ıi]\s*:/i.test(part));
    const invoiceDatePart = parts.find((part) => /^fatura\s+tarih[ıi]\s*:/i.test(part));

    if (!invoiceAmountPart && !invoiceDatePart) {
      return description;
    }

    const isDogalgazTitle = /^dogalgaz$/i.test(title.replace(/\s+/g, " ").trim());

    const formatDateToTr = (raw: string): string | null => {
      const dateOnly = raw.match(/\d{4}-\d{2}-\d{2}/)?.[0];
      if (!dateOnly) {
        return null;
      }
      const [year, month, day] = dateOnly.split("-");
      return `${day}.${month}.${year}`;
    };

    if (isDogalgazTitle && invoiceDatePart) {
      const rawValue = invoiceDatePart.replace(/^fatura\s+tarih[ıi]\s*:/i, "").trim();
      const trDate = formatDateToTr(rawValue);
      return trDate ? `Dogalgaz | Fatura tarihi: ${trDate}` : "Dogalgaz";
    }

    let normalizedInvoiceDatePart = invoiceDatePart;
    if (invoiceDatePart) {
      const rawValue = invoiceDatePart.replace(/^fatura\s+tarih[ıi]\s*:/i, "").trim();
      const dateMatch = rawValue.match(/\d{4}-\d{2}-\d{2}/);
      if (dateMatch?.[0]) {
        normalizedInvoiceDatePart = `Fatura tarihi: ${dateMatch[0]}`;
      }
    }

    const uniqueParts: string[] = [];
    for (const part of [title, invoiceAmountPart, normalizedInvoiceDatePart]) {
      if (!part) {
        continue;
      }
      const normalized = part.replace(/\s+/g, " ").trim().toLocaleLowerCase("tr-TR");
      if (uniqueParts.some((existing) => existing.replace(/\s+/g, " ").trim().toLocaleLowerCase("tr-TR") === normalized)) {
        continue;
      }
      uniqueParts.push(part);
    }

    return uniqueParts.join(" | ");
  }

  function formatAccountingStatementDescription(description?: string | null): string {
    if (!description) {
      return "-";
    }

    const rawParts = description
      .split("|")
      .map((x) => x.trim())
      .filter(Boolean)
      .filter((part) => !/^baslang[ıi]c\s*:/i.test(part) && !/^bitis\s*:/i.test(part) && !/^door\s*:/i.test(part));

    const hasCarryForwardTag = rawParts.some(
      (part) => /carry_forward\s*:/i.test(part) || /unapplied\s*:\s*carry_forward/i.test(part)
    );

    const sourceParts = rawParts
      .map((part) =>
        part
          .replace(/^BANK_DESC\s*:\s*/i, "")
          .replace(/\bCARRY_FORWARD\s*:\s*APARTMENT_CREDIT\b/gi, "")
          .replace(/\bUNAPPLIED\s*:\s*CARRY_FORWARD\b/gi, "")
          .replace(/\s*-\s*$/g, "")
          .replace(/\s{2,}/g, " ")
          .trim()
      )
      .filter((part) => part.length > 0)
      .filter((part) => !/^carry_forward\s*:/i.test(part) && !/^unapplied\s*:/i.test(part));

    const title = sourceParts[0] ?? "";
    const invoiceDatePart = sourceParts.find((part) => /^fatura\s+tarih[ıi]\s*:/i.test(part));
    const isDogalgazTitle = /^dogalgaz$/i.test(title.replace(/\s+/g, " ").trim());

    if (isDogalgazTitle && invoiceDatePart) {
      const rawValue = invoiceDatePart.replace(/^fatura\s+tarih[ıi]\s*:/i, "").trim();
      const dateOnly = rawValue.match(/\d{4}-\d{2}-\d{2}/)?.[0];
      if (dateOnly) {
        const [year, month, day] = dateOnly.split("-");
        return `Dogalgaz | Fatura tarihi: ${day}.${month}.${year}`;
      }
      return "Dogalgaz";
    }

    const parts = sourceParts
      .map((part) => {
        const invoiceDateValue = part.match(/^fatura\s+tarih[ıi]\s*:\s*(.+)$/i)?.[1]?.trim();
        if (invoiceDateValue) {
          const dateOnly = invoiceDateValue.match(/\d{4}-\d{2}-\d{2}/)?.[0];
          if (dateOnly) {
            return `Fatura tarihi: ${dateOnly}`;
          }
        }

        return part.replace(/(\d{4}-\d{2}-\d{2})T\d{2}:\d{2}:\d{2}\.\d{3}Z/g, "$1");
      });

    if (parts.length === 0) {
      if (hasCarryForwardTag) {
        return "Devir alacak girisi";
      }
      return "-";
    }

    const referenceParts = parts.filter((part) => /^(bank_ref|ref)\s*:/i.test(part));
    const nonReferenceParts = parts.filter((part) => !/^(bank_ref|ref)\s*:/i.test(part));

    return [...nonReferenceParts, ...referenceParts].join(" | ");
  }

  function setExpenseDistApartmentTypeChecked(type: ApartmentType, checked: boolean): void {
    setExpenseDistForm((prev) => {
      const hasType = prev.selectedApartmentTypes.includes(type);
      if (checked && hasType) {
        return prev;
      }
      if (!checked && !hasType) {
        return prev;
      }

      const nextTypes = checked
        ? [...prev.selectedApartmentTypes, type]
        : prev.selectedApartmentTypes.filter((x) => x !== type);

      return {
        ...prev,
        selectedApartmentTypes: nextTypes,
      };
    });
  }

  function setExpenseDistBlockChecked(blockName: string, checked: boolean): void {
    setExpenseDistForm((prev) => {
      const hasBlock = prev.selectedBlockNames.includes(blockName);
      if (checked && hasBlock) {
        return prev;
      }
      if (!checked && !hasBlock) {
        return prev;
      }

      const nextBlockNames = checked
        ? [...prev.selectedBlockNames, blockName]
        : prev.selectedBlockNames.filter((x) => x !== blockName);

      return {
        ...prev,
        selectedBlockNames: nextBlockNames,
      };
    });
  }

  function setExpenseDistApartmentChecked(apartmentId: string, checked: boolean): void {
    setExpenseDistForm((prev) => {
      const hasApartment = prev.selectedApartmentIds.includes(apartmentId);
      if (checked && hasApartment) {
        return prev;
      }
      if (!checked && !hasApartment) {
        return prev;
      }

      const nextApartmentIds = checked
        ? [...prev.selectedApartmentIds, apartmentId]
        : prev.selectedApartmentIds.filter((x) => x !== apartmentId);

      return {
        ...prev,
        selectedApartmentIds: nextApartmentIds,
      };
    });
  }

  function setExpenseDistApartmentCoefficient(apartmentId: string, value: string): void {
    setExpenseDistForm((prev) => ({
      ...prev,
      apartmentCoefficients: {
        ...prev.apartmentCoefficients,
        [apartmentId]: value,
      },
    }));
  }

  function setExpenseDistExcludedApartmentChecked(apartmentId: string, checked: boolean): void {
    setExpenseDistForm((prev) => {
      const hasApartment = prev.excludedApartmentIds.includes(apartmentId);
      if (checked && hasApartment) {
        return prev;
      }
      if (!checked && !hasApartment) {
        return prev;
      }

      const nextExcludedApartmentIds = checked
        ? [...prev.excludedApartmentIds, apartmentId]
        : prev.excludedApartmentIds.filter((x) => x !== apartmentId);

      return {
        ...prev,
        excludedApartmentIds: nextExcludedApartmentIds,
        selectedApartmentIds: checked ? prev.selectedApartmentIds.filter((x) => x !== apartmentId) : prev.selectedApartmentIds,
      };
    });
  }

  function selectAllExpenseDistApartmentTypes(): void {
    setExpenseDistForm((prev) => ({
      ...prev,
      selectedApartmentTypes: ["KUCUK", "BUYUK"],
    }));
  }

  function clearAllExpenseDistApartmentTypes(): void {
    setExpenseDistForm((prev) => ({
      ...prev,
      selectedApartmentTypes: [],
    }));
  }

  function selectAllExpenseDistBlocks(): void {
    setExpenseDistForm((prev) => ({
      ...prev,
      selectedBlockNames: blockOptions.map((block) => block.name),
    }));
  }

  function clearAllExpenseDistBlocks(): void {
    setExpenseDistForm((prev) => ({
      ...prev,
      selectedBlockNames: [],
    }));
  }

  function selectAllExpenseDistApartments(): void {
    setExpenseDistForm((prev) => ({
      ...prev,
      selectedApartmentIds: expenseDistApartmentSelectionOptions.map((apt) => apt.id),
    }));
  }

  function clearAllExpenseDistApartments(): void {
    setExpenseDistForm((prev) => ({
      ...prev,
      selectedApartmentIds: [],
    }));
  }

  function selectAllExpenseDistExcludedApartments(): void {
    setExpenseDistForm((prev) => ({
      ...prev,
      excludedApartmentIds: apartmentOptions.map((apt) => apt.id),
      selectedApartmentIds: [],
    }));
  }

  function clearAllExpenseDistExcludedApartments(): void {
    setExpenseDistForm((prev) => ({
      ...prev,
      excludedApartmentIds: [],
    }));
  }

  function formatChargeConsistencyCode(code: ChargeConsistencyWarningRow["code"]): string {
    switch (code) {
      case "MISSING_CHARGE":
        return "Eksik Tahakkuk";
      case "DUPLICATE_CHARGE":
        return "Mukkerrer Tahakkuk";
      case "AMOUNT_MISMATCH":
        return "Tutar Uyumsuz";
      case "DUE_DATE_NOT_MONTH_END":
        return "Vade Ay Sonu Degil";
      case "NONPOSITIVE_AMOUNT":
        return "Sifir/Negatif Tutar";
      case "EXEMPT_APARTMENT_HAS_CHARGE":
        return "Muaf Dairede Tahakkuk";
      default:
        return code;
    }
  }

  function getChargeConsistencyCodeSeverity(code: ChargeConsistencyWarningRow["code"]): "danger" | "warn" | "info" | "muted" {
    switch (code) {
      case "MISSING_CHARGE":
      case "DUPLICATE_CHARGE":
      case "NONPOSITIVE_AMOUNT":
        return "danger";
      case "AMOUNT_MISMATCH":
        return "warn";
      case "DUE_DATE_NOT_MONTH_END":
        return "info";
      case "EXEMPT_APARTMENT_HAS_CHARGE":
        return "muted";
      default:
        return "warn";
    }
  }

  function openCorrectionsForChargeConsistencyRow(row: { apartmentId: string; apartmentDoorNo: string; blockName: string }) {
    setCorrectionApartmentId(row.apartmentId);
    navigate("/admin/corrections");
    setMessage(`Duzeltmeler sayfasina yonlendirildi: ${row.blockName}/${row.apartmentDoorNo}`);
  }

  const bulkFilterOptions = useMemo(() => {
    const unique: Record<BulkFilterKey, Set<string>> = {
      apartmentDoorNo: new Set<string>(),
      apartmentOwnerName: new Set<string>(),
      period: new Set<string>(),
      type: new Set<string>(),
      description: new Set<string>(),
      dueDate: new Set<string>(),
      amount: new Set<string>(),
      paidTotal: new Set<string>(),
      remaining: new Set<string>(),
      status: new Set<string>(),
    };

    for (const row of sortedBulkStatement) {
      unique.apartmentDoorNo.add(getBulkCellValue(row, "apartmentDoorNo"));
      unique.apartmentOwnerName.add(getBulkCellValue(row, "apartmentOwnerName"));
      unique.period.add(getBulkCellValue(row, "period"));
      unique.type.add(getBulkCellValue(row, "type"));
      unique.description.add(getBulkCellValue(row, "description"));
      unique.dueDate.add(getBulkCellValue(row, "dueDate"));
      unique.amount.add(getBulkCellValue(row, "amount"));
      unique.paidTotal.add(getBulkCellValue(row, "paidTotal"));
      unique.remaining.add(getBulkCellValue(row, "remaining"));
      unique.status.add(getBulkCellValue(row, "status"));
    }

    const sortValues = (items: Set<string>) =>
      Array.from(items).sort((a, b) => a.localeCompare(b, "tr", { numeric: true }));

    return {
      apartmentDoorNo: sortValues(unique.apartmentDoorNo),
      apartmentOwnerName: sortValues(unique.apartmentOwnerName),
      period: sortValues(unique.period),
      type: sortValues(unique.type),
      description: sortValues(unique.description),
      dueDate: sortValues(unique.dueDate),
      amount: sortValues(unique.amount),
      paidTotal: sortValues(unique.paidTotal),
      remaining: sortValues(unique.remaining),
      status: sortValues(unique.status),
    };
  }, [sortedBulkStatement]);

  const filteredBulkStatement = useMemo(() => {
    const keys: BulkFilterKey[] = [
      "apartmentDoorNo",
      "apartmentOwnerName",
      "period",
      "type",
      "description",
      "dueDate",
      "amount",
      "paidTotal",
      "remaining",
      "status",
    ];

    return sortedBulkStatement.filter((row) =>
      keys.every((key) => {
        const selected = bulkFilterSelections[key];
        if (selected.length === 0) {
          return true;
        }

        return selected.includes(getBulkCellValue(row, key));
      })
    );
  }, [bulkFilterSelections, sortedBulkStatement]);

  useEffect(() => {
    if (!toastMessage) {
      return;
    }

    const normalizedToastMessage = normalizeToastText(toastMessage);
    const isStatementEmailSuccess = normalizedToastMessage.includes("e-mail gonderildi");
    const isStatementEmailMissingAddress = normalizedToastMessage.includes("kayitli bir email yok- gonderilmedi");
    const toastDurationMs = isStatementEmailMissingAddress ? 5000 : isStatementEmailSuccess ? 3000 : 1800;
    const timer = window.setTimeout(() => setToastMessage(""), toastDurationMs);
    return () => window.clearTimeout(timer);
  }, [toastMessage]);

  useEffect(() => {
    if (typeof BroadcastChannel === "undefined") {
      return;
    }

    const channel = new BroadcastChannel("apartmanweb-admin-sync");
    crossTabSyncChannelRef.current = channel;

    channel.onmessage = (event: MessageEvent<{ type?: string }>) => {
      if (event.data?.type !== "data-changed") {
        return;
      }

      if (crossTabSyncDebounceRef.current) {
        window.clearTimeout(crossTabSyncDebounceRef.current);
      }

      crossTabSyncDebounceRef.current = window.setTimeout(() => {
        void autoRefreshAfterDelete();
        setToastMessage("Diger sekmeden veri guncellendi");
      }, 250);
    };

    return () => {
      if (crossTabSyncDebounceRef.current) {
        window.clearTimeout(crossTabSyncDebounceRef.current);
      }
      channel.close();
      crossTabSyncChannelRef.current = null;
    };
  }, []);

  useEffect(() => {
    if (!activeBulkFilterKey) {
      return;
    }

    const onDocumentClick = (event: MouseEvent) => {
      const target = event.target as Element | null;
      if (!target) {
        return;
      }

      if (target.closest(".bulk-filter-menu") || target.closest(".bulk-filter-button")) {
        return;
      }

      setActiveBulkFilterKey(null);
    };

    document.addEventListener("click", onDocumentClick);
    return () => document.removeEventListener("click", onDocumentClick);
  }, [activeBulkFilterKey]);

  useEffect(() => {
    if (!activeBankPreviewFilterKey) {
      return;
    }

    const onDocumentClick = (event: MouseEvent) => {
      const target = event.target as Element | null;
      if (!target) {
        return;
      }

      if (target.closest(".bank-preview-filter-menu") || target.closest(".bank-preview-filter-button")) {
        return;
      }

      setActiveBankPreviewFilterKey(null);
    };

    document.addEventListener("click", onDocumentClick);
    return () => document.removeEventListener("click", onDocumentClick);
  }, [activeBankPreviewFilterKey]);

  function toggleBulkFilterValue(key: BulkFilterKey, value: string): void {
    setBulkFilterSelections((prev) => {
      const exists = prev[key].includes(value);
      return {
        ...prev,
        [key]: exists ? prev[key].filter((item) => item !== value) : [...prev[key], value],
      };
    });
  }

  function selectAllBulkFilterValues(key: BulkFilterKey): void {
    setBulkFilterSelections((prev) => ({
      ...prev,
      [key]: bulkFilterOptions[key],
    }));
  }

  function clearBulkFilterValues(key: BulkFilterKey): void {
    setBulkFilterSelections((prev) => ({
      ...prev,
      [key]: [],
    }));
  }

  function renderBulkFilterHeader(label: string, key: BulkFilterKey, alignNumeric = false) {
    const selected = bulkFilterSelections[key];
    const options = bulkFilterOptions[key];
    const isOpen = activeBulkFilterKey === key;

    return (
      <th key={key} className={alignNumeric ? "col-num" : undefined}>
        <button
          type="button"
          className="bulk-filter-button"
          onClick={() => setActiveBulkFilterKey((prev) => (prev === key ? null : key))}
        >
          <span>{label}</span>
          {selected.length > 0 && <span className="filter-count">{selected.length}</span>}
          <span className="filter-arrow">▼</span>
        </button>

        {isOpen && (
          <div className="bulk-filter-menu">
            <div className="bulk-filter-actions">
              <button type="button" className="btn btn-ghost" onClick={() => selectAllBulkFilterValues(key)}>
                Tumunu Sec
              </button>
              <button type="button" className="btn btn-ghost" onClick={() => clearBulkFilterValues(key)}>Temizle</button>
            </div>
            <div className="bulk-filter-options">
              {options.map((value) => (
                <label key={value} className="bulk-filter-option">
                  <input
                    type="checkbox"
                    checked={selected.includes(value)}
                    onChange={() => toggleBulkFilterValue(key, value)}
                  />
                  <span>{value}</span>
                </label>
              ))}
            </div>
          </div>
        )}
      </th>
    );
  }

  function toggleBankPreviewFilterValue(key: BankPreviewHeaderFilterKey, value: string): void {
    setBankPreviewHeaderFilterSelections((prev) => {
      const exists = prev[key].includes(value);
      return {
        ...prev,
        [key]: exists ? prev[key].filter((item) => item !== value) : [...prev[key], value],
      };
    });
  }

  function selectAllBankPreviewFilterValues(key: BankPreviewHeaderFilterKey): void {
    setBankPreviewHeaderFilterSelections((prev) => ({
      ...prev,
      [key]: bankPreviewFilterOptions[key],
    }));
  }

  function clearBankPreviewFilterValues(key: BankPreviewHeaderFilterKey): void {
    setBankPreviewHeaderFilterSelections((prev) => ({
      ...prev,
      [key]: [],
    }));
  }

  function resetBankPreviewHeaderFilters(): void {
    setActiveBankPreviewFilterKey(null);
    setBankPreviewHeaderFilterSelections({
      rowNo: [],
      date: [],
      entryType: [],
      amount: [],
      doorNo: [],
      expenseItem: [],
      description: [],
      reference: [],
    });
  }

  function clearBankStatementScreenState(): void {
    setBankStatementFile(null);
    setBankStatementFileInputKey((prev) => prev + 1);
    setBankPreviewRows([]);
    setBankPreviewFileName("");
    setBankPreviewFilterMissingOnly(false);
    setBankPreviewFilterSplitOnly(false);
    resetBankPreviewHeaderFilters();
    setMessage("Banka ekstresi secimi ve onizleme temizlendi");
  }

  function renderBankPreviewFilterHeader(label: string, key: BankPreviewHeaderFilterKey, alignNumeric = false) {
    const selected = bankPreviewHeaderFilterSelections[key];
    const options = bankPreviewFilterOptions[key];
    const isOpen = activeBankPreviewFilterKey === key;

    return (
      <th key={key} className={alignNumeric ? "col-num" : undefined}>
        <button
          type="button"
          className="bulk-filter-button bank-preview-filter-button"
          onClick={() => setActiveBankPreviewFilterKey((prev) => (prev === key ? null : key))}
        >
          <span>{label}</span>
          {selected.length > 0 && <span className="filter-count">{selected.length}</span>}
          <span className="filter-arrow">▼</span>
        </button>

        {isOpen && (
          <div className="bulk-filter-menu bank-preview-filter-menu">
            <div className="bulk-filter-actions">
              <button type="button" className="btn btn-ghost" onClick={() => selectAllBankPreviewFilterValues(key)}>
                Tumunu Sec
              </button>
              <button type="button" className="btn btn-ghost" onClick={() => clearBankPreviewFilterValues(key)}>Temizle</button>
            </div>
            <div className="bulk-filter-options">
              {options.map((value) => (
                <label key={value} className="bulk-filter-option">
                  <input
                    type="checkbox"
                    checked={selected.includes(value)}
                    onChange={() => toggleBankPreviewFilterValue(key, value)}
                  />
                  <span>{value}</span>
                </label>
              ))}
            </div>
          </div>
        )}
      </th>
    );
  }

  async function fetchStatement(targetApartmentId?: string, options?: { silent?: boolean }): Promise<void> {
    const silent = options?.silent ?? false;
    const requestedApartmentId = targetApartmentId ?? activeApartmentId;
    if (!silent) {
      setLoading(true);
      setMessage("Ekstre yukleniyor...");
    }
    try {
      if (!requestedApartmentId) {
        if (!silent) {
          setMessage("Admin icin apartmentId girin");
          setLoading(false);
        }
        return;
      }

      const endpoint = `${apiBase}/api/admin/apartments/${requestedApartmentId}/statement`;

      const res = await fetch(endpoint, {
        credentials: "include",
      });

      if (!res.ok) {
        throw new Error("Ekstre alinamadi");
      }

      const data = (await res.json()) as StatementResponse;
      setStatement(data.statement);
      setAccountingStatement(data.accountingStatement ?? []);
      setStatementHeaderApartmentId(requestedApartmentId);
      if (!silent) {
        setMessage(`Ekstre hazir: ${data.statement.length} satir`);
      }
    } catch (err) {
      console.error(err);
      if (!silent) {
        setMessage("Ekstre cekilirken hata olustu");
      }
    } finally {
      if (!silent) {
        setLoading(false);
      }
    }
  }

  async function fetchBulkStatement(options?: { silent?: boolean }): Promise<void> {
    const silent = options?.silent ?? false;
    if (!silent) {
      setLoading(true);
      setMessage("Toplu ekstre yukleniyor...");
    }

    try {
      const data = await authorizedRequest<BulkStatementResponse>("/api/admin/statement/all");
      setBulkStatement(data.statement);
      if (!silent) {
        setMessage(`Toplu ekstre hazir: ${data.statement.length} satir`);
      }
    } catch (err) {
      console.error(err);
      if (!silent) {
        setMessage(err instanceof Error ? err.message : "Toplu ekstre alinamadi");
      }
    } finally {
      if (!silent) {
        setLoading(false);
      }
    }
  }

  async function fetchMixedPaymentReport(options?: { apartmentId?: string; silent?: boolean }): Promise<void> {
    const apartmentId = options?.apartmentId;
    const silent = options?.silent ?? false;

    if (!silent) {
      setLoading(true);
      setMessage("Karisik odeme raporu yukleniyor...");
    }

    try {
      const query = apartmentId ? `?apartmentId=${encodeURIComponent(apartmentId)}` : "";
      const data = await authorizedRequest<MixedPaymentReportResponse>(`/api/admin/reconcile/mixed-payments${query}`);
      setMixedPaymentRows(data.rows);
      setMixedPaymentTotalCount(data.totalCount);

      if (!silent) {
        setMessage(`Karisik odeme raporu hazir: ${data.totalCount} kayit`);
      }
    } catch (err) {
      console.error(err);
      if (!silent) {
        setMessage(err instanceof Error ? err.message : "Karisik odeme raporu alinamadi");
      }
    } finally {
      if (!silent) {
        setLoading(false);
      }
    }
  }

  async function fetchDoorMismatchReport(options?: { silent?: boolean }): Promise<void> {
    const silent = options?.silent ?? false;

    if (!silent) {
      setDoorMismatchLoading(true);
      setMessage("Banka eslestirme kontrol raporu yukleniyor...");
    }

    try {
      const data = await authorizedRequest<DoorMismatchReportResponse>("/api/admin/reconcile/door-mismatch-report");
      setDoorMismatchRows(data.rows);
      setDoorMismatchTotals(data.totals);

      if (!silent) {
        setMessage(`Banka eslestirme kontrolu hazir: ${data.totals.mismatchPaymentItemCount} uyumsuz satir`);
      }
    } catch (err) {
      console.error(err);
      if (!silent) {
        setMessage(err instanceof Error ? err.message : "Banka eslestirme kontrol raporu alinamadi");
      }
    } finally {
      if (!silent) {
        setDoorMismatchLoading(false);
      }
    }
  }

  function clearDoorMismatchReport(): void {
    setDoorMismatchRows([]);
    setDoorMismatchTotals(null);
  }

  async function reconcileSelectedApartment(): Promise<void> {
    if (!activeApartmentId) {
      setMessage("Yeniden eslestirme icin once daire secin");
      return;
    }

    setLoading(true);
    setMessage("Secilen daire icin yeniden eslestirme calisiyor...");

    try {
      const result = await authorizedRequest<ReconcileApartmentResponse>(
        `/api/admin/apartments/${activeApartmentId}/reconcile`,
        { method: "POST" }
      );

      setMessage(
        `${result.apartmentDoorNo} daire yeniden eslesti. Islenen odeme: ${result.processedPaymentCount}, yeni eslesme satiri: ${result.createdPaymentItemCount}`
      );

      await fetchStatement(activeApartmentId);
      await fetchMixedPaymentReport({ apartmentId: activeApartmentId, silent: true });
    } catch (err) {
      console.error(err);
      setMessage(err instanceof Error ? err.message : "Yeniden eslestirme basarisiz");
    } finally {
      setLoading(false);
    }
  }

  async function checkApiConnection(): Promise<void> {
    try {
      const res = await fetch(`${apiBase}/health`);
      setApiConnectionOk(res.ok);
    } catch {
      setApiConnectionOk(false);
    }
  }

  async function authorizedRequest<T>(
    endpoint: string,
    options?: {
      method?: "GET" | "POST" | "PUT" | "DELETE";
      payload?: unknown;
      suppressDataChangeToast?: boolean;
    }
  ): Promise<T> {
    const method = options?.method ?? "GET";
    const payload = options?.payload;
    const suppressDataChangeToast = options?.suppressDataChangeToast ?? false;
    const isSaveAction = method === "POST" || method === "PUT";
    const isDataChangeAction = isSaveAction || method === "DELETE";

    let res: Response;
    try {
      res = await fetch(`${apiBase}${endpoint}`, {
        method,
        headers: {
          ...(payload ? { "Content-Type": "application/json" } : {}),
        },
        credentials: "include",
        ...(payload ? { body: JSON.stringify(payload) } : {}),
      });
      setApiConnectionOk(true);
    } catch {
      setApiConnectionOk(false);
      if (isDataChangeAction && !suppressDataChangeToast) {
        setToastMessage(method === "DELETE" ? "Kayit silinemedi" : "Veri kaydedilemedi");
      }
      throw new Error("API baglantisi kurulamadi. Sunucunun calistigini kontrol edin (localhost:3000)");
    }

    if (!res.ok) {
      const errorBody = (await res.json().catch(() => ({}))) as {
        message?: string;
        warningCode?: string;
        blockedApartments?: string[];
      };
      if (isDataChangeAction && !suppressDataChangeToast) {
        setToastMessage(method === "DELETE" ? "Kayit silinemedi" : "Veri kaydedilemedi");
      }
      if (res.status === 401) {
        throw new Error("Oturum gecersiz veya suresi dolmus. Lutfen tekrar giris yapin");
      }
      if (res.status === 413) {
        throw new Error("Gonderilen veri cok buyuk (413). Satir sayisini azaltip parca parca kaydetmeyi deneyin.");
      }

      if (res.status === 409 && errorBody.warningCode === "APARTMENT_EXEMPT_FOR_CHARGE_TYPE") {
        setWarningPanel({
          title: "Muafiyet Uyarisi",
          message: errorBody.message ?? "Muaf daire secildigi icin islem durduruldu",
          items: errorBody.blockedApartments ?? [],
        });
      }

      throw new Error(errorBody.message ?? "Istek basarisiz");
    }

    setWarningPanel(null);

    if (isDataChangeAction && !suppressDataChangeToast) {
      setToastMessage(method === "DELETE" ? "Kayit silindi" : "Veri kaydedildi");
    }

    if (method === "DELETE") {
      void autoRefreshAfterDelete();
    }

    if (method !== "GET") {
      crossTabSyncChannelRef.current?.postMessage({ type: "data-changed" });
    }

    if (res.status === 204) {
      return undefined as T;
    }

    return (await res.json()) as T;
  }

  async function fetchApartmentOptions(): Promise<void> {
    try {
      const data = await authorizedRequest<ApartmentOption[]>('/api/admin/apartments');
      const sorted = [...data].sort((a, b) => {
        const aNum = Number(a.doorNo);
        const bNum = Number(b.doorNo);

        if (!Number.isNaN(aNum) && !Number.isNaN(bNum) && aNum !== bNum) {
          return aNum - bNum;
        }

        if (a.blockName !== b.blockName) {
          return a.blockName.localeCompare(b.blockName, "tr");
        }

        return a.doorNo.localeCompare(b.doorNo, "tr", { numeric: true });
      });

      setApartmentOptions(sorted);
    } catch (err) {
      console.error(err);
      const text = err instanceof Error ? err.message : "Daire listesi alinamadi";
      setMessage(text);
    }
  }

  async function fetchBlockOptions(): Promise<void> {
    try {
      const data = await authorizedRequest<BlockDefinition[]>("/api/admin/blocks");
      const sorted = [...data].sort((a, b) => a.name.localeCompare(b.name, "tr"));
      setBlockOptions(sorted);
      setApartmentForm((prev) => {
        if (sorted.length === 0) {
          return { ...prev, blockName: "" };
        }
        const exists = sorted.some((x) => x.name === prev.blockName);
        if (exists) {
          return prev;
        }
        return { ...prev, blockName: sorted[0].name };
      });
    } catch (err) {
      console.error(err);
      setMessage(err instanceof Error ? err.message : "Blok listesi alinamadi");
    }
  }

  async function fetchApartmentClassOptions(): Promise<void> {
    try {
      const data = await authorizedRequest<ApartmentClassDefinition[]>("/api/admin/apartment-classes");
      const sorted = [...data].sort((a, b) => a.name.localeCompare(b.name, "tr"));
      setApartmentClassOptions(sorted);

      const firstActive = sorted.find((x) => x.isActive) ?? sorted[0];
      setApartmentForm((prev) => {
        if (prev.apartmentClassId) {
          const exists = sorted.some((x) => x.id === prev.apartmentClassId);
          if (exists) {
            return prev;
          }
        }

        return {
          ...prev,
          apartmentClassId: firstActive?.id ?? "",
        };
      });
    } catch (err) {
      console.error(err);
      setMessage(err instanceof Error ? err.message : "Daire siniflari alinamadi");
    }
  }

  async function fetchApartmentTypeOptions(): Promise<void> {
    try {
      const data = await authorizedRequest<ApartmentTypeDefinition[]>("/api/admin/apartment-types");
      const sorted = [...data].sort((a, b) => a.name.localeCompare(b.name, "tr"));
      setApartmentTypeOptions(sorted);
    } catch (err) {
      console.error(err);
      setMessage(err instanceof Error ? err.message : "Daire tipleri alinamadi");
    }
  }

  async function fetchApartmentDutyOptions(): Promise<void> {
    try {
      const data = await authorizedRequest<ApartmentDutyDefinition[]>("/api/admin/apartment-duties");
      const sorted = [...data].sort((a, b) => a.name.localeCompare(b.name, "tr"));
      setApartmentDutyOptions(sorted);

      const firstActive = sorted.find((x) => x.isActive) ?? sorted[0];
      setApartmentForm((prev) => {
        if (prev.apartmentDutyId) {
          const exists = sorted.some((x) => x.id === prev.apartmentDutyId);
          if (exists) {
            return prev;
          }
        }

        return {
          ...prev,
          apartmentDutyId: firstActive?.id ?? "",
        };
      });
    } catch (err) {
      console.error(err);
      setMessage(err instanceof Error ? err.message : "Daire gorevleri alinamadi");
    }
  }

  async function fetchBankOptions(): Promise<BankDefinition[]> {
    try {
      const data = await authorizedRequest<BankDefinition[]>("/api/admin/banks");
      const sorted = [...data].sort((a, b) => a.name.localeCompare(b.name, "tr"));
      setBankOptions(sorted);

      const firstActive = sorted.find((x) => x.isActive) ?? sorted[0];
      setBankBranchForm((prev) => {
        if (prev.bankId) {
          const exists = sorted.some((x) => x.id === prev.bankId);
          if (exists) {
            return prev;
          }
        }

        return {
          ...prev,
          bankId: firstActive?.id ?? "",
        };
      });
      setBankTermDepositForm((prev) => {
        if (prev.bankId) {
          const exists = sorted.some((x) => x.id === prev.bankId);
          if (exists) {
            return prev;
          }
        }

        return {
          ...prev,
          bankId: firstActive?.id ?? "",
          branchId: "",
        };
      });
      return sorted;
    } catch (err) {
      console.error(err);
      setMessage(err instanceof Error ? err.message : "Banka listesi alinamadi");
      return [];
    }
  }

  async function fetchChargeTypeOptions(): Promise<void> {
    try {
      const data = await authorizedRequest<ChargeTypeDefinition[]>("/api/admin/charge-types");
      setChargeTypeOptions(data);

      const firstActive = data.find((x) => x.isActive) ?? data[0];
      if (firstActive) {
        setExpenseDistForm((prev) => ({
          ...prev,
          chargeTypeId: prev.chargeTypeId || firstActive.id,
        }));
      }
    } catch (err) {
      console.error(err);
      setMessage("Tahakkuk tipleri alinamadi");
    }
  }

  async function fetchPaymentMethodOptions(): Promise<void> {
    try {
      const data = await authorizedRequest<PaymentMethodDefinition[]>("/api/admin/payment-methods");
      setPaymentMethodOptions(data);

      const firstActive = data.find((x) => x.isActive) ?? data[0];
      if (firstActive) {
        // Payment form defaults are managed in PaymentEntryPage local state.
      }
    } catch (err) {
      console.error(err);
      setMessage("Odeme araclari alinamadi");
    }
  }

  async function fetchWelcomeBuildingProfile(): Promise<void> {
    try {
      const data = await authorizedRequest<{ buildingName: string | null }>("/api/admin/building-profile");
      setWelcomeBuildingName((data.buildingName ?? "").trim());
    } catch (err) {
      console.error(err);
      setWelcomeBuildingName("");
    }
  }

  async function fetchExpenseItemOptions(): Promise<void> {
    try {
      const data = await authorizedRequest<ExpenseItemDefinition[]>("/api/admin/expense-items");
      setExpenseItemOptions(data);

      const firstActive = data.find((x) => x.isActive) ?? data[0];
      if (firstActive) {
        // Expense form defaults are managed in ExpenseEntryPage local state.
      }
    } catch (err) {
      console.error(err);
      setMessage("Gider kalemleri alinamadi");
    }
  }

  async function fetchDescriptionDoorRules(): Promise<void> {
    try {
      const data = await authorizedRequest<DescriptionDoorRule[]>("/api/admin/description-door-rules");
      setDescriptionDoorRules(data);
    } catch (err) {
      console.error(err);
      setMessage("Aciklama-daire esleme listesi alinamadi");
    }
  }

  async function fetchDescriptionExpenseRules(): Promise<void> {
    try {
      const data = await authorizedRequest<DescriptionExpenseRule[]>("/api/admin/description-expense-rules");
      setDescriptionExpenseRules(data);
    } catch (err) {
      console.error(err);
      setMessage("Aciklama-gider esleme listesi alinamadi");
    }
  }

  async function onSubmitDescriptionDoorRule(e: FormEvent<HTMLFormElement>): Promise<void> {
    e.preventDefault();
    setLoading(true);

    try {
      const payload = {
        keyword: descriptionDoorRuleForm.keyword,
        doorNo: descriptionDoorRuleForm.doorNo,
        isActive: descriptionDoorRuleForm.isActive,
      };

      if (editingDescriptionDoorRuleId) {
        await authorizedRequest(`/api/admin/description-door-rules/${editingDescriptionDoorRuleId}`, {
          method: "PUT",
          payload,
        });
      } else {
        await authorizedRequest("/api/admin/description-door-rules", {
          method: "POST",
          payload,
        });
      }

      await fetchDescriptionDoorRules();
      setDescriptionDoorRuleForm({ keyword: "", doorNo: "", isActive: true });
      setEditingDescriptionDoorRuleId(null);
      setMessage(editingDescriptionDoorRuleId ? "Esleme kurali guncellendi" : "Esleme kurali eklendi");
    } catch (err) {
      console.error(err);
      setMessage(err instanceof Error ? err.message : "Esleme kurali kaydedilemedi");
    } finally {
      setLoading(false);
    }
  }

  async function onSubmitDescriptionExpenseRule(e: FormEvent<HTMLFormElement>): Promise<void> {
    e.preventDefault();
    setLoading(true);

    try {
      const payload = {
        keyword: descriptionExpenseRuleForm.keyword,
        expenseItemId: descriptionExpenseRuleForm.expenseItemId,
        isActive: descriptionExpenseRuleForm.isActive,
      };

      if (editingDescriptionExpenseRuleId) {
        await authorizedRequest(`/api/admin/description-expense-rules/${editingDescriptionExpenseRuleId}`, {
          method: "PUT",
          payload,
        });
      } else {
        await authorizedRequest("/api/admin/description-expense-rules", {
          method: "POST",
          payload,
        });
      }

      await fetchDescriptionExpenseRules();
      setDescriptionExpenseRuleForm({ keyword: "", expenseItemId: "", isActive: true });
      setEditingDescriptionExpenseRuleId(null);
      setMessage(editingDescriptionExpenseRuleId ? "Gider esleme kurali guncellendi" : "Gider esleme kurali eklendi");
    } catch (err) {
      console.error(err);
      setMessage(err instanceof Error ? err.message : "Gider esleme kurali kaydedilemedi");
    } finally {
      setLoading(false);
    }
  }

  function startEditDescriptionDoorRule(rule: DescriptionDoorRule): void {
    setEditingDescriptionDoorRuleId(rule.id);
    setDescriptionDoorRuleForm({
      keyword: rule.keyword,
      doorNo: rule.doorNo,
      isActive: rule.isActive,
    });
    setMessage(`Duzenleme modu: ${rule.keyword}`);

    // Bring the edit form into view so the user sees the state change immediately.
    descriptionDoorRuleFormRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  function cancelEditDescriptionDoorRule(): void {
    setEditingDescriptionDoorRuleId(null);
    setDescriptionDoorRuleForm({ keyword: "", doorNo: "", isActive: true });
  }

  function startEditDescriptionExpenseRule(rule: DescriptionExpenseRule): void {
    setEditingDescriptionExpenseRuleId(rule.id);
    setDescriptionExpenseRuleForm({
      keyword: rule.keyword,
      expenseItemId: rule.expenseItemId,
      isActive: rule.isActive,
    });
    setMessage(`Gider esleme duzenleme modu: ${rule.keyword}`);
    descriptionExpenseRuleFormRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  function cancelEditDescriptionExpenseRule(): void {
    setEditingDescriptionExpenseRuleId(null);
    setDescriptionExpenseRuleForm({ keyword: "", expenseItemId: "", isActive: true });
  }

  async function deleteDescriptionDoorRule(rule: DescriptionDoorRule): Promise<void> {
    const accepted = window.confirm(`"${rule.keyword}" kuralini silmek istiyor musun?`);
    if (!accepted) {
      return;
    }

    setLoading(true);
    const previousRules = descriptionDoorRules;
    const wasEditingDeletedRule = editingDescriptionDoorRuleId === rule.id;

    // Optimistic UI: remove row immediately to make action feel responsive.
    setDescriptionDoorRules((prev) => prev.filter((x) => x.id !== rule.id));
    if (wasEditingDeletedRule) {
      cancelEditDescriptionDoorRule();
    }

    try {
      await authorizedRequest(`/api/admin/description-door-rules/${rule.id}`, { method: "DELETE" });
      setMessage("Esleme kurali silindi");
    } catch (err) {
      setDescriptionDoorRules(previousRules);
      if (wasEditingDeletedRule) {
        startEditDescriptionDoorRule(rule);
      }
      console.error(err);
      setMessage(err instanceof Error ? err.message : "Esleme kurali silinemedi");
    } finally {
      setLoading(false);
    }
  }

  async function deleteDescriptionExpenseRule(rule: DescriptionExpenseRule): Promise<void> {
    const accepted = window.confirm(`"${rule.keyword}" gider esleme kuralini silmek istiyor musun?`);
    if (!accepted) {
      return;
    }

    setLoading(true);
    const previousRules = descriptionExpenseRules;
    const wasEditingDeletedRule = editingDescriptionExpenseRuleId === rule.id;

    setDescriptionExpenseRules((prev) => prev.filter((x) => x.id !== rule.id));
    if (wasEditingDeletedRule) {
      cancelEditDescriptionExpenseRule();
    }

    try {
      await authorizedRequest(`/api/admin/description-expense-rules/${rule.id}`, { method: "DELETE" });
      setMessage("Gider esleme kurali silindi");
    } catch (err) {
      setDescriptionExpenseRules(previousRules);
      if (wasEditingDeletedRule) {
        startEditDescriptionExpenseRule(rule);
      }
      console.error(err);
      setMessage(err instanceof Error ? err.message : "Gider esleme kurali silinemedi");
    } finally {
      setLoading(false);
    }
  }

  const filteredDescriptionDoorRules = useMemo(() => {
    const selectedDoorNo = descriptionDoorRuleForm.doorNo.trim();
    if (!selectedDoorNo) {
      return descriptionDoorRules;
    }

    return descriptionDoorRules.filter((rule) => rule.doorNo === selectedDoorNo);
  }, [descriptionDoorRules, descriptionDoorRuleForm.doorNo]);

  const filteredDescriptionExpenseRules = useMemo(() => {
    const selectedExpenseItemId = descriptionExpenseRuleForm.expenseItemId.trim();
    if (!selectedExpenseItemId) {
      return descriptionExpenseRules;
    }

    return descriptionExpenseRules.filter((rule) => rule.expenseItemId === selectedExpenseItemId);
  }, [descriptionExpenseRules, descriptionExpenseRuleForm.expenseItemId]);

  function onClickEditDescriptionDoorRule(e: ReactMouseEvent<HTMLButtonElement>, rule: DescriptionDoorRule): void {
    e.preventDefault();
    e.stopPropagation();
    startEditDescriptionDoorRule(rule);
  }

  async function onClickDeleteDescriptionDoorRule(
    e: ReactMouseEvent<HTMLButtonElement>,
    rule: DescriptionDoorRule
  ): Promise<void> {
    e.preventDefault();
    e.stopPropagation();
    await deleteDescriptionDoorRule(rule);
  }

  function onClickEditDescriptionExpenseRule(e: ReactMouseEvent<HTMLButtonElement>, rule: DescriptionExpenseRule): void {
    e.preventDefault();
    e.stopPropagation();
    startEditDescriptionExpenseRule(rule);
  }

  async function onClickDeleteDescriptionExpenseRule(
    e: ReactMouseEvent<HTMLButtonElement>,
    rule: DescriptionExpenseRule
  ): Promise<void> {
    e.preventDefault();
    e.stopPropagation();
    await deleteDescriptionExpenseRule(rule);
  }

  async function fetchPaymentList(filter = paymentListFilter, options?: { silent?: boolean }): Promise<void> {
    const silent = options?.silent ?? false;
    try {
      setPaymentListError("");
      const params = new URLSearchParams();
      if (filter.from) {
        params.set("from", dateInputToIso(filter.from));
      }
      if (filter.to) {
        params.set("to", dateInputToIso(filter.to));
      }
      if (filter.source) {
        params.set("source", filter.source);
      }

      const endpoint = `/api/admin/payments/list${params.toString() ? `?${params.toString()}` : ""}`;
      const data = await authorizedRequest<PaymentListRow[]>(endpoint);
      setPaymentListRows(data);
    } catch (err) {
      console.error(err);
      setPaymentListError(err instanceof Error ? err.message : "Odeme listesi alinamadi");
      if (!silent) {
        setMessage("Odeme listesi alinamadi");
      }
    }
  }

  async function runPaymentListQuery(): Promise<void> {
    setLoading(true);
    try {
      await fetchPaymentList(paymentListFilter);
      setMessage("Odeme listesi filtrelendi");
    } catch (err) {
      console.error(err);
      setMessage(err instanceof Error ? err.message : "Odeme listesi filtrelenemedi");
    } finally {
      setLoading(false);
    }
  }

  async function clearPaymentListFilters(): Promise<void> {
    const reset = { from: "", to: "", source: "" as PaymentSourceFilter };
    setPaymentListFilter(reset);
    setPaymentListRows([]);
    setPaymentListError("");
    setMessage("Odeme listesi filtresi temizlendi. Listelemek icin Filtrele butonuna basin");
  }

  function normalizeDoorNoForSearch(value: string): string {
    return value.trim().replace(/\s+/g, "").toLocaleLowerCase("tr");
  }

  async function loadUnclassifiedRows(options?: { silent?: boolean }): Promise<void> {
    const silent = options?.silent ?? false;
    setUnclassifiedPageLoading(true);
    try {
      const [payments, expenses] = await Promise.all([
        authorizedRequest<PaymentListRow[]>("/api/admin/payments/list"),
        authorizedRequest<ExpenseReportRow[]>("/api/admin/expenses/report?includeDistributed=false"),
      ]);

      const uncategorizedExpenseItemId =
        expenseItemOptions.find((item) => item.code === "SINIFLANDIRILAMAYAN_GIDERLER")?.id ?? null;

      const unclassifiedPayments = payments.filter((row) => {
        const note = (row.note ?? "").toUpperCase();
        return (
          note.includes("UNCLASSIFIED_COLLECTION:SINIFLANDIRILAMAYAN_TAHSILATLAR") ||
          note.includes("UNAPPLIED:NO_DOOR_NO") ||
          note.includes("UNAPPLIED:APARTMENT_NOT_FOUND")
        );
      });

      const unclassifiedExpenses = expenses.filter((row) => {
        if (row.source === "CHARGE_DISTRIBUTION") {
          return false;
        }
        if (uncategorizedExpenseItemId) {
          return row.expenseItemId === uncategorizedExpenseItemId;
        }
        return row.expenseItemName.toLocaleLowerCase("tr").includes("siniflandirilamayan");
      });

      setUnclassifiedPaymentRows(unclassifiedPayments);
      setUnclassifiedExpenseRows(unclassifiedExpenses);

      if (!silent) {
        setMessage(
          `Siniflandirilamayanlar yuklendi. Tahsilat: ${unclassifiedPayments.length}, Gider: ${unclassifiedExpenses.length}`
        );
      }
    } catch (err) {
      console.error(err);
      if (!silent) {
        setMessage(err instanceof Error ? err.message : "Siniflandirilamayan kayitlar yuklenemedi");
      }
    } finally {
      setUnclassifiedPageLoading(false);
    }
  }

  async function saveUnclassifiedPaymentDoorNo(row: UnclassifiedPaymentRow, doorNo: string): Promise<void> {
    const normalizedDoorNo = normalizeDoorNoForSearch(doorNo);
    if (!normalizedDoorNo) {
      setMessage("Daire no zorunlu");
      return;
    }

    const matchedApartments = apartmentOptions.filter(
      (apt) => normalizeDoorNoForSearch(apt.doorNo) === normalizedDoorNo
    );
    if (matchedApartments.length === 0) {
      setMessage("Girdiginiz daire no bulunamadi");
      return;
    }
    if (matchedApartments.length > 1) {
      setMessage("Ayni daire no birden fazla bulundu. Daire kayitlarini kontrol edin.");
      return;
    }

    const targetApartment = matchedApartments[0];

    setLoading(true);
    try {
      await authorizedRequest(`/api/admin/payments/${row.id}`, {
        method: "PUT",
        payload: {
          paidAt: row.paidAt,
          method: row.method,
          description: row.description ?? undefined,
          reference: row.reference ?? undefined,
          apartmentId: targetApartment.id,
        },
      });

      await Promise.all([loadUnclassifiedRows({ silent: true }), fetchPaymentList(paymentListFilter), fetchActionLogs()]);
      setMessage(`Tahsilat daireye baglandi: ${targetApartment.blockName}/${targetApartment.doorNo}`);
    } catch (err) {
      console.error(err);
      setMessage(err instanceof Error ? err.message : "Tahsilat duzeltmesi kaydedilemedi");
    } finally {
      setLoading(false);
    }
  }

  async function saveUnclassifiedExpenseItem(row: UnclassifiedExpenseRow, expenseItemId: string): Promise<void> {
    if (!expenseItemId) {
      setMessage("Gider kalemi seciniz");
      return;
    }

    setLoading(true);
    try {
      await authorizedRequest(`/api/admin/expenses/${row.id}`, {
        method: "PUT",
        payload: {
          expenseItemId,
          spentAt: row.spentAt,
          amount: row.amount,
          paymentMethod: row.paymentMethod,
          description: row.description ?? undefined,
          reference: row.reference ?? undefined,
        },
      });

      await Promise.all([loadUnclassifiedRows({ silent: true }), fetchExpenseReport(expenseReportFilter), fetchActionLogs()]);
      setMessage("Gider kalemi duzeltildi");
    } catch (err) {
      console.error(err);
      setMessage(err instanceof Error ? err.message : "Gider duzeltmesi kaydedilemedi");
    } finally {
      setLoading(false);
    }
  }

  async function fetchActionLogs(): Promise<void> {
    try {
      const rows = await authorizedRequest<AdminActionLogRow[]>("/api/admin/actions/logs?limit=50");
      setActionLogs(rows);
    } catch (err) {
      console.error(err);
    }
  }

  function startEditPaymentListRow(row: PaymentListRow): void {
    setEditingPaymentListId(row.id);
    setEditingPaymentListSource(row.source);
    setAllowImportedAmountEdit(false);
    setPaymentListEditForm({
      paidAt: isoToDateTimeInput(row.paidAt),
      amount: formatDecimalInput(row.totalAmount),
      method: row.method,
      description: row.description ?? "",
      reference: row.reference ?? "",
      apartmentId: row.apartmentId ?? "",
    });
    setMessage("Odeme listesi satiri duzenleme modunda");
  }

  function cancelEditPaymentListRow(): void {
    setEditingPaymentListId(null);
    setEditingPaymentListSource(null);
    setAllowImportedAmountEdit(false);
    setPaymentListEditForm({
      paidAt: "",
      amount: "",
      method: "BANK_TRANSFER",
      description: "",
      reference: "",
      apartmentId: "",
    });
    setMessage("Odeme listesi duzenleme iptal edildi");
  }

  async function submitPaymentListRowEdit(e: FormEvent<HTMLFormElement>): Promise<void> {
    e.preventDefault();
    if (!editingPaymentListId) {
      return;
    }

    setLoading(true);
    try {
      const original = paymentListRows.find((x) => x.id === editingPaymentListId);
      const requestedAmount = parseDistDecimal(paymentListEditForm.amount);
      if (!Number.isFinite(requestedAmount) || requestedAmount <= 0) {
        throw new Error("Tutar formati gecersiz. Ornek: 1250,50");
      }
      const isImported =
        editingPaymentListSource === "BANK_STATEMENT_UPLOAD" ||
        editingPaymentListSource === "PAYMENT_UPLOAD" ||
        editingPaymentListSource === "GMAIL";

      if (original && isImported && Math.abs(requestedAmount - original.totalAmount) > 0.0001) {
        const accepted = window.confirm(
          `Kaynakli odeme tutari degisecek. Eski: ${formatTry(original.totalAmount)} / Yeni: ${formatTry(requestedAmount)}. Devam edilsin mi?`
        );
        if (!accepted) {
          setLoading(false);
          return;
        }
      }

      await authorizedRequest(`/api/admin/payments/${editingPaymentListId}`, {
        method: "PUT",
        payload: {
          paidAt: dateTimeInputToIso(paymentListEditForm.paidAt),
          amount: requestedAmount,
          allowImportedAmountEdit,
          method: paymentListEditForm.method,
          description: paymentListEditForm.description || undefined,
          reference: paymentListEditForm.reference || undefined,
          apartmentId: paymentListEditForm.apartmentId || undefined,
        },
      });

      await Promise.all([fetchPaymentList(paymentListFilter), fetchActionLogs()]);
      cancelEditPaymentListRow();
      setMessage("Odeme satiri guncellendi");
    } catch (err) {
      console.error(err);
      setMessage(err instanceof Error ? err.message : "Odeme satiri guncellenemedi");
    } finally {
      setLoading(false);
    }
  }

  async function deletePaymentListRow(row: PaymentListRow): Promise<void> {
    const accepted = window.confirm("Bu odeme satirini silmek istiyor musun?");
    if (!accepted) {
      return;
    }

    setLoading(true);
    try {
      await authorizedRequest(`/api/admin/payments/${row.id}`, { method: "DELETE" });
      if (editingPaymentListId === row.id) {
        cancelEditPaymentListRow();
      }
      await Promise.all([fetchPaymentList(paymentListFilter), fetchActionLogs()]);
      setMessage("Odeme satiri silindi");
    } catch (err) {
      console.error(err);
      setMessage(err instanceof Error ? err.message : "Odeme satiri silinemedi");
    } finally {
      setLoading(false);
    }
  }

  async function fetchExpenseReport(filter = expenseReportFilter, options?: { silent?: boolean }): Promise<void> {
    const normalizeSearchText = (value: string): string =>
      value
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .replace(/ı/g, "i")
        .toLocaleLowerCase("tr")
        .replace(/\s+/g, " ")
        .trim();

    const silent = options?.silent ?? false;
    try {
      setExpenseReportError("");
      const params = new URLSearchParams();
      if (filter.from) {
        params.set("from", dateInputToIso(filter.from));
      }
      if (filter.to) {
        params.set("to", dateInputToIso(filter.to));
      }
      if (filter.sources.length === 1) {
        params.set("source", filter.sources[0]);
      }
      if (filter.expenseItemIds.length === 1) {
        params.set("expenseItemId", filter.expenseItemIds[0]);
      }

      const includeDistributed = filter.sources.length === 0 || filter.sources.includes("CHARGE_DISTRIBUTION");
      params.set("includeDistributed", String(includeDistributed));

      const endpoint = `/api/admin/expenses/report${params.toString() ? `?${params.toString()}` : ""}`;
      const data = await authorizedRequest<ExpenseReportRow[]>(endpoint);

      const sourceFiltered =
        filter.sources.length > 0 ? data.filter((row) => filter.sources.includes(row.source)) : data;
      const expenseItemFiltered =
        filter.expenseItemIds.length > 0
          ? sourceFiltered.filter((row) => filter.expenseItemIds.includes(row.expenseItemId))
          : sourceFiltered;
      const normalizedDescription = normalizeSearchText(filter.description ?? "");
      const descriptionFiltered = normalizedDescription
        ? expenseItemFiltered.filter((row) => normalizeSearchText(row.description ?? "").includes(normalizedDescription))
        : expenseItemFiltered;

      setExpenseReportRows(descriptionFiltered);
    } catch (err) {
      console.error(err);
      const text = err instanceof Error ? err.message : "Gider raporu alinamadi";
      setExpenseReportError(text);
      if (!silent) {
        setMessage(text);
      }
    }
  }

  async function runExpenseReportQuery(): Promise<void> {
    setLoading(true);
    try {
      await fetchExpenseReport(expenseReportFilter);
      skipNextExpenseReportAutoRefreshRef.current = true;
      setExpenseReportAutoRefreshEnabled(true);
      setMessage("Gider raporu filtrelendi");
    } catch (err) {
      console.error(err);
      setMessage(err instanceof Error ? err.message : "Gider raporu filtrelenemedi");
    } finally {
      setLoading(false);
    }
  }

  async function clearExpenseReportFilters(): Promise<void> {
    const reset = {
      from: "",
      to: "",
      sources: [] as Array<Exclude<ExpenseSourceFilter, "">>,
      expenseItemIds: [] as string[],
      description: "",
    };
    setExpenseReportAutoRefreshEnabled(false);
    skipNextExpenseReportAutoRefreshRef.current = true;
    setExpenseReportFilter(reset);
    setExpenseReportRows([]);
    setExpenseReportError("");
    setMessage("Gider raporu filtresi temizlendi. Raporu calistirmak icin Calistir butonuna basin");
  }

  async function openExpenseReportForItem(expenseItemId: string): Promise<void> {
    const nextFilter = {
      from: "",
      to: "",
      sources: [] as Array<Exclude<ExpenseSourceFilter, "">>,
      expenseItemIds: [expenseItemId],
      description: "",
    };

    setLoading(true);
    try {
      setExpenseReportFilter(nextFilter);
      skipNextExpenseReportAutoRefreshRef.current = true;
      setExpenseReportAutoRefreshEnabled(true);
      navigate("/admin/expenses/report");
      await fetchExpenseReport(nextFilter);
      setMessage("Secilen gider kalemi icin rapor acildi");
    } catch (err) {
      console.error(err);
      setMessage(err instanceof Error ? err.message : "Gider raporu acilamadi");
    } finally {
      setLoading(false);
    }
  }

  async function openReportForLatestBankMovement(
    movement: ReportsSummaryResponse["latestBankMovements"][number]
  ): Promise<void> {
    const targetDate = isoToDateInput(movement.occurredAt);

    setLoading(true);
    try {
      if (movement.movementType === "PAYMENT") {
        const nextFilter = {
          from: targetDate,
          to: targetDate,
          source: "BANK_STATEMENT_UPLOAD" as PaymentSourceFilter,
        };

        setPaymentListFilter(nextFilter);
        navigate("/admin/payments/list");
        await fetchPaymentList(nextFilter);
        setMessage("Secilen banka tahsilati icin tahsilat raporu acildi");
        return;
      }

      const nextExpenseFilter = {
        from: targetDate,
        to: targetDate,
        sources: ["BANK_STATEMENT_UPLOAD"] as Array<Exclude<ExpenseSourceFilter, "">>,
        expenseItemIds: [] as string[],
        description: "",
      };

      setExpenseReportFilter(nextExpenseFilter);
      skipNextExpenseReportAutoRefreshRef.current = true;
      setExpenseReportAutoRefreshEnabled(true);
      navigate("/admin/expenses/report");
      await fetchExpenseReport(nextExpenseFilter);
      setMessage("Secilen banka gideri icin gider raporu acildi");
    } catch (err) {
      console.error(err);
      setMessage(err instanceof Error ? err.message : "Banka hareketi raporu acilamadi");
    } finally {
      setLoading(false);
    }
  }

  async function openStatementForApartment(apartmentId: string): Promise<void> {
    setLoading(true);
    try {
      setActiveApartmentId(apartmentId);
      navigate("/admin/statement");
      await fetchStatement(apartmentId);
      setMessage("Secilen dairenin ekstresi acildi");
    } catch (err) {
      console.error(err);
      setMessage(err instanceof Error ? err.message : "Ekstre acilamadi");
    } finally {
      setLoading(false);
    }
  }

  function onMonthlyBalanceMatrixRowClick(apartmentId: string): void {
    void openStatementForApartment(apartmentId);
  }

  function openStatementForFractionalClosureRow(row: FractionalClosureReportRow): void {
    const normalizedBlock = row.blockName.trim().toLocaleLowerCase("tr");
    const normalizedDoorNo = row.apartmentDoorNo.trim().toLocaleLowerCase("tr");

    const fallbackApartmentId = apartmentOptions.find((apt) => {
      const aptBlock = apt.blockName.trim().toLocaleLowerCase("tr");
      const aptDoor = apt.doorNo.trim().toLocaleLowerCase("tr");
      return aptBlock === normalizedBlock && aptDoor === normalizedDoorNo;
    })?.id;

    const targetApartmentId = row.apartmentId || fallbackApartmentId || "";
    if (!targetApartmentId) {
      setMessage("Secilen satir icin daire bulunamadi");
      return;
    }

    void openStatementForApartment(targetApartmentId);
  }

  function onMonthlyBalanceMatrixRowKeyDown(
    event: ReactKeyboardEvent<HTMLTableRowElement>,
    apartmentId: string
  ): void {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      void openStatementForApartment(apartmentId);
    }
  }

  function startEditExpenseReportRow(row: ExpenseReportRow): void {
    if (row.source === "CHARGE_DISTRIBUTION") {
      if (
        !row.distributionChargeTypeId ||
        !Number.isFinite(row.distributionPeriodYear) ||
        !Number.isFinite(row.distributionPeriodMonth)
      ) {
        setMessage("Dagitim satiri duzenleme kriterleri eksik");
        return;
      }

      const params = new URLSearchParams({
        chargeTypeId: row.distributionChargeTypeId,
        periodYear: String(row.distributionPeriodYear),
        periodMonth: String(row.distributionPeriodMonth),
        description: row.distributionMatchDescription ?? "",
      });
      if (row.distributionInvoiceDate) {
        params.set("invoiceDate", row.distributionInvoiceDate);
      }
      if (row.distributionPeriodStartDate) {
        params.set("periodStartDate", row.distributionPeriodStartDate);
      }
      if (row.distributionPeriodEndDate) {
        params.set("periodEndDate", row.distributionPeriodEndDate);
      }
      if (row.distributionDueDate) {
        params.set("dueDate", row.distributionDueDate);
      } else if (row.spentAt) {
        params.set("dueDate", row.spentAt);
      }
      navigate(`/admin/charges/bulk-correct/edit?${params.toString()}`);
      setMessage("Dagitim kaydi duzeltme sayfasina yonlendirildi");
      return;
    }

    setEditingExpenseReportId(row.id);
    setExpenseReportEditForm({
      expenseItemId: row.expenseItemId,
      spentAt: isoToDateInput(row.spentAt),
      amount: formatDecimalInput(row.amount),
      paymentMethod: row.paymentMethod,
      description: row.description ?? "",
      reference: row.reference ?? "",
    });
    setMessage("Gider raporu satiri duzenleme modunda");
  }

  function cancelEditExpenseReportRow(): void {
    setEditingExpenseReportId(null);
    setExpenseReportEditForm({
      expenseItemId: "",
      spentAt: "",
      amount: "",
      paymentMethod: "CASH",
      description: "",
      reference: "",
    });
    setMessage("Gider raporu duzenleme iptal edildi");
  }

  async function submitExpenseReportRowEdit(e: FormEvent<HTMLFormElement>): Promise<void> {
    e.preventDefault();
    if (!editingExpenseReportId) {
      return;
    }

    setLoading(true);
    try {
      const parsedAmount = parseDistDecimal(expenseReportEditForm.amount);
      if (!Number.isFinite(parsedAmount) || parsedAmount <= 0) {
        throw new Error("Tutar formati gecersiz. Ornek: 1.250,50");
      }

      await authorizedRequest(`/api/admin/expenses/${editingExpenseReportId}`, {
        method: "PUT",
        payload: {
          expenseItemId: expenseReportEditForm.expenseItemId,
          spentAt: dateInputToIso(expenseReportEditForm.spentAt),
          amount: parsedAmount,
          paymentMethod: expenseReportEditForm.paymentMethod,
          description: expenseReportEditForm.description || undefined,
          reference: expenseReportEditForm.reference || undefined,
        },
      });

      await Promise.all([fetchExpenseReport(expenseReportFilter), fetchActionLogs()]);
      cancelEditExpenseReportRow();
      setMessage("Gider satiri guncellendi");
    } catch (err) {
      console.error(err);
      setMessage(err instanceof Error ? err.message : "Gider satiri guncellenemedi");
    } finally {
      setLoading(false);
    }
  }

  async function deleteExpenseReportRow(row: ExpenseReportRow): Promise<void> {
    if (row.source === "CHARGE_DISTRIBUTION") {
      if (
        !row.distributionChargeTypeId ||
        !Number.isFinite(row.distributionPeriodYear) ||
        !Number.isFinite(row.distributionPeriodMonth)
      ) {
        setMessage("Dagitim satiri silme kriterleri eksik");
        return;
      }

      const accepted = window.confirm("Bu toplu dagitim faturasina bagli tahakkuklar silinsin mi?");
      if (!accepted) {
        return;
      }

      setLoading(true);
      try {
        const result = await authorizedRequest<{ deletedCount: number }>(
          "/api/admin/charges/distributed/invoices/delete",
          {
            method: "POST",
            payload: {
              chargeTypeId: row.distributionChargeTypeId,
              periodYear: row.distributionPeriodYear,
              periodMonth: row.distributionPeriodMonth,
              description: row.distributionMatchDescription ?? null,
            },
          }
        );

        await Promise.all([fetchExpenseReport(expenseReportFilter), fetchDistributedInvoiceRows(true)]);
        setMessage(`Toplu dagitim silindi. Silinen tahakkuk: ${result.deletedCount}`);
      } catch (err) {
        console.error(err);
        setMessage(err instanceof Error ? err.message : "Toplu dagitim silinemedi");
      } finally {
        setLoading(false);
      }
      return;
    }

    const accepted = window.confirm("Bu gider satirini silmek istiyor musun?");
    if (!accepted) {
      return;
    }

    setLoading(true);
    try {
      await authorizedRequest(`/api/admin/expenses/${row.id}`, { method: "DELETE" });
      if (editingExpenseReportId === row.id) {
        cancelEditExpenseReportRow();
      }
      await Promise.all([fetchExpenseReport(expenseReportFilter), fetchActionLogs()]);
      setMessage("Gider satiri silindi");
    } catch (err) {
      console.error(err);
      setMessage(err instanceof Error ? err.message : "Gider satiri silinemedi");
    } finally {
      setLoading(false);
    }
  }

  async function fetchUploadBatchUploaders(): Promise<void> {
    try {
      const data = await authorizedRequest<UploadBatchUploader[]>("/api/admin/upload-batches/uploaders");
      setUploadBatchUploaders(data);
    } catch (err) {
      console.error(err);
      setMessage("Yukleme yapan kullanicilar alinamadi");
    }
  }

  async function fetchUploadBatches(
    filter = uploadBatchFilter,
    options?: { silent?: boolean }
  ): Promise<void> {
    const silent = options?.silent ?? false;
    try {
      const params = new URLSearchParams();
      if (filter.from) {
        params.set("from", dateInputToIso(filter.from));
      }
      if (filter.to) {
        params.set("to", dateInputToIso(filter.to));
      }
      if (filter.uploadedByUserId) {
        params.set("uploadedByUserId", filter.uploadedByUserId);
      }
      if (filter.kind) {
        params.set("kind", filter.kind);
      }
      if (filter.limit) {
        params.set("limit", filter.limit);
      }
      if (filter.offset) {
        params.set("offset", filter.offset);
      }

      const endpoint = `/api/admin/upload-batches${params.toString() ? `?${params.toString()}` : ""}`;
      const data = await authorizedRequest<UploadBatchRow[]>(endpoint);
      setUploadBatchRows(data);
    } catch (err) {
      console.error(err);
      if (!silent) {
        setMessage("Yukleme kayitlari alinamadi");
      }
    }
  }

  async function fetchBankStatementViewRows(
    filter = bankStatementViewFilter,
    options?: { silent?: boolean }
  ): Promise<void> {
    const silent = options?.silent ?? false;
    try {
      const params = new URLSearchParams();
      if (filter.from) {
        params.set("from", dateInputToIso(filter.from));
      }
      if (filter.to) {
        params.set("to", dateInputToIso(filter.to));
      }
      params.set("limit", "1000");

      const endpoint = `/api/admin/reports/bank-reconciliation?${params.toString()}`;
      const data = await authorizedRequest<BankReconciliationReportResponse>(endpoint);
      setBankStatementViewRows(data.rows);
      setBankStatementViewOpeningBalance(data.totals.startingBalance ?? data.totals.openingBalance);
    } catch (err) {
      console.error(err);
      if (!silent) {
        setMessage("Banka hareketleri alinamadi");
      }
    }
  }

  async function fetchUploadBatchDetails(batchId: string): Promise<UploadBatchDetailsResponse> {
    return authorizedRequest<UploadBatchDetailsResponse>(`/api/admin/upload-batches/${batchId}/details`);
  }

  async function fetchReportsSummary(options?: { silent?: boolean }): Promise<void> {
    const silent = options?.silent ?? false;
    setReportsSummaryLoading(true);
    if (!silent) {
      setMessage("Rapor ozeti hazirlaniyor...");
    }

    try {
      const data = await authorizedRequest<ReportsSummaryResponse>("/api/admin/reports/summary");
      setReportsSummary(data);
      if (!silent) {
        setMessage("Rapor ozeti guncellendi");
      }
    } catch (err) {
      console.error(err);
      const text = err instanceof Error ? err.message : "Rapor ozeti alinamadi";
      if (!silent) {
        setMessage(text);
      }
    } finally {
      setReportsSummaryLoading(false);
    }
  }

  async function fetchBankReconciliationReport(options?: {
    from?: string;
    to?: string;
    silent?: boolean;
  }): Promise<void> {
    const from = options?.from ?? bankReconciliationFilter.from;
    const to = options?.to ?? bankReconciliationFilter.to;
    const silent = options?.silent ?? false;

    setBankReconciliationLoading(true);
    if (!silent) {
      setMessage("Banka hareket karsilastirmasi hazirlaniyor...");
    }

    try {
      const params = new URLSearchParams();
      if (from) {
        params.set("from", dateInputToIso(from));
      }
      if (to) {
        params.set("to", dateInputToIso(to));
      }
      params.set("limit", "1000");

      const endpoint = `/api/admin/reports/bank-reconciliation?${params.toString()}`;
      const data = await authorizedRequest<BankReconciliationReportResponse>(endpoint);
      setBankReconciliationRows(data.rows);
      setBankReconciliationTotals(data.totals);
      if (!silent) {
        setMessage(`Banka hareket raporu hazir: ${data.totals.movementCount} hareket`);
      }
    } catch (err) {
      console.error(err);
      if (!silent) {
        setMessage(err instanceof Error ? err.message : "Banka hareket raporu alinamadi");
      }
    } finally {
      setBankReconciliationLoading(false);
    }
  }

  async function fetchInitialBalanceDefaults(options?: { banks?: BankDefinition[] }): Promise<void> {
    const banks = options?.banks ?? bankOptions;
    try {
      const data = await authorizedRequest<InitialBalanceDefaultsResponse>("/api/admin/initial-balances");
      if (data.entries.length > 0) {
        setInitialBalanceRows(
          data.entries.map((entry) => {
            const bank = banks.find((x) => x.name === entry.bankName);
            const bankName = bank?.name ?? "";
            const branchExists = bank?.branches.some((x) => x.name === (entry.branchName ?? ""));
            const branchName = branchExists ? (entry.branchName ?? "") : "";

            return {
              id: `${Date.now()}-${Math.random().toString(36).slice(2)}-${entry.bankName}-${entry.branchName ?? ""}`,
              bankName,
              branchName,
              openingBalance: formatDecimalInput(entry.openingBalance),
              openingDate: isoToDateInput(entry.openingDate),
              isEditing: false,
            };
          })
        );
      } else {
        const firstBank = banks[0];
        const firstBranch = firstBank?.branches[0];
        setInitialBalanceRows([
          {
            id: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
            bankName: firstBank?.name ?? "",
            branchName: firstBranch?.name ?? "",
            openingBalance: "",
            openingDate: isoToDateInput(data.defaultOpeningDate),
            isEditing: true,
          },
        ]);
      }
    } catch (err) {
      console.error(err);
    }
  }

  async function onApplyInitialBalances(e: FormEvent<HTMLFormElement>): Promise<void> {
    e.preventDefault();

    const entries = initialBalanceRows
      .map((row) => ({
        bankName: row.bankName.trim(),
        branchName: row.branchName.trim(),
        openingBalance: parseDistDecimal(row.openingBalance),
        openingDate: row.openingDate,
      }))
      .filter(
        (row) =>
          row.bankName &&
          row.branchName &&
          Number.isFinite(row.openingBalance) &&
          row.openingBalance > 0 &&
          row.openingDate
      )
      .map((row) => ({
        bankName: row.bankName,
        branchName: row.branchName,
        openingBalance: Number(row.openingBalance.toFixed(2)),
        openingDate: dateInputToIso(row.openingDate),
      }));

    if (entries.length === 0) {
      setMessage("En az bir satir icin banka, sube, bakiye ve tarih secin");
      return;
    }

    setLoading(true);
    setMessage("Banka acilis bakiyeleri uygulaniyor...");
    try {
      const result = await authorizedRequest<InitialBalanceApplyResponse>("/api/admin/initial-balances/apply", {
        method: "POST",
        payload: {
          entries,
          replaceExisting: initialBalanceReplaceExisting,
        },
      });

      setMessage(
        `Banka acilis bakiyeleri uygulandi. Yeni kayit: ${result.createdOpeningPayments}, Silinen onceki kayit: ${result.deletedOpeningPayments}, Toplam: ${formatTry(
          result.totalOpeningBalance
        )}`
      );
      await fetchReportsSummary({ silent: true });
      await fetchBankReconciliationReport({ silent: true });
    } catch (err) {
      console.error(err);
      setMessage(err instanceof Error ? err.message : "Acilis verileri uygulanamadi");
    } finally {
      setLoading(false);
    }
  }

  function addInitialBalanceRow(): void {
    const firstBank = bankOptions[0];
    const firstBranch = firstBank?.branches[0];
    setInitialBalanceRows((prev) => [
      ...prev,
      {
        id: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
        bankName: firstBank?.name ?? "",
        branchName: firstBranch?.name ?? "",
        openingBalance: "",
        openingDate: new Date().toISOString().slice(0, 10),
        isEditing: true,
      },
    ]);
  }

  function removeInitialBalanceRow(index: number): void {
    setInitialBalanceRows((prev) => {
      if (prev.length <= 1) {
        return prev;
      }
      return prev.filter((_, idx) => idx !== index);
    });
  }

  function updateInitialBalanceRow(
    index: number,
    field: "bankName" | "branchName" | "openingBalance" | "openingDate",
    value: string
  ): void {
    setInitialBalanceRows((prev) => {
      const next = prev.map((row, idx) =>
        idx === index
          ? {
              ...row,
              [field]: value,
            }
          : row
      );

      if (field === "bankName") {
        const selectedBank = bankOptions.find((x) => x.name === value);
        const fallbackBranch = selectedBank?.branches[0]?.name ?? "";
        next[index] = {
          ...next[index],
          branchName: fallbackBranch,
        };
      }

      return next;
    });
  }

  function toggleInitialBalanceRowEdit(index: number): void {
    setInitialBalanceRows((prev) =>
      prev.map((row, idx) => (idx === index ? { ...row, isEditing: !row.isEditing } : row))
    );
  }

  async function fetchOverduePaymentsReport(options?: { silent?: boolean }): Promise<void> {
    const silent = options?.silent ?? false;
    setOverduePaymentsLoading(true);
    if (!silent) {
      setMessage("Gecikmis odemeler raporu hazirlaniyor...");
    }

    try {
      const params = new URLSearchParams();
      if (overduePaymentsFilter.from) {
        params.set("from", dateInputToIso(overduePaymentsFilter.from));
      }
      if (overduePaymentsFilter.to) {
        params.set("to", dateInputToIso(overduePaymentsFilter.to));
      }
      if (overduePaymentsFilter.blockIds.length === 1) {
        params.set("blockId", overduePaymentsFilter.blockIds[0]);
      }
      if (overduePaymentsFilter.doorNos.length === 1) {
        params.set("doorNo", overduePaymentsFilter.doorNos[0]);
      }
      if (overduePaymentsFilter.chargeTypeId) {
        params.set("chargeTypeId", overduePaymentsFilter.chargeTypeId);
      }

      const endpoint = `/api/admin/reports/overdue-payments${params.toString() ? `?${params.toString()}` : ""}`;
      const data = await authorizedRequest<OverduePaymentsReportResponse>(endpoint);

      let filteredRows = data.rows;
      if (overduePaymentsFilter.blockIds.length > 0) {
        filteredRows = filteredRows.filter((row) => overdueSelectedBlockNames.has(row.blockName));
      }
      if (overduePaymentsFilter.doorNos.length > 0) {
        filteredRows = filteredRows.filter((row) => overduePaymentsFilter.doorNos.includes(row.apartmentDoorNo));
      }

      const totalAmount = Number(filteredRows.reduce((sum, row) => sum + row.amount, 0).toFixed(2));
      const totalPaid = Number(filteredRows.reduce((sum, row) => sum + row.paidTotal, 0).toFixed(2));
      const totalRemaining = Number(filteredRows.reduce((sum, row) => sum + row.remaining, 0).toFixed(2));

      setOverduePaymentsRows(filteredRows);
      setOverduePaymentsTotals({
        rowCount: filteredRows.length,
        totalAmount,
        totalPaid,
        totalRemaining,
      });
      if (!silent) {
        setMessage("Gecikmis odemeler raporu guncellendi");
      }
    } catch (err) {
      console.error(err);
      const text = err instanceof Error ? err.message : "Gecikmis odemeler raporu alinamadi";
      if (!silent) {
        setMessage(text);
      }
    } finally {
      setOverduePaymentsLoading(false);
    }
  }

  async function fetchManualReviewMatchesReport(options?: { silent?: boolean }): Promise<void> {
    const silent = options?.silent ?? false;
    setManualReviewMatchesLoading(true);
    if (!silent) {
      setMessage("Manuel inceleme raporu hazirlaniyor...");
    }

    try {
      const params = new URLSearchParams();
      if (manualReviewMatchesFilter.from) {
        params.set("from", dateInputToIso(manualReviewMatchesFilter.from));
      }
      if (manualReviewMatchesFilter.to) {
        params.set("to", dateInputToIso(manualReviewMatchesFilter.to));
      }
      if (manualReviewMatchesFilter.doorNo.trim()) {
        params.set("doorNo", manualReviewMatchesFilter.doorNo.trim());
      }
      params.set("limit", "1000");

      const endpoint = `/api/admin/reports/manual-review-matches?${params.toString()}`;
      const data = await authorizedRequest<ManualReviewMatchesReportResponse>(endpoint);
      setManualReviewMatchesRows(data.rows);
      setManualReviewMatchesTotalCount(data.totalCount);
      if (!silent) {
        setMessage(`Manuel inceleme raporu hazir: ${data.totalCount} kayit`);
      }
    } catch (err) {
      console.error(err);
      const text = err instanceof Error ? err.message : "Manuel inceleme raporu alinamadi";
      if (!silent) {
        setMessage(text);
      }
    } finally {
      setManualReviewMatchesLoading(false);
    }
  }

  async function runManualReviewMatchesQuery(): Promise<void> {
    setLoading(true);
    try {
      await fetchManualReviewMatchesReport();
    } finally {
      setLoading(false);
    }
  }

  function clearManualReviewMatchesFilters(): void {
    setManualReviewMatchesFilter({ from: "", to: "", doorNo: "" });
    setManualReviewMatchesRows([]);
    setManualReviewMatchesTotalCount(0);
    setMessage("Manuel inceleme filtresi temizlendi. Listelemek icin Calistir butonuna basin");
  }

  async function runOverduePaymentsQuery(): Promise<void> {
    setLoading(true);
    try {
      await fetchOverduePaymentsReport();
    } finally {
      setLoading(false);
    }
  }

  function clearOverduePaymentsFilters(): void {
    setOverduePaymentsFilter({ from: "", to: "", blockIds: [], doorNos: [], chargeTypeId: "" });
    setOverduePaymentsRows([]);
    setOverduePaymentsTotals(null);
    setMessage("Gecikmis odeme filtreleri temizlendi. Listelemek icin Calistir butonuna basin");
  }

  async function fetchStaffOpenAidatReport(
    apartmentIdParam?: string,
    options?: { silent?: boolean }
  ): Promise<void> {
    const silent = options?.silent ?? false;
    const apartmentId = (apartmentIdParam ?? staffOpenAidatSelectedApartmentId).trim();

    if (!apartmentId) {
      if (!silent) {
        setMessage("Lutfen daire secin");
      }
      return;
    }

    setStaffOpenAidatLoading(true);
    if (!silent) {
      setMessage("Gorevli mobil acik borc raporu hazirlaniyor...");
    }

    try {
      const params = new URLSearchParams();
      params.set("apartmentId", apartmentId);
      const endpoint = `/api/admin/reports/staff-open-aidat?${params.toString()}`;
      const data = await authorizedRequest<StaffOpenAidatReportResponse>(endpoint);
      setStaffOpenAidatRows(data.rows);
      setStaffOpenAidatTotals(data.totals);
      setStaffOpenAidatApartment(data.apartment);
      if (!silent) {
        setMessage(`Gorevli raporu hazir: ${data.totals.rowCount} acik borc`);
      }
    } catch (err) {
      console.error(err);
      const text = err instanceof Error ? err.message : "Gorevli mobil aidat raporu alinamadi";
      if (!silent) {
        setMessage(text);
      }
    } finally {
      setStaffOpenAidatLoading(false);
    }
  }

  async function fetchStaffOpenAidatLatestUploads(options?: { silent?: boolean }): Promise<void> {
    const silent = options?.silent ?? false;
    try {
      const endpoint = "/api/admin/upload-batches?limit=10&offset=0";
      const data = await authorizedRequest<UploadBatchRow[]>(endpoint);
      setStaffOpenAidatLatestUploadRows(data.slice(0, 10));
    } catch (err) {
      console.error(err);
      if (!silent) {
        setMessage("Son yukleme kayitlari alinamadi");
      }
    }
  }

  async function runStaffOpenAidatQuery(
    apartmentId: string,
    options?: { silent?: boolean }
  ): Promise<void> {
    await fetchStaffOpenAidatReport(apartmentId, options);
  }

  async function sendStaffOpenAidatStatementEmail(apartmentId: string): Promise<void> {
    const targetApartmentId = apartmentId.trim();
    if (!targetApartmentId) {
      setMessage("Lutfen once daire secin");
      return;
    }

    setLoading(true);
    setMessage("Ekstre e-mail gonderiliyor...");
    try {
      const response = await authorizedRequest<{ message: string }>(
        `/api/admin/apartments/${targetApartmentId}/statement-email`,
        { method: "POST", suppressDataChangeToast: true }
      );
      setMessage(response.message);
      setToastMessage("E-Mail gonderildi");
    } catch (err) {
      console.error(err);
      const errorText = err instanceof Error ? err.message : "Ekstre e-mail gonderilemedi";
      setMessage(errorText);
      if (normalizeToastText(errorText).includes("kayitli bir email yok- gonderilmedi")) {
        setToastMessage("Kayitli bir email yok- GONDERILMEDI");
      }
    } finally {
      setLoading(false);
    }
  }

  function clearStaffOpenAidatFilters(): void {
    setStaffOpenAidatSelectedApartmentId("");
    setStaffOpenAidatRows([]);
    setStaffOpenAidatTotals(null);
    setStaffOpenAidatApartment(null);
    setMessage("Gorevli mobil aidat filtresi temizlendi. Listelemek icin daire secin");
  }

  async function fetchFractionalClosureReport(options?: { silent?: boolean }): Promise<void> {
    const silent = options?.silent ?? false;
    setFractionalClosureLoading(true);
    if (!silent) {
      setMessage("Kismi kapama raporu hazirlaniyor...");
    }

    try {
      const endpoint = "/api/admin/reports/fractional-closures";
      const data = await authorizedRequest<FractionalClosureReportResponse>(endpoint);
      setFractionalClosureRows(data.rows);
      if (!silent) {
        setMessage("Kismi kapama raporu guncellendi");
      }
    } catch (err) {
      console.error(err);
      const text = err instanceof Error ? err.message : "Kismi kapama raporu alinamadi";
      if (!silent) {
        setMessage(text);
      }
    } finally {
      setFractionalClosureLoading(false);
    }
  }

  async function runFractionalClosureQuery(): Promise<void> {
    setLoading(true);
    try {
      await fetchFractionalClosureReport();
    } finally {
      setLoading(false);
    }
  }

  function clearFractionalClosureReport(): void {
    setFractionalClosureRows([]);
    setMessage("Kismi kapama raporu temizlendi. Listelemek icin Calistir butonuna basin");
  }

  async function fetchChargeConsistencyReport(options?: { silent?: boolean }): Promise<void> {
    const silent = options?.silent ?? false;
    setChargeConsistencyLoading(true);
    if (!silent) {
      setMessage("Tahakkuk kontrol raporu hazirlaniyor...");
    }

    try {
      if (chargeConsistencyForm.periodMonths.length === 0) {
        throw new Error("En az bir ay secin");
      }

      const params = new URLSearchParams();
      params.set("periodYear", String(Number(chargeConsistencyForm.periodYear)));
      params.set("periodMonths", chargeConsistencyForm.periodMonths.join(","));
      if (chargeConsistencyForm.chargeTypeId) {
        params.set("chargeTypeId", chargeConsistencyForm.chargeTypeId);
      }
      if (chargeConsistencyForm.apartmentType !== "ALL") {
        params.set("apartmentType", chargeConsistencyForm.apartmentType);
      }
      if (chargeConsistencyForm.expectedBuyukAmount.trim()) {
        params.set("expectedBuyukAmount", chargeConsistencyForm.expectedBuyukAmount.trim());
      }
      if (chargeConsistencyForm.expectedKucukAmount.trim()) {
        params.set("expectedKucukAmount", chargeConsistencyForm.expectedKucukAmount.trim());
      }
      params.set("requireMonthEndDueDate", chargeConsistencyForm.requireMonthEndDueDate ? "YES" : "NO");
      const includeMissingEnabled = Boolean(chargeConsistencyForm.chargeTypeId);
      params.set(
        "includeMissing",
        includeMissingEnabled && chargeConsistencyForm.includeMissing ? "YES" : "NO"
      );

      const endpoint = `/api/admin/reports/charge-consistency?${params.toString()}`;
      const data = await authorizedRequest<ChargeConsistencyReportResponse>(endpoint);

      setChargeConsistencyRows(data.rows);
      setChargeConsistencyTotals(data.totals);
      setChargeConsistencyExcludedApartments(data.excludedApartments);
      setChargeConsistencySelectedCodes((prev) =>
        prev.filter((code) => Number(data.totals.byCode[code] ?? 0) > 0)
      );
      if (!silent) {
        setMessage(`Tahakkuk kontrol raporu hazir: ${data.totals.warningCount} uyari`);
      }
    } catch (err) {
      console.error(err);
      const text = err instanceof Error ? err.message : "Tahakkuk kontrol raporu alinamadi";
      if (!silent) {
        setMessage(text);
      }
    } finally {
      setChargeConsistencyLoading(false);
    }
  }

  async function fetchApartmentBalanceMatrixReport(options?: { silent?: boolean }): Promise<void> {
    const silent = options?.silent ?? false;
    setApartmentBalanceMatrixLoading(true);
    if (!silent) {
      setMessage("Aylik bakiye matrisi hazirlaniyor...");
    }

    try {
      const year = Number(apartmentBalanceMatrixYear);
      if (!Number.isInteger(year) || year < 2000 || year > 2100) {
        throw new Error("Yil 2000 ile 2100 arasinda olmalidir");
      }

      const params = new URLSearchParams();
      params.set("year", String(year));

      const endpoint = `/api/admin/reports/apartment-balance-matrix?${params.toString()}`;
      const data = await authorizedRequest<ApartmentMonthlyBalanceMatrixReportResponse>(endpoint);

      setApartmentBalanceMatrixMonths(data.months);
      setApartmentBalanceMatrixRows(data.rows);
      setApartmentBalanceMatrixTotals(data.totals);
      setApartmentBalanceMatrixSnapshotAt(data.snapshotAt);

      if (!silent) {
        setMessage(`Aylik bakiye matrisi hazir: ${data.totals.apartmentCount} daire`);
      }
    } catch (err) {
      console.error(err);
      const text = err instanceof Error ? err.message : "Aylik bakiye matrisi alinamadi";
      if (!silent) {
        setMessage(text);
      }
    } finally {
      setApartmentBalanceMatrixLoading(false);
    }
  }

  async function runApartmentBalanceMatrixQuery(): Promise<void> {
    setLoading(true);
    try {
      await fetchApartmentBalanceMatrixReport();
    } finally {
      setLoading(false);
    }
  }

  async function fetchReferenceMovementSearchReport(options?: { silent?: boolean }): Promise<void> {
    const silent = options?.silent ?? false;
    setReferenceSearchLoading(true);
    if (!silent) {
      setMessage("Referans hareket aramasi yapiliyor...");
    }

    try {
      const reference = referenceSearchValue.trim();
      if (!reference) {
        throw new Error("Referans numarasi girin");
      }

      const params = new URLSearchParams();
      params.set("reference", reference);
      params.set("limit", "1000");

      const endpoint = `/api/admin/reports/reference-search?${params.toString()}`;
      const data = await authorizedRequest<ReferenceMovementSearchResponse>(endpoint);
      setReferenceSearchRows(data.rows);
      setReferenceSearchTotals(data.totals);

      if (!silent) {
        setMessage(`Referans arama tamamlandi: ${data.totals.movementCount} hareket`);
      }
    } catch (err) {
      console.error(err);
      const text = err instanceof Error ? err.message : "Referans arama raporu alinamadi";
      if (!silent) {
        setMessage(text);
      }
    } finally {
      setReferenceSearchLoading(false);
    }
  }

  async function runReferenceSearchQuery(): Promise<void> {
    setLoading(true);
    try {
      await fetchReferenceMovementSearchReport();
    } finally {
      setLoading(false);
    }
  }

  function clearReferenceSearchFilters(): void {
    setReferenceSearchValue("");
    setReferenceSearchRows([]);
    setReferenceSearchTotals(null);
    setEditingReferenceMovementKey(null);
    setMessage("Referans arama temizlendi");
  }

  function startEditReferenceMovement(row: ReferenceMovementSearchRow): void {
    const defaultApartmentDoorNo = row.apartmentDoorNos.length === 1 ? row.apartmentDoorNos[0] : "";
    const defaultApartmentId =
      apartmentOptions.find((apt) => apt.doorNo === defaultApartmentDoorNo)?.id ?? "";

    setEditingReferenceMovementKey(`${row.movementType}-${row.movementId}`);
    setReferenceEditForm({
      occurredAt: isoToDateInput(row.occurredAt),
      amount: String(row.amount),
      method: row.method ?? "BANK_TRANSFER",
      description: row.description ?? "",
      reference: row.reference ?? "",
      expenseItemId: row.expenseItemId ?? "",
      apartmentId: defaultApartmentId,
    });
  }

  function cancelEditReferenceMovement(): void {
    setEditingReferenceMovementKey(null);
  }

  async function saveReferenceMovement(row: ReferenceMovementSearchRow): Promise<void> {
    const amount = Number(referenceEditForm.amount);
    if (!referenceEditForm.occurredAt || !Number.isFinite(amount) || amount <= 0) {
      setMessage("Tarih ve tutar alanlarini kontrol edin");
      return;
    }

    setLoading(true);
    try {
      if (row.movementType === "PAYMENT") {
        await authorizedRequest(`/api/admin/payments/${row.movementId}`, {
          method: "PUT",
          payload: {
            paidAt: dateInputToIso(referenceEditForm.occurredAt),
            amount,
            allowImportedAmountEdit: true,
            method: referenceEditForm.method,
            description: referenceEditForm.description || undefined,
            reference: referenceEditForm.reference || undefined,
            apartmentId: referenceEditForm.apartmentId || undefined,
          },
        });
      } else {
        if (!referenceEditForm.expenseItemId) {
          setMessage("Gider kalemi bilgisi eksik, duzeltme yapilamadi");
          return;
        }

        await authorizedRequest(`/api/admin/expenses/${row.movementId}`, {
          method: "PUT",
          payload: {
            expenseItemId: referenceEditForm.expenseItemId,
            spentAt: dateInputToIso(referenceEditForm.occurredAt),
            amount,
            paymentMethod: referenceEditForm.method,
            description: referenceEditForm.description || undefined,
            reference: referenceEditForm.reference || undefined,
          },
        });
      }

      setEditingReferenceMovementKey(null);
      await fetchReferenceMovementSearchReport({ silent: true });
      setMessage("Hareket kaydi guncellendi");
    } catch (err) {
      console.error(err);
      setMessage(err instanceof Error ? err.message : "Hareket kaydi guncellenemedi");
    } finally {
      setLoading(false);
    }
  }

  async function deleteReferenceMovement(row: ReferenceMovementSearchRow): Promise<void> {
    const accepted = window.confirm("Bu hareket kaydi silinsin mi?");
    if (!accepted) {
      return;
    }

    setLoading(true);
    try {
      if (row.movementType === "PAYMENT") {
        await authorizedRequest(`/api/admin/payments/${row.movementId}`, { method: "DELETE" });
      } else {
        await authorizedRequest(`/api/admin/expenses/${row.movementId}`, { method: "DELETE" });
      }

      if (editingReferenceMovementKey === `${row.movementType}-${row.movementId}`) {
        setEditingReferenceMovementKey(null);
      }

      await fetchReferenceMovementSearchReport({ silent: true });
      setMessage("Hareket kaydi silindi");
    } catch (err) {
      console.error(err);
      setMessage(err instanceof Error ? err.message : "Hareket kaydi silinemedi");
    } finally {
      setLoading(false);
    }
  }

  function clearApartmentBalanceMatrixFilters(): void {
    setApartmentBalanceMatrixYear(String(new Date().getFullYear()));
    setApartmentBalanceMatrixRows([]);
    setApartmentBalanceMatrixMonths([]);
    setApartmentBalanceMatrixTotals(null);
    setApartmentBalanceMatrixSnapshotAt(null);
    setMessage("Aylik bakiye matrisi filtreleri temizlendi. Listelemek icin Calistir butonuna basin");
  }

  function printApartmentBalanceMatrixReport(): void {
    const styleId = "monthly-balance-print-style";
    const existingStyle = document.getElementById(styleId);
    if (existingStyle) {
      existingStyle.remove();
    }

    const style = document.createElement("style");
    style.id = styleId;
    style.textContent = `
      @media print {
        @page {
          size: A4 landscape;
          margin: 8mm 7mm;
        }

        body.monthly-balance-print-mode * {
          visibility: hidden !important;
        }

        body.monthly-balance-print-mode .monthly-balance-report-page,
        body.monthly-balance-print-mode .monthly-balance-report-page * {
          visibility: visible !important;
        }

        body.monthly-balance-print-mode .monthly-balance-report-page {
          position: absolute;
          left: 0;
          top: 0;
          width: 100%;
          margin: 0 !important;
          padding: 0 !important;
        }

        body.monthly-balance-print-mode .monthly-balance-report-page .report-filter-grid,
        body.monthly-balance-print-mode .monthly-balance-report-page .admin-row,
        body.monthly-balance-print-mode .monthly-balance-report-page .small,
        body.monthly-balance-print-mode .monthly-balance-report-page .monthly-balance-meta {
          display: none !important;
        }

        body.monthly-balance-print-mode .monthly-balance-report-page .table-card,
        body.monthly-balance-print-mode .monthly-balance-report-page .table-wrap {
          border: none !important;
          box-shadow: none !important;
          padding: 0 !important;
          margin: 0 !important;
        }
      }
    `;

    document.head.appendChild(style);
    document.body.classList.add("monthly-balance-print-mode");

    let cleanedUp = false;
    const cleanup = () => {
      if (cleanedUp) {
        return;
      }
      cleanedUp = true;
      document.body.classList.remove("monthly-balance-print-mode");
      style.remove();
      window.removeEventListener("afterprint", cleanup);
    };

    window.addEventListener("afterprint", cleanup);
    window.print();
    window.setTimeout(cleanup, 1500);
  }

  async function autoRefreshAfterDelete(): Promise<void> {
    const tasks: Array<Promise<unknown>> = [
      fetchBulkStatement({ silent: true }),
      fetchPaymentList(paymentListFilter, { silent: true }),
      fetchExpenseReport(expenseReportFilter, { silent: true }),
      fetchUploadBatches(uploadBatchFilter, { silent: true }),
      fetchReportsSummary({ silent: true }),
      fetchOverduePaymentsReport({ silent: true }),
      fetchChargeConsistencyReport({ silent: true }),
      fetchActionLogs(),
    ];

    if (activeApartmentId) {
      tasks.push(fetchStatement(activeApartmentId, { silent: true }));
    }

    await Promise.allSettled(tasks);
    setToastMessage("Silme sonrasi raporlar guncellendi");
  }

  async function runChargeConsistencyQuery(): Promise<void> {
    setLoading(true);
    try {
      await fetchChargeConsistencyReport();
    } finally {
      setLoading(false);
    }
  }

  function clearChargeConsistencyFilters(): void {
    setChargeConsistencyForm({
      periodYear: String(new Date().getFullYear()),
      periodMonths: [...monthOptions],
      chargeTypeId: "",
      apartmentType: "ALL",
      expectedBuyukAmount: "",
      expectedKucukAmount: "",
      requireMonthEndDueDate: true,
      includeMissing: true,
    });
    setChargeConsistencySelectedCodes([]);
    setChargeConsistencyViewMode("MERGED");
    setChargeConsistencyRows([]);
    setChargeConsistencyTotals(null);
    setChargeConsistencyExcludedApartments([]);
    setMessage("Tahakkuk kontrol filtreleri temizlendi. Listelemek icin Calistir butonuna basin");
  }

  async function runUploadBatchQuery(): Promise<void> {
    setLoading(true);
    try {
      await fetchUploadBatches(uploadBatchFilter);
      setMessage("Yukleme kayitlari filtrelendi");
    } catch (err) {
      console.error(err);
      setMessage(err instanceof Error ? err.message : "Yukleme kayitlari filtrelenemedi");
    } finally {
      setLoading(false);
    }
  }

  async function runBankStatementViewQuery(): Promise<void> {
    setLoading(true);
    try {
      await fetchBankStatementViewRows(bankStatementViewFilter);
      setMessage("Banka hareketleri listelendi");
    } catch (err) {
      console.error(err);
      setMessage(err instanceof Error ? err.message : "Banka hareketleri listelenemedi");
    } finally {
      setLoading(false);
    }
  }

  async function resetBankStatementViewToCurrentMonth(): Promise<void> {
    const nextFilter = getCurrentMonthDateRange();
    setBankStatementViewFilter(nextFilter);
    setLoading(true);
    try {
      await fetchBankStatementViewRows(nextFilter);
      setMessage("Banka hareketleri filtresi bu aya alindi");
    } catch (err) {
      console.error(err);
      setMessage(err instanceof Error ? err.message : "Banka hareketleri listelenemedi");
    } finally {
      setLoading(false);
    }
  }

  async function goUploadBatchPage(direction: "prev" | "next"): Promise<void> {
    const limit = Math.max(1, Number.parseInt(uploadBatchFilter.limit, 10) || 200);
    const currentOffset = Math.max(0, Number.parseInt(uploadBatchFilter.offset, 10) || 0);
    const nextOffset = direction === "next" ? currentOffset + limit : Math.max(0, currentOffset - limit);

    if (nextOffset === currentOffset) {
      return;
    }

    const nextFilter = { ...uploadBatchFilter, offset: String(nextOffset), limit: String(limit) };
    setUploadBatchFilter(nextFilter);
    setLoading(true);
    try {
      await fetchUploadBatches(nextFilter);
      setMessage(direction === "next" ? "Sonraki sayfa yuklendi" : "Onceki sayfa yuklendi");
    } catch (err) {
      console.error(err);
      setMessage(err instanceof Error ? err.message : "Sayfa gecisi yapilamadi");
    } finally {
      setLoading(false);
    }
  }

  async function clearUploadBatchFilters(): Promise<void> {
    const reset = {
      from: "",
      to: "",
      uploadedByUserId: "",
      kind: "" as UploadBatchKindFilter,
      limit: "200",
      offset: "0",
    };
    setUploadBatchFilter(reset);
    setUploadBatchRows([]);
    setMessage("Yukleme filtreleri temizlendi. Listelemek icin Calistir butonuna basin");
  }

  async function deleteUploadBatch(row: UploadBatchRow): Promise<void> {
    const accepted = window.confirm(
      `${row.fileName} dosyasini silmek istiyor musun? Bu islem bu yuklemeyle olusan tahsilat/gider kayitlarini da siler.`
    );
    if (!accepted) {
      return;
    }

    setDeletingUploadBatchId(row.id);
    setDeletingUploadBatchFileName(row.fileName);
    const previousRows = uploadBatchRows;
    // Optimistic remove so user instantly sees that action was applied.
    setUploadBatchRows((prev) => prev.filter((x) => x.id !== row.id));

    try {
      const result = await authorizedRequest<{
        deletedBatchId: string;
        deletedPayments: number;
        deletedExpenses: number;
        affectedCharges: number;
      }>(`/api/admin/upload-batches/${row.id}`, { method: "DELETE" });

      await Promise.all([
        fetchPaymentList(paymentListFilter),
        fetchExpenseReport(expenseReportFilter),
      ]);

      setDeletingUploadBatchId(null);
      setDeletingUploadBatchFileName("");
      setToastMessage("Silme tamamlandi: Yukleme kaydi silindi");
      setMessage(
        `Silme tamamlandi. Tahsilat: ${result.deletedPayments}, Gider: ${result.deletedExpenses}, Etkilenen Borc: ${result.affectedCharges}`
      );
    } catch (err) {
      setUploadBatchRows(previousRows);
      console.error(err);
      setMessage(err instanceof Error ? err.message : "Yukleme kaydi silinemedi");
    } finally {
      setDeletingUploadBatchId(null);
      setDeletingUploadBatchFileName("");
    }
  }

  async function editUploadBatchMovement(input: {
    movementType: "PAYMENT" | "EXPENSE";
    movementId: string;
    occurredAt: string;
    reference?: string | null;
  }): Promise<void> {
    const targetDate = isoToDateInput(input.occurredAt);

    setLoading(true);
    try {
      if (input.movementType === "PAYMENT") {
        const nextFilter = {
          from: targetDate,
          to: targetDate,
          source: "BANK_STATEMENT_UPLOAD" as PaymentSourceFilter,
        };

        setPaymentListFilter(nextFilter);
        navigate("/admin/payments/list");

        const params = new URLSearchParams();
        if (nextFilter.from) {
          params.set("from", dateInputToIso(nextFilter.from));
        }
        if (nextFilter.to) {
          params.set("to", dateInputToIso(nextFilter.to));
        }
        params.set("source", nextFilter.source);

        const endpoint = `/api/admin/payments/list?${params.toString()}`;
        const rows = await authorizedRequest<PaymentListRow[]>(endpoint);
        setPaymentListError("");
        setPaymentListRows(rows);

        const targetRow = rows.find((row) => row.id === input.movementId);
        if (targetRow) {
          startEditPaymentListRow(targetRow);
          setMessage(
            `Tahsilat filtrelenip duzeltme acildi (ID: ${input.movementId}${
              input.reference ? `, Ref: ${input.reference}` : ""
            })`
          );
        } else {
          setMessage(`Tahsilat raporu filtrelendi fakat kayit bulunamadi (ID: ${input.movementId})`);
        }
        return;
      }

      const nextExpenseFilter = {
        from: targetDate,
        to: targetDate,
        sources: ["BANK_STATEMENT_UPLOAD"] as Array<Exclude<ExpenseSourceFilter, "">>,
        expenseItemIds: [] as string[],
        description: "",
      };

      setExpenseReportFilter(nextExpenseFilter);
      skipNextExpenseReportAutoRefreshRef.current = true;
      setExpenseReportAutoRefreshEnabled(true);
      navigate("/admin/expenses/report");

      const params = new URLSearchParams();
      if (nextExpenseFilter.from) {
        params.set("from", dateInputToIso(nextExpenseFilter.from));
      }
      if (nextExpenseFilter.to) {
        params.set("to", dateInputToIso(nextExpenseFilter.to));
      }
      params.set("source", "BANK_STATEMENT_UPLOAD");
      params.set("includeDistributed", "false");

      const endpoint = `/api/admin/expenses/report?${params.toString()}`;
      const rows = await authorizedRequest<ExpenseReportRow[]>(endpoint);
      setExpenseReportError("");
      setExpenseReportRows(rows);

      const targetRow = rows.find((row) => row.id === input.movementId);
      if (targetRow) {
        startEditExpenseReportRow(targetRow);
        setMessage(
          `Gider filtrelenip duzeltme acildi (ID: ${input.movementId}${
            input.reference ? `, Ref: ${input.reference}` : ""
          })`
        );
      } else {
        setMessage(`Gider raporu filtrelendi fakat kayit bulunamadi (ID: ${input.movementId})`);
      }
    } catch (err) {
      console.error(err);
      setMessage(err instanceof Error ? err.message : "Duzeltme sayfasi filtrelenemedi");
    } finally {
      setLoading(false);
    }
  }

  async function deleteUploadBatchMovement(input: {
    movementType: "PAYMENT" | "EXPENSE";
    movementId: string;
  }): Promise<void> {
    const accepted = window.confirm(
      `${input.movementType === "PAYMENT" ? "Tahsilat" : "Gider"} kaydi silinsin mi? ID: ${input.movementId}`
    );
    if (!accepted) {
      return;
    }

    if (input.movementType === "PAYMENT") {
      await authorizedRequest(`/api/admin/payments/${input.movementId}`, { method: "DELETE" });
      await fetchPaymentList(paymentListFilter);
      setMessage(`Tahsilat silindi (ID: ${input.movementId})`);
      return;
    }

    await authorizedRequest(`/api/admin/expenses/${input.movementId}`, { method: "DELETE" });
    await fetchExpenseReport(expenseReportFilter);
    setMessage(`Gider silindi (ID: ${input.movementId})`);
  }

  async function onSubmitChargeType(e: FormEvent<HTMLFormElement>): Promise<void> {
    e.preventDefault();
    setLoading(true);
    setMessage("Tahakkuk tipi kaydediliyor...");
    try {
      if (editingChargeTypeId) {
        await authorizedRequest(`/api/admin/charge-types/${editingChargeTypeId}`, {
          method: "PUT",
          payload: chargeTypeForm,
        });
        setMessage("Tahakkuk tipi guncellendi");
      } else {
        await authorizedRequest("/api/admin/charge-types", {
          method: "POST",
          payload: chargeTypeForm,
        });
        setMessage("Tahakkuk tipi olusturuldu");
      }

      setEditingChargeTypeId(null);
      setChargeTypeForm({ code: "", name: "", payerTarget: "OWNER", isActive: true });
      await fetchChargeTypeOptions();
    } catch (err) {
      console.error(err);
      setMessage(err instanceof Error ? err.message : "Tahakkuk tipi kaydedilemedi");
    } finally {
      setLoading(false);
    }
  }

  async function onSubmitBlock(e: FormEvent<HTMLFormElement>): Promise<void> {
    e.preventDefault();
    setLoading(true);
    setMessage("Blok kaydediliyor...");

    const name = blockForm.name.trim();
    if (!name) {
      setLoading(false);
      setMessage("Blok adi bos olamaz");
      return;
    }

    try {
      if (editingBlockId) {
        const previousBlockName = blockOptions.find((x) => x.id === editingBlockId)?.name;
        await authorizedRequest(`/api/admin/blocks/${editingBlockId}`, {
          method: "PUT",
          payload: { name },
        });
        if (previousBlockName && apartmentForm.blockName === previousBlockName) {
          setApartmentForm((prev) => ({ ...prev, blockName: name }));
        }
        setMessage("Blok guncellendi");
      } else {
        await authorizedRequest("/api/admin/blocks", {
          method: "POST",
          payload: { name },
        });
        setMessage("Blok olusturuldu");
      }

      setEditingBlockId(null);
      setBlockForm({ name: "" });
      await fetchBlockOptions();
    } catch (err) {
      console.error(err);
      setMessage(err instanceof Error ? err.message : "Blok kaydedilemedi");
    } finally {
      setLoading(false);
    }
  }

  function resetBankTermDepositForm(nextBankId?: string): void {
    setEditingBankTermDepositId(null);
    setBankTermDepositForm((prev) => ({
      bankId: nextBankId ?? prev.bankId,
      branchId: "",
      principalAmount: "",
      annualInterestRate: "",
      withholdingTaxRate: "15",
      startDate: new Date().toISOString().slice(0, 10),
      endDate: "",
      notes: "",
      isActive: true,
    }));
  }

  async function fetchBankTermDeposits(options?: { silent?: boolean }): Promise<void> {
    const silent = options?.silent ?? false;
    setBankTermDepositLoading(true);
    if (!silent) {
      setMessage("Vadeli mevduat listesi yukleniyor...");
    }

    try {
      const rows = await authorizedRequest<BankTermDepositRow[]>("/api/admin/banks/term-deposits");
      setBankTermDepositRows(rows);
      if (!silent) {
        setMessage(`Vadeli mevduat listesi guncellendi: ${rows.length} kayit`);
      }
    } catch (err) {
      console.error(err);
      if (!silent) {
        setMessage(err instanceof Error ? err.message : "Vadeli mevduat listesi alinamadi");
      }
    } finally {
      setBankTermDepositLoading(false);
    }
  }

  async function onSubmitBankTermDeposit(e: FormEvent<HTMLFormElement>): Promise<void> {
    e.preventDefault();
    setLoading(true);

    const principalAmount = Number(bankTermDepositForm.principalAmount);
    const annualInterestRate = Number(bankTermDepositForm.annualInterestRate);
    const withholdingTaxRate = Number(bankTermDepositForm.withholdingTaxRate);
    if (!bankTermDepositForm.bankId) {
      setLoading(false);
      setMessage("Banka secimi zorunlu");
      return;
    }
    if (!Number.isFinite(principalAmount) || principalAmount <= 0) {
      setLoading(false);
      setMessage("Ana para 0'dan buyuk olmali");
      return;
    }
    if (!Number.isFinite(annualInterestRate) || annualInterestRate < 0) {
      setLoading(false);
      setMessage("Faiz orani gecersiz");
      return;
    }
    if (!Number.isFinite(withholdingTaxRate) || withholdingTaxRate < 0 || withholdingTaxRate > 100) {
      setLoading(false);
      setMessage("Stopaj orani 0-100 araliginda olmali");
      return;
    }
    if (!bankTermDepositForm.startDate || !bankTermDepositForm.endDate) {
      setLoading(false);
      setMessage("Baslangic ve bitis tarihleri zorunlu");
      return;
    }

    const payload = {
      bankId: bankTermDepositForm.bankId,
      branchId: bankTermDepositForm.branchId || undefined,
      principalAmount,
      annualInterestRate,
      withholdingTaxRate,
      startDate: dateInputToIso(bankTermDepositForm.startDate),
      endDate: dateInputToIso(bankTermDepositForm.endDate),
      notes: bankTermDepositForm.notes || undefined,
      isActive: bankTermDepositForm.isActive,
    };

    try {
      if (editingBankTermDepositId) {
        await authorizedRequest(`/api/admin/banks/term-deposits/${editingBankTermDepositId}`, {
          method: "PUT",
          payload,
        });
        setMessage("Vadeli mevduat kaydi guncellendi");
      } else {
        await authorizedRequest("/api/admin/banks/term-deposits", {
          method: "POST",
          payload,
        });
        setMessage("Vadeli mevduat kaydi olusturuldu");
      }

      resetBankTermDepositForm(bankTermDepositForm.bankId);
      await fetchBankTermDeposits({ silent: true });
    } catch (err) {
      console.error(err);
      setMessage(err instanceof Error ? err.message : "Vadeli mevduat kaydi kaydedilemedi");
    } finally {
      setLoading(false);
    }
  }

  function startEditBankTermDeposit(row: BankTermDepositRow): void {
    setEditingBankTermDepositId(row.id);
    setBankTermDepositForm({
      bankId: row.bankId,
      branchId: row.branchId ?? "",
      principalAmount: String(row.principalAmount),
      annualInterestRate: String(row.annualInterestRate),
      withholdingTaxRate: String(row.withholdingTaxRate),
      startDate: isoToDateInput(row.startDate),
      endDate: isoToDateInput(row.endDate),
      notes: row.notes ?? "",
      isActive: row.isActive,
    });
    setMessage(`Vadeli mevduat duzenleme modu: ${row.bankName}${row.branchName ? ` / ${row.branchName}` : ""}`);
  }

  function clearBankTermDepositEditor(): void {
    resetBankTermDepositForm();
    if (editingBankTermDepositId) {
      setMessage("Vadeli mevduat duzenleme iptal edildi");
    }
  }

  async function deleteBankTermDeposit(row: BankTermDepositRow): Promise<void> {
    const accepted = window.confirm(
      `${row.bankName}${row.branchName ? ` / ${row.branchName}` : ""} vadeli mevduat kaydini silmek istiyor musun?`
    );
    if (!accepted) {
      return;
    }

    setLoading(true);
    try {
      await authorizedRequest<void>(`/api/admin/banks/term-deposits/${row.id}`, { method: "DELETE" });
      if (editingBankTermDepositId === row.id) {
        resetBankTermDepositForm(bankTermDepositForm.bankId);
      }
      await fetchBankTermDeposits({ silent: true });
      setMessage("Vadeli mevduat kaydi silindi");
    } catch (err) {
      console.error(err);
      setMessage(err instanceof Error ? err.message : "Vadeli mevduat kaydi silinemedi");
    } finally {
      setLoading(false);
    }
  }

  async function onSubmitBank(e: FormEvent<HTMLFormElement>): Promise<void> {
    e.preventDefault();
    setLoading(true);
    setMessage("Banka kaydediliyor...");

    const name = bankForm.name.trim();
    if (!name) {
      setLoading(false);
      setMessage("Banka adi zorunlu");
      return;
    }

    try {
      if (editingBankId) {
        await authorizedRequest(`/api/admin/banks/${editingBankId}`, {
          method: "PUT",
          payload: {
            name,
            isActive: bankForm.isActive,
          },
        });
        setMessage("Banka guncellendi");
      } else {
        await authorizedRequest("/api/admin/banks", {
          method: "POST",
          payload: {
            name,
            isActive: bankForm.isActive,
          },
        });
        setMessage("Banka olusturuldu");
      }

      setEditingBankId(null);
      setBankForm({ name: "", isActive: true });
      await fetchBankOptions();
    } catch (err) {
      console.error(err);
      setMessage(err instanceof Error ? err.message : "Banka kaydedilemedi");
    } finally {
      setLoading(false);
    }
  }

  async function onSubmitBankBranch(e: FormEvent<HTMLFormElement>): Promise<void> {
    e.preventDefault();
    setLoading(true);
    setMessage("Sube kaydediliyor...");

    const bankId = bankBranchForm.bankId;
    const name = bankBranchForm.name.trim();
    if (!bankId || !name) {
      setLoading(false);
      setMessage("Banka ve sube adi zorunlu");
      return;
    }

    try {
      if (editingBankBranchId) {
        await authorizedRequest(`/api/admin/banks/branches/${editingBankBranchId}`, {
          method: "PUT",
          payload: {
            bankId,
            name,
            branchCode: bankBranchForm.branchCode,
            accountName: bankBranchForm.accountName,
            accountNumber: bankBranchForm.accountNumber,
            iban: bankBranchForm.iban,
            phone: bankBranchForm.phone,
            email: bankBranchForm.email,
            address: bankBranchForm.address,
            representativeName: bankBranchForm.representativeName,
            representativePhone: bankBranchForm.representativePhone,
            representativeEmail: bankBranchForm.representativeEmail,
            notes: bankBranchForm.notes,
            isActive: bankBranchForm.isActive,
          },
        });
        setMessage("Sube guncellendi");
      } else {
        await authorizedRequest("/api/admin/banks/branches", {
          method: "POST",
          payload: {
            bankId,
            name,
            branchCode: bankBranchForm.branchCode,
            accountName: bankBranchForm.accountName,
            accountNumber: bankBranchForm.accountNumber,
            iban: bankBranchForm.iban,
            phone: bankBranchForm.phone,
            email: bankBranchForm.email,
            address: bankBranchForm.address,
            representativeName: bankBranchForm.representativeName,
            representativePhone: bankBranchForm.representativePhone,
            representativeEmail: bankBranchForm.representativeEmail,
            notes: bankBranchForm.notes,
            isActive: bankBranchForm.isActive,
          },
        });
        setMessage("Sube olusturuldu");
      }

      setEditingBankBranchId(null);
      setBankBranchForm((prev) => ({
        ...prev,
        name: "",
        branchCode: "",
        accountName: "",
        accountNumber: "",
        iban: "",
        phone: "",
        email: "",
        address: "",
        representativeName: "",
        representativePhone: "",
        representativeEmail: "",
        notes: "",
        isActive: true,
      }));
      await fetchBankOptions();
    } catch (err) {
      console.error(err);
      setMessage(err instanceof Error ? err.message : "Sube kaydedilemedi");
    } finally {
      setLoading(false);
    }
  }

  async function onSubmitPaymentMethod(e: FormEvent<HTMLFormElement>): Promise<void> {
    e.preventDefault();
    setLoading(true);
    setMessage("Odeme araci kaydediliyor...");
    try {
      if (editingPaymentMethodId) {
        await authorizedRequest(`/api/admin/payment-methods/${editingPaymentMethodId}`, {
          method: "PUT",
          payload: paymentMethodForm,
        });
        setMessage("Odeme araci guncellendi");
      } else {
        await authorizedRequest("/api/admin/payment-methods", {
          method: "POST",
          payload: paymentMethodForm,
        });
        setMessage("Odeme araci olusturuldu");
      }

      setEditingPaymentMethodId(null);
      setPaymentMethodForm({ code: "BANK_TRANSFER", name: "", isActive: true });
      await fetchPaymentMethodOptions();
    } catch (err) {
      console.error(err);
      setMessage(err instanceof Error ? err.message : "Odeme araci kaydedilemedi");
    } finally {
      setLoading(false);
    }
  }

  async function onSubmitExpenseItem(e: FormEvent<HTMLFormElement>): Promise<void> {
    e.preventDefault();
    setLoading(true);
    setMessage("Gider kalemi kaydediliyor...");
    try {
      if (editingExpenseItemId) {
        await authorizedRequest(`/api/admin/expense-items/${editingExpenseItemId}`, {
          method: "PUT",
          payload: expenseItemForm,
        });
        setMessage("Gider kalemi guncellendi");
      } else {
        await authorizedRequest("/api/admin/expense-items", {
          method: "POST",
          payload: expenseItemForm,
        });
        setMessage("Gider kalemi olusturuldu");
      }

      setEditingExpenseItemId(null);
      setExpenseItemForm({ code: "", name: "", isActive: true });
      await fetchExpenseItemOptions();
    } catch (err) {
      console.error(err);
      setMessage(err instanceof Error ? err.message : "Gider kalemi kaydedilemedi");
    } finally {
      setLoading(false);
    }
  }

  async function onSubmitExpense(payload: {
    expenseItemId: string;
    spentAt: string;
    amount: string;
    paymentMethod: PaymentMethod;
    description: string;
    reference: string;
  }): Promise<void> {
    setLoading(true);
    setMessage("Gider kaydediliyor...");

    try {
      const requestPayload = {
        expenseItemId: payload.expenseItemId,
        spentAt: dateInputToIso(payload.spentAt),
        amount: Number(payload.amount),
        paymentMethod: payload.paymentMethod,
        description: payload.description || undefined,
        reference: payload.reference || undefined,
      };

      if (editingExpenseId) {
        await authorizedRequest(`/api/admin/expenses/${editingExpenseId}`, {
          method: "PUT",
          payload: requestPayload,
        });
        setMessage("Gider guncellendi");
      } else {
        await authorizedRequest("/api/admin/expenses", {
          method: "POST",
          payload: requestPayload,
        });
        setMessage("Gider kaydi olusturuldu");
      }

      setEditingExpenseId(null);
    } catch (err) {
      console.error(err);
      setMessage(err instanceof Error ? err.message : "Gider kaydi basarisiz");
    } finally {
      setLoading(false);
    }
  }

  function startEditChargeType(item: ChargeTypeDefinition): void {
    setEditingChargeTypeId(item.id);
    setChargeTypeForm({
      code: item.code,
      name: item.name,
      payerTarget: item.payerTarget,
      isActive: item.isActive,
    });
    setMessage(`Tahakkuk tipi duzenleme modu: ${item.name}`);
  }

  function cancelEditChargeType(): void {
    setEditingChargeTypeId(null);
    setChargeTypeForm({ code: "", name: "", payerTarget: "OWNER", isActive: true });
    setMessage("Tahakkuk tipi duzenleme iptal edildi");
  }

  function startEditBlock(item: BlockDefinition): void {
    setEditingBlockId(item.id);
    setBlockForm({ name: item.name });
    setMessage(`Blok duzenleme modu: ${item.name}`);
  }

  function startEditBank(item: BankDefinition): void {
    setEditingBankId(item.id);
    setBankForm({
      name: item.name,
      isActive: item.isActive,
    });
    setMessage(`Banka duzenleme modu: ${item.name}`);
  }

  function startEditBankBranch(item: BankBranchDefinition): void {
    setEditingBankBranchId(item.id);
    setBankBranchForm({
      bankId: item.bankId,
      name: item.name,
      branchCode: item.branchCode ?? "",
      accountName: item.accountName ?? "",
      accountNumber: item.accountNumber ?? "",
      iban: item.iban ?? "",
      phone: item.phone ?? "",
      email: item.email ?? "",
      address: item.address ?? "",
      representativeName: item.representativeName ?? "",
      representativePhone: item.representativePhone ?? "",
      representativeEmail: item.representativeEmail ?? "",
      notes: item.notes ?? "",
      isActive: item.isActive,
    });
    setMessage(`Sube duzenleme modu: ${item.bankName} / ${item.name}`);
  }

  function cancelEditBank(): void {
    setEditingBankId(null);
    setBankForm({ name: "", isActive: true });
    setMessage("Banka duzenleme iptal edildi");
  }

  function cancelEditBankBranch(): void {
    setEditingBankBranchId(null);
    setBankBranchForm((prev) => ({
      ...prev,
      name: "",
      branchCode: "",
      accountName: "",
      accountNumber: "",
      iban: "",
      phone: "",
      email: "",
      address: "",
      representativeName: "",
      representativePhone: "",
      representativeEmail: "",
      notes: "",
      isActive: true,
    }));
    setMessage("Sube duzenleme iptal edildi");
  }

  function cancelEditBlock(): void {
    setEditingBlockId(null);
    setBlockForm({ name: "" });
    setMessage("Blok duzenleme iptal edildi");
  }

  function startEditExpenseItem(item: ExpenseItemDefinition): void {
    setEditingExpenseItemId(item.id);
    setExpenseItemForm({
      code: item.code,
      name: item.name,
      isActive: item.isActive,
    });
    setMessage(`Gider kalemi duzenleme modu: ${item.name}`);
  }

  function cancelEditExpenseItem(): void {
    setEditingExpenseItemId(null);
    setExpenseItemForm({ code: "", name: "", isActive: true });
    setMessage("Gider kalemi duzenleme iptal edildi");
  }

  function clearExpenseItemForm(): void {
    if (editingExpenseItemId) {
      cancelEditExpenseItem();
      return;
    }
    setExpenseItemForm({ code: "", name: "", isActive: true });
  }

  function startEditPaymentMethod(item: PaymentMethodDefinition): void {
    setEditingPaymentMethodId(item.id);
    setPaymentMethodForm({
      code: item.code,
      name: item.name,
      isActive: item.isActive,
    });
    setMessage(`Odeme araci duzenleme modu: ${item.name}`);
  }

  function cancelEditPaymentMethod(): void {
    setEditingPaymentMethodId(null);
    setPaymentMethodForm({ code: "BANK_TRANSFER", name: "", isActive: true });
    setMessage("Odeme araci duzenleme iptal edildi");
  }

  async function deleteChargeType(item: ChargeTypeDefinition): Promise<void> {
    const accepted = window.confirm(`${item.name} tipini silmek istiyor musun?`);
    if (!accepted) {
      return;
    }

    setLoading(true);
    try {
      await authorizedRequest<void>(`/api/admin/charge-types/${item.id}`, { method: "DELETE" });
      await fetchChargeTypeOptions();
      setMessage("Tahakkuk tipi silindi");
    } catch (err) {
      console.error(err);
      setMessage(err instanceof Error ? err.message : "Tahakkuk tipi silinemedi");
    } finally {
      setLoading(false);
    }
  }

  async function deleteBlock(item: BlockDefinition): Promise<void> {
    const accepted = window.confirm(`${item.name} blogunu silmek istiyor musun?`);
    if (!accepted) {
      return;
    }

    setLoading(true);
    try {
      await authorizedRequest<void>(`/api/admin/blocks/${item.id}`, { method: "DELETE" });
      if (editingBlockId === item.id) {
        setEditingBlockId(null);
        setBlockForm({ name: "" });
      }
      if (apartmentForm.blockName === item.name) {
        setApartmentForm((prev) => ({ ...prev, blockName: "" }));
      }
      await fetchBlockOptions();
      setMessage("Blok silindi");
    } catch (err) {
      console.error(err);
      setMessage(err instanceof Error ? err.message : "Blok silinemedi");
    } finally {
      setLoading(false);
    }
  }

  async function deleteBank(item: BankDefinition): Promise<void> {
    const accepted = window.confirm(`${item.name} bankasini silmek istiyor musun?`);
    if (!accepted) {
      return;
    }

    setLoading(true);
    try {
      await authorizedRequest<void>(`/api/admin/banks/${item.id}`, { method: "DELETE" });
      if (editingBankId === item.id) {
        setEditingBankId(null);
        setBankForm({ name: "", isActive: true });
      }
      if (bankBranchForm.bankId === item.id) {
        setBankBranchForm((prev) => ({
          ...prev,
          bankId: "",
          name: "",
          branchCode: "",
          accountName: "",
          accountNumber: "",
          iban: "",
          phone: "",
          email: "",
          address: "",
          representativeName: "",
          representativePhone: "",
          representativeEmail: "",
          notes: "",
        }));
      }
      await fetchBankOptions();
      setMessage("Banka silindi");
    } catch (err) {
      console.error(err);
      setMessage(err instanceof Error ? err.message : "Banka silinemedi");
    } finally {
      setLoading(false);
    }
  }

  async function deleteBankBranch(item: BankBranchDefinition): Promise<void> {
    const accepted = window.confirm(`${item.bankName} / ${item.name} subesini silmek istiyor musun?`);
    if (!accepted) {
      return;
    }

    setLoading(true);
    try {
      await authorizedRequest<void>(`/api/admin/banks/branches/${item.id}`, { method: "DELETE" });
      if (editingBankBranchId === item.id) {
        setEditingBankBranchId(null);
        setBankBranchForm((prev) => ({
          ...prev,
          name: "",
          branchCode: "",
          accountName: "",
          accountNumber: "",
          iban: "",
          phone: "",
          email: "",
          address: "",
          representativeName: "",
          representativePhone: "",
          representativeEmail: "",
          notes: "",
          isActive: true,
        }));
      }
      await fetchBankOptions();
      setMessage("Sube silindi");
    } catch (err) {
      console.error(err);
      setMessage(err instanceof Error ? err.message : "Sube silinemedi");
    } finally {
      setLoading(false);
    }
  }

  async function deletePaymentMethod(item: PaymentMethodDefinition): Promise<void> {
    const accepted = window.confirm(`${item.name} odeme aracini silmek istiyor musun?`);
    if (!accepted) {
      return;
    }

    setLoading(true);
    try {
      await authorizedRequest<void>(`/api/admin/payment-methods/${item.id}`, { method: "DELETE" });
      await fetchPaymentMethodOptions();
      setMessage("Odeme araci silindi");
    } catch (err) {
      console.error(err);
      setMessage(err instanceof Error ? err.message : "Odeme araci silinemedi");
    } finally {
      setLoading(false);
    }
  }

  async function deleteExpenseItem(item: ExpenseItemDefinition): Promise<void> {
    const accepted = window.confirm(`${item.name} gider kalemini silmek istiyor musun?`);
    if (!accepted) {
      return;
    }

    setLoading(true);
    try {
      await authorizedRequest<void>(`/api/admin/expense-items/${item.id}`, { method: "DELETE" });
      await fetchExpenseItemOptions();
      setMessage("Gider kalemi silindi");
    } catch (err) {
      console.error(err);
      setMessage(err instanceof Error ? err.message : "Gider kalemi silinemedi");
    } finally {
      setLoading(false);
    }
  }

  async function onCreateCharge(payload: {
    apartmentIds: string[];
    chargeTypeId: string;
    periodYear: number;
    entries: Array<{
      periodMonth: number;
      amount: number;
      dueDate: string;
      description?: string;
    }>;
  }): Promise<void> {
    setLoading(true);
    setMessage("Tahakkuk olusturuluyor...");

    try {
      if (!Array.isArray(payload.apartmentIds) || payload.apartmentIds.length === 0) {
        throw new Error("En az bir daire seciniz");
      }

      let firstChargeId: string | undefined;
      let totalCreatedCount = 0;
      for (const apartmentId of payload.apartmentIds) {
        const data = await authorizedRequest<{ id?: string; createdCount?: number; createdIds?: string[]; firstId?: string }>(
          "/api/admin/charges",
          {
            method: "POST",
            payload: {
              apartmentId,
              chargeTypeId: payload.chargeTypeId,
              periodYear: payload.periodYear,
              entries: payload.entries,
            },
          }
        );

        if (!firstChargeId) {
          firstChargeId = data.firstId ?? data.createdIds?.[0] ?? data.id;
        }
        totalCreatedCount += data.createdCount ?? payload.entries.length;
      }

      if (firstChargeId) {
        setLastCreatedChargeId(firstChargeId);
      }

      setMessage(
        `Tahakkuk olustu. Daire: ${payload.apartmentIds.length}, Kayit sayisi: ${totalCreatedCount}${
          firstChargeId ? `, Ilk Charge ID: ${firstChargeId}` : ""
        }`
      );

      const firstApartmentId = payload.apartmentIds[0];
      if (firstApartmentId) {
        setActiveApartmentId(firstApartmentId);
        await fetchStatement(firstApartmentId);
      }
    } catch (err) {
      console.error(err);
      setMessage(err instanceof Error ? err.message : "Tahakkuk olusturulamadi");
    } finally {
      setLoading(false);
    }
  }

  async function onCreatePayment(payload: {
    paidAt: string;
    method: PaymentMethod;
    reference: string;
    note: string;
    items: Array<{
      chargeId: string;
      amount: number;
    }>;
  }): Promise<void> {
    setLoading(true);
    setMessage("Odeme kaydediliyor...");

    try {
      if (!Array.isArray(payload.items) || payload.items.length === 0) {
        throw new Error("En az bir tahakkuk secmelisiniz");
      }

      const sanitizedItems = payload.items
        .map((item) => ({
          chargeId: item.chargeId,
          amount: Number(Number(item.amount).toFixed(2)),
        }))
        .filter((item) => item.chargeId && Number.isFinite(item.amount) && item.amount > 0);

      if (sanitizedItems.length === 0) {
        throw new Error("Secilen tahakkuk tutarlari gecersiz");
      }

      const isoPaidAt = dateInputToIso(payload.paidAt);
      await authorizedRequest<{ id: string }>("/api/admin/payments", {
        method: "POST",
        payload: {
          paidAt: isoPaidAt,
          method: payload.method,
          reference: payload.reference || undefined,
          note: payload.note || undefined,
          items: sanitizedItems,
        },
      });

      setMessage("Odeme girildi");
      await fetchPaymentList();
      if (activeApartmentId) {
        await fetchStatement(activeApartmentId);
      }
    } catch (err) {
      console.error(err);
      setMessage(err instanceof Error ? err.message : "Odeme kaydi basarisiz");
    } finally {
      setLoading(false);
    }
  }

  async function fetchOpenPaymentCharges(apartmentId: string): Promise<
    Array<{
      chargeId: string;
      chargeTypeName: string;
      periodYear: number;
      periodMonth: number;
      dueDate: string;
      amount: number;
      paidTotal: number;
      remaining: number;
    }>
  > {
    if (!apartmentId) {
      return [];
    }

    const data = await authorizedRequest<StatementResponse>(`/api/admin/apartments/${apartmentId}/statement`);
    return [...data.statement]
      .filter((row) => Number(row.remaining) > 0.01)
      .map((row) => ({
        chargeId: row.chargeId,
        chargeTypeName: row.type,
        periodYear: row.periodYear,
        periodMonth: row.periodMonth,
        dueDate: row.dueDate,
        amount: Number(row.amount),
        paidTotal: Number(row.paidTotal),
        remaining: Number(row.remaining),
      }))
      .sort((a, b) => {
        const aDue = new Date(a.dueDate).getTime();
        const bDue = new Date(b.dueDate).getTime();
        if (Number.isFinite(aDue) && Number.isFinite(bDue) && aDue !== bDue) {
          return aDue - bDue;
        }
        if (a.periodYear !== b.periodYear) {
          return a.periodYear - b.periodYear;
        }
        if (a.periodMonth !== b.periodMonth) {
          return a.periodMonth - b.periodMonth;
        }
        return a.chargeId.localeCompare(b.chargeId);
      });
  }

  async function onCreateCarryForward(payload: {
    apartmentId: string;
    amount: string;
    paidAt: string;
    reference: string;
    note: string;
  }): Promise<void> {
    setLoading(true);
    setMessage("Devir alacak kaydi olusturuluyor...");

    try {
      const parsedAmount = parseDistDecimal(payload.amount);
      if (!Number.isFinite(parsedAmount) || parsedAmount <= 0) {
        throw new Error("Devir alacak tutari gecersiz");
      }

      const isoPaidAt = dateInputToIso(payload.paidAt);
      const result = await authorizedRequest<{
        id: string;
        apartmentId: string;
        doorNo: string;
        autoReconcileApplied: boolean;
        reconcileResult: { createdPaymentItemCount: number; unappliedTotal: number } | null;
      }>("/api/admin/payments/carry-forward", {
        method: "POST",
        payload: {
          apartmentId: payload.apartmentId,
          paidAt: isoPaidAt,
          amount: Number(parsedAmount.toFixed(2)),
          reference: payload.reference || undefined,
          note: payload.note || undefined,
          autoReconcile: true,
        },
      });

      const reconcileText = result.autoReconcileApplied
        ? ` Eslestirme yapildi (baglanan satir: ${result.reconcileResult?.createdPaymentItemCount ?? 0}, kalan: ${formatTry(result.reconcileResult?.unappliedTotal ?? 0)}).`
        : "";
      setMessage(`Devir alacak kaydi eklendi: ${result.doorNo}.${reconcileText}`);

      await fetchPaymentList();
      if (activeApartmentId === result.apartmentId) {
        await fetchStatement(result.apartmentId);
      }
    } catch (err) {
      console.error(err);
      setMessage(err instanceof Error ? err.message : "Devir alacak kaydi basarisiz");
    } finally {
      setLoading(false);
    }
  }

  async function onUploadPayments(payload: { method: PaymentMethod; file: File }): Promise<void> {
    setLoading(true);
    setLastSkippedRows([]);
    setLastSkippedTitle("");
    setLastImportInfos([]);
    setLastImportInfoTitle("");
    setLastImportSummary(null);
    setMessage("Toplu odeme dosyasi isleniyor...");

    try {
      const formData = new FormData();
      formData.append("file", payload.file);
      formData.append("method", payload.method);

      const res = await fetch(`${apiBase}/api/admin/payments/upload`, {
        method: "POST",
        credentials: "include",
        body: formData,
      });

      if (!res.ok) {
        const errData = (await res.json().catch(() => ({}))) as { message?: string };
        throw new Error(errData.message ?? "Toplu odeme yukleme basarisiz");
      }

      const result = (await res.json()) as {
        totalRows: number;
        createdCount: number;
        skippedCount: number;
        errors: string[];
      };

      const errorPreview = result.errors.slice(0, 3).join(" | ");
      setMessage(
        `Toplu odeme tamam. Toplam satir: ${result.totalRows}, Kaydedilen: ${result.createdCount}, Atlanan: ${result.skippedCount}${
          errorPreview ? `, Ornek hata: ${errorPreview}` : ""
        }`
      );
      setLastSkippedRows(mapSkippedErrors(result.errors));
      setLastSkippedTitle("Toplu Odeme - Kaydedilmeyen Satirlar");
      setLastImportSummary({
        title: "Toplu Odeme - Islem Ozeti",
        totalRows: result.totalRows,
        savedCount: result.createdCount,
        skippedCount: result.skippedCount,
      });
      await fetchPaymentList();
    } catch (err) {
      console.error(err);
      setMessage(err instanceof Error ? err.message : "Toplu odeme yuklenemedi");
    } finally {
      setLoading(false);
    }
  }

  async function onUploadApartments(e: FormEvent<HTMLFormElement>): Promise<void> {
    e.preventDefault();
    if (!apartmentUploadFile) {
      setMessage("Toplu daire icin Excel dosyasi secin");
      return;
    }

    setLoading(true);
    setLastSkippedRows([]);
    setLastSkippedTitle("");
    setLastImportInfos([]);
    setLastImportInfoTitle("");
    setLastImportSummary(null);
    setMessage("Daire Excel dosyasi isleniyor...");

    try {
      const formData = new FormData();
      formData.append("file", apartmentUploadFile);

      const res = await fetch(`${apiBase}/api/admin/apartments/upload`, {
        method: "POST",
        credentials: "include",
        body: formData,
      });

      if (!res.ok) {
        const errData = (await res.json().catch(() => ({}))) as { message?: string };
        throw new Error(errData.message ?? "Toplu daire yukleme basarisiz");
      }

      const result = (await res.json()) as {
        totalRows: number;
        createdCount: number;
        updatedCount?: number;
        skippedCount: number;
        errors: string[];
      };

      const errorPreview = result.errors.slice(0, 3).join(" | ");
      setMessage(
        `Toplu daire yukleme tamam. Toplam satir: ${result.totalRows}, Olusan: ${result.createdCount}, Guncellenen: ${
          result.updatedCount ?? 0
        }, Atlanan: ${result.skippedCount}${errorPreview ? `, Ornek hata: ${errorPreview}` : ""}`
      );
      setLastSkippedRows(mapSkippedErrors(result.errors));
      setLastSkippedTitle("Toplu Daire - Kaydedilmeyen Satirlar");
      setLastImportSummary({
        title: "Toplu Daire - Islem Ozeti",
        totalRows: result.totalRows,
        savedCount: result.createdCount,
        skippedCount: result.skippedCount,
        savedLabel: "Olusan",
      });
      setApartmentUploadFile(null);
      await fetchApartmentOptions();
      await fetchBlockOptions();
      await fetchApartmentClassOptions();
    } catch (err) {
      console.error(err);
      setMessage(err instanceof Error ? err.message : "Toplu daire yuklenemedi");
    } finally {
      setLoading(false);
    }
  }

  async function downloadApartmentUploadTemplate(): Promise<void> {
    try {
      setMessage("Daire Excel sablonu indiriliyor...");
      const res = await fetch(`${apiBase}/api/admin/apartments/upload-template`, {
        credentials: "include",
      });

      if (!res.ok) {
        const errData = (await res.json().catch(() => ({}))) as { message?: string };
        throw new Error(errData.message ?? "Excel sablonu indirilemedi");
      }

      const blob = await res.blob();
      const blobUrl = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = blobUrl;
      link.download = "daire-upload-sablonu.xlsx";
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(blobUrl);
      setMessage("Daire Excel sablonu indirildi");
    } catch (err) {
      console.error(err);
      setMessage(err instanceof Error ? err.message : "Excel sablonu indirilemedi");
    }
  }

  async function onImportBankStatement(e: FormEvent<HTMLFormElement>): Promise<void> {
    e.preventDefault();
    if (!bankStatementFile) {
      setMessage("Banka ekstresi icin dosya secin");
      return;
    }

    setLoading(true);
    setLastSkippedRows([]);
    setLastSkippedTitle("");
    setLastImportInfos([]);
    setLastImportInfoTitle("");
    setLastImportSummary(null);
    setMessage("Banka ekstresi onizleme icin isleniyor...");

    try {
      const formData = new FormData();
      formData.append("file", bankStatementFile);

      const res = await fetch(`${apiBase}/api/admin/bank-statement/preview`, {
        method: "POST",
        credentials: "include",
        body: formData,
      });

      if (!res.ok) {
        const errData = (await res.json().catch(() => ({}))) as { message?: string };
        throw new Error(errData.message ?? "Banka ekstresi onizleme basarisiz");
      }

      const result = (await res.json()) as {
        fileName: string;
        totalRows: number;
        rows: BankStatementPreviewRow[];
      };

      setBankPreviewRows(result.rows);
      setBankPreviewFilterMissingOnly(false);
      setBankPreviewFilterSplitOnly(false);
      resetBankPreviewHeaderFilters();
      setBankPreviewFileName(result.fileName || bankStatementFile.name);

      const occurredAtTimes = result.rows
        .map((row) => new Date(row.occurredAt).getTime())
        .filter((value) => Number.isFinite(value));
      if (occurredAtTimes.length > 0) {
        const minDate = new Date(Math.min(...occurredAtTimes)).toISOString().slice(0, 10);
        const maxDate = new Date(Math.max(...occurredAtTimes)).toISOString().slice(0, 10);
        setBankReconciliationFilter({ from: minDate, to: maxDate });
        void fetchBankReconciliationReport({ from: minDate, to: maxDate, silent: true });
      }

      setMessage(`Onizleme hazir. ${result.totalRows} satiri duzenleyip kaydedebilirsiniz.`);
      void fetchBulkStatement({ silent: true });
    } catch (err) {
      console.error(err);
      setMessage(err instanceof Error ? err.message : "Banka ekstresi onizlemesi alinamadi");
    } finally {
      setLoading(false);
    }
  }

  function updateBankPreviewRow(index: number, updater: (row: BankStatementPreviewRow) => BankStatementPreviewRow): void {
    setBankPreviewRows((prev) => prev.map((row, i) => (i === index ? updater(row) : row)));
  }

  function parseDoorNosFromFreeText(value: string): string[] {
    if (!value.trim()) {
      return [];
    }

    return value
      .replace(/\bve\b/gi, ",")
      .replace(/\bveya\b/gi, ",")
      .split(/[,;|/&\-\s]+/)
      .map((x) => x.trim())
      .filter(Boolean);
  }

  function normalizeDoorPatternText(value: string): string {
    return value
      .toLocaleLowerCase("tr")
      .replace(/ı/g, "i")
      .replace(/ş/g, "s")
      .replace(/ğ/g, "g")
      .replace(/ü/g, "u")
      .replace(/ö/g, "o")
      .replace(/ç/g, "c");
  }

  function extractDoorNosFromDescriptionForSplit(description: string): string[] {
    const text = normalizeDoorPatternText(description.trim());
    if (!text.trim()) {
      return [];
    }

    const explicitPrefixedDoorNos = [
      ...text.matchAll(/\b(?:d|daire)\s*[:#\-\/.]?\s*0*(\d{1,4})\b/g),
    ].map((match) => match[1]);

    const groupedByKeyword = [
      ...text.matchAll(
        /\b(?:d|daire|daireler)\b[^\d]{0,6}((?:\d{1,4}\s*(?:,|ve|veya|&|\/|-)\s*)+\d{1,4})/g
      ),
    ].flatMap((match) => parseDoorNosFromFreeText(match[1] ?? ""));

    // Support compact formats seen in bank descriptions like D57VE93, D57/93, 57VE93.
    const compactPairs = [
      ...text.matchAll(/\bd\s*0*(\d{1,4})\s*(?:ve|veya|\/|&|-)\s*0*(\d{1,4})\b/g),
      ...text.matchAll(/\b0*(\d{1,4})\s*(?:ve|veya|\/|&)\s*0*(\d{1,4})\b/g),
    ].flatMap((match) => [match[1], match[2]]);

    const merged = [...new Set([...explicitPrefixedDoorNos, ...groupedByKeyword, ...compactPairs])];
    if (merged.length >= 2) {
      return merged;
    }

    return [];
  }

  function normalizeDoorNoForMatch(value: string): string {
    const trimmed = value.trim();
    if (!trimmed) {
      return "";
    }

    const withPrefix = trimmed.match(/^(?:D|DAIRE)\s*[:#\-\/.]?\s*0*(\d{1,4})$/i);
    if (withPrefix?.[1]) {
      return String(Number(withPrefix[1]));
    }

    const numeric = Number(trimmed);
    if (!Number.isNaN(numeric)) {
      return String(numeric);
    }

    return trimmed;
  }

  function resolveSplitDoorNos(row: BankStatementPreviewRow, validDoorNos: Set<string>): string[] {
    if (row.entryType !== "PAYMENT") {
      return [];
    }

    const fromDoorField = parseDoorNosFromFreeText(row.doorNo ?? "");
    const fromDescription = extractDoorNosFromDescriptionForSplit(row.description);
    return [...new Set([...fromDoorField, ...fromDescription].map(normalizeDoorNoForMatch))].filter((doorNo) =>
      validDoorNos.has(doorNo)
    );
  }

  function onAutoSplitMultiDoorBankRows(): void {
    if (bankPreviewRows.length === 0) {
      setMessage("Onizleme satiri yok");
      return;
    }

    const validDoorNos = new Set(
      apartmentOptions
        .flatMap((apt) => [apt.doorNo, normalizeDoorNoForMatch(apt.doorNo)])
        .filter(Boolean)
    );

    let splitSourceCount = 0;
    const nextRows: BankStatementPreviewRow[] = [];

    for (const row of bankPreviewRows) {
      if (row.entryType !== "PAYMENT" || !Number.isFinite(row.amount) || row.amount <= 0) {
        nextRows.push({
          ...row,
          isAutoSplit: false,
          splitSourceRowNo: null,
        });
        continue;
      }

      const mergedCandidates = resolveSplitDoorNos(row, validDoorNos);

      if (mergedCandidates.length < 2) {
        nextRows.push({
          ...row,
          isAutoSplit: false,
          splitSourceRowNo: null,
        });
        continue;
      }

      splitSourceCount += 1;
      const count = mergedCandidates.length;
      const base = Math.floor((row.amount / count) * 100) / 100;
      const remainder = Number((row.amount - base * count).toFixed(2));

      mergedCandidates.forEach((doorNo, idx) => {
        nextRows.push({
          ...row,
          doorNo,
          amount: Number((base + (idx === 0 ? remainder : 0)).toFixed(2)),
          isAutoSplit: true,
          splitSourceRowNo: row.rowNo,
        });
      });
    }

    if (splitSourceCount === 0) {
      setMessage("Bolinecek coklu daire satiri bulunamadi");
      return;
    }

    setBankPreviewRows(nextRows);
    setMessage(`${splitSourceCount} satir coklu daireye gore otomatik bolundu. Kayit oncesi kontrol edin.`);
  }

  async function onCommitBankStatementPreview(): Promise<void> {
    if (hasBankPreviewMissingRows) {
      setMessage("Kirmizi satirlardaki eksikleri tamamlamadan kayit yapamazsiniz");
      return;
    }

    const rowsToCommit = bankPreviewRows.filter((row) => row.description.trim().length > 0 && row.amount > 0);
    if (rowsToCommit.length === 0) {
      setMessage("Kaydedilecek satir yok");
      return;
    }

    setLoading(true);
    setLastSkippedRows([]);
    setLastSkippedTitle("");
    setLastImportInfos([]);
    setLastImportInfoTitle("");
    setLastImportSummary(null);
    setMessage("Onizleme kaydediliyor...");

    try {
      const payload = {
        fileName: bankPreviewFileName || bankStatementFile?.name || "bank-statement-review",
        rows: rowsToCommit.map((row) => ({
          occurredAt: row.occurredAt,
          amount: Number(row.amount),
          entryType: row.entryType,
          isAutoSplit: row.isAutoSplit === true ? true : undefined,
          splitSourceRowNo: row.splitSourceRowNo ?? undefined,
          doorNo: row.entryType === "PAYMENT" ? row.doorNo ?? undefined : undefined,
          expenseItemId: row.entryType === "EXPENSE" ? row.expenseItemId ?? undefined : undefined,
          description: row.description,
          reference: row.reference ?? undefined,
          txType: row.txType ?? undefined,
          paymentMethod: row.paymentMethod,
        })),
      };

      const result = await authorizedRequest<{
        totalRows: number;
        paymentCreatedCount: number;
        expenseCreatedCount: number;
        skippedCount: number;
        errors: string[];
        infos?: string[];
      }>("/api/admin/bank-statement/commit", {
        method: "POST",
        payload,
      });

      const errorPreview = result.errors.slice(0, 3).join(" | ");
      const infoPreview = (result.infos ?? []).slice(0, 2).join(" | ");
      setMessage(
        `Kayit tamam. Satir: ${result.totalRows}, Tahsilat: ${result.paymentCreatedCount}, Gider: ${result.expenseCreatedCount}, Atlanan: ${result.skippedCount}${
          errorPreview ? `, Ornek hata: ${errorPreview}` : ""
        }${infoPreview ? `, Bilgi: ${infoPreview}` : ""}`
      );
      setLastSkippedRows(mapSkippedErrors(result.errors));
      setLastSkippedTitle("Banka Ekstresi - Kaydedilmeyen Satirlar");
      setLastImportInfos(mapImportInfos(result.infos ?? []));
      setLastImportInfoTitle("Banka Ekstresi - Bilgi Notlari");
      setLastImportSummary({
        title: "Banka Ekstresi - Islem Ozeti",
        totalRows: result.totalRows,
        savedCount: result.paymentCreatedCount + result.expenseCreatedCount,
        skippedCount: result.skippedCount,
        detailText: `Tahsilat: ${result.paymentCreatedCount}, Gider: ${result.expenseCreatedCount}`,
      });

      setBankPreviewRows([]);
      setBankPreviewFileName("");
      setBankStatementFile(null);
      await fetchPaymentList();
      if (activeApartmentId) {
        await fetchStatement(activeApartmentId);
      }
    } catch (err) {
      console.error(err);
      setMessage(err instanceof Error ? err.message : "Onizleme kaydedilemedi");
    } finally {
      setLoading(false);
    }
  }

  async function onCreateBulkCharge(payload: {
    chargeTypeId: string;
    periodYear: number;
    periodMonths: number[];
    dueDateByMonth: Record<string, string>;
    description?: string;
    apartmentType?: ApartmentType;
    apartmentClassId?: string;
    apartmentDutyId?: string;
    occupancyType?: OccupancyType;
    amount?: number;
    amountByType?: { KUCUK: number; BUYUK: number };
    skipIfExists: boolean;
  }): Promise<void> {
    if (payload.periodMonths.length === 0) {
      setMessage("Toplu tahakkuk icin en az bir ay secin");
      return;
    }

    setLoading(true);
    setMessage("Toplu tahakkuk olusturuluyor...");

    try {
      const missingMonth = payload.periodMonths.find((month) => !payload.dueDateByMonth[String(month)]);
      if (missingMonth) {
        throw new Error(`Ay ${missingMonth} icin son odeme tarihi girin`);
      }

      const requestPayload = {
        ...payload,
        dueDateByMonth: Object.fromEntries(
          payload.periodMonths.map((month) => {
            const raw = payload.dueDateByMonth[String(month)];
            return [String(month), raw ? dateInputToIso(raw) : ""];
          })
        ),
      };

      const result = await authorizedRequest<{ createdCount: number; skippedCount: number; totalTargetCount: number }>(
        "/api/admin/charges/bulk",
        {
          method: "POST",
          payload: requestPayload,
        }
      );

      setMessage(
        `Toplu tahakkuk tamam. Olusan: ${result.createdCount}, Atlanan: ${result.skippedCount}, Hedef: ${result.totalTargetCount}`
      );
    } catch (err) {
      console.error(err);
      setMessage(err instanceof Error ? err.message : "Toplu tahakkuk olusturulamadi");
    } finally {
      setLoading(false);
    }
  }

  function onAddExpenseDistribution(): void {
    if (!expenseDistForm.chargeTypeId) {
      setMessage("Gider tipi secin");
      return;
    }
    if (!expenseDistForm.dueDate) {
      setMessage("Vade tarihi girin");
      return;
    }
    if (!expenseDistDraft.ready) {
      setExpenseDistResult(null);
      setMessage(expenseDistDraft.message);
      return;
    }

    const calculatedResult = expenseDistDraft.result;
    setExpenseDistResult(calculatedResult);
    setMessage(`Dagitim hazir: ${calculatedResult.selectedCount} daire`);
  }

  async function onSaveExpenseDistribution(): Promise<void> {
    if (!expenseDistResult || expenseDistResult.rows.length === 0) {
      setMessage("Once dagitimi ekleyin");
      return;
    }

    setLoading(true);
    setMessage("Tahakkuklar kaydediliyor...");

    try {
      const payload = {
        chargeTypeId: expenseDistForm.chargeTypeId,
        periodYear: expenseDistResult.periodYear,
        periodMonth: expenseDistResult.periodMonth,
        dueDate: dateInputToIso(expenseDistResult.dueDate),
        invoiceDate: expenseDistResult.invoiceDate ? dateInputToIso(expenseDistResult.invoiceDate) : undefined,
        periodStartDate: expenseDistResult.periodStartDate ? dateInputToIso(expenseDistResult.periodStartDate) : undefined,
        periodEndDate: expenseDistResult.periodEndDate ? dateInputToIso(expenseDistResult.periodEndDate) : undefined,
        invoiceFileName: invoiceUploadFile?.name || undefined,
        invoiceAmount: expenseDistResult.billAmount,
        description: expenseDistForm.description || undefined,
        skipIfExists: false,
        rows: expenseDistResult.rows.map((row) => ({
          apartmentId: row.apartmentId,
          amount: row.amount,
        })),
      };

      const result = await authorizedRequest<{ createdCount: number; skippedCount: number; totalTargetCount: number }>(
        "/api/admin/charges/distributed",
        {
          method: "POST",
          payload,
        }
      );

      const currentMonth = new Date().getMonth() + 1;
      setExpenseDistForm({
        chargeTypeId: "",
        invoiceNo: "",
        period: String(currentMonth),
        invoiceDate: "",
        periodStartDate: "",
        periodEndDate: "",
        dueDate: "",
        billAmount: "",
        selectedApartmentTypes: ["KUCUK", "BUYUK"],
        selectedBlockNames: [],
        selectedApartmentIds: [],
        excludedApartmentIds: [],
        smallCoefficient: "0,765",
        bigCoefficient: "1,02",
        blockCoefficients: {},
        apartmentCoefficients: {},
        roundingDirection: "DOWN",
        roundingStep: 5,
        description: "",
      });
      setExpenseDistResult(null);
      setInvoiceUploadFile(null);
      setExpenseDistUploadInputKey((prev) => prev + 1);

      setMessage(
        `Kayit tamam. Olusan: ${result.createdCount}, Atlanan: ${result.skippedCount}, Hedef: ${result.totalTargetCount}`
      );
    } catch (err) {
      console.error(err);
      setMessage(err instanceof Error ? err.message : "Tahakkuk kaydi basarisiz");
    } finally {
      setLoading(false);
    }
  }

  function editExpenseDistRow(row: {
    apartmentId: string;
    amount: number;
  }): void {
    const entered = window.prompt("Yeni tutari girin", String(row.amount));
    if (entered === null) {
      return;
    }

    const amount = parseDistDecimal(entered);
    if (!Number.isFinite(amount) || amount < 0) {
      setMessage("Gecerli bir tutar girin");
      return;
    }

    setExpenseDistResult((prev) => {
      if (!prev) {
        return prev;
      }

      const rows = prev.rows.map((x) =>
        x.apartmentId === row.apartmentId ? { ...x, amount: Number(amount.toFixed(2)) } : x
      );
      const distributedTotal = Number(rows.reduce((sum, x) => sum + x.amount, 0).toFixed(2));

      return {
        ...prev,
        rows,
        selectedCount: rows.length,
        smallCount: rows.filter((x) => x.type === "KUCUK").length,
        bigCount: rows.filter((x) => x.type === "BUYUK").length,
        distributedTotal,
        roundingDiff: Number((prev.billAmount - distributedTotal).toFixed(2)),
      };
    });
  }

  function deleteExpenseDistRow(apartmentId: string): void {
    const accepted = window.confirm("Bu daireyi dagitim listesinden silmek istiyor musun?");
    if (!accepted) {
      return;
    }

    setExpenseDistResult((prev) => {
      if (!prev) {
        return prev;
      }

      const rows = prev.rows.filter((x) => x.apartmentId !== apartmentId);
      const distributedTotal = Number(rows.reduce((sum, x) => sum + x.amount, 0).toFixed(2));

      return {
        ...prev,
        rows,
        selectedCount: rows.length,
        smallCount: rows.filter((x) => x.type === "KUCUK").length,
        bigCount: rows.filter((x) => x.type === "BUYUK").length,
        distributedTotal,
        roundingDiff: Number((prev.billAmount - distributedTotal).toFixed(2)),
      };
    });
  }

  function clearAllExpenseDistRows(): void {
    if (!expenseDistResult || expenseDistResult.rows.length === 0) {
      return;
    }

    const accepted = window.confirm("Kaydedilmemis dagitim sonucu temizlensin mi?");
    if (!accepted) {
      return;
    }

    setExpenseDistResult(null);
    setMessage("Dagitim sonucu temizlendi");
  }

  async function fetchDistributedInvoiceRows(silent = false): Promise<void> {
    if (!silent) {
      setLoading(true);
      setMessage("Fatura dagitim listesi hazirlaniyor...");
    }

    try {
      const payload: {
        periodYear?: number;
        periodMonths?: number[];
        chargeTypeId?: string;
        accrualDateFrom?: string;
        accrualDateTo?: string;
      } = {};

      const periodYear = Number(bulkCorrectionForm.periodYear);
      if (Number.isFinite(periodYear) && periodYear >= 2000) {
        payload.periodYear = periodYear;
      }

      if (bulkCorrectionForm.periodMonths.length > 0) {
        payload.periodMonths = bulkCorrectionForm.periodMonths;
      }

      if (bulkCorrectionForm.chargeTypeId) {
        payload.chargeTypeId = bulkCorrectionForm.chargeTypeId;
      }

      if (bulkCorrectionForm.accrualDateFrom) {
        payload.accrualDateFrom = bulkCorrectionForm.accrualDateFrom;
      }

      if (bulkCorrectionForm.accrualDateTo) {
        payload.accrualDateTo = bulkCorrectionForm.accrualDateTo;
      }

      if (
        payload.accrualDateFrom &&
        payload.accrualDateTo &&
        payload.accrualDateFrom > payload.accrualDateTo
      ) {
        setMessage("Tahakkuk tarihi araligi gecersiz: baslangic, bitisten buyuk olamaz");
        return;
      }

      const result = await authorizedRequest<{ rows: DistributedInvoiceRow[]; totalCount: number }>(
        "/api/admin/charges/distributed/invoices/list",
        {
          method: "POST",
          payload,
        }
      );

      setDistributedInvoiceRows(result.rows);
      if (!silent) {
        setMessage(`Fatura listesi hazir: ${result.totalCount} kayit`);
      }
    } catch (err) {
      console.error(err);
      setMessage(err instanceof Error ? err.message : "Fatura listesi alinamadi");
    } finally {
      if (!silent) {
        setLoading(false);
      }
    }
  }

  async function onBulkCorrectCharges(e: FormEvent<HTMLFormElement>): Promise<void> {
    e.preventDefault();
    await fetchDistributedInvoiceRows();
  }

  function getBulkCorrectDetailCriteriaFromSearch(search: string): {
    chargeTypeId: string;
    periodYear: number;
    periodMonth: number;
    description: string | null;
    invoiceDate: string | null;
    periodStartDate: string | null;
    periodEndDate: string | null;
    dueDate: string | null;
  } | null {
    const params = new URLSearchParams(search);
    const chargeTypeId = params.get("chargeTypeId")?.trim() ?? "";
    const periodYear = Number(params.get("periodYear"));
    const periodMonth = Number(params.get("periodMonth"));
    const hasDescription = params.has("description");
    const descriptionRaw = params.get("description");
    const hasInvoiceDate = params.has("invoiceDate");
    const invoiceDateRaw = params.get("invoiceDate");
    const hasPeriodStartDate = params.has("periodStartDate");
    const periodStartDateRaw = params.get("periodStartDate");
    const hasPeriodEndDate = params.has("periodEndDate");
    const periodEndDateRaw = params.get("periodEndDate");
    const hasDueDate = params.has("dueDate");
    const dueDateRaw = params.get("dueDate");

    if (!chargeTypeId || !Number.isFinite(periodYear) || !Number.isFinite(periodMonth)) {
      return null;
    }

    return {
      chargeTypeId,
      periodYear,
      periodMonth,
      description: hasDescription ? (descriptionRaw ?? "") : null,
      invoiceDate: hasInvoiceDate ? (invoiceDateRaw ?? "") : null,
      periodStartDate: hasPeriodStartDate ? (periodStartDateRaw ?? "") : null,
      periodEndDate: hasPeriodEndDate ? (periodEndDateRaw ?? "") : null,
      dueDate: hasDueDate ? (dueDateRaw ?? "") : null,
    };
  }

  function openDistributedInvoiceDetailPage(row: DistributedInvoiceRow): void {
    const params = new URLSearchParams({
      chargeTypeId: row.chargeTypeId,
      periodYear: String(row.periodYear),
      periodMonth: String(row.periodMonth),
      description: row.description ?? "",
    });
    navigate(`/admin/charges/bulk-correct/edit?${params.toString()}`);
  }

  async function fetchDistributedInvoiceDetailRows(criteria: {
    chargeTypeId: string;
    periodYear: number;
    periodMonth: number;
    description: string | null;
  }): Promise<void> {
    setDistributedInvoiceDetailLoading(true);
    setMessage("Toplu duzeltme detaylari yukleniyor...");
    try {
      const result = await authorizedRequest<{ rows: DistributedInvoiceChargeDetailRow[]; totalCount: number }>(
        "/api/admin/charges/distributed/invoices/details",
        {
          method: "POST",
          payload: criteria,
        }
      );
      setDistributedInvoiceDetailRows(result.rows);
      setMessage(`Toplu duzeltme detaylari hazir: ${result.totalCount} satir`);
    } catch (err) {
      console.error(err);
      setDistributedInvoiceDetailRows([]);
      setMessage(err instanceof Error ? err.message : "Toplu duzeltme detaylari alinamadi");
    } finally {
      setDistributedInvoiceDetailLoading(false);
    }
  }

  function updateDistributedInvoiceDetailRowField(
    rowId: string,
    key: "amount" | "periodYear" | "periodMonth" | "dueDate" | "description" | "chargeTypeId",
    value: string
  ): void {
    setDistributedInvoiceDetailRows((prev) =>
      prev.map((row) => {
        if (row.id !== rowId) {
          return row;
        }

        if (key === "description") {
          return { ...row, description: value };
        }

        if (key === "dueDate") {
          if (!value) {
            return { ...row, dueDate: "" };
          }
          const iso = dateInputToIso(value);
          return { ...row, dueDate: iso };
        }

        if (key === "chargeTypeId") {
          const selectedType = chargeTypeOptions.find((x) => x.id === value);
          return {
            ...row,
            chargeTypeId: value,
            chargeTypeCode: selectedType?.code ?? row.chargeTypeCode,
            chargeTypeName: selectedType?.name ?? row.chargeTypeName,
          };
        }

        const numeric = Number(value);
        if (!Number.isFinite(numeric)) {
          return row;
        }

        if (key === "amount") {
          return { ...row, amount: numeric };
        }
        if (key === "periodYear") {
          return { ...row, periodYear: Math.trunc(numeric) };
        }
        return { ...row, periodMonth: Math.trunc(numeric) };
      })
    );
  }

  async function saveDistributedInvoiceDetailRow(row: DistributedInvoiceChargeDetailRow): Promise<void> {
    const dueDateInput = isoToDateInput(row.dueDate);
    if (!dueDateInput) {
      setMessage("Son odeme tarihi zorunlu");
      return;
    }
    if (!Number.isFinite(row.amount) || row.amount <= 0) {
      setMessage("Tutar sifirdan buyuk olmali");
      return;
    }
    if (!row.chargeTypeId) {
      setMessage("Tahakkuk tipi zorunlu");
      return;
    }

    setSavingDistributedInvoiceChargeId(row.id);
    try {
      await authorizedRequest(`/api/admin/charges/${row.id}`, {
        method: "PUT",
        payload: {
          chargeTypeId: row.chargeTypeId,
          periodYear: row.periodYear,
          periodMonth: row.periodMonth,
          amount: row.amount,
          dueDate: dateInputToIso(dueDateInput),
          description: row.description?.trim() ? row.description.trim() : null,
        },
      });

      setMessage(`Tahakkuk guncellendi: ${row.blockName}/${row.doorNo}`);

      const criteria = getBulkCorrectDetailCriteriaFromSearch(location.search);
      if (criteria) {
        await fetchDistributedInvoiceDetailRows(criteria);
      }
    } catch (err) {
      console.error(err);
      setMessage(err instanceof Error ? err.message : "Tahakkuk guncellenemedi");
    } finally {
      setSavingDistributedInvoiceChargeId(null);
    }
  }

  async function deleteDistributedInvoiceRow(row: DistributedInvoiceRow): Promise<void> {
    const accepted = window.confirm(
      `${row.invoiceFileName} faturasina bagli ${row.chargeCount} tahakkuk satiri silinecek. Devam edilsin mi?`
    );
    if (!accepted) {
      return;
    }

    const key = `${row.chargeTypeId}|${row.periodYear}|${row.periodMonth}|${row.description ?? ""}`;
    setDeletingDistributedInvoiceKey(key);
    setLoading(true);

    try {
      const result = await authorizedRequest<{ deletedCount: number }>(
        "/api/admin/charges/distributed/invoices/delete",
        {
          method: "POST",
          payload: {
            chargeTypeId: row.chargeTypeId,
            periodYear: row.periodYear,
            periodMonth: row.periodMonth,
            description: row.description ?? null,
          },
        }
      );

      await fetchDistributedInvoiceRows(true);
      setMessage(`Toplu silme tamamlandi. Silinen tahakkuk: ${result.deletedCount}`);
    } catch (err) {
      console.error(err);
      setMessage(err instanceof Error ? err.message : "Toplu tahakkuk silme basarisiz");
    } finally {
      setDeletingDistributedInvoiceKey(null);
      setLoading(false);
    }
  }

  async function loadCorrections(apartmentId: string, showReadyMessage = true): Promise<void> {
    if (!apartmentId) {
      setChargeCorrectionRows([]);
      setPaymentCorrectionRows([]);
      setSelectedChargeCorrectionIds([]);
      setSelectedPaymentCorrectionIds([]);
      return;
    }

    setLoading(true);
    setMessage("Duzeltme kayitlari yukleniyor...");
    try {
      const [charges, paymentItems] = await Promise.all([
        authorizedRequest<ChargeCorrectionRow[]>(`/api/admin/apartments/${apartmentId}/charges`),
        authorizedRequest<PaymentItemCorrectionRow[]>(`/api/admin/apartments/${apartmentId}/payment-items`),
      ]);

      const sortedCharges = [...charges].sort((a, b) => {
        const aDue = new Date(a.dueDate).getTime();
        const bDue = new Date(b.dueDate).getTime();

        if (Number.isFinite(aDue) && Number.isFinite(bDue) && aDue !== bDue) {
          return bDue - aDue;
        }

        if (a.periodYear !== b.periodYear) {
          return b.periodYear - a.periodYear;
        }

        return b.periodMonth - a.periodMonth;
      });

      setChargeCorrectionRows(sortedCharges);
      setPaymentCorrectionRows(paymentItems);
      setSelectedChargeCorrectionIds([]);
      setSelectedPaymentCorrectionIds([]);
      if (showReadyMessage) {
        setMessage(`Duzeltme kayitlari hazir: ${charges.length} tahakkuk, ${paymentItems.length} odeme`);
      }
    } catch (err) {
      console.error(err);
      setMessage(err instanceof Error ? err.message : "Duzeltme kayitlari alinamadi");
    } finally {
      setLoading(false);
    }
  }

  async function saveChargeCorrection(row: ChargeCorrectionRow): Promise<void> {
    try {
      await authorizedRequest(`/api/admin/charges/${row.id}`, {
        method: "PUT",
        payload: {
          chargeTypeId: row.chargeTypeId,
          periodYear: row.periodYear,
          periodMonth: row.periodMonth,
          amount: row.amount,
          dueDate: dateInputToIso(isoToDateInput(row.dueDate)),
          description: row.description ?? undefined,
        },
      });
      await loadCorrections(correctionApartmentId, false);
      setToastMessage("Kaydedildi");
      setMessage("Tahakkuk guncellendi");
    } catch (err) {
      console.error(err);
      setMessage(err instanceof Error ? err.message : "Tahakkuk guncellenemedi");
    }
  }

  async function removeChargeCorrection(chargeId: string): Promise<void> {
    const accepted = window.confirm("Bu tahakkugu silmek istiyor musun?");
    if (!accepted) {
      return;
    }
    try {
      await authorizedRequest<void>(`/api/admin/charges/${chargeId}`, { method: "DELETE" });
      setMessage("Tahakkuk silindi");
      await loadCorrections(correctionApartmentId);
    } catch (err) {
      console.error(err);
      setMessage(err instanceof Error ? err.message : "Tahakkuk silinemedi");
    }
  }

  async function savePaymentCorrection(row: PaymentItemCorrectionRow): Promise<void> {
    try {
      await authorizedRequest(`/api/admin/payment-items/${row.paymentItemId}`, {
        method: "PUT",
        payload: {
          chargeId: row.chargeId,
          amount: row.amount,
          paidAt: dateInputToIso(isoToDateInput(row.paidAt)),
          method: row.method,
          note: row.note ?? undefined,
          isReconcileLocked: row.isReconcileLocked,
        },
      });
      await loadCorrections(correctionApartmentId, false);
      setToastMessage("Kaydedildi");
      setMessage("Odeme kaydi guncellendi");
    } catch (err) {
      console.error(err);
      setMessage(err instanceof Error ? err.message : "Odeme kaydi guncellenemedi");
    }
  }

  async function removePaymentCorrection(paymentItemId: string): Promise<void> {
    const accepted = window.confirm("Bu odeme kaydini silmek istiyor musun?");
    if (!accepted) {
      return;
    }
    try {
      await authorizedRequest<void>(`/api/admin/payment-items/${paymentItemId}`, { method: "DELETE" });
      setMessage("Odeme kaydi silindi");
      await loadCorrections(correctionApartmentId);
    } catch (err) {
      console.error(err);
      setMessage(err instanceof Error ? err.message : "Odeme kaydi silinemedi");
    }
  }

  async function splitPaymentCorrection(input: {
    paymentItemId: string;
    amount: number;
    targetChargeId: string;
  }): Promise<void> {
    try {
      await authorizedRequest(`/api/admin/payment-items/${input.paymentItemId}/split`, {
        method: "POST",
        payload: {
          amount: input.amount,
          targetChargeId: input.targetChargeId,
        },
      });
      await loadCorrections(correctionApartmentId, false);
      setToastMessage("Bolundu");
      setMessage("Kapama eslestirmesi bolundu");
    } catch (err) {
      console.error(err);
      setMessage(err instanceof Error ? err.message : "Kapama eslestirmesi bolunemedi");
    }
  }

  async function removeSelectedChargeCorrections(): Promise<void> {
    if (selectedChargeCorrectionIds.length === 0) {
      setMessage("Toplu silme icin en az bir tahakkuk secin");
      return;
    }

    const accepted = window.confirm(
      `${selectedChargeCorrectionIds.length} tahakkuk kaydi silinsin mi? (Bagli odemesi olan satirlar silinemez)`
    );
    if (!accepted) {
      return;
    }

    setLoading(true);
    try {
      const results = await Promise.allSettled(
        selectedChargeCorrectionIds.map((chargeId) =>
          authorizedRequest<void>(`/api/admin/charges/${chargeId}`, { method: "DELETE" })
        )
      );

      const successCount = results.filter((x) => x.status === "fulfilled").length;
      const failCount = results.length - successCount;

      await loadCorrections(correctionApartmentId, false);

      if (failCount > 0) {
        setMessage(`Toplu tahakkuk silme tamamlandi: ${successCount} silindi, ${failCount} silinemedi`);
      } else {
        setMessage(`Toplu tahakkuk silme tamamlandi: ${successCount} kayit silindi`);
      }
    } catch (err) {
      console.error(err);
      setMessage(err instanceof Error ? err.message : "Toplu tahakkuk silme basarisiz");
    } finally {
      setLoading(false);
    }
  }

  async function removeSelectedPaymentCorrections(): Promise<void> {
    if (selectedPaymentCorrectionIds.length === 0) {
      setMessage("Toplu silme icin en az bir odeme kaydi secin");
      return;
    }

    const accepted = window.confirm(`${selectedPaymentCorrectionIds.length} odeme kaydi silinsin mi?`);
    if (!accepted) {
      return;
    }

    setLoading(true);
    try {
      const results = await Promise.allSettled(
        selectedPaymentCorrectionIds.map((paymentItemId) =>
          authorizedRequest<void>(`/api/admin/payment-items/${paymentItemId}`, { method: "DELETE" })
        )
      );

      const successCount = results.filter((x) => x.status === "fulfilled").length;
      const failCount = results.length - successCount;

      await loadCorrections(correctionApartmentId, false);

      if (failCount > 0) {
        setMessage(`Toplu odeme silme tamamlandi: ${successCount} silindi, ${failCount} silinemedi`);
      } else {
        setMessage(`Toplu odeme silme tamamlandi: ${successCount} kayit silindi`);
      }
    } catch (err) {
      console.error(err);
      setMessage(err instanceof Error ? err.message : "Toplu odeme silme basarisiz");
    } finally {
      setLoading(false);
    }
  }

  function startEditApartment(apartment: ApartmentOption): void {
    navigate(`/admin/apartments/edit?ids=${apartment.id}`);
  }

  function resetApartmentCreateMode(notify = false): void {
    setEditingApartmentId(null);
    setEditingApartmentIds([]);
    setApartmentForm({
      blockName: blockOptions[0]?.name ?? "",
      doorNo: "",
      type: "BUYUK",
      apartmentClassId: apartmentClassOptions.find((x) => x.isActive)?.id ?? apartmentClassOptions[0]?.id ?? "",
      apartmentDutyId: apartmentDutyOptions.find((x) => x.isActive)?.id ?? apartmentDutyOptions[0]?.id ?? "",
      hasAidat: true,
      hasDogalgaz: true,
      hasOtherDues: true,
      hasIncome: true,
      hasExpenses: true,
      ownerFullName: "",
      occupancyType: "OWNER",
      email1: "",
      email2: "",
      email3: "",
      phone1: "",
      phone2: "",
      phone3: "",
      landlordFullName: "",
      landlordPhone: "",
      landlordEmail: "",
    });
    if (notify) {
      setMessage("Duzenleme iptal edildi");
    }
  }

  function cancelEditApartment(): void {
    resetApartmentCreateMode(true);
  }

  async function deleteApartment(apartment: ApartmentOption): Promise<void> {
    const accepted = window.confirm(
      `${apartment.blockName} ${apartment.doorNo} dairesini silmek istiyor musun?`
    );
    if (!accepted) {
      return;
    }

    setLoading(true);
    try {
      await authorizedRequest<void>(`/api/admin/apartments/${apartment.id}`, { method: "DELETE" });
      await fetchApartmentOptions();
      await fetchBlockOptions();
      await fetchApartmentClassOptions();
      if (activeApartmentId === apartment.id) {
        setActiveApartmentId("");
        setStatement([]);
      }
      if (editingApartmentId === apartment.id) {
        cancelEditApartment();
      }
      if (editingApartmentIds.includes(apartment.id)) {
        const nextSelection = editingApartmentIds.filter((id) => id !== apartment.id);
        setEditingApartmentIds(nextSelection);
        if (nextSelection.length === 0) {
          setEditingApartmentId(null);
        }
      }
      setMessage("Daire silindi");
    } catch (err) {
      console.error(err);
      setMessage(err instanceof Error ? err.message : "Daire silinemedi");
    } finally {
      setLoading(false);
    }
  }

  /* eslint-disable react-hooks/exhaustive-deps */
  useEffect(() => {
    void fetchApartmentOptions();
    void fetchBlockOptions();
    void fetchApartmentClassOptions();
    void fetchApartmentTypeOptions();
    void fetchApartmentDutyOptions();
    void fetchChargeTypeOptions();
    void fetchExpenseItemOptions();
    void fetchPaymentMethodOptions();
    void fetchWelcomeBuildingProfile();
    void checkApiConnection();
  }, []);
  /* eslint-enable react-hooks/exhaustive-deps */

  useEffect(() => {
    const timer = window.setInterval(() => {
      void checkApiConnection();
    }, 60000);

    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => {
    const path = location.pathname;

    if (path === "/admin/reports") {
      void fetchReportsSummary({ silent: true });
      if (bankTermDepositRows.length === 0) {
        void fetchBankTermDeposits({ silent: true });
      }
      void fetchStaffOpenAidatLatestUploads({ silent: true });
      return;
    }

    if (path === "/admin/reports/bank-statement") {
      // Manual-run page: user triggers with button.
      return;
    }

    if (path === "/admin/reports/monthly-balance-matrix") {
      // Manual-run page: user triggers with button.
      return;
    }

    if (path === "/admin/reports/reference-search") {
      return;
    }

    if (path === "/admin/reports/fractional-closures") {
      // Manual-run page: user triggers with button.
      return;
    }

    if (path === "/admin/reports/manual-review-matches") {
      // Manual-run page: user triggers with button.
      return;
    }

    if (path === "/admin/reports/staff-open-aidat") {
      if (staffOpenAidatLatestUploadRows.length === 0) {
        void fetchStaffOpenAidatLatestUploads({ silent: true });
      }
      return;
    }

    if (path === "/admin/banks/term-deposits") {
      if (bankOptions.length === 0) {
        void fetchBankOptions();
      }
      void fetchBankTermDeposits({ silent: true });
      return;
    }

    if (path === "/admin/banks/statement-view") {
      const initialFilter = getCurrentMonthDateRange();
      setBankStatementViewFilter(initialFilter);
      void fetchBankStatementViewRows(initialFilter, { silent: true });
      return;
    }

    if (path === "/admin/initial-balances") {
      void (async () => {
        const banks = await fetchBankOptions();
        await fetchInitialBalanceDefaults({ banks });
      })();
      return;
    }

    // Payment list, expense report, and upload batches are manual-run pages.

    if (path === "/admin/upload-batches") {
      if (uploadBatchUploaders.length === 0) {
        void fetchUploadBatchUploaders();
      }
      return;
    }

    // Statement pages, apartment list, and bulk correction list are manual-run.

    if (path === "/admin/charges/bulk-correct/edit") {
      const criteria = getBulkCorrectDetailCriteriaFromSearch(location.search);
      if (criteria) {
        void fetchDistributedInvoiceDetailRows(criteria);
      } else {
        setDistributedInvoiceDetailRows([]);
      }
      return;
    }

    if (path === "/admin/corrections" || path === "/admin/manual-closures") {
      if (correctionApartmentId) {
        void loadCorrections(correctionApartmentId, false);
      }
      return;
    }

    if (path === "/admin/reconcile/door-mismatch-report") {
      void fetchDoorMismatchReport({ silent: true });
      return;
    }

    // Audit logs are also manual-run.

    if (path === "/admin/blocks") {
      if (blockOptions.length === 0) {
        void fetchBlockOptions();
      }
      return;
    }

    if (path === "/admin/apartment-classes") {
      if (apartmentClassOptions.length === 0) {
        void fetchApartmentClassOptions();
      }
      return;
    }

    if (path === "/admin/apartment-types") {
      if (apartmentTypeOptions.length === 0) {
        void fetchApartmentTypeOptions();
      }
      return;
    }

    if (path === "/admin/apartment-duties") {
      if (apartmentDutyOptions.length === 0) {
        void fetchApartmentDutyOptions();
      }
      return;
    }

    if (path === "/admin/banks") {
      if (bankOptions.length === 0) {
        void fetchBankOptions();
      }
      return;
    }

    if (path === "/admin/charge-types") {
      if (chargeTypeOptions.length === 0) {
        void fetchChargeTypeOptions();
      }
      return;
    }

    if (path === "/admin/payment-methods") {
      if (paymentMethodOptions.length === 0) {
        void fetchPaymentMethodOptions();
      }
      return;
    }

    if (path === "/admin/expense-items") {
      if (expenseItemOptions.length === 0) {
        void fetchExpenseItemOptions();
      }
      return;
    }

    if (path === "/admin/description-door-rules") {
      if (descriptionDoorRules.length === 0) {
        void fetchDescriptionDoorRules();
      }
      return;
    }

    if (path === "/admin/description-expense-rules") {
      if (descriptionExpenseRules.length === 0) {
        void fetchDescriptionExpenseRules();
      }
    }
  }, [
    activeApartmentId,
    apartmentClassOptions.length,
    apartmentDutyOptions.length,
    apartmentTypeOptions.length,
    bankOptions.length,
    blockOptions.length,
    chargeTypeOptions.length,
    correctionApartmentId,
    descriptionDoorRules.length,
    descriptionExpenseRules.length,
    expenseItemOptions.length,
    location.pathname,
    location.search,
    paymentMethodOptions.length,
    staffOpenAidatLatestUploadRows.length,
    uploadBatchUploaders.length,
  ]);

  useEffect(() => {
    const root = adminSubnavRef.current;
    if (!root) {
      return;
    }

    const detailsElements = Array.from(
      root.querySelectorAll<HTMLDetailsElement>(".admin-subnav-dropdown")
    );

    const onToggle = (event: Event) => {
      const current = event.currentTarget as HTMLDetailsElement;
      if (!current.open) {
        return;
      }

      for (const details of detailsElements) {
        if (details !== current) {
          details.open = false;
        }
      }
    };

    for (const details of detailsElements) {
      details.addEventListener("toggle", onToggle);
    }

    return () => {
      for (const details of detailsElements) {
        details.removeEventListener("toggle", onToggle);
      }
    };
  }, []);

  useEffect(() => {
    const onDocumentClick = (event: MouseEvent) => {
      const target = event.target;
      if (!(target instanceof Node)) {
        return;
      }

      const root = adminSubnavRef.current;
      if (!root) {
        return;
      }

      if (root.contains(target)) {
        return;
      }

      closeAdminSubnavMenus();
    };

    document.addEventListener("click", onDocumentClick);
    return () => {
      document.removeEventListener("click", onDocumentClick);
    };
  }, []);

  useEffect(() => {
    closeAdminSubnavMenus();
  }, [location.pathname, location.search]);

  useEffect(() => {
    if (!expenseReportAutoRefreshEnabled) {
      return;
    }

    if (location.pathname !== "/admin/expenses/report") {
      return;
    }

    if (skipNextExpenseReportAutoRefreshRef.current) {
      skipNextExpenseReportAutoRefreshRef.current = false;
      return;
    }

    void fetchExpenseReport(expenseReportFilter, { silent: true });
  }, [
    expenseReportAutoRefreshEnabled,
    expenseReportFilter.from,
    expenseReportFilter.to,
    expenseReportFilter.sources,
    expenseReportFilter.expenseItemIds,
    expenseReportFilter.description,
    location.pathname,
  ]);

  useEffect(() => {
    if (location.pathname !== "/admin/unclassified") {
      return;
    }

    void loadUnclassifiedRows({ silent: true });
  }, [location.pathname]);

  function getFractionalClosureSourceStatus(row: FractionalClosureReportRow): string {
    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth() + 1;
    const currentPeriodKey = currentYear * 100 + currentMonth;
    const rowPeriodKey = row.periodYear * 100 + row.periodMonth;

    if (rowPeriodKey <= currentPeriodKey) {
      if (row.lastPaymentAt) {
        const lastPaymentDate = new Date(row.lastPaymentAt);
        const lastPaymentKey = lastPaymentDate.getUTCFullYear() * 100 + (lastPaymentDate.getUTCMonth() + 1);
        if (lastPaymentKey < rowPeriodKey) {
          return "Fazla Odeme";
        }
      }
      return "Eksik Odeme";
    }

    return "Fazla Odeme";
  }

  const normalizedToastForState = normalizeToastText(toastMessage);
  const toastIsError =
    normalizedToastForState.includes("kaydedilemedi") ||
    normalizedToastForState.includes("basarisiz") ||
    normalizedToastForState.includes("gonderilmedi");

  const reportLoadingOverlayVisible =
    loading ||
    reportsSummaryLoading ||
    bankReconciliationLoading ||
    overduePaymentsLoading ||
    staffOpenAidatLoading ||
    chargeConsistencyLoading ||
    manualReviewMatchesLoading ||
    fractionalClosureLoading ||
    doorMismatchLoading ||
    bankTermDepositLoading ||
    distributedInvoiceDetailLoading ||
    unclassifiedPageLoading ||
    apartmentBalanceMatrixLoading ||
    referenceSearchLoading;

  return (
    <section className="dashboard">
      {toastMessage && (
        <div className="blocking-modal toast-modal" role="status" aria-live="polite" aria-busy="false">
          <div className={`blocking-modal-card save-notice-modal-card${toastIsError ? " save-notice-modal-card-error" : ""}`}>
            <div className="save-notice-icon" aria-hidden="true">
              {toastIsError ? "!" : "✓"}
            </div>
            <h3>{toastIsError ? "Islem Basarisiz" : "Islem Tamamlandi"}</h3>
            <p className="small">{toastMessage}</p>
          </div>
        </div>
      )}
      {!apiConnectionOk && (
        <div className="status-bar status-bar-error">API baglantisi yok. Backend calismiyor olabilir (localhost:3000).</div>
      )}
      {deletingUploadBatchId && (
        <div className="blocking-modal" role="status" aria-live="polite" aria-busy="true">
          <div className="blocking-modal-card">
            <h3>Silme Islemi Devam Ediyor</h3>
            <p className="small">
              {deletingUploadBatchFileName ? `"${deletingUploadBatchFileName}"` : "Secilen yukleme"} siliniyor.
            </p>
            <p className="small">Islem bitince otomatik olarak "Silme tamamlandi" bildirimi gosterilecek.</p>
          </div>
        </div>
      )}
      {!deletingUploadBatchId && reportLoadingOverlayVisible && (
        <div className="blocking-modal" role="status" aria-live="polite" aria-busy="true">
          <div className="blocking-modal-card report-loading-modal-card">
            <div className="report-loading-hourglass" aria-hidden="true">
              ⌛
            </div>
            <h3>Islem Devam Ediyor</h3>
            <p className="small">Lutfen bekleyin.</p>
          </div>
        </div>
      )}

      <div className="card admin-subnav" ref={adminSubnavRef}>
        <details className="admin-subnav-group admin-subnav-dropdown">
          <summary className="admin-subnav-title">
            <span className="admin-subnav-icon" aria-hidden="true">🏠</span>
            <span className="admin-subnav-label">Daire</span>
          </summary>
          <div className="admin-subnav-links" onClick={closeAdminSubnavMenus}>
            <NavLink
              className="btn btn-ghost"
              to="/admin/apartments/new"
              onClick={() => resetApartmentCreateMode(false)}
            >
              Daire Ekle
            </NavLink>
            <NavLink className="btn btn-ghost" to="/admin/apartments/list">
              Daire Listesi
            </NavLink>
            <NavLink className="btn btn-ghost" to="/admin/apartments/edit">
              Daire Degistir
            </NavLink>
            <NavLink className="btn btn-ghost" to="/admin/apartments/passwords">
              Daire Sifre Degistir
            </NavLink>
            <NavLink className="btn btn-ghost" to="/admin/apartments/upload">
              Daire Excel Yukle
            </NavLink>
            <NavLink className="btn btn-ghost" to="/admin/apartments/bulk-update">
              Daire Toplu Duzenle
            </NavLink>
            <NavLink className="btn btn-ghost" to="/admin/apartments/history">
              Daire Degisiklik Gecmisi
            </NavLink>
            <NavLink className="btn btn-ghost" to="/admin/building-info">
              Bina Bilgileri
            </NavLink>
            <NavLink className="btn btn-ghost" to="/admin/blocks">
              Blok Ekle
            </NavLink>
            <NavLink className="btn btn-ghost" to="/admin/apartment-classes">
              Daire Siniflari
            </NavLink>
            <NavLink className="btn btn-ghost" to="/admin/apartment-types">
              Daire Tipleri
            </NavLink>
            <NavLink className="btn btn-ghost" to="/admin/apartment-duties">
              Daire Gorevleri
            </NavLink>
          </div>
        </details>

        <details className="admin-subnav-group admin-subnav-dropdown">
          <summary className="admin-subnav-title">
            <span className="admin-subnav-icon" aria-hidden="true">🧾</span>
            <span className="admin-subnav-label">Tahakkuk</span>
          </summary>
          <div className="admin-subnav-links" onClick={closeAdminSubnavMenus}>
            <NavLink className="btn btn-ghost" to="/admin/charge-types">
              Tahakkuk Tipleri
            </NavLink>
            <NavLink className="btn btn-ghost" to="/admin/charges/new">
              Tahakkuk Girisi
            </NavLink>
            <NavLink className="btn btn-ghost" to="/admin/charges/bulk">
              Toplu Tahakkuk
            </NavLink>
            <NavLink className="btn btn-ghost" to="/admin/charges/bulk-correct">
              Toplu Tahakkuk Silme ve Duzeltme
            </NavLink>
            <NavLink className="btn btn-ghost" to="/admin/charges/gas-calculator">
              Gider Dagitimi
            </NavLink>
          </div>
        </details>

        <details className="admin-subnav-group admin-subnav-dropdown">
          <summary className="admin-subnav-title">
            <span className="admin-subnav-icon" aria-hidden="true">💳</span>
            <span className="admin-subnav-label">Tahsilat</span>
          </summary>
          <div className="admin-subnav-links" onClick={closeAdminSubnavMenus}>
            <NavLink className="btn btn-ghost" to="/admin/payment-methods">
              Tahsilat Tipleri
            </NavLink>
            <NavLink className="btn btn-ghost" to="/admin/payments/new">
              Tahsilat Gir
            </NavLink>
            <NavLink className="btn btn-ghost" to="/admin/payments/list">
              Tahsilat Raporu
            </NavLink>
          </div>
        </details>

        <details className="admin-subnav-group admin-subnav-dropdown">
          <summary className="admin-subnav-title">
            <span className="admin-subnav-icon" aria-hidden="true">📄</span>
            <span className="admin-subnav-label">Ekstre</span>
          </summary>
          <div className="admin-subnav-links" onClick={closeAdminSubnavMenus}>
            <NavLink className="btn btn-ghost" to="/admin/statement">
              Ekstre
            </NavLink>
            <NavLink className="btn btn-ghost" to="/admin/statement/all">
              Toplu Ekstre
            </NavLink>
          </div>
        </details>

        <details className="admin-subnav-group admin-subnav-dropdown">
          <summary className="admin-subnav-title">
            <span className="admin-subnav-icon" aria-hidden="true">💸</span>
            <span className="admin-subnav-label">Gider</span>
          </summary>
          <div className="admin-subnav-links" onClick={closeAdminSubnavMenus}>
            <NavLink className="btn btn-ghost" to="/admin/expense-items">
              Gider Kalemleri
            </NavLink>
            <NavLink className="btn btn-ghost" to="/admin/expenses/new">
              Gider Giris
            </NavLink>
            <NavLink className="btn btn-ghost" to="/admin/expenses/report">
              Gider Raporu
            </NavLink>
          </div>
        </details>

        <details className="admin-subnav-group admin-subnav-dropdown">
          <summary className="admin-subnav-title">
            <span className="admin-subnav-icon" aria-hidden="true">📊</span>
            <span className="admin-subnav-label">Raporlar</span>
          </summary>
          <div className="admin-subnav-links" onClick={closeAdminSubnavMenus}>
            <NavLink className="btn btn-ghost" to="/admin/reports">
              Rapor Ana Sayfa
            </NavLink>
            <NavLink className="btn btn-ghost" to="/admin/expenses/report">
              Gider Raporu
            </NavLink>
            <NavLink className="btn btn-ghost" to="/admin/payments/list">
              Tahsilat Raporu
            </NavLink>
            <NavLink className="btn btn-ghost" to="/admin/reports/apartments/list">
              Daire Listesi
            </NavLink>
            <NavLink className="btn btn-ghost" to="/admin/reports/overdue-payments">
              Gecikmis Odemeler
            </NavLink>
            <NavLink className="btn btn-ghost" to="/admin/reports/staff-open-aidat">
              Gorevli Mobil Acik Aidat
            </NavLink>
            <NavLink className="btn btn-ghost" to="/admin/reports/monthly-balance-matrix">
              Aylik Bakiye Matrisi
            </NavLink>
            <NavLink className="btn btn-ghost" to="/admin/reports/monthly-ledger-print">
              Gelir-Gider Defteri Print
            </NavLink>
            <NavLink className="btn btn-ghost" to="/admin/reports/fractional-closures">
              Kismi Kapama Raporu
            </NavLink>
            <NavLink className="btn btn-ghost" to="/admin/reports/reference-search">
              Referans Ile Hareket Ara
            </NavLink>
            <NavLink className="btn btn-ghost" to="/admin/reports/bank-movements">
              Banka Hareketleri
            </NavLink>
          </div>
        </details>

        <details className="admin-subnav-group admin-subnav-dropdown">
          <summary className="admin-subnav-title">
            <span className="admin-subnav-icon" aria-hidden="true">🏦</span>
            <span className="admin-subnav-label">Bankalar</span>
          </summary>
          <div className="admin-subnav-links" onClick={closeAdminSubnavMenus}>
            <NavLink className="btn btn-ghost" to="/admin/banks">
              Banka ve Sube Tanimlari
            </NavLink>
            <NavLink className="btn btn-ghost" to="/admin/initial-balances">
              Banka Acilis Bakiyesi
            </NavLink>
            <NavLink className="btn btn-ghost" to="/admin/banks/term-deposits">
              Vadeli Mevduatlar
            </NavLink>
            <NavLink className="btn btn-ghost" to="/admin/bank-statement">
              Banka Ekstresi Yukle (Excel)
            </NavLink>
            <NavLink className="btn btn-ghost" to="/admin/banks/statement-view">
              Banka Hareketleri
            </NavLink>
            <NavLink className="btn btn-ghost" to="/admin/upload-batches">
              Yukleme Kayitlari
            </NavLink>
          </div>
        </details>

        <details className="admin-subnav-group admin-subnav-dropdown">
          <summary className="admin-subnav-title">
            <span className="admin-subnav-icon" aria-hidden="true">✅</span>
            <span className="admin-subnav-label">Kontrol</span>
          </summary>
          <div className="admin-subnav-links" onClick={closeAdminSubnavMenus}>
            <NavLink className="btn btn-ghost" to="/admin/reports/charge-consistency">
              Tahakkuk Kontrol
            </NavLink>
            <NavLink className="btn btn-ghost" to="/admin/reconcile/door-mismatch-report">
              Banka Eslestirme Kontrolu
            </NavLink>
            <NavLink className="btn btn-ghost" to="/admin/reports/bank-statement">
              Banka Ekstresi Karsilastirma
            </NavLink>
            <NavLink className="btn btn-ghost" to="/admin/reports/manual-review-matches">
              Manuel Inceleme Gerektiren Eslesmeler
            </NavLink>
          </div>
        </details>

        <details className="admin-subnav-group admin-subnav-dropdown">
          <summary className="admin-subnav-title">
            <span className="admin-subnav-icon" aria-hidden="true">🛠️</span>
            <span className="admin-subnav-label">Sistem ve Duzeltme</span>
          </summary>
          <div className="admin-subnav-links" onClick={closeAdminSubnavMenus}>
            <NavLink className="btn btn-ghost" to="/admin/description-door-rules">
              Aciklama-Daire Esleme
            </NavLink>
            <NavLink className="btn btn-ghost" to="/admin/description-expense-rules">
              Aciklama-Gider Esleme
            </NavLink>
            <NavLink className="btn btn-ghost" to="/admin/resident-content">
              Duyurular ve Anketler
            </NavLink>
            <NavLink className="btn btn-ghost" to="/admin/corrections">
              Duzeltmeler
            </NavLink>
            <NavLink className="btn btn-ghost" to="/admin/unclassified">
              Siniflandirilamayanlar
            </NavLink>
            <NavLink className="btn btn-ghost" to="/admin/manual-closures">
              Manuel Kapama Yonetimi
            </NavLink>
            <NavLink className="btn btn-ghost" to="/admin/audit-logs">
              Islem Gecmisi
            </NavLink>
          </div>
        </details>

        <details className="admin-subnav-group admin-subnav-dropdown">
          <summary className="admin-subnav-title">
            <span className="admin-subnav-icon" aria-hidden="true">🗂️</span>
            <span className="admin-subnav-label">Toplanti</span>
          </summary>
          <div className="admin-subnav-links" onClick={closeAdminSubnavMenus}>
            <NavLink className="btn btn-ghost" to="/admin/meeting">
              Toplanti Hazirlik ve Tutanaklar
            </NavLink>
          </div>
        </details>

      </div>

      <Routes>
        <Route path="/" element={<Navigate to="/admin/reports" replace />} />
        <Route
          path="/reports"
          element={
            <section className="dashboard report-page reports-home">
              <div className="card table-card report-page-card">
                <div className="section-head report-toolbar">
                  <h3>Rapor Ana Sayfa</h3>
                  <span className="small">
                    <strong>
                      Bu rapor {reportsSummary ? formatDateTimeTr(reportsSummary.snapshotAt) : "-"} tarihi itibari ile hazirlanmistir.
                    </strong>
                  </span>
                </div>

                {!reportsSummary && (
                  <p className="small">Rapor kartlari yukleniyor...</p>
                )}

                {reportsSummary && (
                  <>
                    <div className="stats-grid reports-home-stats-grid compact-row-top-gap">
                      <article
                        className={`card stat ${
                          reportsSummary.bankBalance.estimatedBalance < 0
                            ? "stat-tone-danger"
                            : reportsSummary.bankBalance.estimatedBalance < 50000
                              ? "stat-tone-warn"
                              : "stat-tone-good"
                        } stat-clickable`}
                        onClick={() => navigate("/admin/reports/bank-statement")}
                        role="button"
                        tabIndex={0}
                        onKeyDown={(event) => {
                          if (event.key === "Enter" || event.key === " ") {
                            event.preventDefault();
                            navigate("/admin/reports/bank-statement");
                          }
                        }}
                      >
                        <h4>Banka Bakiyesi</h4>
                        <p>{formatTry(reportsSummary.bankBalance.estimatedBalance)}</p>
                        <span className="small">
                          Son hareket: {reportsSummary.bankBalance.latestMovementAt ? formatDateTr(reportsSummary.bankBalance.latestMovementAt) : "-"}
                        </span>
                      </article>
                      <article
                        className={`card stat ${
                          reportsSummary.receivables.overdueRemainingTotal > 0 ? "stat-tone-danger" : "stat-tone-good"
                        } stat-clickable`}
                        onClick={() => navigate("/admin/reports/overdue-payments")}
                        role="button"
                        tabIndex={0}
                        onKeyDown={(event) => {
                          if (event.key === "Enter" || event.key === " ") {
                            event.preventDefault();
                            navigate("/admin/reports/overdue-payments");
                          }
                        }}
                      >
                        <h4>Gecikmis Odemeler</h4>
                        <p>{formatTry(reportsSummary.receivables.overdueRemainingTotal)}</p>
                        <span className="small">
                          {reportsSummary.receivables.overdueChargeCount} borc / {reportsSummary.receivables.overdueApartmentCount} daire
                        </span>
                      </article>
                      <article
                        className="card stat stat-tone-info stat-clickable"
                        onClick={() => navigate("/admin/reports/monthly-balance-matrix")}
                        role="button"
                        tabIndex={0}
                        onKeyDown={(event) => {
                          if (event.key === "Enter" || event.key === " ") {
                            event.preventDefault();
                            navigate("/admin/reports/monthly-balance-matrix");
                          }
                        }}
                      >
                        <h4>Aylik Bakiye Matrisi</h4>
                        <p>{new Date().getFullYear()}</p>
                        <span className="small">Daire bazli ay sonu borc bakiyeleri</span>
                      </article>
                      <article
                        className="card stat stat-tone-good stat-clickable"
                        onClick={() => navigate("/admin/banks/term-deposits")}
                        role="button"
                        tabIndex={0}
                        onKeyDown={(event) => {
                          if (event.key === "Enter" || event.key === " ") {
                            event.preventDefault();
                            navigate("/admin/banks/term-deposits");
                          }
                        }}
                      >
                        <h4>Vadeli Mevduat</h4>
                        <p>{formatTry(bankTermDepositPrincipalTotal)}</p>
                        <span className="small">Ana para toplam | Aktif kayit: {activeBankTermDepositCount}</span>
                      </article>
                      <article className="card stat stat-tone-warn">
                        <h4>Ayin 5'ine Kadar Tahsilat</h4>
                        <p>{formatTry(reportsSummary.receivables.monthEndUpcomingTotal)}</p>
                        <span className="small">Bugunden bir sonraki ayin 5. gunune kadar beklenen tahsilat</span>
                      </article>
                      <article
                        className="card stat stat-tone-danger stat-clickable"
                        onClick={() => navigate("/admin/expenses/report")}
                        role="button"
                        tabIndex={0}
                        onKeyDown={(event) => {
                          if (event.key === "Enter" || event.key === " ") {
                            event.preventDefault();
                            navigate("/admin/expenses/report");
                          }
                        }}
                      >
                        <h4>Toplam Giderler</h4>
                        <p>{formatTry(reportsSummary.collectionsAndExpenses.totalExpenses)}</p>
                        <span className="small">Rapor tarihine kadar kaydedilen toplam gider</span>
                      </article>
                    </div>

                    <div className="reports-home-focus-grid compact-row-top-gap">
                      <article className="card table-card reports-home-panel">
                        <div className="section-head reports-home-panel-head">
                          <h3>En Yuksek 10 Gider Kalemi</h3>
                          <span className="small">Gider Raporuna tikla ac</span>
                        </div>
                        <div className="table-wrap compact-row-top-gap">
                          <table className="apartment-list-table report-compact-table reports-home-table">
                            <thead>
                              <tr>
                                <th>Gider Kalemi</th>
                                <th>Son Gider Tarihi</th>
                                <th className="col-num">Islem Adedi</th>
                                <th className="col-num">Toplam Tutar</th>
                              </tr>
                            </thead>
                            <tbody>
                              {reportsSummary.topExpenses.length > 0 ? (
                                reportsSummary.topExpenses.map((row) => (
                                  <tr
                                    key={row.id}
                                    className="report-row-clickable"
                                    onClick={() => void openExpenseReportForItem(row.id)}
                                    role="button"
                                    tabIndex={0}
                                    onKeyDown={(event) => {
                                      if (event.key === "Enter" || event.key === " ") {
                                        event.preventDefault();
                                        void openExpenseReportForItem(row.id);
                                      }
                                    }}
                                    title="Bu gider kaleminin detayini Gider Raporu ekraninda ac"
                                  >
                                    <td>{row.expenseItemName}</td>
                                    <td>{row.latestSpentAt ? formatDateTr(row.latestSpentAt) : "-"}</td>
                                    <td className="col-num">{row.expenseCount}</td>
                                    <td className="col-num">{formatTry(row.totalAmount)}</td>
                                  </tr>
                                ))
                              ) : (
                                <tr>
                                  <td colSpan={4} className="empty">
                                    Gider kaydi bulunmuyor
                                  </td>
                                </tr>
                              )}
                            </tbody>
                          </table>
                        </div>
                      </article>

                      <article className="card table-card reports-home-panel">
                        <div className="section-head reports-home-panel-head">
                          <h3>Gecikenlerde Ilk 10 Daire</h3>
                          <span className="small">Ekstre ekranina tikla ac</span>
                        </div>
                        <div className="table-wrap compact-row-top-gap">
                          <table className="apartment-list-table report-compact-table reports-home-table">
                            <thead>
                              <tr>
                                <th>Daire</th>
                                <th className="col-num">Geciken Borc Adedi</th>
                                <th className="col-num">Toplam Geciken</th>
                              </tr>
                            </thead>
                            <tbody>
                              {reportsSummary.topOverdueApartments.length > 0 ? (
                                reportsSummary.topOverdueApartments.map((row) => (
                                  <tr
                                    key={row.apartmentId}
                                    className="report-row-clickable"
                                    onClick={() => void openStatementForApartment(row.apartmentId)}
                                    role="button"
                                    tabIndex={0}
                                    onKeyDown={(event) => {
                                      if (event.key === "Enter" || event.key === " ") {
                                        event.preventDefault();
                                        void openStatementForApartment(row.apartmentId);
                                      }
                                    }}
                                    title="Bu dairenin ekstresini ac"
                                  >
                                    <td>{row.apartmentLabel}</td>
                                    <td className="col-num">{row.overdueChargeCount}</td>
                                    <td className="col-num">{formatTry(row.remainingTotal)}</td>
                                  </tr>
                                ))
                              ) : (
                                <tr>
                                  <td colSpan={3} className="empty">
                                    Geciken daire kaydi bulunmuyor
                                  </td>
                                </tr>
                              )}
                            </tbody>
                            <tfoot>
                              <tr className="report-summary-total-row">
                                <td>
                                  <b>Toplam Geciken</b>
                                </td>
                                <td className="col-num">-</td>
                                <td className="col-num">
                                  <b>{formatTry(reportsSummary.receivables.overdueRemainingTotal)}</b>
                                </td>
                              </tr>
                            </tfoot>
                          </table>
                        </div>
                      </article>
                    </div>

                    <div className="reports-home-bottom-grid compact-row-top-gap">
                      <article className="card apartment-overview-card reports-home-overview-card">
                        <div className="section-head reports-home-panel-head">
                          <h3>Apartman Genel Durum</h3>
                          <span className="small">Muafiyetler ve gorev dagilimi</span>
                        </div>
                        <div className="apartment-overview-grid">
                          <span>Toplam Daire Sayisi</span>
                          <b>{reportsSummary.apartmentOverview.totalApartmentCount}</b>

                          <span>Daire Tipi Dagilimi</span>
                          <b>
                            {`${reportsSummary.apartmentOverview.kucukApartmentCount}-Kucuk Daire | ${reportsSummary.apartmentOverview.buyukApartmentCount}-Buyuk Daire`}
                          </b>

                          <span>Daire Sinif Dagilimi</span>
                          <b>
                            {reportsSummary.apartmentOverview.apartmentClassBreakdown.length > 0
                              ? reportsSummary.apartmentOverview.apartmentClassBreakdown
                                  .map((item) => `${item.count}-${item.className}`)
                                  .join(" | ")
                              : `${reportsSummary.apartmentOverview.apartmentClassCount}-Sinifsiz`}
                          </b>

                          <span>Ev Sahibi</span>
                          <b>{reportsSummary.apartmentOverview.ownerCount}</b>

                          <span>Kiraci</span>
                          <b>{reportsSummary.apartmentOverview.tenantCount}</b>

                          <span>Yoneticiler</span>
                          <div className="apartment-overview-list">
                            {reportsSummary.apartmentOverview.managers.length > 0
                              ? reportsSummary.apartmentOverview.managers.map((manager) => (
                                  <span key={manager}>{manager}</span>
                                ))
                              : "-"}
                          </div>

                          <span>Apartman Gorevlileri</span>
                          <div className="apartment-overview-list">
                            {reportsSummary.apartmentOverview.dutyAssignments.length > 0
                              ? reportsSummary.apartmentOverview.dutyAssignments.map((item, idx) => (
                                  <span key={`${item.dutyName}-${item.apartment}-${idx}`}>{`${item.dutyName}: ${item.apartment}`}</span>
                                ))
                              : "-"}
                          </div>
                        </div>
                      </article>

                      <article className="card table-card reports-home-panel reports-home-banklog-card">
                        <div className="section-head reports-home-panel-head">
                          <h3>Son 10 Banka Kaydi</h3>
                          <span className="small">Tarih, tutar ve aciklama</span>
                        </div>
                        <div className="reports-home-banklog-list compact-row-top-gap">
                          {sortedLatestBankMovements.length > 0 ? (
                            sortedLatestBankMovements.map((row) => (
                                <div
                                  key={row.id}
                                  className="reports-home-banklog-item reports-home-banklog-item-clickable"
                                  title={`${row.movementType === "PAYMENT" ? "Tahsilat" : "Gider"} - ${row.description}`}
                                  role="button"
                                  tabIndex={0}
                                  onClick={() => void openReportForLatestBankMovement(row)}
                                  onKeyDown={(event) => {
                                    if (event.key === "Enter" || event.key === " ") {
                                      event.preventDefault();
                                      void openReportForLatestBankMovement(row);
                                    }
                                  }}
                                >
                                  <span className="reports-home-banklog-date">{formatDateTr(row.occurredAt)}</span>
                                  <span className="reports-home-banklog-amount">{formatTry(row.amount)}</span>
                                  <span className="reports-home-banklog-desc">{row.description}</span>
                                </div>
                              ))
                          ) : (
                            <p className="small reports-home-banklog-empty">Banka hareketi bulunmuyor</p>
                          )}
                        </div>
                      </article>
                    </div>

                    <div className="card table-card compact-row-top-gap staff-open-aidat-upload-card">
                      <div className="section-head">
                        <h4>Son 10 Yukleme Kaydi</h4>
                      </div>
                      {staffOpenAidatLatestUploadRows.length === 0 ? (
                        <p className="small">Yukleme kaydi bulunmuyor.</p>
                      ) : (
                        <div className="table-wrap staff-open-aidat-upload-table-wrap">
                          <table className="apartment-list-table staff-open-aidat-upload-table">
                            <thead>
                              <tr>
                                <th>Yukleme Zamani</th>
                                <th>Yukleyen</th>
                                <th>Yukleme Tipi</th>
                                <th>Dosya</th>
                                <th className="col-num">Toplam Satir</th>
                                <th className="col-num">Tahsilat</th>
                                <th className="col-num">Gider</th>
                                <th className="col-num">Atlanan</th>
                              </tr>
                            </thead>
                            <tbody>
                              {staffOpenAidatLatestUploadRows.map((row) => (
                                <tr key={row.id}>
                                  <td>{formatDateTimeTr(row.uploadedAt)}</td>
                                  <td>{row.uploadedByName ?? row.uploadedByEmail ?? (row.kind === "GMAIL_AUTO" ? "Otomatik (Gmail)" : "-")}</td>
                                  <td>{row.kind === "BANK" ? "Banka" : row.kind === "PAYMENT" ? "Tahsilat" : row.kind === "EXPENSE" ? "Gider" : row.kind === "GMAIL_AUTO" ? "Otomatik" : row.kind}</td>
                                  <td>{row.fileName}</td>
                                  <td className="col-num">{row.totalRows}</td>
                                  <td className="col-num">{row.createdPaymentCount}</td>
                                  <td className="col-num">{row.createdExpenseCount}</td>
                                  <td className="col-num">{row.skippedCount}</td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      )}
                    </div>

                  </>
                )}
              </div>
            </section>
          }
        />
        <Route
          path="/reports/bank-statement"
          element={
            <section className="dashboard report-page">
              <div className="card table-card report-page-card">
                <div className="section-head report-toolbar">
                  <h3>Banka Ekstresi Karsilastirma</h3>
                </div>

                <p className="small">
                  Bu ekran, bankadan aldiginiz ekstre satirlari ile sistemde kayitli banka hareketlerini karsilastirmaniza yardimci olur.
                </p>

                <div className="upload-batch-filter-row compact-row-top-gap report-filter-grid">
                  <label>
                    Baslangic
                    <input
                      type="date"
                      value={bankReconciliationFilter.from}
                      onChange={(e) => setBankReconciliationFilter((prev) => ({ ...prev, from: e.target.value }))}
                    />
                  </label>
                  <label>
                    Bitis
                    <input
                      type="date"
                      value={bankReconciliationFilter.to}
                      onChange={(e) => setBankReconciliationFilter((prev) => ({ ...prev, to: e.target.value }))}
                    />
                  </label>
                </div>

                <form className="admin-form compact-row-top-gap" onSubmit={onImportBankStatement}>
                  <label>
                    Banka Ekstresi Dosyasi
                    <input
                      key={bankStatementFileInputKey}
                      type="file"
                      accept=".xlsx"
                      onChange={(e) => setBankStatementFile(e.target.files?.[0] ?? null)}
                      required
                    />
                  </label>
                  <div className="admin-row">
                    <button className="btn btn-ghost" type="submit" disabled={loading || !bankStatementFile}>
                      Ekstreyi Yukle ve Karsilastir
                    </button>
                  </div>
                </form>

                <div className="stats-grid compact-row-top-gap bank-compare-stats-grid">
                  <article className="card stat stat-tone-info">
                    <h4>Sistem Banka Acilis</h4>
                    <p>{formatTry(bankReconciliationTotals?.openingBalance ?? 0)}</p>
                    <span className="small">
                      Tarih: {bankReconciliationTotals?.openingDate ? formatDateTr(bankReconciliationTotals.openingDate) : "-"}
                    </span>
                  </article>
                  <article className="card stat stat-tone-info">
                    <h4>Sistem Banka Giris</h4>
                    <p>{formatTry(bankReconciliationTotals?.totalIn ?? 0)}</p>
                    <span className="small">Odeme adedi: {bankReconciliationTotals?.paymentCount ?? 0}</span>
                  </article>
                  <article className="card stat stat-tone-warn">
                    <h4>Sistem Banka Cikis</h4>
                    <p>{formatTry(bankReconciliationTotals?.totalOut ?? 0)}</p>
                    <span className="small">Gider adedi: {bankReconciliationTotals?.expenseCount ?? 0}</span>
                  </article>
                  <article className={`card stat ${(bankReconciliationTotals?.net ?? 0) >= 0 ? "stat-tone-good" : "stat-tone-danger"}`}>
                    <h4>Sistem Net</h4>
                    <p>{formatTry(bankReconciliationTotals?.net ?? 0)}</p>
                    <span className="small">Hareket: {bankReconciliationTotals?.movementCount ?? 0}</span>
                  </article>
                  <article className="card stat stat-tone-info">
                    <h4>Ekstre Giris</h4>
                    <p>
                      {formatTry(
                        bankPreviewRows
                          .filter((row) => row.entryType === "PAYMENT")
                          .reduce((sum, row) => sum + Number(row.amount), 0)
                      )}
                    </p>
                    <span className="small">Ekstre satiri: {bankPreviewRows.filter((row) => row.entryType === "PAYMENT").length}</span>
                  </article>
                  <article className="card stat stat-tone-warn">
                    <h4>Ekstre Cikis</h4>
                    <p>
                      {formatTry(
                        bankPreviewRows
                          .filter((row) => row.entryType === "EXPENSE")
                          .reduce((sum, row) => sum + Number(row.amount), 0)
                      )}
                    </p>
                    <span className="small">Ekstre satiri: {bankPreviewRows.filter((row) => row.entryType === "EXPENSE").length}</span>
                  </article>
                  <article
                    className={`card stat ${
                      Math.abs(
                        (bankPreviewRows
                          .filter((row) => row.entryType === "PAYMENT")
                          .reduce((sum, row) => sum + Number(row.amount), 0) -
                          bankPreviewRows
                            .filter((row) => row.entryType === "EXPENSE")
                            .reduce((sum, row) => sum + Number(row.amount), 0)) -
                          (bankReconciliationTotals?.net ?? 0)
                      ) <= 0.01
                        ? "stat-tone-good"
                        : "stat-tone-danger"
                    }`}
                  >
                    <h4>Net Fark (Ekstre - Sistem)</h4>
                    <p>
                      {formatTry(
                        (bankPreviewRows
                          .filter((row) => row.entryType === "PAYMENT")
                          .reduce((sum, row) => sum + Number(row.amount), 0) -
                          bankPreviewRows
                            .filter((row) => row.entryType === "EXPENSE")
                            .reduce((sum, row) => sum + Number(row.amount), 0)) -
                          (bankReconciliationTotals?.net ?? 0)
                      )}
                    </p>
                    <span className="small">0'a yakin olmali</span>
                  </article>
                </div>

                <div className="bank-compare-accordions compact-row-top-gap">
                  <details className="bank-compare-accordion">
                    <summary>Sistem Banka Hareketleri</summary>
                    <div className="report-column-menu-row">
                      <details className="report-column-menu">
                        <summary>Kolonlar</summary>
                        <div className="report-column-menu-list">
                          <label>
                            <input
                              type="checkbox"
                              checked={bankSystemColumnVisibility.date}
                              onChange={() => toggleBankSystemColumn("date")}
                            />
                            Tarih
                          </label>
                          <label>
                            <input
                              type="checkbox"
                              checked={bankSystemColumnVisibility.type}
                              onChange={() => toggleBankSystemColumn("type")}
                            />
                            Tip
                          </label>
                          <label>
                            <input
                              type="checkbox"
                              checked={bankSystemColumnVisibility.amount}
                              onChange={() => toggleBankSystemColumn("amount")}
                            />
                            Tutar
                          </label>
                          <label>
                            <input
                              type="checkbox"
                              checked={bankSystemColumnVisibility.description}
                              onChange={() => toggleBankSystemColumn("description")}
                            />
                            Aciklama
                          </label>
                          <label>
                            <input
                              type="checkbox"
                              checked={bankSystemColumnVisibility.reference}
                              onChange={() => toggleBankSystemColumn("reference")}
                            />
                            Referans
                          </label>
                          <label>
                            <input
                              type="checkbox"
                              checked={bankSystemColumnVisibility.source}
                              onChange={() => toggleBankSystemColumn("source")}
                            />
                            Kaynak
                          </label>
                        </div>
                      </details>
                    </div>
                    <div className="table-wrap">
                      <table className="report-compact-table">
                        <thead>
                          <tr>
                            {bankSystemColumnVisibility.date && <th>Tarih</th>}
                            {bankSystemColumnVisibility.type && <th>Tip</th>}
                            {bankSystemColumnVisibility.amount && <th className="col-num">Tutar</th>}
                            {bankSystemColumnVisibility.description && <th>Aciklama</th>}
                            {bankSystemColumnVisibility.reference && <th>Referans</th>}
                            {bankSystemColumnVisibility.source && <th>Kaynak</th>}
                          </tr>
                        </thead>
                        <tbody>
                          {bankReconciliationRows.length === 0 ? (
                            <tr>
                              <td colSpan={bankSystemVisibleColumnCount} className="empty">
                                Sistem banka hareketi yok
                              </td>
                            </tr>
                          ) : (
                            bankReconciliationRows.map((row) => (
                              <tr key={`sys-${row.entryType}-${row.id}`}>
                                {bankSystemColumnVisibility.date && <td>{formatDateTr(row.occurredAt)}</td>}
                                {bankSystemColumnVisibility.type && <td>{row.entryType === "IN" ? "Giris" : "Cikis"}</td>}
                                {bankSystemColumnVisibility.amount && <td className="col-num">{formatTry(row.amount)}</td>}
                                {bankSystemColumnVisibility.description && <td>{row.description ?? "-"}</td>}
                                {bankSystemColumnVisibility.reference && <td>{row.reference ?? "-"}</td>}
                                {bankSystemColumnVisibility.source && (
                                  <td>
                                    {row.source === "BANK_STATEMENT_UPLOAD"
                                      ? `Banka Upload${row.fileName ? ` (${row.fileName})` : ""}`
                                      : row.source === "PAYMENT_UPLOAD"
                                        ? "Toplu Odeme Upload"
                                        : "Manuel"}
                                  </td>
                                )}
                              </tr>
                            ))
                          )}
                        </tbody>
                      </table>
                    </div>
                  </details>

                  <details className="bank-compare-accordion">
                    <summary>Yuklenen Banka Ekstresi Satirlari</summary>
                    <div className="report-column-menu-row">
                      <details className="report-column-menu">
                        <summary>Kolonlar</summary>
                        <div className="report-column-menu-list">
                          <label>
                            <input
                              type="checkbox"
                              checked={bankStatementColumnVisibility.date}
                              onChange={() => toggleBankStatementColumn("date")}
                            />
                            Tarih
                          </label>
                          <label>
                            <input
                              type="checkbox"
                              checked={bankStatementColumnVisibility.type}
                              onChange={() => toggleBankStatementColumn("type")}
                            />
                            Tip
                          </label>
                          <label>
                            <input
                              type="checkbox"
                              checked={bankStatementColumnVisibility.amount}
                              onChange={() => toggleBankStatementColumn("amount")}
                            />
                            Tutar
                          </label>
                          <label>
                            <input
                              type="checkbox"
                              checked={bankStatementColumnVisibility.description}
                              onChange={() => toggleBankStatementColumn("description")}
                            />
                            Aciklama
                          </label>
                          <label>
                            <input
                              type="checkbox"
                              checked={bankStatementColumnVisibility.reference}
                              onChange={() => toggleBankStatementColumn("reference")}
                            />
                            Referans
                          </label>
                        </div>
                      </details>
                    </div>
                    <div className="table-wrap">
                      <table className="report-compact-table">
                        <thead>
                          <tr>
                            {bankStatementColumnVisibility.date && <th>Tarih</th>}
                            {bankStatementColumnVisibility.type && <th>Tip</th>}
                            {bankStatementColumnVisibility.amount && <th className="col-num">Tutar</th>}
                            {bankStatementColumnVisibility.description && <th>Aciklama</th>}
                            {bankStatementColumnVisibility.reference && <th>Referans</th>}
                          </tr>
                        </thead>
                        <tbody>
                          {bankPreviewRows.length === 0 ? (
                            <tr>
                              <td colSpan={bankStatementVisibleColumnCount} className="empty">
                                Henuz karsilastirma icin ekstre yuklenmedi
                              </td>
                            </tr>
                          ) : (
                            bankPreviewRows.map((row, idx) => (
                              <tr key={`ext-${row.rowNo}-${idx}`}>
                                {bankStatementColumnVisibility.date && <td>{formatDateTr(row.occurredAt)}</td>}
                                {bankStatementColumnVisibility.type && <td>{row.entryType === "PAYMENT" ? "Giris" : "Cikis"}</td>}
                                {bankStatementColumnVisibility.amount && <td className="col-num">{formatTry(row.amount)}</td>}
                                {bankStatementColumnVisibility.description && <td>{row.description || "-"}</td>}
                                {bankStatementColumnVisibility.reference && <td>{row.reference || "-"}</td>}
                              </tr>
                            ))
                          )}
                        </tbody>
                      </table>
                    </div>
                  </details>

                  <details className="bank-compare-accordion">
                    <summary>Fark Listesi (Tarih + Tip + Tutar)</summary>
                    <div className="report-column-menu-row">
                      <details className="report-column-menu">
                        <summary>Kolonlar</summary>
                        <div className="report-column-menu-list">
                          <label>
                            <input
                              type="checkbox"
                              checked={bankDiffColumnVisibility.date}
                              onChange={() => toggleBankDiffColumn("date")}
                            />
                            Tarih
                          </label>
                          <label>
                            <input
                              type="checkbox"
                              checked={bankDiffColumnVisibility.type}
                              onChange={() => toggleBankDiffColumn("type")}
                            />
                            Tip
                          </label>
                          <label>
                            <input
                              type="checkbox"
                              checked={bankDiffColumnVisibility.amount}
                              onChange={() => toggleBankDiffColumn("amount")}
                            />
                            Tutar
                          </label>
                          <label>
                            <input
                              type="checkbox"
                              checked={bankDiffColumnVisibility.systemCount}
                              onChange={() => toggleBankDiffColumn("systemCount")}
                            />
                            Sistem Adet
                          </label>
                          <label>
                            <input
                              type="checkbox"
                              checked={bankDiffColumnVisibility.statementCount}
                              onChange={() => toggleBankDiffColumn("statementCount")}
                            />
                            Ekstre Adet
                          </label>
                          <label>
                            <input
                              type="checkbox"
                              checked={bankDiffColumnVisibility.systemReference}
                              onChange={() => toggleBankDiffColumn("systemReference")}
                            />
                            Sistem Referans
                          </label>
                          <label>
                            <input
                              type="checkbox"
                              checked={bankDiffColumnVisibility.statementReference}
                              onChange={() => toggleBankDiffColumn("statementReference")}
                            />
                            Ekstre Referans
                          </label>
                          <label>
                            <input
                              type="checkbox"
                              checked={bankDiffColumnVisibility.diffCount}
                              onChange={() => toggleBankDiffColumn("diffCount")}
                            />
                            Fark
                          </label>
                        </div>
                      </details>
                    </div>
                    <div className="table-wrap">
                      <table className="report-compact-table">
                        <thead>
                          <tr>
                            {bankDiffColumnVisibility.date && <th>Tarih</th>}
                            {bankDiffColumnVisibility.type && <th>Tip</th>}
                            {bankDiffColumnVisibility.amount && <th className="col-num">Tutar</th>}
                            {bankDiffColumnVisibility.systemCount && <th className="col-num">Sistem Adet</th>}
                            {bankDiffColumnVisibility.statementCount && <th className="col-num">Ekstre Adet</th>}
                            {bankDiffColumnVisibility.systemReference && <th>Sistem Referans</th>}
                            {bankDiffColumnVisibility.statementReference && <th>Ekstre Referans</th>}
                            {bankDiffColumnVisibility.diffCount && <th className="col-num">Fark (Ekstre-Sistem)</th>}
                          </tr>
                        </thead>
                        <tbody>
                          {bankComparisonDifferenceRows.length === 0 ? (
                            <tr>
                              <td colSpan={bankDiffVisibleColumnCount} className="empty">
                                Fark bulunmuyor
                              </td>
                            </tr>
                          ) : (
                            bankComparisonDifferenceRows.map((row) => (
                              <tr key={row.key}>
                                {bankDiffColumnVisibility.date && <td>{row.dateKey}</td>}
                                {bankDiffColumnVisibility.type && <td>{row.entryType}</td>}
                                {bankDiffColumnVisibility.amount && <td className="col-num">{formatTry(row.amount)}</td>}
                                {bankDiffColumnVisibility.systemCount && <td className="col-num">{row.systemCount}</td>}
                                {bankDiffColumnVisibility.statementCount && <td className="col-num">{row.statementCount}</td>}
                                {bankDiffColumnVisibility.systemReference && (
                                  <td>{row.systemReferences.length > 0 ? row.systemReferences.join(", ") : "-"}</td>
                                )}
                                {bankDiffColumnVisibility.statementReference && (
                                  <td>{row.statementReferences.length > 0 ? row.statementReferences.join(", ") : "-"}</td>
                                )}
                                {bankDiffColumnVisibility.diffCount && (
                                  <td className="col-num">{row.diffCount > 0 ? `+${row.diffCount}` : String(row.diffCount)}</td>
                                )}
                              </tr>
                            ))
                          )}
                        </tbody>
                      </table>
                    </div>
                  </details>
                </div>
              </div>
            </section>
          }
        />
        <Route
          path="/reports/overdue-payments"
          element={
            <section className="dashboard report-page">
              <div className="card table-card report-page-card">
                <div className="section-head report-toolbar">
                  <h3>Gecikmis Odemeler Raporu</h3>
                  <div className="admin-row">
                    <button
                      className="btn btn-primary btn-run"
                      type="button"
                      onClick={() => void runOverduePaymentsQuery()}
                      disabled={overduePaymentsLoading || loading}
                    >
                      {overduePaymentsLoading ? "Hesaplaniyor..." : "Calistir"}
                    </button>
                    <button className="btn btn-ghost" type="button" onClick={clearOverduePaymentsFilters}>Temizle</button>
                  </div>
                </div>

                <div className="upload-batch-filter-row compact-row-top-gap report-filter-grid">
                  <label>
                    Vade Baslangic
                    <input
                      type="date"
                      value={overduePaymentsFilter.from}
                      onChange={(e) => setOverduePaymentsFilter((prev) => ({ ...prev, from: e.target.value }))}
                    />
                  </label>
                  <label>
                    Vade Bitis
                    <input
                      type="date"
                      value={overduePaymentsFilter.to}
                      onChange={(e) => setOverduePaymentsFilter((prev) => ({ ...prev, to: e.target.value }))}
                    />
                  </label>
                  <label>
                    Blok
                    <details className="filter-dropdown apartment-edit-select-dropdown">
                      <summary>{overdueBlockSummary}</summary>
                      <div className="filter-dropdown-panel apartment-edit-select-list">
                        <label className="bulk-filter-option apartment-edit-select-item">
                          <input
                            type="checkbox"
                            checked={allOverdueBlocksSelected}
                            onChange={(e) =>
                              setOverduePaymentsFilter((prev) => {
                                const nextBlockIds = e.target.checked ? overdueBlockValues : [];
                                const nextBlockNames = new Set(
                                  blockOptions.filter((x) => nextBlockIds.includes(x.id)).map((x) => x.name)
                                );
                                const nextDoorNos = prev.doorNos.filter((doorNo) =>
                                  apartmentOptions.some(
                                    (apt) =>
                                      apt.doorNo === doorNo &&
                                      (nextBlockIds.length === 0 || nextBlockNames.has(apt.blockName))
                                  )
                                );

                                return {
                                  ...prev,
                                  blockIds: nextBlockIds,
                                  doorNos: nextDoorNos,
                                };
                              })
                            }
                          />
                          Hepsini Sec
                        </label>
                        {blockOptions.map((block) => {
                          const checked = overduePaymentsFilter.blockIds.includes(block.id);
                          return (
                            <label key={block.id} className="bulk-filter-option apartment-edit-select-item">
                              <input
                                type="checkbox"
                                checked={checked}
                                onChange={(e) =>
                                  setOverduePaymentsFilter((prev) => {
                                    const nextBlockIds = e.target.checked
                                      ? [...prev.blockIds, block.id]
                                      : prev.blockIds.filter((id) => id !== block.id);
                                    const nextBlockNames = new Set(
                                      blockOptions.filter((x) => nextBlockIds.includes(x.id)).map((x) => x.name)
                                    );
                                    const nextDoorNos = prev.doorNos.filter((doorNo) =>
                                      apartmentOptions.some(
                                        (apt) =>
                                          apt.doorNo === doorNo &&
                                          (nextBlockIds.length === 0 || nextBlockNames.has(apt.blockName))
                                      )
                                    );

                                    return {
                                      ...prev,
                                      blockIds: nextBlockIds,
                                      doorNos: nextDoorNos,
                                    };
                                  })
                                }
                              />
                              {block.name}
                            </label>
                          );
                        })}
                      </div>
                    </details>
                  </label>
                  <label>
                    Daire No
                    <details className="filter-dropdown apartment-edit-select-dropdown">
                      <summary>{overdueDoorSummary}</summary>
                      <div className="filter-dropdown-panel apartment-edit-select-list">
                        <label className="bulk-filter-option apartment-edit-select-item">
                          <input
                            type="checkbox"
                            checked={allOverdueDoorsSelected}
                            onChange={(e) =>
                              setOverduePaymentsFilter((prev) => ({
                                ...prev,
                                doorNos: e.target.checked ? overdueDoorValues : [],
                              }))
                            }
                          />
                          Hepsini Sec
                        </label>
                        {overdueDoorValues.map((doorNo) => {
                          const checked = overduePaymentsFilter.doorNos.includes(doorNo);
                          return (
                            <label key={doorNo} className="bulk-filter-option apartment-edit-select-item">
                              <input
                                type="checkbox"
                                checked={checked}
                                onChange={(e) =>
                                  setOverduePaymentsFilter((prev) => ({
                                    ...prev,
                                    doorNos: e.target.checked
                                      ? [...prev.doorNos, doorNo]
                                      : prev.doorNos.filter((x) => x !== doorNo),
                                  }))
                                }
                              />
                              {doorNo}
                            </label>
                          );
                        })}
                      </div>
                    </details>
                  </label>
                  <label>
                    Tahakkuk Tipi
                    <select
                      value={overduePaymentsFilter.chargeTypeId}
                      onChange={(e) =>
                        setOverduePaymentsFilter((prev) => ({ ...prev, chargeTypeId: e.target.value }))
                      }
                    >
                      <option value="">Tum tipler</option>
                      {chargeTypeOptions.map((x) => (
                        <option key={x.id} value={x.id}>
                          {x.name} ({x.code})
                        </option>
                      ))}
                    </select>
                  </label>
                </div>

                {overduePaymentsTotals && (
                  <div className="stats-grid compact-row-top-gap">
                    <article className="card stat stat-tone-danger">
                      <h4>Toplam Kalan Borc</h4>
                      <p>{formatTry(overduePaymentsTotals.totalRemaining)}</p>
                      <span className="small">Satir sayisi: {overduePaymentsTotals.rowCount}</span>
                    </article>
                    <article className="card stat stat-tone-warn">
                      <h4>Toplam Borclandirilan</h4>
                      <p>{formatTry(overduePaymentsTotals.totalAmount)}</p>
                      <span className="small">Rapor satirlari toplami</span>
                    </article>
                    <article className="card stat stat-tone-good">
                      <h4>Toplam Odenen</h4>
                      <p>{formatTry(overduePaymentsTotals.totalPaid)}</p>
                      <span className="small">Gecikmis satirlardan tahsil edilen</span>
                    </article>
                  </div>
                )}

                <div className="report-column-menu-group">
                  <details className="report-column-menu">
                    <summary>Kolonlar</summary>
                    <div className="report-column-menu-list">
                      <label>
                        <input
                          type="checkbox"
                          checked={overduePaymentsColumnVisibility.block}
                          onChange={() => toggleOverduePaymentsColumn("block")}
                        />
                        Blok
                      </label>
                      <label>
                        <input
                          type="checkbox"
                          checked={overduePaymentsColumnVisibility.doorNo}
                          onChange={() => toggleOverduePaymentsColumn("doorNo")}
                        />
                        Daire
                      </label>
                      <label>
                        <input
                          type="checkbox"
                          checked={overduePaymentsColumnVisibility.owner}
                          onChange={() => toggleOverduePaymentsColumn("owner")}
                        />
                        Malik
                      </label>
                      <label>
                        <input
                          type="checkbox"
                          checked={overduePaymentsColumnVisibility.chargeType}
                          onChange={() => toggleOverduePaymentsColumn("chargeType")}
                        />
                        Borc Tipi
                      </label>
                      <label>
                        <input
                          type="checkbox"
                          checked={overduePaymentsColumnVisibility.period}
                          onChange={() => toggleOverduePaymentsColumn("period")}
                        />
                        Donem
                      </label>
                      <label>
                        <input
                          type="checkbox"
                          checked={overduePaymentsColumnVisibility.dueDate}
                          onChange={() => toggleOverduePaymentsColumn("dueDate")}
                        />
                        Vade
                      </label>
                      <label>
                        <input
                          type="checkbox"
                          checked={overduePaymentsColumnVisibility.overdueDays}
                          onChange={() => toggleOverduePaymentsColumn("overdueDays")}
                        />
                        Gun
                      </label>
                      <label>
                        <input
                          type="checkbox"
                          checked={overduePaymentsColumnVisibility.amount}
                          onChange={() => toggleOverduePaymentsColumn("amount")}
                        />
                        Borc
                      </label>
                      <label>
                        <input
                          type="checkbox"
                          checked={overduePaymentsColumnVisibility.paidTotal}
                          onChange={() => toggleOverduePaymentsColumn("paidTotal")}
                        />
                        Odenen
                      </label>
                      <label>
                        <input
                          type="checkbox"
                          checked={overduePaymentsColumnVisibility.remaining}
                          onChange={() => toggleOverduePaymentsColumn("remaining")}
                        />
                        Kalan
                      </label>
                      <label>
                        <input
                          type="checkbox"
                          checked={overduePaymentsColumnVisibility.description}
                          onChange={() => toggleOverduePaymentsColumn("description")}
                        />
                        Aciklama
                      </label>
                    </div>
                  </details>
                </div>

                <div className="table-wrap compact-row-top-gap overdue-payments-wrap">
                  <table className="apartment-list-table report-compact-table overdue-payments-table">
                    <thead>
                      <tr>
                        {overduePaymentsColumnVisibility.block && <th>Blok</th>}
                        {overduePaymentsColumnVisibility.doorNo && <th>Daire</th>}
                        {overduePaymentsColumnVisibility.owner && <th>Malik</th>}
                        {overduePaymentsColumnVisibility.chargeType && <th>Borc Tipi</th>}
                        {overduePaymentsColumnVisibility.period && <th>Donem</th>}
                        {overduePaymentsColumnVisibility.dueDate && <th>Vade</th>}
                        {overduePaymentsColumnVisibility.overdueDays && <th className="col-num">Gun</th>}
                        {overduePaymentsColumnVisibility.amount && <th className="col-num">Borc</th>}
                        {overduePaymentsColumnVisibility.paidTotal && <th className="col-num">Odenen</th>}
                        {overduePaymentsColumnVisibility.remaining && <th className="col-num">Kalan</th>}
                        {overduePaymentsColumnVisibility.description && <th>Aciklama</th>}
                      </tr>
                    </thead>
                    <tbody>
                      {overduePaymentsRows.length === 0 ? (
                        <tr>
                          <td colSpan={overduePaymentsVisibleColumnCount} className="empty">
                            Gecikmis odeme kaydi bulunmuyor
                          </td>
                        </tr>
                      ) : (
                        overduePaymentsRows.map((row) => (
                          <tr key={row.chargeId}>
                            {overduePaymentsColumnVisibility.block && <td>{row.blockName}</td>}
                            {overduePaymentsColumnVisibility.doorNo && <td>{row.apartmentDoorNo}</td>}
                            {overduePaymentsColumnVisibility.owner && <td>{row.apartmentOwnerName || "-"}</td>}
                            {overduePaymentsColumnVisibility.chargeType && <td>{row.chargeTypeName}</td>}
                            {overduePaymentsColumnVisibility.period && <td>{`${row.periodMonth}/${row.periodYear}`}</td>}
                            {overduePaymentsColumnVisibility.dueDate && <td>{formatDateTr(row.dueDate)}</td>}
                            {overduePaymentsColumnVisibility.overdueDays && <td className="col-num">{row.overdueDays}</td>}
                            {overduePaymentsColumnVisibility.amount && <td className="col-num">{formatTry(row.amount)}</td>}
                            {overduePaymentsColumnVisibility.paidTotal && <td className="col-num">{formatTry(row.paidTotal)}</td>}
                            {overduePaymentsColumnVisibility.remaining && <td className="col-num">{formatTry(row.remaining)}</td>}
                            {overduePaymentsColumnVisibility.description && <td>{row.description || "-"}</td>}
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </section>
          }
        />
        <Route
          path="/reports/charge-consistency"
          element={
            <section className="dashboard report-page">

              {/* ─── Filter Card ─────────────────────────────────── */}
              <div className="card report-page-card cc-report-card">
                <div className="section-head report-toolbar">
                  <div>
                    <h3>Tahakkuk Kontrol Raporu</h3>
                    <p className="small">Secilen donem icin tahakkuk tutarsizliklarini ve eksikliklerini tarar.</p>
                  </div>
                  <div className="admin-row">
                    <button
                      className="btn btn-run"
                      type="button"
                      onClick={() => void runChargeConsistencyQuery()}
                      disabled={chargeConsistencyLoading || loading}
                    >
                      {chargeConsistencyLoading ? "Hesaplaniyor..." : "▶ Calistir"}
                    </button>
                    <button className="btn btn-ghost" type="button" onClick={clearChargeConsistencyFilters}>Temizle</button>
                  </div>
                </div>

                <div className="cc-filter-body">
                  {/* Donem */}
                  <div className="cc-filter-group">
                    <span className="cc-filter-group-label">Donem</span>
                    <div className="cc-filter-period-row">
                      <div className="cc-period-year-row">
                        <label className="cc-inline-label">
                          <span>Yil</span>
                          <input
                            type="number"
                            className="cc-year-input"
                            value={chargeConsistencyForm.periodYear}
                            onChange={(e) => setChargeConsistencyForm((prev) => ({ ...prev, periodYear: e.target.value }))}
                            required
                          />
                        </label>
                      </div>
                      <div className="cc-month-inline-row">
                        <label className="checkbox-row cc-all-months-label">
                          <input
                            type="checkbox"
                            checked={chargeConsistencyForm.periodMonths.length === monthOptions.length}
                            onChange={(e) => {
                              setChargeConsistencyForm((prev) => ({
                                ...prev,
                                periodMonths: e.target.checked ? [...monthOptions] : [],
                              }));
                            }}
                          />
                          Tum aylari sec
                        </label>
                        <div className="month-grid cc-month-grid-inline">
                          {monthOptions.map((month) => {
                            const checked = chargeConsistencyForm.periodMonths.includes(month);
                            return (
                              <label key={month} className="month-chip">
                                <input
                                  type="checkbox"
                                  checked={checked}
                                  onChange={(e) => {
                                    setChargeConsistencyForm((prev) => {
                                      const next = e.target.checked
                                        ? [...prev.periodMonths, month]
                                        : prev.periodMonths.filter((m) => m !== month);
                                      return { ...prev, periodMonths: [...new Set(next)].sort((a, b) => a - b) };
                                    });
                                  }}
                                />
                                {month}
                              </label>
                            );
                          })}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Filtreler */}
                  <div className="cc-filter-group">
                    <span className="cc-filter-group-label">Filtreler</span>
                    <div className="report-filter-grid cc-filter-grid">
                      <label className="cc-inline-field">
                        <span className="cc-inline-field-label">Tahakkuk Tipi</span>
                        <select
                          value={chargeConsistencyForm.chargeTypeId}
                          onChange={(e) =>
                            setChargeConsistencyForm((prev) => ({
                              ...prev,
                              chargeTypeId: e.target.value,
                              includeMissing: e.target.value ? prev.includeMissing : false,
                            }))
                          }
                        >
                          <option value="">Tum tipler</option>
                          {chargeTypeOptions.map((x) => (
                            <option key={x.id} value={x.id}>
                              {x.name} ({x.code})
                            </option>
                          ))}
                        </select>
                      </label>
                      <label className="cc-inline-field">
                        <span className="cc-inline-field-label">Daire Tipi</span>
                        <select
                          value={chargeConsistencyForm.apartmentType}
                          onChange={(e) =>
                            setChargeConsistencyForm((prev) => ({ ...prev, apartmentType: e.target.value as "ALL" | ApartmentType }))
                          }
                        >
                          <option value="ALL">Tum Daireler</option>
                          <option value="BUYUK">Sadece BUYUK</option>
                          <option value="KUCUK">Sadece KUCUK</option>
                        </select>
                      </label>
                      <label className="cc-inline-field">
                        <span className="cc-inline-field-label">Beklenen BUYUK Tutar</span>
                        <input
                          type="number"
                          step="0.01"
                          placeholder="Orn: 2000"
                          value={chargeConsistencyForm.expectedBuyukAmount}
                          onChange={(e) =>
                            setChargeConsistencyForm((prev) => ({ ...prev, expectedBuyukAmount: e.target.value }))
                          }
                        />
                      </label>
                      <label className="cc-inline-field">
                        <span className="cc-inline-field-label">Beklenen KUCUK Tutar</span>
                        <input
                          type="number"
                          step="0.01"
                          placeholder="Orn: 1500"
                          value={chargeConsistencyForm.expectedKucukAmount}
                          onChange={(e) =>
                            setChargeConsistencyForm((prev) => ({ ...prev, expectedKucukAmount: e.target.value }))
                          }
                        />
                      </label>
                    </div>
                  </div>

                  {/* Secenekler */}
                  <div className="cc-filter-group">
                    <span className="cc-filter-group-label">Secenekler</span>
                    <div className="cc-options-row">
                      <label className="checkbox-row">
                        <input
                          type="checkbox"
                          checked={chargeConsistencyForm.requireMonthEndDueDate}
                          onChange={(e) =>
                            setChargeConsistencyForm((prev) => ({ ...prev, requireMonthEndDueDate: e.target.checked }))
                          }
                        />
                        Son odeme tarihi ay sonu kontrolu yap
                      </label>
                      <label className="checkbox-row">
                        <input
                          type="checkbox"
                          checked={Boolean(chargeConsistencyForm.chargeTypeId) && chargeConsistencyForm.includeMissing}
                          disabled={!chargeConsistencyForm.chargeTypeId}
                          onChange={(e) => setChargeConsistencyForm((prev) => ({ ...prev, includeMissing: e.target.checked }))}
                        />
                        Eksik tahakkuklari da uyar
                      </label>
                      <label className="checkbox-row">
                        <input
                          type="checkbox"
                          checked={chargeConsistencyViewMode === "RAW"}
                          onChange={(e) => setChargeConsistencyViewMode(e.target.checked ? "RAW" : "MERGED")}
                        />
                        Ham kayitlari goster (varsayilan: birlestirilmis)
                      </label>
                    </div>
                  </div>

                  {/* Bilgi notu */}
                  <div className="cc-info-callout">
                    <span className="cc-info-icon">ⓘ</span>
                    <span>
                      Eksik tahakkuk uyarisi dogru calissin diye <strong>Tahakkuk Tipi</strong> secili olmalidir
                      (ornegin AIDAT).
                    </span>
                  </div>
                </div>
              </div>

              {/* ─── Stats ───────────────────────────────────────── */}
              {chargeConsistencyTotals && (
                <div className="stats-grid cc-stats-row">
                  <article className="card stat stat-tone-danger">
                    <h4>Toplam Uyari</h4>
                    <p>{visibleChargeConsistencyRows.length}</p>
                    <span className="small">
                      {chargeConsistencyViewMode === "RAW" ? "Ham uyari satiri" : "Tekillestirilmis uyari"}
                    </span>
                  </article>
                  <article className="card stat stat-tone-info">
                    <h4>Hedef Daire</h4>
                    <p>{chargeConsistencyTotals.targetApartmentCount}</p>
                    <span className="small">
                      Kontrol kapsami ({chargeConsistencyTotals.totalApartmentCount} toplamdan)
                    </span>
                  </article>
                  <article className="card stat stat-tone-warn">
                    <h4>Taranan Tahakkuk</h4>
                    <p>{chargeConsistencyTotals.scannedChargeCount}</p>
                    <span className="small">Donem icindeki kayitlar</span>
                  </article>
                </div>
              )}

              {/* ─── Kod Dagilimi / Hizli Filtre ─────────────────── */}
              {chargeConsistencyCodeOptions.length > 0 && (
                <div className="card report-page-card cc-code-filter-card">
                  <div className="cc-code-filter-header">
                    <span className="cc-code-filter-title">Uyari Tip Dagilimi</span>
                    <div className="cc-code-filter-actions">
                      <button
                        className="btn btn-ghost cc-code-filter-btn"
                        type="button"
                        onClick={() =>
                          setChargeConsistencySelectedCodes(chargeConsistencyCodeOptions.map((item) => item.code))
                        }
                      >
                        Tumunu Sec
                      </button>
                      <button
                        className="btn btn-ghost cc-code-filter-btn"
                        type="button"
                        onClick={() => setChargeConsistencySelectedCodes([])}
                      >Temizle</button>
                    </div>
                  </div>
                  <div className="cc-code-badges">
                    {chargeConsistencyCodeOptions.map((item) => {
                      const isActive = chargeConsistencySelectedCodes.includes(item.code);
                      const severity = getChargeConsistencyCodeSeverity(item.code);
                      return (
                        <button
                          key={item.code}
                          type="button"
                          className={`cc-code-badge cc-code-badge--${severity}${isActive ? " cc-code-badge--active" : ""}`}
                          onClick={() => {
                            setChargeConsistencySelectedCodes((prev) => {
                              if (prev.includes(item.code)) {
                                return prev.filter((c) => c !== item.code);
                              }
                              return [...new Set([...prev, item.code])];
                            });
                          }}
                        >
                          <span className="cc-code-badge-label">{item.label}</span>
                          <span className="cc-code-badge-count">{item.count}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* ─── Muaf Daireler ───────────────────────────────── */}
              {chargeConsistencyTotals && chargeConsistencyExcludedApartments.length > 0 && (
                <details className="card report-page-card cc-excluded-card">
                  <summary className="cc-excluded-summary">
                    <span className="cc-excluded-title">Muaf Daireler (Kontrol Disi)</span>
                    <span className="cc-excluded-count">{chargeConsistencyExcludedApartments.length} daire</span>
                  </summary>
                  <p className="small cc-excluded-note">
                    Toplam {chargeConsistencyTotals.totalApartmentCount} dairenin{" "}
                    {chargeConsistencyTotals.excludedApartmentCount} adedi secili tahakkuk tipi icin muaf oldugu icin
                    hedef daire sayisina dahil edilmedi.
                  </p>
                  <div className="table-wrap cc-excluded-table-wrap">
                    <table className="apartment-list-table report-compact-table">
                      <thead>
                        <tr>
                          <th>Blok</th>
                          <th>Daire</th>
                          <th>Tip</th>
                          <th>Gorev</th>
                          <th>Muafiyet Nedeni</th>
                        </tr>
                      </thead>
                      <tbody>
                        {chargeConsistencyExcludedApartments.map((row) => (
                          <tr key={row.apartmentId}>
                            <td>{row.blockName}</td>
                            <td>{row.apartmentDoorNo}</td>
                            <td>{row.apartmentType}</td>
                            <td>{row.apartmentDutyName || "-"}</td>
                            <td>{row.reason}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </details>
              )}

              {/* ─── Sonuc Tablosu ───────────────────────────────── */}
              <div className="card report-page-card cc-results-card">
                <div className="cc-results-header">
                  <span className="cc-results-title">Uyari Listesi</span>
                  {chargeConsistencyTotals && (
                    <span className="cc-results-badge">{visibleChargeConsistencyRows.length} kayit</span>
                  )}
                </div>
                <div className="table-wrap charge-consistency-wrap">
                  <table className="apartment-list-table report-compact-table charge-consistency-table">
                    <thead>
                      <tr>
                        <th>Uyari Tipi</th>
                        <th>Mesaj</th>
                        <th>Blok</th>
                        <th>Daire</th>
                        <th>Tip</th>
                        <th>Oturan</th>
                        <th>Donem</th>
                        <th>Tah. Tipi</th>
                        <th className="col-num">Bek. Tutar</th>
                        <th className="col-num">Ger. Tutar</th>
                        <th>Bek. Vade</th>
                        <th>Ger. Vade</th>
                        <th>Islem</th>
                      </tr>
                    </thead>
                    <tbody>
                      {visibleChargeConsistencyRows.length === 0 ? (
                        <tr>
                          <td colSpan={13} className="empty">
                            Uyari bulunmuyor. Listelemek icin Calistir butonunu kullanin.
                          </td>
                        </tr>
                      ) : (
                        visibleChargeConsistencyRows.map((row, idx) => {
                          const rowSeverity: "danger" | "warn" | "info" = row.codes.some((c) =>
                            ["MISSING_CHARGE", "DUPLICATE_CHARGE", "NONPOSITIVE_AMOUNT"].includes(c)
                          )
                            ? "danger"
                            : row.codes.some((c) => c === "AMOUNT_MISMATCH")
                              ? "warn"
                              : "info";
                          return (
                            <tr
                              key={`${row.code}-${row.chargeId ?? row.apartmentId}-${row.periodMonth}-${idx}`}
                              data-cc-severity={rowSeverity}
                            >
                              <td>
                                <div className="cc-pills-wrap">
                                  {row.codes.map((code) => (
                                    <span
                                      key={code}
                                      className={`cc-warn-pill cc-warn-pill--${getChargeConsistencyCodeSeverity(code)}`}
                                    >
                                      {formatChargeConsistencyCode(code)}
                                    </span>
                                  ))}
                                </div>
                              </td>
                              <td>{row.messages.join(" | ")}</td>
                              <td>{row.blockName}</td>
                              <td>{row.apartmentDoorNo}</td>
                              <td>{row.apartmentType}</td>
                              <td>{row.residentNames.length > 0 ? row.residentNames.join(", ") : "-"}</td>
                              <td>{`${row.periodMonth}/${row.periodYear}`}</td>
                              <td>{row.chargeTypeName ?? "-"}</td>
                              <td className="col-num">{row.expectedAmount === null ? "-" : formatTry(row.expectedAmount)}</td>
                              <td className="col-num">{row.actualAmount === null ? "-" : formatTry(row.actualAmount)}</td>
                              <td>{row.expectedDueDate ? formatDateTr(row.expectedDueDate) : "-"}</td>
                              <td>{row.actualDueDate ? formatDateTr(row.actualDueDate) : "-"}</td>
                              <td>
                                <button
                                  className="btn btn-ghost cc-action-btn"
                                  type="button"
                                  onClick={() => openCorrectionsForChargeConsistencyRow(row)}
                                >
                                  Duzelt
                                </button>
                              </td>
                            </tr>
                          );
                        })
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

            </section>
          }
        />
        <Route
          path="/reports/staff-open-aidat"
          element={
            <Suspense fallback={<LazyAdminPageFallback />}>
              <StaffOpenAidatReportPage
                loading={loading}
                apartmentOptions={apartmentOptions}
                selectedApartmentId={staffOpenAidatSelectedApartmentId}
                setSelectedApartmentId={setStaffOpenAidatSelectedApartmentId}
                rows={staffOpenAidatRows}
                totals={staffOpenAidatTotals}
                apartmentSummary={staffOpenAidatApartment}
                reportLoading={staffOpenAidatLoading}
                runQuery={runStaffOpenAidatQuery}
                sendStatementEmail={sendStaffOpenAidatStatementEmail}
                clearFilters={clearStaffOpenAidatFilters}
              />
            </Suspense>
          }
        />
        <Route
          path="/reports/manual-review-matches"
          element={
            <Suspense fallback={<LazyAdminPageFallback />}>
              <ManualReviewMatchesPage
                loading={loading}
                reportLoading={manualReviewMatchesLoading}
                rows={manualReviewMatchesRows}
                totalCount={manualReviewMatchesTotalCount}
                filter={manualReviewMatchesFilter}
                setFilter={setManualReviewMatchesFilter}
                runQuery={runManualReviewMatchesQuery}
                clearFilters={clearManualReviewMatchesFilters}
              />
            </Suspense>
          }
        />
        <Route
          path="/reports/monthly-balance-matrix"
          element={
            <section className="dashboard report-page monthly-balance-report-page">
              <div className="card table-card report-page-card monthly-balance-report-card">
                <div className="section-head report-toolbar">
                  <h3 className="monthly-balance-title">
                    <span className="monthly-balance-title-icon" aria-hidden="true">DL</span>
                    Daire Listesi Raporu
                  </h3>
                  <div className="admin-row monthly-balance-toolbar-actions">
                    <button
                      className="btn btn-primary btn-run"
                      type="button"
                      onClick={() => void runApartmentBalanceMatrixQuery()}
                      disabled={apartmentBalanceMatrixLoading || loading}
                    >
                      {apartmentBalanceMatrixLoading ? "Hesaplaniyor..." : "Calistir"}
                    </button>
                    <button className="btn btn-ghost" type="button" onClick={clearApartmentBalanceMatrixFilters}>Temizle</button>
                    <button className="btn btn-ghost" type="button" onClick={printApartmentBalanceMatrixReport}>
                      Yazdir
                    </button>
                  </div>
                </div>

                <div className="compact-row-top-gap report-filter-grid report-filter-grid-single monthly-balance-filter-row">
                  <label>
                    Yil
                    <input
                      type="number"
                      value={apartmentBalanceMatrixYear}
                      onChange={(e) => setApartmentBalanceMatrixYear(e.target.value)}
                      required
                    />
                  </label>
                </div>

                <p className="small monthly-balance-subtitle">
                  Daire bazli aylik kalan borclari ve rapor tarihindeki geciken toplamlari tek tabloda izleyin.
                </p>

                <div className="monthly-balance-meta compact-row-top-gap">
                  <span className="month-chip monthly-balance-meta-chip">
                    <span className="monthly-balance-meta-chip-key">YL</span>
                    Yil: {apartmentBalanceMatrixYear || "-"}
                  </span>
                  <span className="month-chip monthly-balance-meta-chip">
                    <span className="monthly-balance-meta-chip-key">RT</span>
                    Rapor Tarihi: {apartmentBalanceMatrixSnapshotAt ? formatDateTimeTr(apartmentBalanceMatrixSnapshotAt) : "-"}
                  </span>
                  <span className="month-chip monthly-balance-meta-chip">
                    <span className="monthly-balance-meta-chip-key">ST</span>
                    Satir: {apartmentBalanceMatrixTotals ? apartmentBalanceMatrixTotals.apartmentCount : sortedApartmentBalanceMatrixRows.length}
                  </span>
                </div>

                {apartmentBalanceMatrixTotals && (
                  <div className="stats-grid compact-row-top-gap monthly-balance-stats-grid">
                    <article className="card stat stat-tone-info monthly-balance-stat-card">
                      <h4>Daire Sayisi</h4>
                      <p>{apartmentBalanceMatrixTotals.apartmentCount}</p>
                      <span className="small">Raporlanan satir</span>
                    </article>
                    <article
                      className={`card stat monthly-balance-stat-card monthly-balance-overdue-cta ${
                        apartmentBalanceMatrixTotals.yearEndTotal > 200 ? "stat-tone-danger" : "stat-tone-warn"
                      }`}
                      role="button"
                      tabIndex={0}
                      aria-label="Gecikmis odemeler raporunu ac"
                      onClick={() => navigate("/admin/reports/overdue-payments")}
                      onKeyDown={(event) => {
                        if (event.key === "Enter" || event.key === " ") {
                          event.preventDefault();
                          navigate("/admin/reports/overdue-payments");
                        }
                      }}
                    >
                      <h4>Rapor Tarihi Gecikmis Toplam</h4>
                      <p>{formatTry(apartmentBalanceMatrixTotals.yearEndTotal)}</p>
                      <span className="small">
                        {apartmentBalanceMatrixSnapshotAt
                          ? `${formatDateTimeTr(apartmentBalanceMatrixSnapshotAt)} itibariyla vadesi gecen odenmeyen`
                          : "Vadesi gecen odenmeyen"}
                      </span>
                    </article>
                  </div>
                )}

                <div className="table-wrap compact-row-top-gap monthly-balance-table-wrap">
                  <table className="apartment-list-table report-compact-table monthly-balance-matrix-table">
                    <thead>
                      <tr>
                        <th>Daire No</th>
                        <th>Oturan</th>
                        {apartmentBalanceMatrixMonths.map((month) => (
                          <th
                            key={`month-${month.month}`}
                            className="col-num"
                            title={formatDateTr(month.monthEnd)}
                          >
                            {`${String(month.month).padStart(2, "0")}/${String(Number(apartmentBalanceMatrixYear) % 100).padStart(2, "0")}`}
                          </th>
                        ))}
                        <th className="col-num">Geciken</th>
                      </tr>
                    </thead>
                    <tbody>
                      {sortedApartmentBalanceMatrixRows.length === 0 ? (
                        <tr>
                          <td colSpan={apartmentBalanceMatrixMonths.length + 3} className="empty">
                            Kayit bulunmuyor. Listelemek icin Calistir butonunu kullanin.
                          </td>
                        </tr>
                      ) : (
                        sortedApartmentBalanceMatrixRows.map((row) => {
                          const overdueAmount =
                            typeof row.yearEndBalance === "number"
                              ? row.yearEndBalance
                              : Number(String(row.yearEndBalance).replace(",", "."));
                          const rowHighlightClasses = [
                            overdueAmount > 0.01 ? "monthly-balance-row-overdue" : "",
                            row.hasPartialMonth ? "monthly-balance-row-fractional" : "",
                            "monthly-balance-row-clickable",
                          ]
                            .filter(Boolean)
                            .join(" ");

                          return (
                          <tr
                            key={row.apartmentId}
                            className={rowHighlightClasses}
                            role="button"
                            tabIndex={0}
                            aria-label={`${row.blockName}-${row.apartmentDoorNo} dairesinin ekstresini ac`}
                            onClick={() => onMonthlyBalanceMatrixRowClick(row.apartmentId)}
                            onKeyDown={(event) => onMonthlyBalanceMatrixRowKeyDown(event, row.apartmentId)}
                          >
                            <td>{`${row.blockName}-${row.apartmentDoorNo}`}</td>
                            <td className="monthly-balance-occupant" title={row.occupant || "-"}>{row.occupant || "-"}</td>
                            {row.monthBalances.map((balance, index) => (
                              <td key={`${row.apartmentId}-${index}`} className={`col-num${balance < 0 ? " col-num-negative" : ""}`}>
                                {formatTry(balance)}
                              </td>
                            ))}
                            <td className={`col-num${overdueAmount > 0.01 ? " col-num-negative" : ""}`}>
                              {formatTry(row.yearEndBalance)}
                            </td>
                          </tr>
                          );
                        })
                      )}
                      {apartmentBalanceMatrixTotals && apartmentBalanceMatrixMonths.length > 0 && (
                        <tr className="monthly-balance-total-row">
                          <td colSpan={2}>
                            <b>Toplam</b>
                          </td>
                          {apartmentBalanceMatrixTotals.monthlyTotals.map((total, index) => (
                            <td key={`total-${index}`} className={`col-num${total < 0 ? " col-num-negative" : ""}`}>
                              <b>{formatTry(total)}</b>
                            </td>
                          ))}
                          <td className={`col-num${apartmentBalanceMatrixTotals.yearEndTotal > 200 ? " col-num-negative" : ""}`}>
                            <b>{formatTry(apartmentBalanceMatrixTotals.yearEndTotal)}</b>
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </section>
          }
        />
        <Route
          path="/reports/reference-search"
          element={
            <section className="dashboard report-page">
              <div className="card table-card report-page-card">
                <div className="section-head report-toolbar">
                  <h3>Referans Numarasindan Hareket Bul</h3>
                  <div className="admin-row">
                    <button
                      className="btn btn-primary btn-run"
                      type="button"
                      onClick={() => void runReferenceSearchQuery()}
                      disabled={referenceSearchLoading || loading}
                    >
                      {referenceSearchLoading ? "Araniyor..." : "Calistir"}
                    </button>
                    <button className="btn btn-ghost" type="button" onClick={clearReferenceSearchFilters}>Temizle</button>
                  </div>
                </div>

                <div className="compact-row-top-gap report-filter-grid report-filter-grid-single">
                  <label>
                    Referans Numarasi
                    <input
                      value={referenceSearchValue}
                      onChange={(e) => setReferenceSearchValue(e.target.value)}
                      placeholder="Orn: 11188005235620260303115134255"
                      required
                    />
                  </label>
                </div>

                {referenceSearchTotals && (
                  <div className="stats-grid compact-row-top-gap">
                    <article className="card stat stat-tone-info">
                      <h4>Toplam Hareket</h4>
                      <p>{referenceSearchTotals.movementCount}</p>
                      <span className="small">Tahsilat: {referenceSearchTotals.paymentCount} / Gider: {referenceSearchTotals.expenseCount}</span>
                    </article>
                    <article className="card stat stat-tone-good">
                      <h4>Tahsilat Toplami</h4>
                      <p>{formatTry(referenceSearchTotals.paymentTotal)}</p>
                      <span className="small">Referansla eslesen odemeler</span>
                    </article>
                    <article className={`card stat ${referenceSearchTotals.net < 0 ? "stat-tone-danger" : "stat-tone-warn"}`}>
                      <h4>Net</h4>
                      <p>{formatTry(referenceSearchTotals.net)}</p>
                      <span className="small">Tahsilat - Gider</span>
                    </article>
                  </div>
                )}

                <div className="report-column-menu-group">
                  <details className="report-column-menu">
                    <summary>Kolonlar</summary>
                    <div className="report-column-menu-list">
                      <label>
                        <input
                          type="checkbox"
                          checked={referenceSearchColumnVisibility.date}
                          onChange={() => toggleReferenceSearchColumn("date")}
                        />
                        Tarih
                      </label>
                      <label>
                        <input
                          type="checkbox"
                          checked={referenceSearchColumnVisibility.movementType}
                          onChange={() => toggleReferenceSearchColumn("movementType")}
                        />
                        Hareket
                      </label>
                      <label>
                        <input
                          type="checkbox"
                          checked={referenceSearchColumnVisibility.amount}
                          onChange={() => toggleReferenceSearchColumn("amount")}
                        />
                        Tutar
                      </label>
                      <label>
                        <input
                          type="checkbox"
                          checked={referenceSearchColumnVisibility.method}
                          onChange={() => toggleReferenceSearchColumn("method")}
                        />
                        Yontem
                      </label>
                      <label>
                        <input
                          type="checkbox"
                          checked={referenceSearchColumnVisibility.reference}
                          onChange={() => toggleReferenceSearchColumn("reference")}
                        />
                        Referans
                      </label>
                      <label>
                        <input
                          type="checkbox"
                          checked={referenceSearchColumnVisibility.apartment}
                          onChange={() => toggleReferenceSearchColumn("apartment")}
                        />
                        Daire
                      </label>
                      <label>
                        <input
                          type="checkbox"
                          checked={referenceSearchColumnVisibility.source}
                          onChange={() => toggleReferenceSearchColumn("source")}
                        />
                        Kaynak
                      </label>
                      <label>
                        <input
                          type="checkbox"
                          checked={referenceSearchColumnVisibility.description}
                          onChange={() => toggleReferenceSearchColumn("description")}
                        />
                        Aciklama
                      </label>
                      <label>
                        <input
                          type="checkbox"
                          checked={referenceSearchColumnVisibility.actions}
                          onChange={() => toggleReferenceSearchColumn("actions")}
                        />
                        Islem
                      </label>
                    </div>
                  </details>
                </div>

                <div className="table-wrap compact-row-top-gap reference-search-wrap">
                  <table className="apartment-list-table report-compact-table reference-search-table">
                    <thead>
                      <tr>
                        {referenceSearchColumnVisibility.date && <th>Tarih</th>}
                        {referenceSearchColumnVisibility.movementType && <th>Hareket</th>}
                        {referenceSearchColumnVisibility.amount && <th className="col-num">Tutar</th>}
                        {referenceSearchColumnVisibility.method && <th>Yontem</th>}
                        {referenceSearchColumnVisibility.reference && <th>Referans</th>}
                        {referenceSearchColumnVisibility.apartment && <th>Daire</th>}
                        {referenceSearchColumnVisibility.source && <th>Kaynak</th>}
                        {referenceSearchColumnVisibility.description && <th>Aciklama</th>}
                        {referenceSearchColumnVisibility.actions && <th>Islem</th>}
                      </tr>
                    </thead>
                    <tbody>
                      {referenceSearchRows.length === 0 ? (
                        <tr>
                          <td colSpan={referenceSearchVisibleColumnCount} className="empty">
                            Kayit bulunmuyor. Referans girip Calistir butonuna basin.
                          </td>
                        </tr>
                      ) : (
                        referenceSearchRows.map((row) => {
                          const rowKey = `${row.movementType}-${row.movementId}`;
                          const isEditing = editingReferenceMovementKey === rowKey;
                          const sourceLabel =
                            row.source === "BANK_STATEMENT_UPLOAD"
                              ? "Banka Upload"
                              : row.source === "PAYMENT_UPLOAD"
                                ? "Toplu Odeme Upload"
                                : row.source === "CHARGE_DISTRIBUTION"
                                  ? "Dagitim"
                                  : "Manuel";
                          const sourceDetail = row.fileName ? `${sourceLabel} (${row.fileName})` : sourceLabel;
                          const descriptionText = row.description ?? "-";

                          return (
                            <tr key={rowKey}>
                              {referenceSearchColumnVisibility.date && <td>
                                {isEditing ? (
                                  <input
                                    type="date"
                                    title="Hareket tarihi"
                                    value={referenceEditForm.occurredAt}
                                    onChange={(e) => setReferenceEditForm((prev) => ({ ...prev, occurredAt: e.target.value }))}
                                  />
                                ) : (
                                  formatDateTr(row.occurredAt)
                                )}
                              </td>}
                              {referenceSearchColumnVisibility.movementType && <td>{row.movementType === "PAYMENT" ? "Tahsilat" : "Gider"}</td>}
                              {referenceSearchColumnVisibility.amount && <td className="col-num">
                                {isEditing ? (
                                  <input
                                    type="number"
                                    step="0.01"
                                    title="Hareket tutari"
                                    value={referenceEditForm.amount}
                                    onChange={(e) => setReferenceEditForm((prev) => ({ ...prev, amount: e.target.value }))}
                                  />
                                ) : (
                                  formatTry(row.amount)
                                )}
                              </td>}
                              {referenceSearchColumnVisibility.method && <td>
                                {isEditing ? (
                                  <select
                                    title="Odeme yontemi"
                                    value={referenceEditForm.method}
                                    onChange={(e) =>
                                      setReferenceEditForm((prev) => ({ ...prev, method: e.target.value as PaymentMethod }))
                                    }
                                  >
                                    {(paymentMethodOptions.filter((x) => x.isActive).length > 0
                                      ? paymentMethodOptions.filter((x) => x.isActive)
                                      : paymentMethodOptions
                                    ).map((item) => (
                                      <option key={item.id} value={item.code}>
                                        {item.name}
                                      </option>
                                    ))}
                                  </select>
                                ) : (
                                  row.method ?? "-"
                                )}
                              </td>}
                              {referenceSearchColumnVisibility.reference && <td>
                                {isEditing ? (
                                  <input
                                    title="Referans numarasi"
                                    value={referenceEditForm.reference}
                                    onChange={(e) => setReferenceEditForm((prev) => ({ ...prev, reference: e.target.value }))}
                                  />
                                ) : (
                                  row.reference ?? "-"
                                )}
                              </td>}
                              {referenceSearchColumnVisibility.apartment && <td>
                                {isEditing && row.movementType === "PAYMENT" ? (
                                  <select
                                    title="Daire"
                                    value={referenceEditForm.apartmentId}
                                    onChange={(e) =>
                                      setReferenceEditForm((prev) => ({ ...prev, apartmentId: e.target.value }))
                                    }
                                  >
                                    <option value="">Daire secin</option>
                                    {apartmentOptions
                                      .slice()
                                      .sort((a, b) => a.doorNo.localeCompare(b.doorNo, "tr", { numeric: true }))
                                      .map((apt) => (
                                        <option key={apt.id} value={apt.id}>{`${apt.blockName}/${apt.doorNo}`}</option>
                                      ))}
                                  </select>
                                ) : row.apartmentDoorNos.length > 0 ? (
                                  row.apartmentDoorNos.join(", ")
                                ) : (
                                  "-"
                                )}
                              </td>}
                              {referenceSearchColumnVisibility.source && <td>
                                <span className="reference-search-ellipsis" title={sourceDetail}>
                                  {sourceDetail}
                                </span>
                              </td>}
                              {referenceSearchColumnVisibility.description && <td>
                                {isEditing ? (
                                  <input
                                    title="Hareket aciklamasi"
                                    value={referenceEditForm.description}
                                    onChange={(e) => setReferenceEditForm((prev) => ({ ...prev, description: e.target.value }))}
                                  />
                                ) : (
                                  <span className="reference-search-ellipsis" title={descriptionText}>
                                    {descriptionText}
                                  </span>
                                )}
                              </td>}
                              {referenceSearchColumnVisibility.actions && <td className="actions-cell">
                                {isEditing ? (
                                  <>
                                    <button
                                      className="btn btn-ghost"
                                      type="button"
                                      onClick={() => void saveReferenceMovement(row)}
                                      disabled={loading}
                                    >
                                      Kaydet
                                    </button>
                                    <button className="btn btn-ghost" type="button" onClick={cancelEditReferenceMovement}>
                                      Vazgec
                                    </button>
                                  </>
                                ) : (
                                  <>
                                    <button
                                      className="btn btn-ghost"
                                      type="button"
                                      onClick={() => startEditReferenceMovement(row)}
                                      disabled={loading}
                                    >
                                      Duzelt
                                    </button>
                                    <button
                                      className="btn btn-danger"
                                      type="button"
                                      onClick={() => void deleteReferenceMovement(row)}
                                      disabled={loading}
                                    >
                                      Sil
                                    </button>
                                  </>
                                )}
                              </td>}
                            </tr>
                          );
                        })
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </section>
          }
        />
        <Route
          path="/apartments/:mode"
          element={
            <Suspense fallback={<LazyAdminPageFallback />}>
              <ApartmentFormPage />
            </Suspense>
          }
        />
        <Route
          path="/charge-types"
          element={
            <section className="dashboard compact-management-page">
              <form className="card admin-form" onSubmit={onSubmitChargeType}>
                <div className="section-head">
                  <h3>{editingChargeTypeId ? "Tahakkuk Tipi Degistir" : "Tahakkuk Tipi Ekle"}</h3>
                  <div className="admin-row">
                    <button className="btn btn-primary" type="submit" disabled={loading}>
                      {editingChargeTypeId ? "Degisiklikleri Kaydet" : "Tip Ekle"}
                    </button>
                    <button className="btn btn-ghost" type="button" onClick={cancelEditChargeType}>Temizle</button>
                  </div>
                </div>
                <div className="charge-type-form-inline">
                  <label>
                    Kod
                    <input
                      value={chargeTypeForm.code}
                      onChange={(e) => setChargeTypeForm((prev) => ({ ...prev, code: e.target.value }))}
                      placeholder="AIDAT"
                      required
                    />
                  </label>
                  <label>
                    Ad
                    <input
                      value={chargeTypeForm.name}
                      onChange={(e) => setChargeTypeForm((prev) => ({ ...prev, name: e.target.value }))}
                      placeholder="Aidat"
                      required
                    />
                  </label>
                  <label>
                    Odemeyi Kim Yapacak?
                    <select
                      value={chargeTypeForm.payerTarget}
                      onChange={(e) =>
                        setChargeTypeForm((prev) => ({
                          ...prev,
                          payerTarget: e.target.value as "OWNER" | "TENANT",
                        }))
                      }
                    >
                      <option value="OWNER">Ev Sahibi</option>
                      <option value="TENANT">Kiraci</option>
                    </select>
                  </label>
                  <label className="checkbox-row charge-type-inline-active">
                    <input
                      type="checkbox"
                      checked={chargeTypeForm.isActive}
                      onChange={(e) => setChargeTypeForm((prev) => ({ ...prev, isActive: e.target.checked }))}
                    />
                    Aktif
                  </label>
                </div>
              </form>

              <div className="card table-card">
                <h3>Tahakkuk Tipi Listesi</h3>
                <div className="table-wrap">
                  <table className="filter-table">
                    <thead>
                      <tr>
                        <th>Kod</th>
                        <th>Ad</th>
                        <th>Odeyecek</th>
                        <th>Durum</th>
                        <th>Islem</th>
                      </tr>
                    </thead>
                    <tbody>
                      {chargeTypeOptions.map((item) => (
                        <tr key={item.id}>
                          <td>{item.code}</td>
                          <td>{item.name}</td>
                          <td>{item.payerTarget === "OWNER" ? "Ev Sahibi" : "Kiraci"}</td>
                          <td>{item.isActive ? "Aktif" : "Pasif"}</td>
                          <td className="actions-cell">
                            <button
                              className="btn btn-ghost"
                              type="button"
                              onClick={() => startEditChargeType(item)}
                            >
                              Degistir
                            </button>
                            <button className="btn btn-danger" type="button" onClick={() => void deleteChargeType(item)}>
                              Sil
                            </button>
                          </td>
                        </tr>
                      ))}
                      {chargeTypeOptions.length === 0 && (
                        <tr>
                          <td colSpan={5} className="empty">
                            Tahakkuk tipi yok
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </section>
          }
        />
        <Route
          path="/charges/new"
          element={
            <Suspense fallback={<LazyAdminPageFallback />}>
              <ChargeEntryPage
                loading={loading}
                apartmentOptions={apartmentOptions}
                chargeTypeOptions={chargeTypeOptions}
                onCreateCharge={onCreateCharge}
              />
            </Suspense>
          }
        />
        <Route
          path="/charges/bulk"
          element={
            <Suspense fallback={<LazyAdminPageFallback />}>
              <ChargeBulkPage
                loading={loading}
                chargeTypeOptions={chargeTypeOptions}
                apartmentClassOptions={apartmentClassOptions}
                apartmentDutyOptions={apartmentDutyOptions}
                onCreateBulkCharge={onCreateBulkCharge}
              />
            </Suspense>
          }
        />
        <Route
          path="/charges/gas-calculator"
          element={
            <section className="dashboard expense-dist-page">
              <div className="card admin-form expense-dist-form-surface">
                <h3>Gider Dagitimi ve Tahakkuk</h3>
                <p className="small">
                  Gider tipini, daire secimini, katsayilari ve yuvarlama kuralini belirleyin. Hesaplama sonucunu
                  kontrol ettikten sonra Ekle ile veritabanina kaydedin.
                </p>

                <div className="expense-dist-section-head">
                  <h4 className="sheet-section-title">🧾 Fatura Bilgileri</h4>
                  <p className="small">Fatura temel bilgileri, donem araligi ve tutar bilgilerini girin.</p>
                </div>
                <div className="compact-row expense-dist-bill-row-1">
                  <label>
                    Gider Tipi
                    <select
                      value={expenseDistForm.chargeTypeId}
                      onChange={(e) => setExpenseDistForm((prev) => ({ ...prev, chargeTypeId: e.target.value }))}
                      required
                    >
                      <option value="">Seciniz</option>
                      {chargeTypeOptions
                        .filter((x) => x.isActive)
                        .map((x) => (
                          <option key={x.id} value={x.id}>
                            {x.name} ({x.code})
                          </option>
                        ))}
                    </select>
                  </label>
                  <label>
                    Fatura Tarihi
                    <input
                      type="date"
                      value={expenseDistForm.invoiceDate}
                      onChange={(e) => setExpenseDistForm((prev) => ({ ...prev, invoiceDate: e.target.value }))}
                    />
                  </label>
                  <label>
                    Fatura Period Baslangic
                    <input
                      type="date"
                      value={expenseDistForm.periodStartDate}
                      onChange={(e) => setExpenseDistForm((prev) => ({ ...prev, periodStartDate: e.target.value }))}
                    />
                  </label>
                  <label>
                    Fatura Period Bitis
                    <input
                      type="date"
                      value={expenseDistForm.periodEndDate}
                      onChange={(e) => setExpenseDistForm((prev) => ({ ...prev, periodEndDate: e.target.value }))}
                    />
                  </label>
                </div>

                <div className="compact-row expense-dist-bill-row-2">
                  <label>
                    Ay
                    <input
                      type="number"
                      min={1}
                      max={12}
                      value={expenseDistForm.period}
                      onChange={(e) => setExpenseDistForm((prev) => ({ ...prev, period: e.target.value }))}
                      placeholder="Orn: 3"
                      inputMode="numeric"
                      required
                    />
                  </label>
                  <label>
                    Son Odeme Tarihi
                    <input
                      type="date"
                      value={expenseDistForm.dueDate}
                      onChange={(e) => setExpenseDistForm((prev) => ({ ...prev, dueDate: e.target.value }))}
                    />
                  </label>
                  <label>
                    Fatura Tutari (TL)
                    <input
                      type="text"
                      inputMode="decimal"
                      value={expenseDistForm.billAmount}
                      onChange={(e) => setExpenseDistForm((prev) => ({ ...prev, billAmount: e.target.value }))}
                      onBlur={(e) => {
                        const parsed = parseDistDecimal(e.target.value);
                        if (Number.isFinite(parsed)) {
                          setExpenseDistForm((prev) => ({ ...prev, billAmount: formatDecimalInput(parsed) }));
                        }
                      }}
                      placeholder="Orn: 168.673,00"
                    />
                  </label>
                  <label>
                    Fatura Upload
                    <input
                      key={expenseDistUploadInputKey}
                      type="file"
                      onChange={(e) => setInvoiceUploadFile(e.target.files?.[0] ?? null)}
                    />
                  </label>
                  <label>
                    Fatura No
                    <input
                      value={expenseDistForm.invoiceNo}
                      onChange={(e) => setExpenseDistForm((prev) => ({ ...prev, invoiceNo: e.target.value }))}
                      placeholder="Opsiyonel"
                    />
                  </label>
                  <label>
                    Aciklama
                    <input
                      value={expenseDistForm.description}
                      onChange={(e) => setExpenseDistForm((prev) => ({ ...prev, description: e.target.value }))}
                      placeholder="Opsiyonel"
                    />
                  </label>
                </div>

                <div className="expense-dist-section-head">
                  <h4 className="sheet-section-title">⚖️ Katsayi Dagitim Secimi</h4>
                  <p className="small">Daire filtrelerini ve katsayi bazini secerek dagitim modelini olusturun.</p>
                </div>
                <div className="compact-row expense-dist-coeff-row">
                  <div className="filter-dropdown-field">
                    <span>Daire Filtreleri ve Secimi</span>
                    <details className="filter-dropdown">
                      <summary>
                        Filtreyi ac
                        <span className="small">
                          Tip: {expenseDistForm.selectedApartmentTypes.length} | Blok: {expenseDistForm.selectedBlockNames.length} | Daire: {expenseDistForm.selectedApartmentIds.length} | Haric: {expenseDistForm.excludedApartmentIds.length}
                        </span>
                      </summary>

                      <div className="filter-dropdown-panel">
                        <section className="filter-dropdown-section">
                          <div className="filter-dropdown-head">
                            <strong>Sinif Secimi</strong>
                            <div className="admin-row">
                              <button className="btn btn-ghost" type="button" onClick={selectAllExpenseDistApartmentTypes}>
                                Hepsini Sec
                              </button>
                              <button className="btn btn-ghost" type="button" onClick={clearAllExpenseDistApartmentTypes}>
                                Hepsini Kaldir
                              </button>
                            </div>
                          </div>
                          <div className="filter-dropdown-grid">
                            {(["KUCUK", "BUYUK"] as ApartmentType[]).map((type) => (
                              <label key={type} className="month-chip">
                                <input
                                  type="checkbox"
                                  checked={expenseDistForm.selectedApartmentTypes.includes(type)}
                                  onChange={(e) => setExpenseDistApartmentTypeChecked(type, e.target.checked)}
                                />
                                {type}
                              </label>
                            ))}
                          </div>
                        </section>

                        <section className="filter-dropdown-section">
                          <div className="filter-dropdown-head">
                            <strong>Blok Secimi</strong>
                            <div className="admin-row">
                              <button className="btn btn-ghost" type="button" onClick={selectAllExpenseDistBlocks}>
                                Hepsini Sec
                              </button>
                              <button className="btn btn-ghost" type="button" onClick={clearAllExpenseDistBlocks}>
                                Hepsini Kaldir
                              </button>
                            </div>
                          </div>
                          <div className="filter-dropdown-grid">
                            {blockOptions.map((block) => (
                              <label key={block.id} className="month-chip">
                                <input
                                  type="checkbox"
                                  checked={expenseDistForm.selectedBlockNames.includes(block.name)}
                                  onChange={(e) => setExpenseDistBlockChecked(block.name, e.target.checked)}
                                />
                                {block.name}
                              </label>
                            ))}
                          </div>
                        </section>

                        <section className="filter-dropdown-section">
                          <div className="filter-dropdown-head">
                            <strong>Daire Secimi</strong>
                            <div className="admin-row">
                              <button className="btn btn-ghost" type="button" onClick={selectAllExpenseDistApartments}>
                                Hepsini Sec
                              </button>
                              <button className="btn btn-ghost" type="button" onClick={clearAllExpenseDistApartments}>
                                Hepsini Kaldir
                              </button>
                            </div>
                          </div>
                          <div className="filter-dropdown-grid">
                            {expenseDistApartmentSelectionOptions.map((apt) => (
                              <label key={apt.id} className="month-chip">
                                <input
                                  type="checkbox"
                                  checked={expenseDistForm.selectedApartmentIds.includes(apt.id)}
                                  onChange={(e) => setExpenseDistApartmentChecked(apt.id, e.target.checked)}
                                />
                                {apt.blockName}/{apt.doorNo}
                                {apt.ownerFullName ? ` - ${apt.ownerFullName}` : ""}
                                {` (${apt.type})`}
                              </label>
                            ))}
                          </div>
                        </section>

                        <section className="filter-dropdown-section">
                          <div className="filter-dropdown-head">
                            <strong>Hesaplamaya Dahil Olmayan Daireler</strong>
                            <div className="admin-row">
                              <button className="btn btn-ghost" type="button" onClick={selectAllExpenseDistExcludedApartments}>
                                Hepsini Sec
                              </button>
                              <button className="btn btn-ghost" type="button" onClick={clearAllExpenseDistExcludedApartments}>
                                Hepsini Kaldir
                              </button>
                            </div>
                          </div>
                          <div className="filter-dropdown-grid">
                            {apartmentOptions.map((apt) => (
                              <label key={`exclude-${apt.id}`} className="month-chip">
                                <input
                                  type="checkbox"
                                  checked={expenseDistForm.excludedApartmentIds.includes(apt.id)}
                                  onChange={(e) => setExpenseDistExcludedApartmentChecked(apt.id, e.target.checked)}
                                />
                                {apt.blockName}/{apt.doorNo}
                                {apt.ownerFullName ? ` - ${apt.ownerFullName}` : ""}
                                {` (${apt.type})`}
                              </label>
                            ))}
                          </div>
                        </section>
                      </div>
                    </details>
                  </div>
                  <label>
                    Katsayi Bazi
                    <input
                      value={
                        expenseDistEffectiveCoefficientScope === "BY_APARTMENT"
                          ? "Secilen dairelere gore"
                          : expenseDistEffectiveCoefficientScope === "BY_BLOCK"
                            ? "Secilen bloklara gore"
                            : "Sinif secimine gore"
                      }
                      readOnly
                    />
                  </label>
                  <label>
                    Kucuk Daire Katsayisi
                    <input
                      type="text"
                      inputMode="decimal"
                      value={expenseDistForm.smallCoefficient}
                      onChange={(e) => setExpenseDistForm((prev) => ({ ...prev, smallCoefficient: e.target.value }))}
                    />
                  </label>
                  <label>
                    Buyuk Daire Katsayisi
                    <input
                      type="text"
                      inputMode="decimal"
                      value={expenseDistForm.bigCoefficient}
                      onChange={(e) => setExpenseDistForm((prev) => ({ ...prev, bigCoefficient: e.target.value }))}
                    />
                  </label>
                </div>

                {expenseDistEffectiveCoefficientScope === "BY_BLOCK" && expenseDistForm.selectedBlockNames.length > 0 && (
                  <div className="table-wrap compact-row-top-gap">
                    <table className="apartment-list-table report-compact-table">
                      <thead>
                        <tr>
                          <th>Blok</th>
                          <th>Kucuk Katsayi</th>
                          <th>Buyuk Katsayi</th>
                        </tr>
                      </thead>
                      <tbody>
                        {expenseDistForm.selectedBlockNames.map((blockName) => (
                          <tr key={blockName}>
                            <td>{blockName}</td>
                            <td>
                              <input
                                type="text"
                                inputMode="decimal"
                                value={expenseDistForm.blockCoefficients[blockName]?.KUCUK ?? ""}
                                onChange={(e) =>
                                  setExpenseDistForm((prev) => ({
                                    ...prev,
                                    blockCoefficients: {
                                      ...prev.blockCoefficients,
                                      [blockName]: {
                                        KUCUK: e.target.value,
                                        BUYUK: prev.blockCoefficients[blockName]?.BUYUK ?? "",
                                      },
                                    },
                                  }))
                                }
                                placeholder={`Varsayilan: ${expenseDistForm.smallCoefficient}`}
                              />
                            </td>
                            <td>
                              <input
                                type="text"
                                inputMode="decimal"
                                value={expenseDistForm.blockCoefficients[blockName]?.BUYUK ?? ""}
                                onChange={(e) =>
                                  setExpenseDistForm((prev) => ({
                                    ...prev,
                                    blockCoefficients: {
                                      ...prev.blockCoefficients,
                                      [blockName]: {
                                        KUCUK: prev.blockCoefficients[blockName]?.KUCUK ?? "",
                                        BUYUK: e.target.value,
                                      },
                                    },
                                  }))
                                }
                                placeholder={`Varsayilan: ${expenseDistForm.bigCoefficient}`}
                              />
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}

                {expenseDistEffectiveCoefficientScope === "BY_APARTMENT" && (
                  <div className="table-wrap compact-row-top-gap">
                    <table className="apartment-list-table report-compact-table">
                      <thead>
                        <tr>
                          <th>Daire</th>
                          <th>Tip</th>
                          <th>Oturan</th>
                          <th>Katsayi</th>
                        </tr>
                      </thead>
                      <tbody>
                        {expenseDistSelectedApartmentRows.length === 0 ? (
                          <tr>
                            <td colSpan={4} className="empty">
                              Daire Secimi bolumunden en az bir daire isaretleyin.
                            </td>
                          </tr>
                        ) : (
                          expenseDistSelectedApartmentRows.map((apt) => (
                            <tr key={apt.id}>
                              <td>
                                {apt.blockName}/{apt.doorNo}
                              </td>
                              <td>{apt.type}</td>
                              <td>{apt.occupancyType === "TENANT" ? "Kiraci" : "Ev Sahibi"}</td>
                              <td>
                                <input
                                  type="text"
                                  inputMode="decimal"
                                  value={expenseDistForm.apartmentCoefficients[apt.id] ?? ""}
                                  onChange={(e) => setExpenseDistApartmentCoefficient(apt.id, e.target.value)}
                                  placeholder={`Varsayilan: ${apt.type === "KUCUK" ? expenseDistForm.smallCoefficient : expenseDistForm.bigCoefficient}`}
                                />
                              </td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
                )}

                <div className="expense-dist-section-head">
                  <h4 className="sheet-section-title">🔧 Yuvarlama</h4>
                  <p className="small">Yuvarlama yonu ve adimini belirleyerek son dagitim tutarini netlestirin.</p>
                </div>
                <div className="compact-row compact-row-top-gap">
                  <label>
                    Yuvarlama Yon
                    <select
                      value={expenseDistForm.roundingDirection}
                      onChange={(e) =>
                        setExpenseDistForm((prev) => ({ ...prev, roundingDirection: e.target.value as "UP" | "DOWN" }))
                      }
                    >
                      <option value="UP">Yukari</option>
                      <option value="DOWN">Asagi</option>
                    </select>
                  </label>
                  <label>
                    Yuvarlama Adimi
                    <select
                      value={String(expenseDistForm.roundingStep)}
                      onChange={(e) =>
                        setExpenseDistForm((prev) => ({ ...prev, roundingStep: Number(e.target.value) }))
                      }
                    >
                      {Array.from({ length: 10 }, (_, idx) => idx + 1).map((step) => (
                        <option key={step} value={step}>
                          {step}
                        </option>
                      ))}
                    </select>
                  </label>
                </div>

                <div className="compact-row compact-row-top-gap">
                  <button type="button" className="btn btn-primary" onClick={onAddExpenseDistribution} disabled={loading}>
                    Ekle
                  </button>
                </div>

              </div>

              <div className="card table-card">
                <h3>Fatura Bilgisi</h3>
                <div className="table-wrap">
                  <table className="apartment-list-table report-compact-table">
                    <thead>
                      <tr>
                        <th>Fatura Tarihi</th>
                        <th>Fatura No</th>
                        <th>Fatura Tutari</th>
                        <th>Baslangic Periodu</th>
                        <th>Bitis Periodu</th>
                        <th>Dagitim - Fatura Farki</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr>
                        <td>{expenseDistForm.invoiceDate ? formatDateTr(expenseDistForm.invoiceDate) : "-"}</td>
                        <td>{expenseDistForm.invoiceNo.trim() || "-"}</td>
                        <td>
                          {expenseDistForm.billAmount.trim()
                            ? (() => {
                                const parsedAmount = parseDistDecimal(expenseDistForm.billAmount);
                                return Number.isFinite(parsedAmount) ? formatTry(parsedAmount) : expenseDistForm.billAmount;
                              })()
                            : "-"}
                        </td>
                        <td>{expenseDistForm.periodStartDate ? formatDateTr(expenseDistForm.periodStartDate) : "-"}</td>
                        <td>{expenseDistForm.periodEndDate ? formatDateTr(expenseDistForm.periodEndDate) : "-"}</td>
                        <td>
                          {expenseDistResult
                            ? formatTry(expenseDistResult.roundingDiff)
                            : expenseDistDraft.ready
                              ? formatTry(expenseDistDraft.result.roundingDiff)
                              : "-"}
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>

              <div className="card table-card">
                <div className="section-head">
                  <h3>Daire Bazli Dagitim</h3>
                  <div className="actions-cell">
                    <button
                      className="btn btn-danger"
                      type="button"
                      onClick={clearAllExpenseDistRows}
                      disabled={!expenseDistResult || expenseDistResult.rows.length === 0}
                    >Temizle</button>
                    <button
                      className="btn btn-primary"
                      type="button"
                      onClick={onSaveExpenseDistribution}
                      disabled={loading || !expenseDistResult || expenseDistResult.rows.length === 0}
                    >
                      Kaydet ve Dagit
                    </button>
                  </div>
                </div>
                <div className="table-wrap">
                  <table className="apartment-list-table report-compact-table">
                    <thead>
                      <tr>
                        <th>Blok</th>
                        <th>Daire</th>
                        <th>Tip</th>
                        <th>Katsayi</th>
                        <th>Tutar</th>
                        <th>Islem</th>
                      </tr>
                    </thead>
                    <tbody>
                      {!expenseDistResult || expenseDistResult.rows.length === 0 ? (
                        <tr>
                          <td colSpan={6} className="empty">
                            Sonuc bulunmuyor
                          </td>
                        </tr>
                      ) : (
                        expenseDistResult.rows.map((row) => (
                          <tr key={row.apartmentId}>
                            <td>{row.blockName}</td>
                            <td>{row.doorNo}</td>
                            <td>{row.type}</td>
                            <td>{row.coefficient}</td>
                            <td>{formatTry(row.amount)}</td>
                            <td className="actions-cell">
                              <button className="btn btn-ghost" type="button" onClick={() => editExpenseDistRow(row)}>
                                Degistir
                              </button>
                              <button className="btn btn-danger" type="button" onClick={() => deleteExpenseDistRow(row.apartmentId)}>
                                Sil
                              </button>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </section>
          }
        />
        <Route
          path="/charges/bulk-correct"
          element={
            <section className="dashboard">
              <form className="card admin-form" onSubmit={onBulkCorrectCharges}>
                <div className="section-head">
                  <h3>Toplu Tahakkuk Silme ve Duzeltme</h3>
                  <div className="admin-row">
                    <button className="btn btn-primary" type="submit" disabled={loading}>
                      Faturalari Listele
                    </button>
                    <button
                      className="btn btn-ghost"
                      type="button"
                      onClick={() => {
                        setBulkCorrectionForm((prev) => ({
                          ...prev,
                          periodYear: String(new Date().getFullYear()),
                          periodMonths: [],
                          chargeTypeId: "",
                          accrualDateFrom: "",
                          accrualDateTo: "",
                        }));
                        setDistributedInvoiceRows([]);
                        setMessage("Filtreler temizlendi");
                      }}
                    >Temizle</button>
                  </div>
                </div>
                <p className="small">
                  Faturalar tek satirda listelenir. Bir satiri sildiginizde o faturaya bagli tum dagitim tahakkuklari silinir.
                </p>

                <div className="bulk-correct-filter-row">
                  <label>
                    Yil
                    <input
                      type="number"
                      value={bulkCorrectionForm.periodYear}
                      onChange={(e) => setBulkCorrectionForm((prev) => ({ ...prev, periodYear: e.target.value }))}
                    />
                  </label>

                  <label>
                    Tahakkuk Tipi
                    <select
                      value={bulkCorrectionForm.chargeTypeId}
                      onChange={(e) => setBulkCorrectionForm((prev) => ({ ...prev, chargeTypeId: e.target.value }))}
                    >
                      <option value="">Tum Tipler</option>
                      {chargeTypeOptions
                        .filter((x) => x.isActive)
                        .map((x) => (
                          <option key={x.id} value={x.id}>
                            {x.name} ({x.code})
                          </option>
                        ))}
                    </select>
                  </label>

                  <label>
                    Tahakkuk Tarihi Baslangic
                    <input
                      type="date"
                      value={bulkCorrectionForm.accrualDateFrom}
                      onChange={(e) => setBulkCorrectionForm((prev) => ({ ...prev, accrualDateFrom: e.target.value }))}
                    />
                  </label>

                  <label>
                    Tahakkuk Tarihi Bitis
                    <input
                      type="date"
                      value={bulkCorrectionForm.accrualDateTo}
                      onChange={(e) => setBulkCorrectionForm((prev) => ({ ...prev, accrualDateTo: e.target.value }))}
                    />
                  </label>

                  <label className="bulk-correct-month-filter">
                    Ay Secimi (bos birakirsan tum aylar)
                    <details className="filter-dropdown apartment-edit-select-dropdown">
                      <summary>
                        {bulkCorrectionForm.periodMonths.length === 0
                          ? "Tum aylar"
                          : bulkCorrectionForm.periodMonths.length === monthOptions.length
                            ? "Tum aylar"
                            : bulkCorrectionForm.periodMonths.join(", ")}
                      </summary>
                      <div className="filter-dropdown-panel apartment-edit-select-list charge-bulk-month-panel">
                        <label className="bulk-filter-option apartment-edit-select-item">
                          <input
                            type="checkbox"
                            checked={bulkCorrectionForm.periodMonths.length === monthOptions.length}
                            onChange={(e) =>
                              setBulkCorrectionForm((prev) => ({
                                ...prev,
                                periodMonths: e.target.checked ? [...monthOptions] : [],
                              }))
                            }
                          />
                          Hepsini Sec
                        </label>

                        {monthOptions.map((month) => {
                          const checked = bulkCorrectionForm.periodMonths.includes(month);
                          return (
                            <label key={month} className="bulk-filter-option apartment-edit-select-item">
                              <input
                                type="checkbox"
                                checked={checked}
                                onChange={(e) => {
                                  setBulkCorrectionForm((prev) => {
                                    const next = e.target.checked
                                      ? [...prev.periodMonths, month]
                                      : prev.periodMonths.filter((m) => m !== month);
                                    return { ...prev, periodMonths: [...new Set(next)].sort((a, b) => a - b) };
                                  });
                                }}
                              />
                              Ay {month}
                            </label>
                          );
                        })}
                      </div>
                    </details>
                  </label>
                </div>

              </form>

              <div className="card table-card">
                <h3>Fatura Bazli Dagitimlar</h3>
                <table>
                  <thead>
                    <tr>
                      <th>Fatura</th>
                      <th>Donem</th>
                      <th>Tahakkuk Tipi</th>
                      <th>Son Odeme</th>
                      <th>Daire</th>
                      <th className="col-num">Toplam</th>
                      <th>Bagli Tahsilat</th>
                      <th>Islem</th>
                    </tr>
                  </thead>
                  <tbody>
                    {distributedInvoiceRows.length === 0 ? (
                      <tr>
                        <td colSpan={8}>Kayit yok</td>
                      </tr>
                    ) : (
                      distributedInvoiceRows.map((row) => {
                        const rowKey = `${row.chargeTypeId}|${row.periodYear}|${row.periodMonth}|${row.description ?? ""}`;
                        return (
                          <tr key={rowKey}>
                            <td>{row.invoiceFileName}</td>
                            <td>{`${row.periodMonth}/${row.periodYear}`}</td>
                            <td>{`${row.chargeTypeName} (${row.chargeTypeCode})`}</td>
                            <td>{formatDateTr(row.dueDate)}</td>
                            <td>{row.chargeCount}</td>
                            <td className="col-num">{formatTry(row.totalAmount)}</td>
                            <td>{row.linkedPaymentCount}</td>
                            <td>
                              <div className="actions-cell">
                                <button className="btn btn-ghost" type="button" onClick={() => openDistributedInvoiceDetailPage(row)}>
                                  Duzelt
                                </button>
                                <button
                                  className="btn btn-danger"
                                  type="button"
                                  disabled={!row.canDelete || deletingDistributedInvoiceKey === rowKey}
                                  onClick={() => void deleteDistributedInvoiceRow(row)}
                                >
                                  {deletingDistributedInvoiceKey === rowKey
                                    ? "Siliniyor..."
                                    : row.canDelete
                                      ? "Toplu Sil"
                                      : "Tahsilat Var"}
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </section>
          }
        />
        <Route
          path="/charges/bulk-correct/edit"
          element={
            (() => {
              const criteria = getBulkCorrectDetailCriteriaFromSearch(location.search);
              const selectedChargeTypeName =
                chargeTypeOptions.find((x) => x.id === criteria?.chargeTypeId)?.name ?? criteria?.chargeTypeId ?? "-";
              const fallbackPeriodStart = criteria
                ? new Date(Date.UTC(criteria.periodYear, criteria.periodMonth - 1, 1)).toISOString()
                : null;
              const fallbackPeriodEnd = criteria
                ? new Date(Date.UTC(criteria.periodYear, criteria.periodMonth, 0)).toISOString()
                : null;
              const inferredInvoiceDateFromDescription = (() => {
                if (!criteria?.description) {
                  return null;
                }
                const part = criteria.description
                  .split("|")
                  .map((x) => x.trim())
                  .find((x) => /^fatura\s+tarih[ıi]\s*:/i.test(x));
                if (!part) {
                  return null;
                }
                const raw = part.replace(/^fatura\s+tarih[ıi]\s*:/i, "").trim();
                if (!raw) {
                  return null;
                }
                const iso = raw.match(/\d{4}-\d{2}-\d{2}/)?.[0];
                if (iso) {
                  return `${iso}T00:00:00.000Z`;
                }
                const tr = raw.match(/(\d{1,2})[./-](\d{1,2})[./-](\d{4})/);
                if (tr) {
                  const day = Number(tr[1]);
                  const month = Number(tr[2]);
                  const year = Number(tr[3]);
                  return new Date(Date.UTC(year, month - 1, day)).toISOString();
                }
                return null;
              })();
              const resolvedInvoiceDate = criteria?.invoiceDate || inferredInvoiceDateFromDescription;
              const resolvedDueDate = criteria?.dueDate || distributedInvoiceDetailRows[0]?.dueDate || null;

              return (
                <section className="dashboard bulk-correct-edit-page">
                  <div className="card admin-form bulk-correct-edit-head">
                    <div className="section-head">
                      <h3>Toplu Tahakkuk Duzeltme Detayi</h3>
                      <div className="admin-row">
                        <button className="btn btn-ghost" type="button" onClick={() => navigate("/admin/charges/bulk-correct")}>
                          Listeye Don
                        </button>
                      </div>
                    </div>
                    {!criteria ? (
                      <p className="small">Duzeltme bilgisi eksik. Liste ekranindan tekrar Duzelt'e basin.</p>
                    ) : (
                      <>
                        <p className="small">
                          Donem: {criteria.periodMonth}/{criteria.periodYear} | Tip: {selectedChargeTypeName} | Aciklama: {criteria.description ?? "-"}
                        </p>
                        <p className="small">
                          Fatura Tarihi: {resolvedInvoiceDate ? formatDateTr(resolvedInvoiceDate) : "-"} | Baslangic: {criteria.periodStartDate ? formatDateTr(criteria.periodStartDate) : fallbackPeriodStart ? formatDateTr(fallbackPeriodStart) : "-"} | Bitis: {criteria.periodEndDate ? formatDateTr(criteria.periodEndDate) : fallbackPeriodEnd ? formatDateTr(fallbackPeriodEnd) : "-"} | Vade: {resolvedDueDate ? formatDateTr(resolvedDueDate) : "-"}
                        </p>
                      </>
                    )}
                  </div>

                  <div className="card table-card">
                    <h3>Daire Daire Tahakkuk Satirlari</h3>
                    <div className="table-wrap">
                      <table className="apartment-list-table report-compact-table bulk-correct-edit-table">
                        <thead>
                          <tr>
                            <th>Blok</th>
                            <th>Daire</th>
                            <th>Tip</th>
                            <th>Oturan</th>
                            <th>Tahakkuk Tipi</th>
                            <th>Yil</th>
                            <th>Ay</th>
                            <th>Son Odeme</th>
                            <th className="col-num">Tutar</th>
                            <th>Aciklama</th>
                            <th>Bagli Tahsilat</th>
                            <th>Islem</th>
                          </tr>
                        </thead>
                        <tbody>
                          {distributedInvoiceDetailRows.length === 0 ? (
                            <tr>
                              <td colSpan={12} className="empty">
                                {distributedInvoiceDetailLoading
                                  ? "Detaylar yukleniyor..."
                                  : "Kayit yok veya secilen grup bulunamadi"}
                              </td>
                            </tr>
                          ) : (
                            distributedInvoiceDetailRows.map((row) => (
                              <tr key={row.id}>
                                <td>{row.blockName}</td>
                                <td>{row.doorNo}</td>
                                <td>{row.apartmentType}</td>
                                <td>{row.ownerFullName ?? "-"}</td>
                                <td>
                                  <select
                                    value={row.chargeTypeId}
                                    aria-label={`Tahakkuk tipi secimi ${row.blockName} ${row.doorNo}`}
                                    title="Tahakkuk tipi"
                                    onChange={(e) =>
                                      updateDistributedInvoiceDetailRowField(row.id, "chargeTypeId", e.target.value)
                                    }
                                  >
                                    {chargeTypeOptions.map((x) => (
                                      <option key={x.id} value={x.id}>
                                        {x.name} ({x.code})
                                      </option>
                                    ))}
                                  </select>
                                </td>
                                <td>
                                  <input
                                    type="number"
                                    value={String(row.periodYear)}
                                    aria-label={`Yil ${row.blockName} ${row.doorNo}`}
                                    title="Yil"
                                    onChange={(e) =>
                                      updateDistributedInvoiceDetailRowField(row.id, "periodYear", e.target.value)
                                    }
                                  />
                                </td>
                                <td>
                                  <input
                                    type="number"
                                    min={1}
                                    max={12}
                                    value={String(row.periodMonth)}
                                    aria-label={`Ay ${row.blockName} ${row.doorNo}`}
                                    title="Ay"
                                    onChange={(e) =>
                                      updateDistributedInvoiceDetailRowField(row.id, "periodMonth", e.target.value)
                                    }
                                  />
                                </td>
                                <td>
                                  <input
                                    type="date"
                                    value={isoToDateInput(row.dueDate)}
                                    aria-label={`Son odeme tarihi ${row.blockName} ${row.doorNo}`}
                                    title="Son odeme tarihi"
                                    onChange={(e) =>
                                      updateDistributedInvoiceDetailRowField(row.id, "dueDate", e.target.value)
                                    }
                                  />
                                </td>
                                <td className="col-num">
                                  <input
                                    type="number"
                                    step="0.01"
                                    value={String(row.amount)}
                                    aria-label={`Tutar ${row.blockName} ${row.doorNo}`}
                                    title="Tutar"
                                    onChange={(e) => updateDistributedInvoiceDetailRowField(row.id, "amount", e.target.value)}
                                  />
                                  <span className="money-preview">{formatTry(row.amount)}</span>
                                </td>
                                <td>
                                  <input
                                    value={row.description ?? ""}
                                    aria-label={`Aciklama ${row.blockName} ${row.doorNo}`}
                                    title="Aciklama"
                                    onChange={(e) =>
                                      updateDistributedInvoiceDetailRowField(row.id, "description", e.target.value)
                                    }
                                  />
                                </td>
                                <td>{row.linkedPaymentCount}</td>
                                <td className="actions-cell">
                                  <button
                                    className="btn btn-primary"
                                    type="button"
                                    disabled={savingDistributedInvoiceChargeId === row.id}
                                    onClick={() => void saveDistributedInvoiceDetailRow(row)}
                                  >
                                    {savingDistributedInvoiceChargeId === row.id ? "Kaydediliyor..." : "Kaydet"}
                                  </button>
                                </td>
                              </tr>
                            ))
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </section>
              );
            })()
          }
        />
        <Route
          path="/expense-items"
          element={
            <section className="dashboard compact-management-page expense-item-page">
              <form className="card admin-form apartment-form-surface expense-item-form-surface" onSubmit={onSubmitExpenseItem}>
                <div className="section-head">
                  <h3>{editingExpenseItemId ? "Gider Kalemi Degistir" : "Gider Kalemi Ekle"}</h3>
                  <div className="admin-row">
                    <button className="btn btn-primary" type="submit" disabled={loading}>
                      {editingExpenseItemId ? "Degisiklikleri Kaydet" : "Kalem Ekle"}
                    </button>
                    <button className="btn btn-ghost" type="button" onClick={clearExpenseItemForm}>
                      Temizle
                    </button>
                  </div>
                </div>
                <p className="small">Banka importu ve gider raporlari icin standart kalem tanimlarini yonetin.</p>
                <div className="expense-item-form-row">
                  <label>
                    Kod
                    <input
                      value={expenseItemForm.code}
                      onChange={(e) => setExpenseItemForm((prev) => ({ ...prev, code: e.target.value }))}
                      placeholder="MAAS"
                      required
                    />
                  </label>
                  <label>
                    Ad
                    <input
                      value={expenseItemForm.name}
                      onChange={(e) => setExpenseItemForm((prev) => ({ ...prev, name: e.target.value }))}
                      placeholder="Maas"
                      required
                    />
                  </label>
                  <label className="checkbox-row expense-item-form-active">
                    <input
                      type="checkbox"
                      checked={expenseItemForm.isActive}
                      onChange={(e) => setExpenseItemForm((prev) => ({ ...prev, isActive: e.target.checked }))}
                    />
                    Aktif
                  </label>
                </div>
              </form>

              <div className="card table-card expense-item-table-card">
                <div className="section-head">
                  <h3>Gider Kalemi Listesi</h3>
                  <p className="small">Toplam {expenseItemOptions.length} kalem</p>
                </div>
                <div className="table-wrap">
                  <table className="expense-item-table">
                    <thead>
                      <tr>
                        <th>Kod</th>
                        <th>Ad</th>
                        <th>Durum</th>
                        <th>Islem</th>
                      </tr>
                    </thead>
                    <tbody>
                      {expenseItemOptions.map((item) => (
                        <tr key={item.id}>
                          <td>{item.code}</td>
                          <td>{item.name}</td>
                          <td>{item.isActive ? "Aktif" : "Pasif"}</td>
                          <td className="actions-cell">
                            <button className="btn btn-ghost" type="button" onClick={() => startEditExpenseItem(item)}>
                              Degistir
                            </button>
                            <button className="btn btn-danger" type="button" onClick={() => void deleteExpenseItem(item)}>
                              Sil
                            </button>
                          </td>
                        </tr>
                      ))}
                      {expenseItemOptions.length === 0 && (
                        <tr>
                          <td colSpan={4} className="empty">
                            Gider kalemi yok
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </section>
          }
        />
        <Route
          path="/expenses/new"
          element={
            <Suspense fallback={<LazyAdminPageFallback />}>
              <ExpenseEntryPage
                loading={loading}
                expenseItemOptions={expenseItemOptions}
                paymentMethodOptions={paymentMethodOptions}
                onSubmitExpense={onSubmitExpense}
              />
            </Suspense>
          }
        />
        <Route
          path="/description-door-rules"
          element={
            <section className="dashboard compact-management-page">
              <form
                ref={descriptionDoorRuleFormRef}
                className="card admin-form description-door-rule-form"
                onSubmit={onSubmitDescriptionDoorRule}
              >
                <div className="section-head">
                  <h3>{editingDescriptionDoorRuleId ? "Esleme Kurali Degistir" : "Aciklama-Daire Esleme Ekle"}</h3>
                  <div className="admin-row">
                    <button className="btn btn-primary" type="submit" disabled={loading}>
                      {editingDescriptionDoorRuleId ? "Degisiklikleri Kaydet" : "Kural Ekle"}
                    </button>
                    <button className="btn btn-ghost" type="button" onClick={cancelEditDescriptionDoorRule}>Temizle</button>
                  </div>
                </div>
                <p className="small">
                  Aciklamada bu metin varsa ve daire no bulunamazsa secilen daire no kullanilir.
                </p>
                <div className="description-door-rule-inline compact-row-top-gap">
                  <label>
                    Daire No
                    <select
                      value={descriptionDoorRuleForm.doorNo}
                      onChange={(e) => setDescriptionDoorRuleForm((prev) => ({ ...prev, doorNo: e.target.value }))}
                      required
                    >
                      <option value="">Daire seciniz</option>
                      {apartmentOptions.map((apt) => (
                        <option key={apt.id} value={apt.doorNo}>
                          {apt.blockName} {apt.doorNo} {apt.ownerFullName ? `- ${apt.ownerFullName}` : ""}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label>
                    Aciklama Anahtar Metni
                    <input
                      value={descriptionDoorRuleForm.keyword}
                      onChange={(e) => setDescriptionDoorRuleForm((prev) => ({ ...prev, keyword: e.target.value }))}
                      placeholder="HAKAN OYMAN"
                      required
                    />
                  </label>
                  <label className="checkbox-row description-door-rule-active">
                    <input
                      type="checkbox"
                      checked={descriptionDoorRuleForm.isActive}
                      onChange={(e) =>
                        setDescriptionDoorRuleForm((prev) => ({ ...prev, isActive: e.target.checked }))
                      }
                    />
                    Aktif
                  </label>
                </div>
              </form>

              <div className="card table-card description-door-rule-list-card">
                <h3>Aciklama-Daire Esleme Listesi</h3>
                {descriptionDoorRuleForm.doorNo && (
                  <p className="small">
                    Filtre: {descriptionDoorRuleForm.doorNo} numarali daire kurallari gosteriliyor.
                  </p>
                )}
                <div className="table-wrap">
                  <table>
                    <thead>
                      <tr>
                        <th>Daire No</th>
                        <th>Anahtar Metin</th>
                        <th>Durum</th>
                        <th>Islem</th>
                      </tr>
                    </thead>
                    <tbody>
                      {[...filteredDescriptionDoorRules]
                        .sort((a, b) => a.doorNo.localeCompare(b.doorNo, "tr", { numeric: true }))
                        .map((rule) => (
                        <tr key={rule.id}>
                          <td>{rule.doorNo}</td>
                          <td>{rule.keyword}</td>
                          <td>{rule.isActive ? "Aktif" : "Pasif"}</td>
                          <td className="actions-cell">
                            <button
                              className="btn btn-ghost"
                              type="button"
                              onClick={(e) => onClickEditDescriptionDoorRule(e, rule)}
                            >
                              Degistir
                            </button>
                            <button
                              className="btn btn-danger"
                              type="button"
                              onClick={(e) => void onClickDeleteDescriptionDoorRule(e, rule)}
                            >
                              Sil
                            </button>
                          </td>
                        </tr>
                      ))}
                      {filteredDescriptionDoorRules.length === 0 && (
                        <tr>
                          <td colSpan={4} className="empty">
                            {descriptionDoorRuleForm.doorNo ? "Secilen daire icin esleme kurali yok" : "Esleme kurali yok"}
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </section>
          }
        />
        <Route
          path="/description-expense-rules"
          element={
            <section className="dashboard compact-management-page">
              <form
                ref={descriptionExpenseRuleFormRef}
                className="card admin-form description-expense-rule-form"
                onSubmit={onSubmitDescriptionExpenseRule}
              >
                <div className="section-head">
                  <h3>{editingDescriptionExpenseRuleId ? "Gider Esleme Kurali Degistir" : "Aciklama-Gider Esleme Ekle"}</h3>
                  <div className="admin-row">
                    <button className="btn btn-primary" type="submit" disabled={loading}>
                      {editingDescriptionExpenseRuleId ? "Degisiklikleri Kaydet" : "Kural Ekle"}
                    </button>
                    <button className="btn btn-ghost" type="button" onClick={cancelEditDescriptionExpenseRule}>Temizle</button>
                  </div>
                </div>
                <p className="small">Aciklamada bu metin varsa gider kalemi otomatik secilir.</p>
                <label>
                  Aciklama Anahtar Metni
                  <input
                    value={descriptionExpenseRuleForm.keyword}
                    onChange={(e) => setDescriptionExpenseRuleForm((prev) => ({ ...prev, keyword: e.target.value }))}
                    placeholder="EYUP KURUMAHMUTOGLU"
                    required
                  />
                </label>
                <label>
                  Gider Kalemi
                  <select
                    value={descriptionExpenseRuleForm.expenseItemId}
                    onChange={(e) =>
                      setDescriptionExpenseRuleForm((prev) => ({ ...prev, expenseItemId: e.target.value }))
                    }
                    required
                  >
                    <option value="">Gider kalemi seciniz</option>
                    {(expenseItemOptions.filter((x) => x.isActive).length > 0
                      ? expenseItemOptions.filter((x) => x.isActive)
                      : expenseItemOptions
                    ).map((item) => (
                      <option key={item.id} value={item.id}>
                        {item.name} ({item.code})
                      </option>
                    ))}
                  </select>
                </label>
                <label className="checkbox-row">
                  <input
                    type="checkbox"
                    checked={descriptionExpenseRuleForm.isActive}
                    onChange={(e) =>
                      setDescriptionExpenseRuleForm((prev) => ({ ...prev, isActive: e.target.checked }))
                    }
                  />
                  Aktif
                </label>
              </form>

              <div className="card table-card">
                <h3>Aciklama-Gider Esleme Listesi</h3>
                {descriptionExpenseRuleForm.expenseItemId && (
                  <p className="small">
                    Filtre: secilen gider kalemine ait kurallar gosteriliyor.
                  </p>
                )}
                <div className="table-wrap">
                  <table>
                    <thead>
                      <tr>
                        <th>Anahtar Metin</th>
                        <th>Gider Kalemi</th>
                        <th>Durum</th>
                        <th>Islem</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredDescriptionExpenseRules.map((rule) => (
                        <tr key={rule.id}>
                          <td>{rule.keyword}</td>
                          <td>
                            {rule.expenseItemName} ({rule.expenseItemCode})
                            {!rule.expenseItemIsActive && " - Pasif"}
                          </td>
                          <td>{rule.isActive ? "Aktif" : "Pasif"}</td>
                          <td className="actions-cell">
                            <button
                              className="btn btn-ghost"
                              type="button"
                              onClick={(e) => onClickEditDescriptionExpenseRule(e, rule)}
                            >
                              Degistir
                            </button>
                            <button
                              className="btn btn-danger"
                              type="button"
                              onClick={(e) => void onClickDeleteDescriptionExpenseRule(e, rule)}
                            >
                              Sil
                            </button>
                          </td>
                        </tr>
                      ))}
                      {filteredDescriptionExpenseRules.length === 0 && (
                        <tr>
                          <td colSpan={4} className="empty">
                            {descriptionExpenseRuleForm.expenseItemId
                              ? "Secilen gider kalemi icin esleme kurali yok"
                              : "Gider esleme kurali yok"}
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </section>
          }
        />
        <Route
          path="/expenses/report"
          element={
            <Suspense fallback={<LazyAdminPageFallback />}>
              <ExpenseReportPage
                loading={loading}
                expenseReportFilter={expenseReportFilter}
                setExpenseReportFilter={setExpenseReportFilter}
                expenseItemOptions={expenseItemOptions}
                expenseReportItemSummary={expenseReportItemSummary}
                editingExpenseReportId={editingExpenseReportId}
                expenseReportEditForm={expenseReportEditForm}
                setExpenseReportEditForm={setExpenseReportEditForm}
                paymentMethodOptions={paymentMethodOptions}
                runExpenseReportQuery={runExpenseReportQuery}
                clearExpenseReportFilters={clearExpenseReportFilters}
                submitExpenseReportRowEdit={submitExpenseReportRowEdit}
                cancelEditExpenseReportRow={cancelEditExpenseReportRow}
                toggleExpenseReportSort={toggleExpenseReportSort}
                getExpenseReportSortButtonTitle={getExpenseReportSortButtonTitle}
                getExpenseReportSortButtonText={getExpenseReportSortButtonText}
                sortedExpenseReportRows={sortedExpenseReportRows}
                startEditExpenseReportRow={startEditExpenseReportRow}
                deleteExpenseReportRow={deleteExpenseReportRow}
                expenseReportError={expenseReportError}
              />
            </Suspense>
          }
        />
        <Route
          path="/upload-batches"
          element={
            <Suspense fallback={<LazyAdminPageFallback />}>
              <UploadBatchesPage
                loading={loading}
                uploadBatchRows={uploadBatchRows}
                uploadBatchUploaders={uploadBatchUploaders}
                uploadBatchFilter={uploadBatchFilter}
                setUploadBatchFilter={setUploadBatchFilter}
                deletingUploadBatchId={deletingUploadBatchId}
                fetchUploadBatchDetails={fetchUploadBatchDetails}
                runUploadBatchQuery={runUploadBatchQuery}
                goUploadBatchPage={goUploadBatchPage}
                clearUploadBatchFilters={clearUploadBatchFilters}
                deleteUploadBatch={deleteUploadBatch}
                editUploadBatchMovement={editUploadBatchMovement}
                deleteUploadBatchMovement={deleteUploadBatchMovement}
              />
            </Suspense>
          }
        />
        <Route
          path="/payment-methods"
          element={
            <Suspense fallback={<LazyAdminPageFallback />}>
              <PaymentMethodManagementPage
                loading={loading}
                editingPaymentMethodId={editingPaymentMethodId}
                paymentMethodForm={paymentMethodForm}
                setPaymentMethodForm={setPaymentMethodForm}
                paymentMethodOptions={paymentMethodOptions}
                onSubmitPaymentMethod={onSubmitPaymentMethod}
                cancelEditPaymentMethod={cancelEditPaymentMethod}
                startEditPaymentMethod={startEditPaymentMethod}
                deletePaymentMethod={deletePaymentMethod}
              />
            </Suspense>
          }
        />
        <Route
          path="/payments/new"
          element={
            <Suspense fallback={<LazyAdminPageFallback />}>
              <PaymentEntryPage
                loading={loading}
                initialChargeId={lastCreatedChargeId}
                apartmentOptions={apartmentOptions}
                paymentMethodOptions={paymentMethodOptions}
                fetchOpenPaymentCharges={fetchOpenPaymentCharges}
                onCreatePayment={onCreatePayment}
                onCreateCarryForward={onCreateCarryForward}
                onUploadPayments={onUploadPayments}
                lastImportSummary={lastImportSummary}
                lastSkippedRows={lastSkippedRows}
                lastSkippedTitle={lastSkippedTitle}
              />
            </Suspense>
          }
        />
        <Route
          path="/initial-balances"
          element={
            <section className="dashboard">
              <form className="card table-card" onSubmit={onApplyInitialBalances}>
                <div className="section-head">
                  <h3>Banka Acilis Bakiyeleri</h3>
                  <div className="admin-row">
                    <button className="btn btn-ghost" type="button" onClick={addInitialBalanceRow} disabled={loading}>
                      Satir Ekle
                    </button>
                    <button className="btn btn-primary" type="submit" disabled={loading}>
                      Uygula
                    </button>
                  </div>
                </div>
                <p className="small">
                  Sadece banka acilis bakiyesi tanimlanir. Birden fazla banka ve sube satiri ekleyebilirsiniz.
                </p>

                <label className="checkbox-row compact-row-top-gap">
                  <input
                    type="checkbox"
                    checked={initialBalanceReplaceExisting}
                    onChange={(e) => setInitialBalanceReplaceExisting(e.target.checked)}
                  />
                  Uygulamadan once eski acilis bakiye kayitlarini temizle
                </label>

                <div className="table-wrap compact-row-top-gap">
                  <table className="report-compact-table">
                    <thead>
                      <tr>
                        <th>Banka</th>
                        <th>Sube</th>
                        <th className="col-num">Acilis Bakiyesi</th>
                        <th>Acilis Tarihi</th>
                        <th>Islem</th>
                      </tr>
                    </thead>
                    <tbody>
                      {initialBalanceRows.map((row, index) => {
                        const selectedBank = bankOptions.find((x) => x.name === row.bankName);
                        const branchOptions = selectedBank?.branches ?? [];

                        return (
                        <tr key={row.id}>
                          <td>
                            <select
                              title="Banka secimi"
                              value={row.bankName}
                              onChange={(e) => updateInitialBalanceRow(index, "bankName", e.target.value)}
                              disabled={!row.isEditing}
                            >
                              <option value="">Banka seciniz</option>
                              {bankOptions.map((bank) => (
                                <option key={bank.id} value={bank.name}>
                                  {bank.name}
                                </option>
                              ))}
                            </select>
                          </td>
                          <td>
                            <select
                              title="Sube secimi"
                              value={row.branchName}
                              onChange={(e) => updateInitialBalanceRow(index, "branchName", e.target.value)}
                              disabled={!row.bankName || !row.isEditing}
                            >
                              <option value="">Sube seciniz</option>
                              {branchOptions.map((branch) => (
                                <option key={branch.id} value={branch.name}>
                                  {branch.name}
                                </option>
                              ))}
                            </select>
                          </td>
                          <td className="col-num">
                            <input
                              type="text"
                              inputMode="decimal"
                              title="Acilis bakiyesi"
                              value={row.openingBalance}
                              onChange={(e) => updateInitialBalanceRow(index, "openingBalance", e.target.value)}
                              onBlur={() => {
                                const parsed = parseDistDecimal(row.openingBalance);
                                if (Number.isFinite(parsed)) {
                                  updateInitialBalanceRow(index, "openingBalance", formatDecimalInput(parsed));
                                }
                              }}
                              placeholder="0,00"
                              disabled={!row.isEditing}
                            />
                          </td>
                          <td>
                            <input
                              type="date"
                              title="Acilis tarihi"
                              value={row.openingDate}
                              onChange={(e) => updateInitialBalanceRow(index, "openingDate", e.target.value)}
                              disabled={!row.isEditing}
                            />
                          </td>
                          <td className="actions-cell">
                            <button
                              type="button"
                              className="btn btn-ghost"
                              onClick={() => toggleInitialBalanceRowEdit(index)}
                            >
                              {row.isEditing ? "Kapat" : "Degistir"}
                            </button>
                            <button
                              type="button"
                              className="btn btn-danger"
                              onClick={() => removeInitialBalanceRow(index)}
                              disabled={initialBalanceRows.length <= 1}
                            >
                              Sil
                            </button>
                          </td>
                        </tr>
                      )})}
                    </tbody>
                  </table>
                </div>
              </form>
            </section>
          }
        />
        <Route
          path="/bank-statement"
          element={
            <section className="dashboard">
              <form className="card admin-form" onSubmit={onImportBankStatement}>
                <h3>Banka Ekstresi Onizleme ve Isleme</h3>
                <p className="small">
                  Dosya secip butona bastiginizda veriler hemen kaydedilmez, once duzenlenebilir onizleme listesi
                  olusur.
                </p>
                <p className="small">
                  Satirlari duzeltip "Onizlemeyi Kaydet" dediginizde veritabani kaydi yapilir.
                </p>
                <label>
                  Ekstre Dosyasi
                  <input
                    key={bankStatementFileInputKey}
                    type="file"
                    accept=".xlsx"
                    onChange={(e) => setBankStatementFile(e.target.files?.[0] ?? null)}
                    required
                  />
                </label>
                <div className="admin-row">
                  <button className="btn btn-primary" type="submit" disabled={loading || !bankStatementFile}>
                    Banka Ekstresi Yukle (Excel)
                  </button>
                  <button
                    className="btn btn-run"
                    type="button"
                    disabled={loading}
                    onClick={clearBankStatementScreenState}
                  >Temizle</button>
                </div>
              </form>

              {bankPreviewRows.length > 0 && (
                <section className="card">
                  <h3>Ekstre Onizleme</h3>
                  <p className="small">Kayit oncesi satirlari duzenleyebilirsiniz. Bos birakilan satirlar kaydedilmez.</p>
                  {bankPreviewSplitCandidateCount > 0 && (
                    <p className="small">Bolunme adayi satir: {bankPreviewSplitCandidateCount}</p>
                  )}
                  <div className="compact-row compact-row-top-gap bank-preview-filter-row">
                    <label className="checkbox-row">
                      <input
                        type="checkbox"
                        checked={bankPreviewFilterMissingOnly}
                        onChange={(e) => setBankPreviewFilterMissingOnly(e.target.checked)}
                      />
                      Eksik verileri filtrele
                    </label>
                    <label className="checkbox-row">
                      <input
                        type="checkbox"
                        checked={bankPreviewFilterSplitOnly}
                        onChange={(e) => setBankPreviewFilterSplitOnly(e.target.checked)}
                      />
                      Bolunecek satirlari filtrele
                    </label>
                  </div>
                  <div className="table-wrap">
                    <table className="bank-preview-table">
                      <thead>
                        <tr>
                          {renderBankPreviewFilterHeader("Satir", "rowNo")}
                          {renderBankPreviewFilterHeader("Tarih", "date")}
                          {renderBankPreviewFilterHeader("Tip", "entryType")}
                          {renderBankPreviewFilterHeader("Tutar", "amount", true)}
                          {renderBankPreviewFilterHeader("Daire No", "doorNo")}
                          {renderBankPreviewFilterHeader("Gider Kalemi", "expenseItem")}
                          {renderBankPreviewFilterHeader("Aciklama", "description")}
                          {renderBankPreviewFilterHeader("Referans", "reference")}
                        </tr>
                      </thead>
                      <tbody>
                        {bankPreviewVisibleRows.map(({ row, sourceIndex, isMissing, isSplitCandidate }, index) => (
                          (() => {
                            const className = [
                              isMissing ? "bank-preview-row-missing" : "",
                              row.isAutoSplit ? "bank-preview-row-split" : "",
                              !row.isAutoSplit && isSplitCandidate ? "bank-preview-row-split-candidate" : "",
                            ]
                              .filter(Boolean)
                              .join(" ");

                            return (
                          <tr
                            key={`${row.rowNo}-${sourceIndex}-${index}`}
                            className={className || undefined}
                          >
                            <td>{row.rowNo}{!row.isAutoSplit && isSplitCandidate ? " *" : ""}</td>
                            <td>
                              <input
                                type="date"
                                title="Satir tarihi"
                                value={isoToDateInput(row.occurredAt)}
                                onChange={(e) =>
                                  updateBankPreviewRow(sourceIndex, (prev) => ({
                                    ...prev,
                                    occurredAt: dateInputToIso(e.target.value),
                                  }))
                                }
                              />
                            </td>
                            <td>
                              <select
                                title="Satir tipi"
                                value={row.entryType}
                                onChange={(e) =>
                                  updateBankPreviewRow(sourceIndex, (prev) => ({
                                    ...prev,
                                    entryType: e.target.value as "PAYMENT" | "EXPENSE",
                                  }))
                                }
                              >
                                <option value="PAYMENT">Tahsilat</option>
                                <option value="EXPENSE">Gider</option>
                              </select>
                            </td>
                            <td className="col-num">
                              <input
                                type="text"
                                inputMode="decimal"
                                title="Satir tutari"
                                value={new Intl.NumberFormat("tr-TR", {
                                  minimumFractionDigits: 2,
                                  maximumFractionDigits: 2,
                                }).format(Number.isFinite(row.amount) ? row.amount : 0)}
                                onChange={(e) =>
                                  updateBankPreviewRow(sourceIndex, (prev) => ({
                                    ...prev,
                                    amount: (() => {
                                      const parsed = parseDistDecimal(e.target.value);
                                      return Number.isFinite(parsed) ? Number(parsed.toFixed(2)) : prev.amount;
                                    })(),
                                  }))
                                }
                              />
                            </td>
                            <td>
                              <input
                                title="Daire numarasi"
                                value={row.doorNo ?? ""}
                                onChange={(e) =>
                                  updateBankPreviewRow(sourceIndex, (prev) => ({
                                    ...prev,
                                    doorNo: e.target.value,
                                  }))
                                }
                                disabled={row.entryType !== "PAYMENT"}
                              />
                            </td>
                            <td>
                              <select
                                title="Gider kalemi"
                                value={row.expenseItemId ?? ""}
                                onChange={(e) =>
                                  updateBankPreviewRow(sourceIndex, (prev) => ({
                                    ...prev,
                                    expenseItemId: e.target.value || null,
                                  }))
                                }
                                disabled={row.entryType !== "EXPENSE"}
                              >
                                <option value="">Seciniz</option>
                                {(expenseItemOptions.some((item) => item.isActive)
                                  ? expenseItemOptions.filter((item) => item.isActive)
                                  : expenseItemOptions
                                ).map((item) => (
                                    <option key={item.id} value={item.id}>
                                      {item.name}{item.isActive ? "" : " (Pasif)"}
                                    </option>
                                  ))}
                              </select>
                            </td>
                            <td>
                              <input
                                title="Satir aciklamasi"
                                value={row.description}
                                onChange={(e) =>
                                  updateBankPreviewRow(sourceIndex, (prev) => ({
                                    ...prev,
                                    description: e.target.value,
                                  }))
                                }
                              />
                            </td>
                            <td>
                              <input
                                title="Satir referansi"
                                value={row.reference ?? ""}
                                onChange={(e) =>
                                  updateBankPreviewRow(sourceIndex, (prev) => ({
                                    ...prev,
                                    reference: e.target.value || null,
                                  }))
                                }
                              />
                            </td>
                          </tr>
                            );
                          })()
                        ))}
                      </tbody>
                    </table>
                  </div>
                  <div className="compact-row compact-row-top-gap">
                    <button
                      className="btn btn-ghost"
                      type="button"
                      disabled={loading}
                      onClick={onAutoSplitMultiDoorBankRows}
                    >
                      Coklu Daire Satirlarini Bol
                    </button>
                    <button
                      className="btn btn-primary"
                      type="button"
                      disabled={loading || hasBankPreviewMissingRows}
                      onClick={() => void onCommitBankStatementPreview()}
                    >
                      Onizlemeyi Kaydet
                    </button>
                    <button
                      className="btn btn-ghost"
                      type="button"
                      disabled={loading}
                      onClick={clearBankStatementScreenState}
                    >Temizle</button>
                  </div>
                  {hasBankPreviewMissingRows && (
                    <p className="small small-error">
                      Kirmizi satirlarda zorunlu alanlar eksik: Tahsilat icin Daire No, Gider icin Gider Kalemi.
                    </p>
                  )}
                  {bankPreviewPreSaveWarnings.length > 0 && (
                    <div className="table-wrap compact-row-top-gap">
                      <table className="report-compact-table">
                        <thead>
                          <tr>
                            <th className="col-num">Satir</th>
                            <th>Kod</th>
                            <th>On Kayit Uyarisi</th>
                          </tr>
                        </thead>
                        <tbody>
                          {bankPreviewPreSaveWarnings.map((warning, idx) => (
                            <tr key={`${warning.rowNo}-${warning.code}-${idx}`}>
                              <td className="col-num">{warning.rowNo}</td>
                              <td>{warning.code}</td>
                              <td>{warning.message}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </section>
              )}

              {lastImportSummary && (
                <section className="card import-summary-card">
                  <h3>{lastImportSummary.title}</h3>
                  <div className="import-summary-badges">
                    <span className="summary-badge summary-badge-total">Toplam Satir: {lastImportSummary.totalRows}</span>
                    <span className="summary-badge summary-badge-saved">
                      {lastImportSummary.savedLabel ?? "Kaydedilen"}: {lastImportSummary.savedCount}
                    </span>
                    <span className="summary-badge summary-badge-skipped">Atlanan: {lastImportSummary.skippedCount}</span>
                  </div>
                  {lastImportSummary.detailText && <p className="small">{lastImportSummary.detailText}</p>}
                </section>
              )}

              {lastSkippedRows.length > 0 && (
                <section className="card">
                  <h3>{lastSkippedTitle || "Kaydedilmeyen Satirlar"}</h3>
                  <div className="table-wrap">
                    <table>
                      <thead>
                        <tr>
                          <th>Satir</th>
                          <th>Ham Hata</th>
                          <th>Aciklama</th>
                        </tr>
                      </thead>
                      <tbody>
                        {lastSkippedRows.map((item, idx) => (
                          <tr key={`${item.raw}-${idx}`}>
                            <td>{item.rowNo ?? "-"}</td>
                            <td>{item.raw}</td>
                            <td>{item.explanation}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </section>
              )}

              {lastImportInfos.length > 0 && (
                <section className="card">
                  <h3>{lastImportInfoTitle || "Bilgi Notlari"}</h3>
                  <div className="table-wrap">
                    <table>
                      <thead>
                        <tr>
                          <th>Satir</th>
                          <th>Ham Not</th>
                          <th>Aciklama</th>
                        </tr>
                      </thead>
                      <tbody>
                        {lastImportInfos.map((item, idx) => (
                          <tr key={`${item.raw}-${idx}`}>
                            <td>{item.rowNo ?? "-"}</td>
                            <td>{item.raw}</td>
                            <td>{item.explanation}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </section>
              )}

              {manualReviewImportInfos.length > 0 && (
                <section className="card import-manual-review-card">
                  <h3>Manuel Inceleme Gereken Odemeler</h3>
                  <div className="import-summary-badges">
                    <span className="summary-badge summary-badge-manual-review">
                      Manuel Inceleme: {manualReviewImportInfos.length}
                    </span>
                  </div>
                  <p className="small">
                    Bu satirlar bilerek otomatik dagitilmaz. Yanlis tahakkuk kapanmasini onlemek icin Tahsilat Raporu
                    veya Eslestirme ekranindan manuel kontrol edin.
                  </p>
                  <div className="table-wrap">
                    <table>
                      <thead>
                        <tr>
                          <th>Satir</th>
                          <th>Ham Not</th>
                          <th>Aciklama</th>
                        </tr>
                      </thead>
                      <tbody>
                        {manualReviewImportInfos.map((item, idx) => (
                          <tr key={`${item.raw}-manual-${idx}`}>
                            <td>{item.rowNo ?? "-"}</td>
                            <td>{item.raw}</td>
                            <td>{item.explanation}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </section>
              )}
            </section>
          }
        />
        <Route
          path="/payments/list"
          element={
            <Suspense fallback={<LazyAdminPageFallback />}>
              <PaymentListPage
                loading={loading}
                apartmentOptions={apartmentOptions}
                paymentMethodOptions={paymentMethodOptions}
                paymentListFilter={paymentListFilter}
                setPaymentListFilter={setPaymentListFilter}
                paymentListRows={paymentListRows}
                paymentListError={paymentListError}
                editingPaymentListId={editingPaymentListId}
                editingPaymentListSource={editingPaymentListSource}
                paymentListEditForm={paymentListEditForm}
                setPaymentListEditForm={setPaymentListEditForm}
                allowImportedAmountEdit={allowImportedAmountEdit}
                setAllowImportedAmountEdit={setAllowImportedAmountEdit}
                runPaymentListQuery={runPaymentListQuery}
                clearPaymentListFilters={clearPaymentListFilters}
                submitPaymentListRowEdit={submitPaymentListRowEdit}
                cancelEditPaymentListRow={cancelEditPaymentListRow}
                startEditPaymentListRow={startEditPaymentListRow}
                deletePaymentListRow={deletePaymentListRow}
              />
            </Suspense>
          }
        />
        <Route
          path="/apartments/upload"
          element={
            <section className="dashboard">
              <form className="card admin-form" onSubmit={onUploadApartments}>
                <div className="section-head">
                  <h3>Daire Listesi Excel Yukle</h3>
                  <div className="admin-row">
                    <button className="btn btn-ghost" type="button" onClick={() => void downloadApartmentUploadTemplate()}>
                      Excel Sablonunu Indir
                    </button>
                    <button className="btn btn-primary" type="submit" disabled={loading}>
                      Daire Listesi Yukle
                    </button>
                  </div>
                </div>
                <p className="small">Toplu yaratma icin .xlsx dosyasi secin. Bos opsiyonel alanlar kabul edilir.</p>
                <p className="small">
                  Beklenen kolonlar: blockName/blok, doorNo/daireno ve opsiyonel olarak type, apartmentClassCode,
                  apartmentDutyCode, hasAidat, hasDogalgaz, hasOtherDues, hasIncome, hasExpenses, ownerFullName,
                  occupancyType, email1, email2, email3, phone1, phone2, phone3, landlordFullName, landlordPhone,
                  landlordEmail. Bos bir hucre mevcut veriyi silmez.
                </p>
                <label>
                  Excel Dosyasi
                  <input
                    type="file"
                    accept=".xlsx"
                    onChange={(e) => setApartmentUploadFile(e.target.files?.[0] ?? null)}
                    required
                  />
                </label>
              </form>
            </section>
          }
        />
        <Route
          path="/apartments/bulk-update"
          element={
            <Suspense fallback={<LazyAdminPageFallback />}>
              <ApartmentBulkUpdatePage
                apartmentClassOptions={apartmentClassOptions}
                blockOptions={blockOptions}
                onAfterUpdate={async () => {
                  await Promise.all([
                    fetchApartmentOptions(),
                    fetchApartmentClassOptions(),
                    fetchApartmentTypeOptions(),
                  ]);
                }}
              />
            </Suspense>
          }
        />
        <Route
          path="/reports/fractional-closures"
          element={
            <section className="dashboard report-page">
              <div className="card table-card report-page-card">
                <div className="section-head report-toolbar">
                  <h3>Kismi Kapama Raporu</h3>
                  <div className="admin-row">
                    <button
                      className="btn btn-primary btn-run"
                      type="button"
                      onClick={() => void runFractionalClosureQuery()}
                      disabled={fractionalClosureLoading || loading}
                    >
                      {fractionalClosureLoading ? "Hazirlaniyor..." : "Calistir"}
                    </button>
                    <button className="btn btn-ghost" type="button" onClick={clearFractionalClosureReport}>Temizle</button>
                  </div>
                </div>

                <p className="small">
                  Bu rapor, vadesine bakmadan odeme almis ancak hala acik kalan tum tahakkuklari listeler.
                </p>

                <div className="table-wrap compact-row-top-gap">
                  <table className="apartment-list-table report-compact-table">
                    <thead>
                      <tr>
                        <th>Blok</th>
                        <th>Daire</th>
                        <th>Malik</th>
                        <th>Tahakkuk Turu</th>
                        <th>Donem</th>
                        <th className="col-num">Tahakkuk</th>
                        <th className="col-num">Odeme</th>
                        <th className="col-num">Kalan</th>
                        <th>Son Odeme Tarihi</th>
                        <th>Hangi Aydan Geldi</th>
                        <th>Durum</th>
                      </tr>
                    </thead>
                    <tbody>
                      {fractionalClosureRows.length === 0 ? (
                        <tr>
                          <td colSpan={11} className="empty">
                            Kayit bulunmuyor. Listelemek icin Calistir butonunu kullanin.
                          </td>
                        </tr>
                      ) : (
                        fractionalClosureRows
                          .slice()
                          .sort((left, right) => {
                            const doorCompare = left.apartmentDoorNo.localeCompare(right.apartmentDoorNo, "tr", {
                              numeric: true,
                              sensitivity: "base",
                            });
                            if (doorCompare !== 0) {
                              return doorCompare;
                            }
                            return left.blockName.localeCompare(right.blockName, "tr", {
                              numeric: true,
                              sensitivity: "base",
                            });
                          })
                          .map((row) => {
                            const sourceStatus = getFractionalClosureSourceStatus(row);
                            return (
                              <tr
                                key={row.chargeId}
                                className={`${sourceStatus === "Eksik Odeme" ? "fractional-closure-row-missing " : ""}report-row-clickable`}
                                role="button"
                                tabIndex={0}
                                aria-label={`${row.blockName}-${row.apartmentDoorNo} dairesinin ekstresini ac`}
                                onClick={() => openStatementForFractionalClosureRow(row)}
                                onKeyDown={(event) => {
                                  if (event.key === "Enter" || event.key === " ") {
                                    event.preventDefault();
                                    openStatementForFractionalClosureRow(row);
                                  }
                                }}
                              >
                                <td>{row.blockName}</td>
                                <td>{row.apartmentDoorNo}</td>
                                <td>{row.apartmentOwnerName || "-"}</td>
                                <td>{row.chargeTypeName}</td>
                                <td>{`${String(row.periodMonth).padStart(2, "0")}/${row.periodYear}`}</td>
                                <td className="col-num">{formatTry(row.amount)}</td>
                                <td className="col-num">{formatTry(row.paidTotal)}</td>
                                <td className="col-num col-num-negative">{formatTry(row.remaining)}</td>
                                <td>{row.lastPaymentAt ? formatDateTr(row.lastPaymentAt) : "-"}</td>
                                <td>{row.sourceMonth ?? "-"}</td>
                                <td>{sourceStatus}</td>
                              </tr>
                            );
                          })
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </section>
          }
        />
        <Route
          path="/reports/monthly-ledger-print"
          element={
            <Suspense fallback={<LazyAdminPageFallback />}>
              <MonthlyLedgerPrintPage />
            </Suspense>
          }
        />
        <Route
          path="/reports/bank-movements"
          element={<Navigate replace to="/admin/banks/statement-view" />}
        />
        <Route
          path="/reports/apartments/list"
          element={<Navigate replace to="/admin/apartments/list" />}
        />
        <Route
          path="/apartments/list"
          element={
            <Suspense fallback={<LazyAdminPageFallback />}>
              <ApartmentListPage
                blockOptions={blockOptions}
                apartmentClassOptions={apartmentClassOptions}
                apartmentDutyOptions={apartmentDutyOptions}
                onEditApartment={startEditApartment}
                onDeleteApartment={deleteApartment}
              />
            </Suspense>
          }
        />
        <Route
          path="/apartments/history"
          element={
            <Suspense fallback={<LazyAdminPageFallback />}>
              <ApartmentChangeHistoryPage apartmentOptions={apartmentOptions} />
            </Suspense>
          }
        />
        <Route
          path="/apartments/passwords"
          element={
            <Suspense fallback={<LazyAdminPageFallback />}>
              <ApartmentPasswordManagementPage />
            </Suspense>
          }
        />
        <Route
          path="/building-info"
          element={
            <Suspense fallback={<LazyAdminPageFallback />}>
              <BuildingInfoPage />
            </Suspense>
          }
        />
        <Route
          path="/blocks"
          element={
            <Suspense fallback={<LazyAdminPageFallback />}>
              <BlockManagementPage
                editingBlockId={editingBlockId}
                blockForm={blockForm}
                setBlockForm={setBlockForm}
                loading={loading}
                blockOptions={blockOptions}
                onSubmitBlock={onSubmitBlock}
                cancelEditBlock={cancelEditBlock}
                startEditBlock={startEditBlock}
                deleteBlock={deleteBlock}
              />
            </Suspense>
          }
        />
        <Route
          path="/apartment-classes"
          element={
            <Suspense fallback={<LazyAdminPageFallback />}>
              <ApartmentClassManagementPage onDefinitionsChanged={fetchApartmentClassOptions} />
            </Suspense>
          }
        />
        <Route
          path="/apartment-types"
          element={
            <Suspense fallback={<LazyAdminPageFallback />}>
              <ApartmentTypeManagementPage onDefinitionsChanged={fetchApartmentTypeOptions} />
            </Suspense>
          }
        />
        <Route
          path="/apartment-duties"
          element={
            <Suspense fallback={<LazyAdminPageFallback />}>
              <ApartmentDutyManagementPage onDefinitionsChanged={fetchApartmentDutyOptions} />
            </Suspense>
          }
        />
        <Route
          path="/banks"
          element={
            <Suspense fallback={<LazyAdminPageFallback />}>
              <BankManagementPage
                editingBankId={editingBankId}
                editingBankBranchId={editingBankBranchId}
                bankForm={bankForm}
                setBankForm={setBankForm}
                bankBranchForm={bankBranchForm}
                setBankBranchForm={setBankBranchForm}
                bankOptions={bankOptions}
                loading={loading}
                onSubmitBank={onSubmitBank}
                onSubmitBankBranch={onSubmitBankBranch}
                cancelEditBank={cancelEditBank}
                cancelEditBankBranch={cancelEditBankBranch}
                startEditBank={startEditBank}
                deleteBank={deleteBank}
                startEditBankBranch={startEditBankBranch}
                deleteBankBranch={deleteBankBranch}
              />
            </Suspense>
          }
        />
        <Route
          path="/banks/term-deposits"
          element={
            <section className="dashboard bank-term-deposit-page">
              <form className="card admin-form bank-term-deposit-form-surface" onSubmit={onSubmitBankTermDeposit}>
                <div className="section-head">
                  <h3>{editingBankTermDepositId ? "Vadeli Mevduat Degistir" : "Vadeli Mevduat Ekle"}</h3>
                  <div className="admin-row">
                    <button className="btn btn-primary" type="submit" disabled={loading}>
                      {editingBankTermDepositId ? "Degisiklikleri Kaydet" : "Vadeli Mevduat Ekle"}
                    </button>
                    <button className="btn btn-ghost" type="button" onClick={clearBankTermDepositEditor} disabled={loading}>
                      Temizle
                    </button>
                    <button
                      className="btn btn-ghost"
                      type="button"
                      onClick={() => void fetchBankTermDeposits()}
                      disabled={bankTermDepositLoading || loading}
                    >
                      {bankTermDepositLoading ? "Yukleniyor..." : "Yenile"}
                    </button>
                  </div>
                </div>

                <section className="bank-term-deposit-form-section">
                  <div className="bank-term-deposit-form-section-head">
                    <h4>🏦 Banka ve Sube</h4>
                    <p className="small">Kaydin bagli oldugu banka ve sube secimi</p>
                  </div>

                  <div className="compact-row bank-term-deposit-bank-row">
                  <label>
                    Banka
                    <select
                      value={bankTermDepositForm.bankId}
                      onChange={(e) =>
                        setBankTermDepositForm((prev) => ({
                          ...prev,
                          bankId: e.target.value,
                          branchId: "",
                        }))
                      }
                      required
                    >
                      <option value="">Banka seciniz</option>
                      {bankOptions.map((bank) => (
                        <option key={bank.id} value={bank.id}>
                          {bank.name}
                        </option>
                      ))}
                    </select>
                  </label>

                  <label>
                    Sube (opsiyonel)
                    <select
                      value={bankTermDepositForm.branchId}
                      onChange={(e) => setBankTermDepositForm((prev) => ({ ...prev, branchId: e.target.value }))}
                    >
                      <option value="">Sube seciniz</option>
                      {(bankOptions.find((x) => x.id === bankTermDepositForm.bankId)?.branches ?? []).map((branch) => (
                        <option key={branch.id} value={branch.id}>
                          {branch.name}
                        </option>
                      ))}
                    </select>
                  </label>
                  </div>
                </section>

                <section className="bank-term-deposit-form-section">
                  <div className="bank-term-deposit-form-section-head">
                    <h4>💰 Tutar ve Oranlar</h4>
                    <p className="small">Ana para ve faiz/stopaj oranlarini girin</p>
                  </div>

                  <div className="compact-row bank-term-deposit-amount-row">
                  <label>
                    Ana Para
                    <input
                      type="number"
                      step="0.01"
                      min={0}
                      value={bankTermDepositForm.principalAmount}
                      onChange={(e) => setBankTermDepositForm((prev) => ({ ...prev, principalAmount: e.target.value }))}
                      required
                    />
                  </label>
                  <label>
                    Yillik Faiz Orani (%)
                    <input
                      type="number"
                      step="0.0001"
                      min={0}
                      value={bankTermDepositForm.annualInterestRate}
                      onChange={(e) => setBankTermDepositForm((prev) => ({ ...prev, annualInterestRate: e.target.value }))}
                      required
                    />
                  </label>
                  <label>
                    Stopaj Orani (%)
                    <input
                      type="number"
                      step="0.0001"
                      min={0}
                      max={100}
                      value={bankTermDepositForm.withholdingTaxRate}
                      onChange={(e) => setBankTermDepositForm((prev) => ({ ...prev, withholdingTaxRate: e.target.value }))}
                      required
                    />
                  </label>
                  </div>
                </section>

                <section className="bank-term-deposit-form-section">
                  <div className="bank-term-deposit-form-section-head">
                    <h4>📅 Vade Bilgisi</h4>
                    <p className="small">Baslangic, bitis tarihi ve durum bilgisi</p>
                  </div>

                  <div className="compact-row bank-term-deposit-maturity-row">
                  <label>
                    Baslangic Tarihi
                    <input
                      type="date"
                      value={bankTermDepositForm.startDate}
                      onChange={(e) => setBankTermDepositForm((prev) => ({ ...prev, startDate: e.target.value }))}
                      required
                    />
                  </label>
                  <label>
                    Bitis Tarihi
                    <input
                      type="date"
                      value={bankTermDepositForm.endDate}
                      onChange={(e) => setBankTermDepositForm((prev) => ({ ...prev, endDate: e.target.value }))}
                      required
                    />
                  </label>
                  <label className="checkbox-row">
                    <input
                      type="checkbox"
                      checked={bankTermDepositForm.isActive}
                      onChange={(e) => setBankTermDepositForm((prev) => ({ ...prev, isActive: e.target.checked }))}
                    />
                    Aktif
                  </label>
                  </div>
                </section>

                <section className="bank-term-deposit-form-section">
                  <div className="bank-term-deposit-form-section-head">
                    <h4>📝 Not</h4>
                    <p className="small">Opsiyonel aciklama alani</p>
                  </div>

                  <label>
                    Not
                    <textarea
                      rows={2}
                      value={bankTermDepositForm.notes}
                      onChange={(e) => setBankTermDepositForm((prev) => ({ ...prev, notes: e.target.value }))}
                    />
                  </label>
                </section>
              </form>

              <div className="card table-card">
                <h3>Vadeli Mevduat Listesi</h3>
                <p className="small">
                  Ana Para Toplami: <b>{formatTry(bankTermDepositPrincipalTotal)}</b>
                </p>
                <div className="table-wrap">
                  <table className="apartment-list-table report-compact-table">
                    <thead>
                      <tr>
                        <th>Banka</th>
                        <th>Sube</th>
                        <th className="col-num">Ana Para</th>
                        <th>Baslangic</th>
                        <th>Bitis</th>
                        <th className="col-num">Gun</th>
                        <th className="col-num">Faiz %</th>
                        <th className="col-num">Stopaj %</th>
                        <th className="col-num">Net Getiri</th>
                        <th className="col-num">Vade Sonu Net</th>
                        <th>Durum</th>
                        <th>Islem</th>
                      </tr>
                    </thead>
                    <tbody>
                      {bankTermDepositRows.length === 0 ? (
                        <tr>
                          <td colSpan={12} className="empty">
                            Kayit bulunmuyor
                          </td>
                        </tr>
                      ) : (
                        bankTermDepositRows.map((row) => (
                          <tr key={row.id}>
                            <td>{row.bankName}</td>
                            <td>{row.branchName ?? "-"}</td>
                            <td className="col-num">{formatTry(row.principalAmount)}</td>
                            <td>{formatDateTr(row.startDate)}</td>
                            <td>{formatDateTr(row.endDate)}</td>
                            <td className="col-num">{row.dayCount}</td>
                            <td className="col-num">{row.annualInterestRate.toFixed(4)}</td>
                            <td className="col-num">{row.withholdingTaxRate.toFixed(4)}</td>
                            <td className="col-num">{formatTry(row.netInterest)}</td>
                            <td className="col-num">{formatTry(row.netMaturityAmount)}</td>
                            <td>{row.isActive ? "Aktif" : "Pasif"}</td>
                            <td className="actions-cell">
                              <button className="btn btn-ghost" type="button" onClick={() => startEditBankTermDeposit(row)}>
                                Degistir
                              </button>
                              <button className="btn btn-danger" type="button" onClick={() => void deleteBankTermDeposit(row)}>
                                Sil
                              </button>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </section>
          }
        />
        <Route
          path="/banks/statement-view"
          element={
            <Suspense fallback={<LazyAdminPageFallback />}>
              <BankStatementViewPage
                loading={loading}
                rows={bankStatementViewRows}
                openingBalance={bankStatementViewOpeningBalance}
                filter={bankStatementViewFilter}
                setFilter={setBankStatementViewFilter}
                runQuery={runBankStatementViewQuery}
                resetToCurrentMonth={resetBankStatementViewToCurrentMonth}
              />
            </Suspense>
          }
        />
        <Route
          path="/corrections"
          element={
            <Suspense fallback={<LazyAdminPageFallback />}>
              <CorrectionsPage
                correctionApartmentId={correctionApartmentId}
                setCorrectionApartmentId={setCorrectionApartmentId}
                loadCorrections={loadCorrections}
                apartmentOptions={apartmentOptions}
                loading={loading}
                chargeCorrectionRows={chargeCorrectionRows}
                setChargeCorrectionRows={setChargeCorrectionRows}
                selectedChargeCorrectionIds={selectedChargeCorrectionIds}
                setSelectedChargeCorrectionIds={setSelectedChargeCorrectionIds}
                chargeTypeOptions={chargeTypeOptions}
                removeSelectedChargeCorrections={removeSelectedChargeCorrections}
                saveChargeCorrection={saveChargeCorrection}
                removeChargeCorrection={removeChargeCorrection}
                paymentCorrectionRows={paymentCorrectionRows}
                setPaymentCorrectionRows={setPaymentCorrectionRows}
                selectedPaymentCorrectionIds={selectedPaymentCorrectionIds}
                setSelectedPaymentCorrectionIds={setSelectedPaymentCorrectionIds}
                paymentMethodOptions={paymentMethodOptions}
                removeSelectedPaymentCorrections={removeSelectedPaymentCorrections}
                savePaymentCorrection={savePaymentCorrection}
                removePaymentCorrection={removePaymentCorrection}
              />
            </Suspense>
          }
        />
        <Route
          path="/manual-closures"
          element={
            <Suspense fallback={<LazyAdminPageFallback />}>
              <ManualClosuresPage
                correctionApartmentId={correctionApartmentId}
                setCorrectionApartmentId={setCorrectionApartmentId}
                loadCorrections={loadCorrections}
                apartmentOptions={apartmentOptions}
                loading={loading}
                chargeCorrectionRows={chargeCorrectionRows}
                paymentCorrectionRows={paymentCorrectionRows}
                setPaymentCorrectionRows={setPaymentCorrectionRows}
                paymentMethodOptions={paymentMethodOptions}
                savePaymentCorrection={savePaymentCorrection}
                removePaymentCorrection={removePaymentCorrection}
                splitPaymentCorrection={splitPaymentCorrection}
              />
            </Suspense>
          }
        />
        <Route
          path="/unclassified"
          element={
            <Suspense fallback={<LazyAdminPageFallback />}>
              <UnclassifiedItemsPage
                loading={loading}
                pageLoading={unclassifiedPageLoading}
                paymentRows={unclassifiedPaymentRows}
                expenseRows={unclassifiedExpenseRows}
                apartmentOptions={apartmentOptions}
                expenseItemOptions={expenseItemOptions}
                refresh={() => loadUnclassifiedRows()}
                savePaymentDoorNo={saveUnclassifiedPaymentDoorNo}
                saveExpenseItem={saveUnclassifiedExpenseItem}
              />
            </Suspense>
          }
        />
        <Route
          path="/statement"
          element={
            <Suspense fallback={<LazyAdminPageFallback />}>
              <StatementPage
                activeApartmentId={activeApartmentId}
                setActiveApartmentId={setActiveApartmentId}
                apartmentOptions={apartmentOptions}
                fetchApartmentOptions={fetchApartmentOptions}
                fetchStatement={fetchStatement}
                reconcileSelectedApartment={reconcileSelectedApartment}
                loading={loading}
                statementViewMode={statementViewMode}
                setStatementViewMode={setStatementViewMode}
                totals={totals}
                overdueStatementTotals={overdueStatementTotals}
                accountingTotals={accountingTotals}
                activeApartmentHeaderText={activeApartmentHeaderText}
                sortedStatement={sortedStatement}
                sortedAccountingStatement={sortedAccountingStatement}
                statementCount={statement.length}
                accountingStatementCount={accountingStatement.length}
                formatAccountingStatementDescription={formatAccountingStatementDescription}
              />
            </Suspense>
          }
        />
        <Route
          path="/audit-logs"
          element={
            <Suspense fallback={<LazyAdminPageFallback />}>
              <AuditLogsPage
                actionLogs={actionLogs}
                fetchActionLogs={fetchActionLogs}
              />
            </Suspense>
          }
        />
        <Route
          path="/guide/manual"
          element={
            <Suspense fallback={<LazyAdminPageFallback />}>
              <GuideManualPage />
            </Suspense>
          }
        />
        <Route
          path="/meeting"
          element={
            <Suspense fallback={<LazyAdminPageFallback />}>
              <MeetingGuidePage />
            </Suspense>
          }
        />
        <Route
          path="/resident-content"
          element={
            <Suspense fallback={<LazyAdminPageFallback />}>
              <ResidentContentAdminPage />
            </Suspense>
          }
        />
        <Route
          path="/reconcile/door-mismatch-report"
          element={
            <Suspense fallback={<LazyAdminPageFallback />}>
              <DoorMismatchReportPage
                fetchDoorMismatchReport={fetchDoorMismatchReport}
                clearDoorMismatchReport={clearDoorMismatchReport}
                doorMismatchLoading={doorMismatchLoading}
                doorMismatchTotals={doorMismatchTotals}
                doorMismatchRows={doorMismatchRows}
              />
            </Suspense>
          }
        />
        <Route
          path="/statement/all"
          element={
            <>
              <div className="card user-card">
                <h2>Toplu Ekstre (Tum Daireler)</h2>
                <button className="btn btn-primary" onClick={() => void fetchBulkStatement()} disabled={loading}>
                  Toplu Ekstre Getir
                </button>
              </div>

              <div className="card table-card">
                <h3>Daire Bazli Tum Ekstreler</h3>
                <div className="table-wrap">
                  <table className="filter-table">
                    <thead>
                      <tr>
                        {renderBulkFilterHeader("Daire No", "apartmentDoorNo")}
                        {renderBulkFilterHeader("Daire Ismi", "apartmentOwnerName")}
                        {renderBulkFilterHeader("Donem", "period")}
                        {renderBulkFilterHeader("Tip", "type")}
                        {renderBulkFilterHeader("Aciklama", "description")}
                        {renderBulkFilterHeader("Son Odeme Tarihi", "dueDate")}
                        {renderBulkFilterHeader("Tutar", "amount", true)}
                        {renderBulkFilterHeader("Odenen", "paidTotal", true)}
                        {renderBulkFilterHeader("Kalan", "remaining", true)}
                        {renderBulkFilterHeader("Durum", "status")}
                      </tr>
                    </thead>
                    <tbody>
                      {filteredBulkStatement.map((row) => (
                        <tr key={row.chargeId}>
                          <td>{row.apartmentDoorNo}</td>
                          <td>{row.apartmentOwnerName ?? "-"}</td>
                          <td>
                            {row.periodMonth}/{row.periodYear}
                          </td>
                          <td>{row.type}</td>
                          <td>{formatBulkStatementDescription(row.description)}</td>
                          <td>{formatDateTr(row.dueDate)}</td>
                          <td className="col-num">{formatTry(row.amount)}</td>
                          <td className="col-num">{formatTry(row.paidTotal)}</td>
                          <td className="col-num">{formatTry(row.remaining)}</td>
                          <td>{row.status}</td>
                        </tr>
                      ))}
                      {filteredBulkStatement.length === 0 && (
                        <tr>
                          <td colSpan={10} className="empty">
                            Filtreye uygun kayit yok
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </>
          }
        />
      </Routes>

      {warningPanel && (
        <aside className="warning-panel-fixed" role="status" aria-live="polite">
          <div className="warning-panel-head">
            <strong>{warningPanel.title}</strong>
            <button type="button" className="btn btn-ghost" onClick={() => setWarningPanel(null)}>
              Kapat
            </button>
          </div>
          <p>{warningPanel.message}</p>
          {warningPanel.items.length > 0 && (
            <div className="warning-panel-list">
              {warningPanel.items.map((item) => (
                <span key={`warn-${item}`}>{item}</span>
              ))}
            </div>
          )}
        </aside>
      )}

      <footer className="status-bar status-bar-fixed">{message}</footer>
    </section>
  );
}

function ResidentPage({
  user,
  onResidentDoorNo,
}: {
  user: LoginResponse["user"] | null;
  onResidentDoorNo: (doorNo: string) => void;
}) {
  const [statement, setStatement] = useState<StatementItem[]>([]);
  const [accountingStatement, setAccountingStatement] = useState<AccountingStatementItem[]>([]);
  const [announcements, setAnnouncements] = useState<ResidentAnnouncementItem[]>([]);
  const [polls, setPolls] = useState<ResidentPollItem[]>([]);
  const [pollSelections, setPollSelections] = useState<Record<string, string[]>>({});
  const [votingPollId, setVotingPollId] = useState<string | null>(null);
  const [statementViewMode, setStatementViewMode] = useState<StatementViewMode>("CLASSIC");
  const [expenseReport, setExpenseReport] = useState<ResidentExpenseReportResponse | null>(null);
  const [expenseReportLoading, setExpenseReportLoading] = useState(false);
  const [selectedExpenseItemId, setSelectedExpenseItemId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("Resident panel hazir");
  const [passwordForm, setPasswordForm] = useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  });
  const [passwordSaving, setPasswordSaving] = useState(false);
  const [passwordPanelOpen, setPasswordPanelOpen] = useState(false);

  const totals = useMemo(() => {
    const amount = statement.reduce((sum, row) => sum + row.amount, 0);
    const paid = statement.reduce((sum, row) => sum + row.paidTotal, 0);
    return { amount, paid, remaining: amount - paid };
  }, [statement]);

  const overdueStatementTotals = useMemo(() => {
    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
    let overdueRemaining = 0;
    let overdueCount = 0;

    for (const row of statement) {
      if (row.remaining <= 0) {
        continue;
      }

      const dueAt = new Date(row.dueDate).getTime();
      if (!Number.isFinite(dueAt) || dueAt >= todayStart) {
        continue;
      }

      overdueRemaining += row.remaining;
      overdueCount += 1;
    }

    return {
      remaining: Number(overdueRemaining.toFixed(2)),
      count: overdueCount,
    };
  }, [statement]);

  const sortedStatement = useMemo(
    () => [...statement].sort((a, b) => a.periodYear - b.periodYear || a.periodMonth - b.periodMonth),
    [statement]
  );

  const accountingTotals = useMemo(() => {
    const debit = accountingStatement.reduce((sum, row) => sum + row.debit, 0);
    const credit = accountingStatement.reduce((sum, row) => sum + row.credit, 0);
    return { debit, credit, balance: debit - credit };
  }, [accountingStatement]);

  const sortedAccountingStatement = useMemo(
    () =>
      [...accountingStatement].sort((a, b) => {
        const dateDiff = new Date(a.date).getTime() - new Date(b.date).getTime();
        if (dateDiff !== 0) {
          return dateDiff;
        }
        return a.movementId.localeCompare(b.movementId);
      }),
    [accountingStatement]
  );

  const selectedExpenseItem = useMemo(
    () => expenseReport?.topItems.find((item) => item.expenseItemId === selectedExpenseItemId) ?? null,
    [expenseReport, selectedExpenseItemId]
  );

  const selectedExpenseRows = useMemo(() => {
    if (!expenseReport || !selectedExpenseItemId) {
      return [];
    }
    return expenseReport.rows.filter((row) => row.expenseItemId === selectedExpenseItemId);
  }, [expenseReport, selectedExpenseItemId]);

  async function fetchMyStatement(): Promise<void> {
    if (!user?.apartmentId) {
      setStatement([]);
      setAccountingStatement([]);
      setMessage("Hesabiniza daire baglantisi tanimli degil. Yoneticiniz ile iletisime gecin.");
      return;
    }

    setLoading(true);
    setMessage("Ekstre yukleniyor...");
    try {
      const res = await fetch(`${apiBase}/api/resident/me/statement`, {
        credentials: "include",
      });

      if (!res.ok) {
        const errBody = (await res.json().catch(() => ({}))) as { message?: string };
        throw new Error(errBody.message ?? "Ekstre alinamadi");
      }

      const data = (await res.json()) as StatementResponse;
      if (user?.role === "RESIDENT" && typeof data.apartmentDoorNo === "string") {
        const nextDoorNo = data.apartmentDoorNo.trim();
        if (nextDoorNo) {
          onResidentDoorNo(nextDoorNo);
        }
      }
      setStatement(data.statement);
      setAccountingStatement(data.accountingStatement ?? []);
      setMessage(`Ekstre hazir: ${data.statement.length} satir`);
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "Ekstre cekilirken hata olustu");
    } finally {
      setLoading(false);
    }
  }

  async function fetchResidentEngagement(): Promise<void> {
    try {
      const res = await fetch(`${apiBase}/api/resident/me/engagement`, {
        credentials: "include",
      });
      if (!res.ok) {
        throw new Error("Duyuru ve anketler alinamadi");
      }

      const data = (await res.json()) as ResidentEngagementResponse;
      setAnnouncements(data.announcements);
      setPolls(data.polls);
      setPollSelections(
        data.polls.reduce<Record<string, string[]>>((acc, poll) => {
          acc[poll.id] = poll.myOptionIds;
          return acc;
        }, {})
      );
    } catch (err) {
      console.error(err);
      setMessage(err instanceof Error ? err.message : "Duyuru ve anketler alinamadi");
    }
  }

  async function fetchResidentExpensesReport(): Promise<void> {
    setExpenseReportLoading(true);
    try {
      const params = new URLSearchParams();
      params.set("limit", "200");

      const res = await fetch(`${apiBase}/api/resident/me/expenses-report?${params.toString()}`, {
        credentials: "include",
      });
      if (!res.ok) {
        throw new Error("Gider raporu alinamadi");
      }

      const data = (await res.json()) as ResidentExpenseReportResponse;
      setExpenseReport(data);
      if (selectedExpenseItemId && !data.topItems.some((item) => item.expenseItemId === selectedExpenseItemId)) {
        setSelectedExpenseItemId(null);
      }
    } catch (err) {
      console.error(err);
      setMessage(err instanceof Error ? err.message : "Gider raporu alinamadi");
    } finally {
      setExpenseReportLoading(false);
    }
  }

  async function submitPollVote(poll: ResidentPollItem): Promise<void> {
    const selectedOptionIds = pollSelections[poll.id] ?? [];
    if (selectedOptionIds.length === 0) {
      setMessage("Oy kullanmak icin en az bir secenek secin");
      return;
    }

    setVotingPollId(poll.id);
    try {
      const res = await fetch(`${apiBase}/api/resident/me/polls/${poll.id}/vote`, {
        method: "POST",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ optionIds: selectedOptionIds }),
      });

      if (!res.ok) {
        const errBody = (await res.json().catch(() => ({}))) as { message?: string };
        throw new Error(errBody.message ?? "Oy kaydedilemedi");
      }

      await fetchResidentEngagement();
      setMessage("Oyunuz kaydedildi");
    } catch (err) {
      console.error(err);
      setMessage(err instanceof Error ? err.message : "Oy kaydedilemedi");
    } finally {
      setVotingPollId(null);
    }
  }

  async function handlePasswordChange(e: FormEvent<HTMLFormElement>): Promise<void> {
    e.preventDefault();

    if (!passwordForm.currentPassword || !passwordForm.newPassword || !passwordForm.confirmPassword) {
      setMessage("Sifre alanlarini doldurun");
      return;
    }

    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      setMessage("Yeni sifre ve tekrar sifresi ayni olmali");
      return;
    }

    setPasswordSaving(true);
    try {
      const res = await fetch(`${apiBase}/api/resident/me/password`, {
        method: "POST",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(passwordForm),
      });

      if (!res.ok) {
        const errBody = (await res.json().catch(() => ({}))) as { message?: string };
        throw new Error(errBody.message ?? "Sifre guncellenemedi");
      }

      setPasswordForm({
        currentPassword: "",
        newPassword: "",
        confirmPassword: "",
      });
      setPasswordPanelOpen(false);
      setMessage("Sifreniz guncellendi");
    } catch (err) {
      console.error(err);
      setMessage(err instanceof Error ? err.message : "Sifre guncellenemedi");
    } finally {
      setPasswordSaving(false);
    }
  }

  /* eslint-disable react-hooks/exhaustive-deps */
  useEffect(() => {
    if (user?.apartmentId) {
      void fetchMyStatement();
    } else {
      setStatement([]);
      setAccountingStatement([]);
      setMessage("Hesabiniza daire baglantisi tanimli degil. Yoneticiniz ile iletisime gecin.");
    }
    void fetchResidentEngagement();
    void fetchResidentExpensesReport();
  }, [user?.apartmentId]);
  /* eslint-enable react-hooks/exhaustive-deps */

  return (
    <section className="dashboard resident-dashboard">
      <div className="card user-card resident-header-card">
        <h2>Resident Ekstre</h2>
        <div className="resident-header-actions">
          <button
            className="btn btn-ghost"
            type="button"
            onClick={() => setPasswordPanelOpen((prev) => !prev)}
          >
            {passwordPanelOpen ? "Sifreyi Kapat" : "Sifre Degistir"}
          </button>
          <button className="btn btn-primary" onClick={() => void fetchMyStatement()} disabled={loading}>
            Yenile
          </button>
        </div>
      </div>

      {passwordPanelOpen && (
        <div className="card table-card resident-password-card">
          <h3>Sifre Degistir</h3>
          <form className="form-grid compact-row-top-gap" onSubmit={(e) => void handlePasswordChange(e)}>
            <label>
              Mevcut Sifre
              <input
                type="password"
                value={passwordForm.currentPassword}
                onChange={(e) =>
                  setPasswordForm((prev) => ({
                    ...prev,
                    currentPassword: e.target.value,
                  }))
                }
                placeholder="********"
                required
              />
            </label>
            <label>
              Yeni Sifre
              <input
                type="password"
                value={passwordForm.newPassword}
                onChange={(e) =>
                  setPasswordForm((prev) => ({
                    ...prev,
                    newPassword: e.target.value,
                  }))
                }
                placeholder="En az 8 karakter, harf ve rakam"
                required
              />
            </label>
            <label>
              Yeni Sifre (Tekrar)
              <input
                type="password"
                value={passwordForm.confirmPassword}
                onChange={(e) =>
                  setPasswordForm((prev) => ({
                    ...prev,
                    confirmPassword: e.target.value,
                  }))
                }
                placeholder="Yeni sifreyi tekrar girin"
                required
              />
            </label>
            <button type="submit" className="btn btn-primary" disabled={passwordSaving}>
              {passwordSaving ? "Kaydediliyor..." : "Sifreyi Guncelle"}
            </button>
          </form>
        </div>
      )}

      <div className="stats-grid resident-stats-grid">
        {statementViewMode === "CLASSIC" ? (
          <>
            <article className="card stat">
              <h4>Toplam Borclandirilan</h4>
              <p>{formatTry(totals.amount)}</p>
            </article>
            <article className="card stat">
              <h4>Toplam Odenen</h4>
              <p>{formatTry(totals.paid)}</p>
            </article>
            <article className="card stat">
              <h4>Vadesi Gecmis Borc</h4>
              <p>{formatTry(overdueStatementTotals.remaining)}</p>
            </article>
            <article className="card stat">
              <h4>Kalan Bakiye</h4>
              <p>{formatTry(totals.remaining)}</p>
            </article>
          </>
        ) : (
          <>
            <article className="card stat">
              <h4>Toplam Borc Hareketi</h4>
              <p>{formatTry(accountingTotals.debit)}</p>
            </article>
            <article className="card stat">
              <h4>Toplam Alacak Hareketi</h4>
              <p>{formatTry(accountingTotals.credit)}</p>
            </article>
            <article className="card stat">
              <h4>Bakiye</h4>
              <p>{formatTry(accountingTotals.balance)}</p>
            </article>
          </>
        )}
      </div>

      <div className="card table-card resident-section-expense">
        {expenseReportLoading && <p className="small">Gider raporu yukleniyor...</p>}

        <section className="expense-report-summary compact-row-top-gap">
          <div className="expense-report-summary-head">
            <h4>
              Gider Kalemi Bazli Toplamlar
              {!selectedExpenseItemId && (
                <span className="small"> (Detayi gormek icin yukaridan bir gider kalemine tiklayin.)</span>
              )}
            </h4>
            <span className="small">
              Kalem: {expenseReport?.topItems.length ?? 0} | Toplam: {formatTry(expenseReport?.totalAmount ?? 0)} | Kayit: {expenseReport?.totalCount ?? 0}
            </span>
          </div>

          {expenseReport && expenseReport.topItems.length > 0 ? (
            <div className="table-wrap">
              <table className="apartment-list-table report-compact-table expense-report-summary-table">
                <thead>
                  <tr>
                    <th className="col-num">Sira</th>
                    <th>Gider Kalemi</th>
                    <th className="col-num">Kayit Adedi</th>
                    <th className="col-num">Toplam</th>
                  </tr>
                </thead>
                <tbody>
                  {expenseReport.topItems.map((item, index) => (
                    <tr key={item.expenseItemId}>
                      <td className="col-num">{index + 1}</td>
                      <td>
                        <button
                          type="button"
                          className={selectedExpenseItemId === item.expenseItemId ? "btn btn-primary" : "btn btn-ghost"}
                          onClick={() => setSelectedExpenseItemId(item.expenseItemId)}
                        >
                          {item.expenseItemName}
                        </button>
                      </td>
                      <td className="col-num">{item.expenseCount}</td>
                      <td className="col-num">{formatTry(item.totalAmount)}</td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="expense-report-summary-total-row">
                    <td colSpan={3}>Gider Toplami</td>
                    <td className="col-num">{formatTry(expenseReport.totalAmount)}</td>
                  </tr>
                </tfoot>
              </table>
            </div>
          ) : (
            <p className="small">Gider ozeti bulunmuyor.</p>
          )}
        </section>

        {selectedExpenseItemId && (
          <>
            <div className="section-head compact-row-top-gap">
              <h4>Detay: {selectedExpenseItem?.expenseItemName ?? "Kalem"}</h4>
              <button type="button" className="btn btn-ghost" onClick={() => setSelectedExpenseItemId(null)}>
                Detayi Kapat
              </button>
            </div>
            <div className="table-wrap compact-row-top-gap">
              <table className="apartment-list-table report-compact-table expense-report-table">
                <thead>
                  <tr>
                    <th>Gider Tarihi</th>
                    <th>Gider Kalemi</th>
                    <th>Odeme Araci</th>
                    <th className="col-num">Tutar</th>
                    <th>Aciklama</th>
                    <th>Referans</th>
                  </tr>
                </thead>
                <tbody>
                  {selectedExpenseRows.map((row) => (
                    <tr key={row.id}>
                      <td>{formatDateTr(row.spentAt)}</td>
                      <td>{row.expenseItemName}</td>
                      <td>{row.paymentMethod}</td>
                      <td className="col-num">{formatTry(row.amount)}</td>
                      <td className="expense-report-description" title={row.description ?? "-"}>{row.description ?? "-"}</td>
                      <td>{row.reference ?? "-"}</td>
                    </tr>
                  ))}
                  {selectedExpenseRows.length === 0 && (
                    <tr>
                      <td className="empty" colSpan={6}>
                        Bu gider kalemi icin detay kaydi yok
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </>
        )}
      </div>

      <div className="card table-card resident-section-statement">
        <div className="compact-row">
          <h3>Ekstre</h3>
          <div className="admin-row">
            <button
              type="button"
              className={statementViewMode === "CLASSIC" ? "btn btn-primary" : "btn btn-ghost"}
              onClick={() => setStatementViewMode("CLASSIC")}
            >
              Kapamali Ekstre
            </button>
            <button
              type="button"
              className={statementViewMode === "ACCOUNTING" ? "btn btn-primary" : "btn btn-ghost"}
              onClick={() => setStatementViewMode("ACCOUNTING")}
            >
              Muhasebe Ekstresi
            </button>
          </div>
        </div>
        <div className="table-wrap">
          {statementViewMode === "CLASSIC" ? (
            <table className="resident-classic-statement-table">
              <thead>
                <tr>
                  <th>Yil</th>
                  <th>Ay</th>
                  <th>Aciklama</th>
                  <th>Son Odeme Tarihi</th>
                  <th>Odenme Tarihi</th>
                  <th className="col-num">Tutar</th>
                  <th className="col-num">Odenen</th>
                  <th className="col-num">Kalan</th>
                  <th>Durum</th>
                </tr>
              </thead>
              <tbody>
                {sortedStatement.map((row) => {
                  const isClosed = row.remaining <= 0.0001 || row.status === "CLOSED";
                  let rowClassName = "statement-classic-row-open";

                  if (isClosed) {
                    rowClassName = "statement-classic-row-closed";
                  } else {
                    const due = new Date(row.dueDate);
                    if (!Number.isNaN(due.getTime())) {
                      const todayStart = new Date();
                      todayStart.setHours(0, 0, 0, 0);
                      const dueStart = new Date(due.getFullYear(), due.getMonth(), due.getDate()).getTime();
                      if (dueStart < todayStart.getTime()) {
                        rowClassName = "statement-classic-row-overdue";
                      }
                    }
                  }

                  return (
                    <tr key={row.chargeId} className={rowClassName}>
                    <td>{row.periodYear}</td>
                    <td>{String(row.periodMonth).padStart(2, "0")}</td>
                    <td>{row.type}</td>
                    <td>{formatDateTr(row.dueDate)}</td>
                    <td>{row.status === "CLOSED" ? (row.paidAt ? formatDateTr(row.paidAt) : "-") : "-"}</td>
                    <td className="col-num">{formatTry(row.amount)}</td>
                    <td className="col-num">{formatTry(row.paidTotal)}</td>
                    <td className="col-num">{formatTry(row.remaining)}</td>
                    <td>{row.status}</td>
                    </tr>
                  );
                })}
                {statement.length === 0 && (
                  <tr>
                    <td colSpan={9} className="empty">
                      Henuz ekstre verisi yok
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          ) : (
            <table>
              <thead>
                <tr>
                  <th>Yil</th>
                  <th>Ay</th>
                  <th>Tarih</th>
                  <th>Hareket</th>
                  <th>Aciklama</th>
                  <th className="col-num">Borc</th>
                  <th className="col-num">Alacak</th>
                  <th className="col-num">Bakiye</th>
                </tr>
              </thead>
              <tbody>
                {sortedAccountingStatement.map((row) => (
                  <tr key={row.movementId}>
                    <td>{row.periodYear ?? new Date(row.date).getFullYear()}</td>
                    <td>{String(row.periodMonth ?? new Date(row.date).getMonth() + 1).padStart(2, "0")}</td>
                    <td>{formatDateTr(row.date)}</td>
                    <td>{row.movementType}</td>
                    <td>{row.description}</td>
                    <td className="col-num">{row.debit > 0 ? formatTry(row.debit) : "-"}</td>
                    <td className="col-num">{row.credit > 0 ? formatTry(row.credit) : "-"}</td>
                    <td className="col-num">{formatTry(row.balance)}</td>
                  </tr>
                ))}
                {accountingStatement.length === 0 && (
                  <tr>
                    <td colSpan={8} className="empty">
                      Henuz muhasebe ekstresi verisi yok
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          )}
        </div>
      </div>

      <div className="card table-card resident-section-announcements">
        <div className="section-head">
          <h3>Duyurular</h3>
          <button className="btn btn-ghost" type="button" onClick={() => void fetchResidentEngagement()}>
            Yenile
          </button>
        </div>
        {announcements.length === 0 ? (
          <p className="small">Aktif duyuru bulunmuyor.</p>
        ) : (
          <div className="guide-list compact-row-top-gap">
            {announcements.map((item) => (
              <article key={item.id} className="card">
                <h4>{item.title}</h4>
                <p className="small">Yayin: {formatDateTr(item.publishAt)}</p>
                <p>{item.content}</p>
              </article>
            ))}
          </div>
        )}
      </div>

      <div className="card table-card resident-section-polls">
        <h3>Anketler</h3>
        {polls.length === 0 ? (
          <p className="small">Aktif anket bulunmuyor.</p>
        ) : (
          <div className="guide-list compact-row-top-gap">
            {polls.map((poll) => {
              const selected = pollSelections[poll.id] ?? [];
              return (
                <article key={poll.id} className="card">
                  <h4>{poll.title}</h4>
                  {poll.description && <p className="small">{poll.description}</p>}
                  <p className="small">
                    Oy sayisi: {poll.totalVotes} | Tip: {poll.allowMultiple ? "Coklu secim" : "Tek secim"}
                  </p>
                  <div className="guide-list compact-row-top-gap">
                    {poll.options.map((option) => {
                      const checked = selected.includes(option.id);
                      return (
                        <label key={option.id} className="month-chip">
                          <input
                            type="checkbox"
                            checked={checked}
                            onChange={(e) => {
                              const isChecked = e.target.checked;
                              setPollSelections((prev) => {
                                const current = prev[poll.id] ?? [];
                                let next: string[];
                                if (poll.allowMultiple) {
                                  next = isChecked
                                    ? [...new Set([...current, option.id])]
                                    : current.filter((id) => id !== option.id);
                                } else {
                                  next = isChecked ? [option.id] : [];
                                }
                                return {
                                  ...prev,
                                  [poll.id]: next,
                                };
                              });
                            }}
                          />
                          {option.text} ({option.voteCount})
                        </label>
                      );
                    })}
                  </div>
                  <div className="admin-row compact-row-top-gap">
                    <button
                      className="btn btn-primary"
                      type="button"
                      disabled={votingPollId === poll.id || selected.length === 0}
                      onClick={() => void submitPollVote(poll)}
                    >
                      {votingPollId === poll.id ? "Kaydediliyor..." : "Oyumu Kaydet"}
                    </button>
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </div>

      <footer className="status-bar status-bar-fixed">{message}</footer>
    </section>
  );
}

function App() {
  const navigate = useNavigate();
  const location = useLocation();
  const [user, setUser] = useState<LoginResponse["user"] | null>(() => {
    const raw = localStorage.getItem(userStorageKey);
    return raw ? (JSON.parse(raw) as LoginResponse["user"]) : null;
  });
  const [authLoading, setAuthLoading] = useState(false);
  const [authMessage, setAuthMessage] = useState("Lutfen giris yapin");
  const defaultAuthenticatedPath = user?.role === "ADMIN" ? "/admin/reports" : "/resident";
  const isAdmin = user?.role === "ADMIN";
  const residentDoorNo =
    user?.role === "RESIDENT"
      ? ((user.apartmentDoorNo ?? "").trim() || "-")
      : "";

  useEffect(() => {
    const dropdownSelector = "details.filter-dropdown";

    const closeOtherFilterDropdowns = (active?: HTMLDetailsElement): void => {
      const detailsElements = Array.from(
        document.querySelectorAll<HTMLDetailsElement>(dropdownSelector)
      );

      for (const details of detailsElements) {
        if (details !== active) {
          details.open = false;
        }
      }
    };

    const onToggle = (event: Event): void => {
      const target = event.target;
      if (!(target instanceof HTMLDetailsElement)) {
        return;
      }

      if (!target.matches(dropdownSelector) || !target.open) {
        return;
      }

      closeOtherFilterDropdowns(target);
    };

    const onDocumentClick = (event: MouseEvent): void => {
      const target = event.target;
      if (!(target instanceof Node)) {
        return;
      }

      if (target instanceof Element) {
        const clickedDropdown = target.closest(dropdownSelector);
        if (clickedDropdown) {
          return;
        }
      }

      closeOtherFilterDropdowns();
    };

    document.addEventListener("toggle", onToggle, true);
    document.addEventListener("click", onDocumentClick);

    return () => {
      document.removeEventListener("toggle", onToggle, true);
      document.removeEventListener("click", onDocumentClick);
    };
  }, []);

  async function handleLogin(identifier: string, password: string): Promise<void> {
    setAuthLoading(true);
    setAuthMessage("Giris yapiliyor...");

    try {
      const res = await fetch(`${apiBase}/api/auth/login`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify({ identifier, password }),
      });

      const errorPayload = (await res.clone().json().catch(() => null)) as { message?: string } | null;

      if (!res.ok) {
        if (res.status === 429) {
          setAuthMessage(errorPayload?.message ?? "Cok fazla deneme yaptiniz. Lutfen biraz bekleyip tekrar deneyin.");
          return;
        }

        if (res.status === 401) {
          setAuthMessage(errorPayload?.message ?? "Giris basarisiz. Telefon/e-posta veya sifreyi kontrol et.");
          return;
        }

        throw new Error(errorPayload?.message ?? `Login failed (${res.status})`);
      }

      const data = (await res.json()) as LoginResponse;
      setUser(data.user);
      localStorage.setItem(userStorageKey, JSON.stringify(data.user));
      setAuthMessage(`Hos geldin ${data.user.fullName}`);
      navigate(data.user.role === "ADMIN" ? "/admin/reports" : "/resident");
    } catch (err) {
      console.error(err);
      setAuthMessage("Giris basarisiz. Telefon/e-posta veya sifreyi kontrol et.");
    } finally {
      setAuthLoading(false);
    }
  }

  function logout(): void {
    void fetch(`${apiBase}/api/auth/logout`, {
      method: "POST",
      credentials: "include",
    }).catch(() => {
      // best-effort logout request; local cleanup always continues
    });

    setUser(null);
    localStorage.removeItem(userStorageKey);
    setAuthMessage("Cikis yapildi");
    navigate("/");
  }

  function openCurrentScreenInNewTab(): void {
    const targetPath = `${location.pathname}${location.search}${location.hash}`;
    const width = Math.max(1100, window.screen.availWidth);
    const height = Math.max(760, window.screen.availHeight);
    const left = 0;
    const top = 0;

    const features = [
      "popup=yes",
      "noopener=yes",
      "noreferrer=yes",
      `width=${width}`,
      `height=${height}`,
      `left=${left}`,
      `top=${top}`,
    ].join(",");

    const opened = window.open(targetPath, "_blank", features);
    if (opened) {
      opened.focus();
      return;
    }

    // Fallback: if popup is blocked, continue with a normal new tab.
    window.open(targetPath, "_blank", "noopener,noreferrer");
  }

  const isStaffOpenAidatRoute = location.pathname === "/admin/reports/staff-open-aidat";

  return (
    <div className={`page${isStaffOpenAidatRoute ? " page-mobile-staff-open-aidat" : ""}`}>
      <div className="ambient ambient-one" />
      <div className="ambient ambient-two" />

      <header className="hero">
        <h1>
          ApartmanWeb MVP
          <span className="hero-title-suffix"> | Tahakkuk ve Ekstre Paneli</span>
        </h1>
        {user && (
          <div className="hero-actions">
            {user.role === "ADMIN" && (
              <NavLink className="btn btn-ghost" to="/admin/reports">
                Admin Panel
              </NavLink>
            )}
            <NavLink className="btn btn-ghost" to="/resident">
              Resident Panel
            </NavLink>
            {isAdmin && (
              <NavLink className="btn btn-ghost" to="/admin/guide/manual">
                Kullanim Kilavuzu
              </NavLink>
            )}
            <button className="btn btn-ghost" type="button" onClick={openCurrentScreenInNewTab}>
              Yeni Ekran Ac
            </button>
            <span className={user.role === "RESIDENT" ? "resident-user-line" : "small"}>
              {user.role === "RESIDENT" ? `Sn. ${user.fullName} + Daire No: ${residentDoorNo}` : user.fullName}
            </span>
            <button className="btn btn-danger" onClick={logout}>
              Cikis
            </button>
          </div>
        )}
      </header>

      <div className="app-shell">
        <main className="workspace">
          <Routes>
            <Route path="/" element={<Navigate to={user ? defaultAuthenticatedPath : "/login"} replace />} />
            <Route
              path="/login"
              element={
                user ? (
                  <Navigate to={defaultAuthenticatedPath} replace />
                ) : (
                  <LoginPage onLogin={handleLogin} loading={authLoading} message={authMessage} />
                )
              }
            />
            <Route
              path="/admin/*"
              element={user?.role === "ADMIN" ? <AdminPage /> : <Navigate to="/login" replace />}
            />
            <Route
              path="/resident"
              element={
                user ? (
                  <ResidentPage
                    user={user}
                    onResidentDoorNo={(doorNo) => {
                      setUser((prev) => {
                        if (!prev || prev.role !== "RESIDENT" || prev.apartmentDoorNo === doorNo) {
                          return prev;
                        }
                        const nextUser = { ...prev, apartmentDoorNo: doorNo };
                        localStorage.setItem(userStorageKey, JSON.stringify(nextUser));
                        return nextUser;
                      });
                    }}
                  />
                ) : (
                  <Navigate to="/login" replace />
                )
              }
            />
            <Route path="*" element={<Navigate to={user ? defaultAuthenticatedPath : "/login"} replace />} />
          </Routes>
        </main>
      </div>
    </div>
  );
}

export default App;

