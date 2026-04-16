import type { Prisma } from "@prisma/client";

export type AdminPermissionAction = "read" | "write" | "delete";

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

export const ADMIN_PAGE_DEFINITIONS: Array<{ key: AdminPageKey; label: string }> = [
  { key: "APT_NEW", label: "Daire / Kayit Islemleri / Daire Ekle" },
  { key: "APT_LIST", label: "Daire / Kayit Islemleri / Daire Listesi" },
  { key: "APT_EDIT", label: "Daire / Kayit Islemleri / Daire Degistir" },
  { key: "APT_PASSWORDS", label: "Daire / Kayit Islemleri / Daire Sifre Degistir" },
  { key: "APT_UPLOAD", label: "Daire / Toplu Islemler / Daire Excel Yukle" },
  { key: "APT_BULK_UPDATE", label: "Daire / Toplu Islemler / Daire Toplu Duzenle" },
  { key: "APT_HISTORY", label: "Daire / Toplu Islemler / Daire Degisiklik Gecmisi" },
  { key: "BUILDING_INFO", label: "Daire / Tanimlar / Bina Bilgileri" },
  { key: "BLOCKS", label: "Daire / Tanimlar / Blok Ekle" },
  { key: "APT_CLASSES", label: "Daire / Tanimlar / Daire Siniflari" },
  { key: "APT_TYPES", label: "Daire / Tanimlar / Daire Tipleri" },
  { key: "APT_DUTIES", label: "Daire / Tanimlar / Daire Gorevleri" },
  { key: "CHARGE_TYPES_LIST", label: "Tahakkuk / Tahakkuk Tipleri / Liste" },
  { key: "CHARGE_TYPES_CREATE", label: "Tahakkuk / Tahakkuk Tipleri / Ekle" },
  { key: "CHARGE_TYPES_EDIT", label: "Tahakkuk / Tahakkuk Tipleri / Degistir" },
  { key: "CHARGE_TYPES_DELETE", label: "Tahakkuk / Tahakkuk Tipleri / Sil" },
  { key: "CHARGES_NEW_CREATE", label: "Tahakkuk / Tahakkuk Girisi / Kaydet" },
  { key: "CHARGES_BULK_CREATE", label: "Tahakkuk / Toplu Tahakkuk / Uygula" },
  { key: "CHARGES_BULK_CORRECT_EDIT", label: "Tahakkuk / Toplu Tahakkuk Duzeltme / Duzelt-Sil" },
  { key: "CHARGES_GAS_CALC_CREATE", label: "Tahakkuk / Gider Dagitimi / Uygula" },
  { key: "PAYMENT_METHODS_LIST", label: "Tahsilat / Odeme Yontemleri / Liste" },
  { key: "PAYMENT_METHODS_CREATE", label: "Tahsilat / Odeme Yontemleri / Ekle" },
  { key: "PAYMENT_METHODS_EDIT", label: "Tahsilat / Odeme Yontemleri / Degistir" },
  { key: "PAYMENT_METHODS_DELETE", label: "Tahsilat / Odeme Yontemleri / Sil" },
  { key: "PAYMENTS_NEW_CREATE", label: "Tahsilat / Tahsilat Girisi / Kaydet" },
  { key: "PAYMENTS_LIST_LIST", label: "Tahsilat / Tahsilat Raporu / Liste" },
  { key: "PAYMENTS_LIST_EDIT", label: "Tahsilat / Tahsilat Raporu / Degistir" },
  { key: "PAYMENTS_LIST_DELETE", label: "Tahsilat / Tahsilat Raporu / Sil" },
  { key: "STATEMENT_VIEW", label: "Tahsilat / Ekstre / Goruntule" },
  { key: "STATEMENT_ALL_VIEW", label: "Tahsilat / Toplu Ekstre / Goruntule" },
  { key: "EXPENSE_ITEMS_LIST", label: "Gider / Gider Kalemleri / Liste" },
  { key: "EXPENSE_ITEMS_CREATE", label: "Gider / Gider Kalemleri / Ekle" },
  { key: "EXPENSE_ITEMS_EDIT", label: "Gider / Gider Kalemleri / Degistir" },
  { key: "EXPENSE_ITEMS_DELETE", label: "Gider / Gider Kalemleri / Sil" },
  { key: "EXPENSES_NEW_CREATE", label: "Gider / Gider Girisi / Kaydet" },
  { key: "EXPENSES_REPORT_LIST", label: "Gider / Gider Raporu / Liste" },
  { key: "EXPENSES_REPORT_EDIT", label: "Gider / Gider Raporu / Degistir" },
  { key: "EXPENSES_REPORT_DELETE", label: "Gider / Gider Raporu / Sil" },
  { key: "REPORTS_SUMMARY", label: "Raporlar / Ozet / Genel Rapor" },
  { key: "REPORTS_STAFF_MOBILE_HOME", label: "Raporlar / Personel / Personel Mobil Ana Ekran" },
  { key: "REPORTS_OVERDUE", label: "Raporlar / Borc Analizi / Gecikmis Borc Raporu" },
  { key: "REPORTS_STAFF_OPEN_AIDAT", label: "Raporlar / Personel / Personel Acik Aidat" },
  { key: "REPORTS_STAFF_OPEN_AIDAT_SEND_EMAIL", label: "Raporlar / Personel / Personel Acik Aidat / Ekstre E-mail Gonder" },
  { key: "REPORTS_MONTHLY_BALANCE", label: "Raporlar / Finans / Aylik Bakiye Matrisi" },
  { key: "REPORTS_MONTHLY_LEDGER", label: "Sistem ve Duzeltme / Raporlar / Aylik Defter" },
  { key: "REPORTS_FRACTIONAL", label: "Raporlar / Finans / Kesirli Kapatmalar" },
  { key: "REPORTS_REFERENCE_SEARCH", label: "Raporlar / Arama / Referans Arama" },
  { key: "REPORTS_BANK_MOVEMENTS", label: "Raporlar / Finans / Banka Hareketleri" },
  { key: "BANKS", label: "Banka / Tanimlar / Banka Listesi" },
  { key: "BANK_INITIAL_BALANCES", label: "Banka / Tanimlar / Ilk Bakiye" },
  { key: "BANK_TERM_DEPOSITS_LIST", label: "Banka / Vadeli Mevduat / Liste" },
  { key: "BANK_TERM_DEPOSITS_CREATE", label: "Banka / Vadeli Mevduat / Ekle" },
  { key: "BANK_TERM_DEPOSITS_EDIT", label: "Banka / Vadeli Mevduat / Degistir" },
  { key: "BANK_TERM_DEPOSITS_DELETE", label: "Banka / Vadeli Mevduat / Sil" },
  { key: "BANK_STATEMENT_IMPORT", label: "Banka / Ekstre / Banka Ekstresi Yukle" },
  { key: "BANK_STATEMENT_VIEW", label: "Banka / Ekstre / Banka Ekstre Goruntule" },
  { key: "UPLOAD_BATCHES", label: "Banka / Ekstre / Yukleme Gecmisi" },
  { key: "CHECK_CHARGE_CONSISTENCY", label: "Kontrol / Finans Kontrolleri / Tahakkuk Kontrol" },
  { key: "CHECK_DOOR_MISMATCH", label: "Kontrol / Finans Kontrolleri / Banka Eslestirme Kontrolu" },
  { key: "CHECK_BANK_STATEMENT", label: "Kontrol / Finans Kontrolleri / Banka Ekstresi Karsilastirma" },
  { key: "CHECK_MANUAL_REVIEW", label: "Kontrol / Finans Kontrolleri / Manuel Inceleme Gerektiren Eslesmeler" },
  { key: "SETTINGS_DESC_DOOR", label: "Sistem ve Duzeltme / Esleme / Aciklama-Daire Esleme" },
  { key: "SETTINGS_DESC_EXPENSE", label: "Sistem ve Duzeltme / Esleme / Aciklama-Gider Esleme" },
  { key: "RESIDENT_CONTENT", label: "Sistem ve Duzeltme / Iletisim / Duyurular ve Anketler" },
  { key: "CORRECTIONS", label: "Sistem ve Duzeltme / Islemler / Duzeltmeler" },
  { key: "UNCLASSIFIED", label: "Kontrol / Finans Kontrolleri / Siniflandirilamayanlar" },
  { key: "MANUAL_CLOSURES", label: "Sistem ve Duzeltme / Islemler / Manuel Kapama Yonetimi" },
  { key: "AUDIT_LOGS", label: "Sistem ve Duzeltme / Izleme / Islem Gecmisi" },
  { key: "MEETING", label: "Toplanti / Islemler / Toplanti" },
  { key: "GUIDE_MANUAL", label: "Kullanim Kilavuzu / Dokuman / Kilavuz" },
  { key: "USER_ACCESS", label: "Kullanici ve Yetki / Yonetim / Yonetim" },
  { key: "OPENING_ENTRY", label: "Sistem ve Duzeltme / Islemler / Acilis Kaydi" },
  { key: "LOGIN_LOGS", label: "Sistem ve Duzeltme / Izleme / Kullanici Oturumlari" },
];

