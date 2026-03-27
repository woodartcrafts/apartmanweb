import { runGmailBankSync } from "../routes/admin";

async function main(): Promise<void> {
  const result = await runGmailBankSync();
  console.log(
    JSON.stringify(
      {
        ok: true,
        scannedMessageCount: result.scannedMessageCount,
        importedBatchCount: result.importedBatchCount,
        importedPaymentCount: result.importedPaymentCount,
        importedExpenseCount: result.importedExpenseCount,
        skippedRowCount: result.skippedRowCount,
        skippedDuplicateAttachmentCount: result.skippedDuplicateAttachmentCount,
        skippedNoParsedRowsCount: result.skippedNoParsedRowsCount,
        batchIds: result.batchIds,
        errorCount: result.errors.length,
        errors: result.errors,
      },
      null,
      2
    )
  );
}

main().catch((err) => {
  const detail = err instanceof Error ? err.message : "Unknown error";
  console.error("[gmail:sync] failed", detail);
  process.exitCode = 1;
});
