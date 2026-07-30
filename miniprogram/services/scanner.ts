export type ScannedCodeType = "barcode" | "qrCode";

export interface ScannedCode {
  value: string;
  type: ScannedCodeType;
}

export interface ScannerDependencies {
  scanCode(): Promise<{ result: string; scanType: string }>;
}

function mapScanType(scanType: string): ScannedCodeType | null {
  const normalized = scanType.toUpperCase();
  if (normalized.includes("QR")) return "qrCode";
  if (
    normalized.includes("EAN")
    || normalized.includes("UPC")
    || normalized.includes("CODE")
    || normalized.includes("BAR")
    || normalized === "PDF_417"
    || normalized === "DATAMATRIX"
  ) {
    return "barcode";
  }
  return "barcode";
}

function isCancelError(error: unknown): boolean {
  const message =
    error instanceof Error
      ? error.message
      : typeof error === "object" && error !== null
        ? String((error as { errMsg?: unknown }).errMsg ?? "")
        : String(error ?? "");
  return /cancel|取消/i.test(message);
}

export function createScanner(dependencies: ScannerDependencies) {
  return {
    async scanProductCode(): Promise<ScannedCode | null> {
      try {
        const result = await dependencies.scanCode();
        const value = (result.result || "").trim();
        if (!value) return null;
        const type = mapScanType(result.scanType || "");
        if (!type) return null;
        return { value, type };
      } catch (error) {
        if (isCancelError(error)) return null;
        throw error;
      }
    },
  };
}

export const scanner = createScanner({
  scanCode: () =>
    wx.scanCode({
      onlyFromCamera: true,
      scanType: ["barCode", "qrCode"],
    }),
});

export const scanProductCode = () => scanner.scanProductCode();