const ADMIN_PAGE_KEYS = new Set<AdminPageKey>(ADMIN_PAGE_DEFINITIONS.map((x) => x.key));

export function createFullAdminPermissionMap(): AdminPagePermissionMap {
  return ADMIN_PAGE_DEFINITIONS.reduce((acc, item) => {
    acc[item.key] = { visible: true, read: true, write: true, delete: true };
    return acc;
  }, {} as AdminPagePermissionMap);
}

export function normalizeAdminPermissionMap(input: unknown): AdminPagePermissionMap {
  const full = createFullAdminPermissionMap();

  if (!input || typeof input !== "object" || Array.isArray(input)) {
    return full;
  }

  const raw = input as Record<string, unknown>;
  for (const [key, value] of Object.entries(raw)) {
    if (!ADMIN_PAGE_KEYS.has(key as AdminPageKey)) {
      continue;
    }
    if (!value || typeof value !== "object" || Array.isArray(value)) {
      continue;
    }

    const row = value as Record<string, unknown>;
    full[key as AdminPageKey] = {
      visible: Boolean(row.visible),
      read: Boolean(row.read),
      write: Boolean(row.write),
      delete: Boolean(row.delete),
    };
  }

  return full;
}

export function mapRequestPathToAdminPage(pathname: string, method?: string): AdminPageKey {
  const normalizedMethod = (method ?? "GET").toUpperCase();

  if (pathname.startsWith("/user-access")) return "USER_ACCESS";
  if (pathname.startsWith("/opening-entries")) return "OPENING_ENTRY";

  if (/^\/apartments\/[^/]+\/statement-email$/.test(pathname)) {
    return "REPORTS_STAFF_OPEN_AIDAT_SEND_EMAIL";
  }

  if (/^\/apartments\/[^/]+\/statement-pdf-email$/.test(pathname)) {
    return "REPORTS_STAFF_OPEN_AIDAT_SEND_EMAIL";
  }

  if (/^\/apartments\/[^/]+\/statement$/.test(pathname)) return "STATEMENT_VIEW";

  if (pathname.startsWith("/apartments/upload")) return "APT_UPLOAD";
  if (pathname.startsWith("/apartments/bulk-update")) return "APT_BULK_UPDATE";
  if (pathname.startsWith("/apartments/history")) return "APT_HISTORY";
  if (pathname.startsWith("/apartments/password")) return "APT_PASSWORDS";
  if (pathname.startsWith("/apartments/list")) return "APT_LIST";
  if (pathname === "/apartments") {
    if (normalizedMethod === "GET") return "APT_LIST";
    if (normalizedMethod === "POST") return "APT_NEW";
    return "APT_EDIT";
  }
  if (pathname.startsWith("/apartments")) return "APT_EDIT";
  if (pathname.startsWith("/building-profile") || pathname.startsWith("/building-info")) return "BUILDING_INFO";
  if (pathname.startsWith("/blocks")) return "BLOCKS";
  if (pathname.startsWith("/apartment-classes")) return "APT_CLASSES";
  if (pathname.startsWith("/apartment-types")) return "APT_TYPES";
  if (pathname.startsWith("/apartment-duties")) return "APT_DUTIES";

  if (pathname.startsWith("/charge-types")) {
    if (normalizedMethod === "POST") return "CHARGE_TYPES_CREATE";
    if (normalizedMethod === "PUT" || normalizedMethod === "PATCH") return "CHARGE_TYPES_EDIT";
    if (normalizedMethod === "DELETE") return "CHARGE_TYPES_DELETE";
    return "CHARGE_TYPES_LIST";
  }
  if (pathname.includes("/gas") || pathname.startsWith("/charges/distributed")) {
    return pathname.includes("/invoices/") ? "CHARGES_BULK_CORRECT_EDIT" : "CHARGES_GAS_CALC_CREATE";
  }
  if (pathname.includes("/bulk-correct") || pathname.includes("/bulk-correction")) return "CHARGES_BULK_CORRECT_EDIT";
  if (pathname.includes("/bulk")) return "CHARGES_BULK_CREATE";
  if (/^\/charges\/[^/]+$/.test(pathname) || /^\/charges\/[^/]+\/close$/.test(pathname)) {
    return "CHARGES_BULK_CORRECT_EDIT";
  }
  if (pathname.startsWith("/charges")) return "CHARGES_NEW_CREATE";

  if (pathname.startsWith("/payment-methods")) {
    if (normalizedMethod === "POST") return "PAYMENT_METHODS_CREATE";
    if (normalizedMethod === "PUT" || normalizedMethod === "PATCH") return "PAYMENT_METHODS_EDIT";
    if (normalizedMethod === "DELETE") return "PAYMENT_METHODS_DELETE";
    return "PAYMENT_METHODS_LIST";
  }

  if (pathname.startsWith("/payments/list")) return "PAYMENTS_LIST_LIST";

  if (/^\/payments\/[^/]+$/.test(pathname)) {
    if (normalizedMethod === "DELETE") return "PAYMENTS_LIST_DELETE";
    return "PAYMENTS_LIST_EDIT";
  }

  if (/^\/payments\/[^/]+\/manual-review-dismiss$/.test(pathname)) {
    return "PAYMENTS_LIST_EDIT";
  }

  if (pathname.startsWith("/payments")) {
    return "PAYMENTS_NEW_CREATE";
  }

  if (pathname.startsWith("/statement/all")) return "STATEMENT_ALL_VIEW";
  if (pathname.startsWith("/statement")) return "STATEMENT_VIEW";

  if (pathname.startsWith("/expense-items")) {
    if (normalizedMethod === "POST") return "EXPENSE_ITEMS_CREATE";
    if (normalizedMethod === "PUT" || normalizedMethod === "PATCH") return "EXPENSE_ITEMS_EDIT";
    if (normalizedMethod === "DELETE") return "EXPENSE_ITEMS_DELETE";
    return "EXPENSE_ITEMS_LIST";
  }

  if (pathname.startsWith("/expenses/report") || pathname === "/expenses") {
    return "EXPENSES_REPORT_LIST";
  }

  if (/^\/expenses\/[^/]+$/.test(pathname)) {
    if (normalizedMethod === "DELETE") return "EXPENSES_REPORT_DELETE";
    return "EXPENSES_REPORT_EDIT";
  }

  if (pathname.startsWith("/expenses")) return "EXPENSES_NEW_CREATE";

  if (pathname.startsWith("/reports/overdue")) return "REPORTS_OVERDUE";
  if (pathname.startsWith("/reports/staff-mobile-home")) return "REPORTS_STAFF_MOBILE_HOME";
  if (pathname.startsWith("/reports/staff-open-aidat")) return "REPORTS_STAFF_OPEN_AIDAT";
  if (pathname.startsWith("/reports/apartment-balance-matrix")) return "REPORTS_MONTHLY_BALANCE";
  if (pathname.startsWith("/reports/monthly-balance")) return "REPORTS_MONTHLY_BALANCE";
  if (pathname.startsWith("/reports/monthly-ledger")) return "REPORTS_MONTHLY_LEDGER";
  if (pathname.startsWith("/reports/fractional")) return "REPORTS_FRACTIONAL";
  if (pathname.startsWith("/reports/reference-search")) return "REPORTS_REFERENCE_SEARCH";
  if (pathname.startsWith("/reports/bank-reconciliation")) return "REPORTS_BANK_MOVEMENTS";
  if (pathname.startsWith("/reports/bank-movements")) return "REPORTS_BANK_MOVEMENTS";
  if (pathname.startsWith("/reports")) return "REPORTS_SUMMARY";

  if (pathname.startsWith("/banks/term-deposits")) {
    const normalizedMethod = (method ?? "GET").toUpperCase();
    if (normalizedMethod === "POST") return "BANK_TERM_DEPOSITS_CREATE";
    if (normalizedMethod === "PUT" || normalizedMethod === "PATCH") return "BANK_TERM_DEPOSITS_EDIT";
    if (normalizedMethod === "DELETE") return "BANK_TERM_DEPOSITS_DELETE";
    return "BANK_TERM_DEPOSITS_LIST";
  }
  if (pathname.startsWith("/banks/statement-view")) return "BANK_STATEMENT_VIEW";
  if (pathname.startsWith("/bank-statement")) return "BANK_STATEMENT_IMPORT";
  if (pathname.startsWith("/initial-balances")) return "BANK_INITIAL_BALANCES";
  if (pathname.startsWith("/upload-batches")) return "UPLOAD_BATCHES";
  if (pathname.startsWith("/banks")) return "BANKS";

  if (pathname.startsWith("/reconcile/door-mismatch")) return "CHECK_DOOR_MISMATCH";
  if (pathname.startsWith("/reports/charge-consistency")) return "CHECK_CHARGE_CONSISTENCY";
  if (pathname.startsWith("/reports/bank-statement")) return "CHECK_BANK_STATEMENT";
  if (pathname.startsWith("/reports/manual-review")) return "CHECK_MANUAL_REVIEW";

  if (pathname.startsWith("/description-door-rules")) return "SETTINGS_DESC_DOOR";
  if (pathname.startsWith("/description-expense-rules")) return "SETTINGS_DESC_EXPENSE";
  if (pathname.startsWith("/resident-content")) return "RESIDENT_CONTENT";
  if (pathname.startsWith("/corrections")) return "CORRECTIONS";
  if (pathname.startsWith("/unclassified")) return "UNCLASSIFIED";
  if (pathname.startsWith("/manual-closures")) return "MANUAL_CLOSURES";
  if (pathname.startsWith("/audit-logs")) return "AUDIT_LOGS";
  if (pathname.startsWith("/login-logs")) return "LOGIN_LOGS";

  if (pathname.startsWith("/meeting")) return "MEETING";
  if (pathname.startsWith("/guide")) return "GUIDE_MANUAL";

  return "REPORTS_SUMMARY";
}

export function mapRequestMethodToAdminAction(method: string): AdminPermissionAction {
  const normalized = method.toUpperCase();
  if (normalized === "GET" || normalized === "HEAD" || normalized === "OPTIONS") {
    return "read";
  }
  if (normalized === "DELETE") {
    return "delete";
  }
  return "write";
}

export function toPrismaJson(value: unknown): Prisma.InputJsonValue {
  return value as Prisma.InputJsonValue;
}