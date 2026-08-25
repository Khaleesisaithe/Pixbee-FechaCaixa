/**
 * Design: PixBee — fundo verde, vidro translúcido, marca de abelha minimalista,
 * botões arredondados e acentos verde/turquesa. Fluxo: início → abertura → contagem → validação.
 */
import { Button } from "@/components/ui/button";
import { AppShell } from "@/components/AppShell";
import { LoadingIndicator } from "@/components/LoadingIndicator";
import { AdSenseSlot } from "@/components/AdSenseSlot";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  type AdjustmentEntry,
  type AdjustmentKind,
  type AuditEvent,
  type CashEntry,
  type MethodId,
  type Quantities,
  type ShiftDurationHours,
  applyPhysicalMovement,
  createEmptyQuantities,
  createQuantitiesFromOpening,
  getShiftDeadline,
  getShiftRemainingMs,
  getNetCashEntryAmount,
  getStartedAt,
  sumCashEntries,
  useCashSession,
} from "@/contexts/CashSessionContext";
import {
  ArrowLeft,
  ArrowRight,
  Banknote,
  Building2,
  CheckCircle2,
  CircleDollarSign,
  ClipboardCheck,
  Clock3,
  Coins,
  CreditCard,
  Download,
  History,
  Home as HomeIcon,
  Landmark,
  Menu,
  Minus,
  Pencil,
  PackagePlus,
  Plus,
  Printer,
  ReceiptText,
  RotateCcw,
  Settings,
  Smartphone,
  Store,
  Trash2,
  UserRound,
  WalletCards,
  type LucideIcon,
} from "lucide-react";
import React, { useEffect, useMemo, useRef, useState } from "react";
import { Link, useLocation } from "wouter";
import { toast } from "sonner";
import { jsPDF } from "jspdf";
import { isDevelopmentPreviewEnabled } from "@/lib/feedbackPreview";
import { useLanguage, type Locale } from "@/contexts/LanguageContext";
import { adsenseSettings } from "@/lib/adsense";

const NOTE_DENOMINATIONS = [
  { key: "n200", label: "R$ 200", value: 200 },
  { key: "n100", label: "R$ 100", value: 100 },
  { key: "n50", label: "R$ 50", value: 50 },
  { key: "n20", label: "R$ 20", value: 20 },
  { key: "n10", label: "R$ 10", value: 10 },
  { key: "n5", label: "R$ 5", value: 5 },
  { key: "n2", label: "R$ 2", value: 2 },
];
const COIN_DENOMINATIONS = [
  { key: "m100", label: "R$ 1,00", value: 1 },
  { key: "m50", label: "R$ 0,50", value: 0.5 },
  { key: "m25", label: "R$ 0,25", value: 0.25 },
  { key: "m10", label: "R$ 0,10", value: 0.1 },
  { key: "m5", label: "R$ 0,05", value: 0.05 },
  { key: "m1", label: "R$ 0,01", value: 0.01 },
];
const CASH_DENOMINATIONS = [...NOTE_DENOMINATIONS, ...COIN_DENOMINATIONS];
export const sumDenominationQuantities = (quantities: Quantities) =>
  CASH_DENOMINATIONS.reduce(
    (total, item) => total + item.value * (quantities[item.key] ?? 0),
    0
  );
const getGrossAmount = (entry: CashEntry) => entry.grossAmount ?? entry.amount;
const getChangeAmount = (entry: CashEntry) => entry.changeAmount ?? 0;
const DIGITAL_METHODS: MethodId[] = ["pix", "debit", "credit", "voucher"];
const ADJUSTMENT_METHODS: AdjustmentKind[] = ["withdrawal", "supply"];
const METHOD_INFO: Record<
  MethodId,
  { title: string; description: string; icon: LucideIcon; tone: string }
> = {
  cash: {
    title: "Notas e moedas",
    description: "Conte o dinheiro físico do caixa.",
    icon: Banknote,
    tone: "green",
  },
  pix: {
    title: "PIX",
    description: "Confira o total recebido por PIX.",
    icon: Smartphone,
    tone: "aqua",
  },
  debit: {
    title: "Cartão de débito",
    description: "Informe o total da operadora.",
    icon: CreditCard,
    tone: "aqua",
  },
  credit: {
    title: "Cartão de crédito",
    description: "Informe o total da operadora.",
    icon: CreditCard,
    tone: "aqua",
  },
  voucher: {
    title: "Vales e vouchers",
    description: "Registre convênios e benefícios.",
    icon: ReceiptText,
    tone: "purple",
  },
  withdrawal: {
    title: "Sangria",
    description: "Valor retirado durante o turno.",
    icon: ArrowLeft,
    tone: "orange",
  },
  supply: {
    title: "Suprimento",
    description: "Valor colocado no caixa.",
    icon: PackagePlus,
    tone: "orange",
  },
};
const ENGLISH_METHOD_INFO: Record<MethodId, { title: string; description: string }> = {
  cash: { title: "Notes and coins", description: "Count the drawer's physical cash." },
  pix: { title: "PIX", description: "Check the total received by PIX." },
  debit: { title: "Debit card", description: "Enter the acquirer total." },
  credit: { title: "Credit card", description: "Enter the acquirer total." },
  voucher: { title: "Vouchers", description: "Record agreements and benefits." },
  withdrawal: { title: "Withdrawal", description: "Cash removed during the shift." },
  supply: { title: "Supply", description: "Cash added to the drawer." },
};
const SPANISH_METHOD_INFO: Record<MethodId, { title: string; description: string }> = {
  cash: { title: "Billetes y monedas", description: "Cuenta el efectivo físico de la caja." },
  pix: { title: "PIX", description: "Confirma el total recibido por PIX." },
  debit: { title: "Tarjeta de débito", description: "Informa el total de la operadora." },
  credit: { title: "Tarjeta de crédito", description: "Informa el total de la operadora." },
  voucher: { title: "Vales y vouchers", description: "Registra convenios y beneficios." },
  withdrawal: { title: "Retiro", description: "Valor retirado durante el turno." },
  supply: { title: "Ingreso", description: "Valor agregado a la caja." },
};
const localize = (locale: Locale, english: string, spanish: string, portuguese: string) =>
  locale === "en" ? english : locale === "es" ? spanish : portuguese;
const currency = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
});
const formatCurrency = (value: number) =>
  currency.format(Number.isFinite(value) ? value : 0);
const formatDuration = (milliseconds: number) => {
  const seconds = Math.max(0, Math.floor(milliseconds / 1000));
  return [
    Math.floor(seconds / 3600),
    Math.floor((seconds % 3600) / 60),
    seconds % 60,
  ]
    .map(part => part.toString().padStart(2, "0"))
    .join(":");
};
const formatShortTime = (timestamp: string) =>
  new Intl.DateTimeFormat("pt-BR", {
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(timestamp));
const parseOptionalMoney = (value: string) =>
  value === "" ? null : Math.max(0, Number(value) || 0);
const getAdjustmentTotals = (entries: AdjustmentEntry[]) =>
  entries.reduce(
    (totals, entry) => ({
      withdrawal:
        totals.withdrawal + (entry.type === "withdrawal" ? entry.amount : 0),
      supply: totals.supply + (entry.type === "supply" ? entry.amount : 0),
    }),
    { withdrawal: 0, supply: 0 }
  );

export type ShiftHistoryRecord = {
  id: string;
  shiftId: string;
  company: string;
  operator: string;
  shiftLabel?: string;
  startedAt: string | null;
  finishedAt: string;
  totalExpected: number;
  totalFound: number;
  difference: number;
  status: "SEM QUEBRA" | "SOBRA" | "FALTA";
  cashEntries: CashEntry[];
  adjustments: AdjustmentEntry[];
  auditTrail: AuditEvent[];
};
export const HISTORY_KEY = "pixbee-fecha-caixa-history-v2";
const RETENTION_MS = 3 * 24 * 60 * 60 * 1000;
const getStoredHistory = (): ShiftHistoryRecord[] => {
  try {
    const stored = JSON.parse(
      localStorage.getItem(HISTORY_KEY) ?? "[]"
    ) as Partial<ShiftHistoryRecord>[];
    return Array.isArray(stored)
      ? stored.map((record, index) => ({
          id: record.id ?? `turno-legado-${index}`,
          shiftId:
            record.shiftId ??
            record.id ??
            record.finishedAt ??
            `turno-legado-${index}`,
          company: record.company ?? "Empresa não informada",
          operator: record.operator ?? "Operador não informado",
          startedAt: record.startedAt ?? null,
          finishedAt: record.finishedAt ?? new Date().toISOString(),
          totalExpected: record.totalExpected ?? 0,
          totalFound: record.totalFound ?? 0,
          difference: record.difference ?? 0,
          status: record.status ?? "SEM QUEBRA",
          cashEntries: Array.isArray(record.cashEntries)
            ? record.cashEntries.map(entry => ({
                ...entry,
                shiftId:
                  entry.shiftId ??
                  record.shiftId ??
                  record.id ??
                  `turno-legado-${index}`,
              }))
            : [],
          adjustments: Array.isArray(record.adjustments)
            ? record.adjustments.map(entry => ({
                ...entry,
                shiftId:
                  entry.shiftId ??
                  record.shiftId ??
                  record.id ??
                  `turno-legado-${index}`,
              }))
            : [],
          auditTrail: Array.isArray(record.auditTrail) ? record.auditTrail : [],
        }))
      : [];
  } catch {
    return [];
  }
};
const getShiftLabel = (
  record: Pick<
    ShiftHistoryRecord,
    "company" | "operator" | "startedAt" | "finishedAt"
  >,
  locale: Locale = "pt-BR"
) =>
  `${new Intl.DateTimeFormat(locale === "en" ? "en-US" : locale === "es" ? "es-ES" : "pt-BR", { dateStyle: "short", timeStyle: "short" }).format(new Date(record.startedAt ?? record.finishedAt))} · ${record.company} · ${record.operator}`;
const getTimeValue = (timestamp: string) => {
  const date = new Date(timestamp);
  return `${date.getHours().toString().padStart(2, "0")}:${date.getMinutes().toString().padStart(2, "0")}`;
};
const formatDateTime = (timestamp: string | null, locale: Locale = "pt-BR") =>
  timestamp
    ? new Intl.DateTimeFormat(locale === "en" ? "en-US" : locale === "es" ? "es-ES" : "pt-BR", {
        dateStyle: "short",
        timeStyle: "short",
      }).format(new Date(timestamp))
    : locale === "en" ? "Not provided" : locale === "es" ? "No informado" : "Não informado";
const formatShiftDuration = (startedAt: string | null, finishedAt: string, locale: Locale = "pt-BR") =>
  startedAt
    ? formatDuration(
        new Date(finishedAt).getTime() - new Date(startedAt).getTime()
      )
    : locale === "en" ? "Not provided" : locale === "es" ? "No informado" : "Não informado";
export const isHistoryExpired = (records: ShiftHistoryRecord[]) =>
  records.some(
    record => Date.now() - new Date(record.finishedAt).getTime() >= RETENTION_MS
  );
const formatAuditEvent = (event: AuditEvent, locale: Locale = "pt-BR") => {
  const method = event.type === "withdrawal"
    ? locale === "en" ? "Withdrawal" : locale === "es" ? "Retiro" : "Sangria"
    : locale === "en" ? "Supply" : locale === "es" ? "Ingreso" : "Suprimento";
  if (event.action === "created")
    return locale === "en"
      ? `${method} added: ${formatCurrency(event.current?.amount ?? 0)}.`
      : locale === "es"
        ? `${method} añadido: ${formatCurrency(event.current?.amount ?? 0)}.`
        : `${method} incluído: ${formatCurrency(event.current?.amount ?? 0)}.`;
  if (event.action === "deleted")
    return locale === "en"
      ? `${method} deleted: ${formatCurrency(event.previous?.amount ?? 0)}.`
      : locale === "es"
        ? `${method} eliminado: ${formatCurrency(event.previous?.amount ?? 0)}.`
        : `${method} excluído: ${formatCurrency(event.previous?.amount ?? 0)}.`;
  return locale === "en"
    ? `${method} changed: ${formatCurrency(event.previous?.amount ?? 0)} → ${formatCurrency(event.current?.amount ?? 0)}.`
    : locale === "es"
      ? `${method} modificado: ${formatCurrency(event.previous?.amount ?? 0)} → ${formatCurrency(event.current?.amount ?? 0)}.`
      : `${method} alterado: ${formatCurrency(event.previous?.amount ?? 0)} → ${formatCurrency(event.current?.amount ?? 0)}.`;
};
export function exportHistoryPdf(
  records: ShiftHistoryRecord[],
  options: { download?: boolean; filename?: string; locale?: Locale } = {}
) {
  const reportLocale = options.locale ?? "pt-BR";
  const document = new jsPDF({ unit: "mm", format: "a4" });
  const pageWidth = 210;
  const pageHeight = 297;
  const margin = 14;
  const contentWidth = pageWidth - margin * 2;
  const generatedAt = formatDateTime(new Date().toISOString(), reportLocale);
  const summary = records.reduce(
    (totals, record) => ({
      expected: totals.expected + record.totalExpected,
      found: totals.found + record.totalFound,
      difference: totals.difference + record.difference,
      audits: totals.audits + record.auditTrail.length,
      breaks: totals.breaks + (record.status === "SEM QUEBRA" ? 0 : 1),
    }),
    { expected: 0, found: 0, difference: 0, audits: 0, breaks: 0 }
  );
  const orderedRecords = [...records].sort(
    (a, b) =>
      new Date(b.finishedAt).getTime() - new Date(a.finishedAt).getTime()
  );
  let cursorY = 0;
  let pageNumber = 1;
  const setBodyStyle = () => {
    document.setTextColor(27, 49, 38);
    document.setFont("helvetica", "normal");
    document.setFontSize(8.3);
  };
  const drawHeader = (continued = false) => {
    document.setFillColor(11, 80, 45);
    document.rect(0, 0, pageWidth, 35, "F");
    document.setFillColor(0, 173, 181);
    document.roundedRect(margin, 10, 8, 8, 2, 2, "F");
    document.setTextColor(255, 255, 255);
    document.setFont("helvetica", "bold");
    document.setFontSize(17);
    document.text("PIXBEE", margin + 11, 16);
    document.setFontSize(6.9);
    document.setTextColor(194, 255, 218);
    document.text("FECHACAIXA", margin + 11, 21);
    document.setFontSize(11);
    document.setTextColor(255, 255, 255);
    document.text(
      continued
        ? localize(reportLocale, "HISTORY REPORT · CONTINUED", "INFORME DE HISTORIAL · CONTINUACIÓN", "RELATÓRIO DE HISTÓRICO · CONTINUAÇÃO")
        : localize(reportLocale, "LOCAL HISTORY REPORT", "INFORME DE HISTORIAL LOCAL", "RELATÓRIO DE HISTÓRICO LOCAL"),

      pageWidth - margin,
      14,
      { align: "right" }
    );
    document.setFont("helvetica", "normal");
    document.setFontSize(7.4);
    document.setTextColor(211, 237, 220);
    document.text(
      localize(reportLocale, "Operational archive · Local retention up to 3 days", "Archivo operativo · Retención local de hasta 3 días", "Arquivamento operacional · Retenção local de até 3 dias"),
      pageWidth - margin,
      20,
      { align: "right" }
    );
    cursorY = 44;
  };
  const drawFooter = (page: number) => {
    document.setDrawColor(202, 217, 207);
    document.line(margin, pageHeight - 13, pageWidth - margin, pageHeight - 13);
    document.setFont("helvetica", "normal");
    document.setFontSize(7);
    document.setTextColor(100, 118, 108);
    document.text(
      `${localize(reportLocale, "Generated on", "Generado el", "Gerado em")} ${generatedAt} · ${localize(reportLocale, "Local history on this machine", "Historial local en este dispositivo", "Histórico local desta máquina")}`,
      margin,
      pageHeight - 8
    );
    document.text(`${localize(reportLocale, "Page", "Página", "Página")} ${page}`, pageWidth - margin, pageHeight - 8, {
      align: "right",
    });
  };
  const ensureSpace = (height: number) => {
    if (cursorY + height <= pageHeight - 20) return;
    drawFooter(pageNumber);
    document.addPage();
    pageNumber += 1;
    drawHeader(true);
  };
  const sectionTitle = (title: string, helper?: string) => {
    ensureSpace(12);
    document.setFont("helvetica", "bold");
    document.setFontSize(8.2);
    document.setTextColor(0, 139, 149);
    document.text(title.toUpperCase(), margin, cursorY);
    if (helper) {
      document.setFont("helvetica", "normal");
      document.setFontSize(7.4);
      document.setTextColor(105, 123, 113);
      document.text(helper, pageWidth - margin, cursorY, { align: "right" });
    }
    cursorY += 4;
    document.setDrawColor(195, 220, 207);
    document.line(margin, cursorY, pageWidth - margin, cursorY);
    cursorY += 7;
  };
  const metric = (
    x: number,
    label: string,
    value: string,
    tone: "green" | "aqua" | "dark" | "alert" = "dark"
  ) => {
    const colors = {
      green: [37, 124, 74],
      aqua: [0, 139, 149],
      dark: [27, 49, 38],
      alert: [171, 70, 56],
    } as const;
    const color = colors[tone];
    document.setFillColor(245, 250, 247);
    document.roundedRect(x, cursorY, 42, 20, 2, 2, "F");
    document.setFillColor(color[0], color[1], color[2]);
    document.roundedRect(x, cursorY, 1.8, 20, 1, 1, "F");
    document.setFont("helvetica", "bold");
    document.setFontSize(6.6);
    document.setTextColor(93, 111, 101);
    document.text(label.toUpperCase(), x + 4, cursorY + 6);
    document.setFontSize(9.2);
    document.setTextColor(color[0], color[1], color[2]);
    document.text(value, x + 4, cursorY + 14);
  };
  const textLines = (text: string, width: number, size = 7.5) => {
    document.setFontSize(size);
    return document.splitTextToSize(text, width) as string[];
  };
  const amountTone = (difference: number) =>
    difference === 0
      ? [37, 124, 74]
      : difference > 0
        ? [0, 139, 149]
        : [171, 70, 56];

  drawHeader();
  document.setFont("helvetica", "normal");
  document.setFontSize(8);
  document.setTextColor(94, 112, 102);
  document.text(`${localize(reportLocale, "Issued on", "Emitido el", "Emitido em")} ${generatedAt}`, margin, cursorY);
  document.text(
    reportLocale === "en"
      ? `${records.length} shift${records.length === 1 ? "" : "s"} in period`
      : reportLocale === "es"
        ? `${records.length} turno${records.length === 1 ? "" : "s"} en el período`
        : `${records.length} turno${records.length === 1 ? "" : "s"} no período`,
    pageWidth - margin,
    cursorY,
    { align: "right" }
  );
  cursorY += 7;
  sectionTitle(localize(reportLocale, "Period summary", "Resumen del período", "Resumo do período"), localize(reportLocale, "Consolidation of available records", "Consolidación de los registros disponibles", "Consolidação dos registros disponíveis"));
  metric(margin, localize(reportLocale, "Closed shifts", "Turnos cerrados", "Turnos fechados"), String(records.length), "green");
  metric(
    margin + 45,
    localize(reportLocale, "Expected total", "Total esperado", "Total esperado"),
    formatCurrency(summary.expected),
    "dark"
  );
  metric(margin + 90, localize(reportLocale, "Counted total", "Total contado", "Total conferido"), formatCurrency(summary.found), "aqua");
  metric(
    margin + 135,
    localize(reportLocale, "Difference", "Diferencia", "Divergência"),
    `${summary.difference > 0 ? "+" : ""}${formatCurrency(summary.difference)}`,
    summary.difference === 0 ? "green" : "alert"
  );
  cursorY += 27;
  document.setFillColor(235, 246, 239);
  document.roundedRect(margin, cursorY, contentWidth, 12, 2, 2, "F");
  document.setFont("helvetica", "bold");
  document.setFontSize(7.3);
  document.setTextColor(27, 87, 52);
  document.text(
    reportLocale === "en"
      ? `${summary.breaks} shift${summary.breaks === 1 ? "" : "s"} with discrepancy · ${summary.audits} audit event${summary.audits === 1 ? "" : "s"} recorded`
      : reportLocale === "es"
        ? `${summary.breaks} turno${summary.breaks === 1 ? "" : "s"} con diferencia · ${summary.audits} evento${summary.audits === 1 ? "" : "s"} de auditoría registrado${summary.audits === 1 ? "" : "s"}`
        : `${summary.breaks} turno${summary.breaks === 1 ? "" : "s"} com quebra · ${summary.audits} evento${summary.audits === 1 ? "" : "s"} de auditoria registrados`,
    margin + 4,
    cursorY + 7.5
  );
  cursorY += 20;
  sectionTitle(
    localize(reportLocale, "Consolidated shifts", "Turnos consolidados", "Turnos consolidados"),
    localize(reportLocale, "Values, movements, and audit trail", "Valores, movimientos y auditoría", "Valores, lançamentos e trilha de auditoria")
  );

  orderedRecords.forEach((record, index) => {
    const statusLabel =
      record.status === "SEM QUEBRA"
        ? localize(reportLocale, "NO DISCREPANCY", "SIN DIFERENCIA", "SEM QUEBRA")
        : reportLocale === "en"
          ? `DISCREPANCY · ${record.status === "SOBRA" ? "SURPLUS" : "SHORTAGE"}`
          : reportLocale === "es"
            ? `DIFERENCIA · ${record.status === "SOBRA" ? "SOBRANTE" : "FALTANTE"}`
            : `QUEBRA · ${record.status}`;
    const statusColor: [number, number, number] =
      record.status === "SEM QUEBRA"
        ? [37, 124, 74]
        : record.status === "SOBRA"
          ? [0, 139, 149]
          : [171, 70, 56];
    ensureSpace(41);
    document.setFillColor(247, 251, 248);
    document.roundedRect(margin, cursorY, contentWidth, 31, 2.5, 2.5, "F");
    document.setFillColor(statusColor[0], statusColor[1], statusColor[2]);
    document.roundedRect(margin, cursorY, 2.3, 31, 1, 1, "F");
    document.setFont("helvetica", "bold");
    document.setFontSize(10);
    document.setTextColor(25, 52, 36);
    document.text(record.company, margin + 6, cursorY + 8);
    document.setFont("helvetica", "normal");
    document.setFontSize(7.2);
    document.setTextColor(92, 111, 101);
    document.text(`${localize(reportLocale, "Operator:", "Operador:", "Operador:")} ${record.operator}`, margin + 6, cursorY + 14);
    document.text(
      `${localize(reportLocale, "Opening:", "Apertura:", "Abertura:")} ${formatDateTime(record.startedAt, reportLocale)} · ${localize(reportLocale, "Closing:", "Cierre:", "Fechamento:")} ${formatDateTime(record.finishedAt, reportLocale)}`,
      margin + 6,
      cursorY + 20
    );
    document.text(
      `${localize(reportLocale, "Duration:", "Duración:", "Duração:")} ${formatShiftDuration(record.startedAt, record.finishedAt, reportLocale)}`,
      margin + 6,
      cursorY + 25.5
    );
    document.setFillColor(statusColor[0], statusColor[1], statusColor[2]);
    document.roundedRect(
      pageWidth - margin - 40,
      cursorY + 5,
      36,
      10,
      3,
      3,
      "F"
    );
    document.setFont("helvetica", "bold");
    document.setFontSize(6.7);
    document.setTextColor(255, 255, 255);
    document.text(statusLabel, pageWidth - margin - 22, cursorY + 11.3, {
      align: "center",
    });
    cursorY += 37;
    ensureSpace(18);
    const metricY = cursorY;
    metric(margin, localize(reportLocale, "Expected", "Esperado", "Esperado"), formatCurrency(record.totalExpected), "dark");
    metric(margin + 45, localize(reportLocale, "Counted", "Contado", "Conferido"), formatCurrency(record.totalFound), "aqua");
    metric(
      margin + 90,
      localize(reportLocale, "Difference", "Diferencia", "Diferença"),
      `${record.difference > 0 ? "+" : ""}${formatCurrency(record.difference)}`,
      record.difference === 0 ? "green" : "alert"
    );
    metric(
      margin + 135,
      localize(reportLocale, "Audit trail", "Auditoría", "Auditoria"),
      `${record.auditTrail.length} ${localize(reportLocale, "event", "evento", "evento")}${record.auditTrail.length === 1 ? "" : "s"}`,
      "green"
    );
    cursorY = metricY + 27;
    if (record.cashEntries.length > 0) {
      const cashEntryTotal = sumCashEntries(record.cashEntries);
      sectionTitle(
        localize(reportLocale, "Cash entries", "Entradas de efectivo", "Entradas em espécie"),
        reportLocale === "en"
          ? `${record.cashEntries.length} ${record.cashEntries.length === 1 ? "entry" : "entries"}`
          : reportLocale === "es"
            ? `${record.cashEntries.length} entrada${record.cashEntries.length === 1 ? "" : "s"}`
            : `${record.cashEntries.length} lançamento${record.cashEntries.length === 1 ? "" : "s"}`
      );
      record.cashEntries.forEach(entry => {
        ensureSpace(14);
        document.setFont("helvetica", "bold");
        document.setFontSize(7.5);
        document.setTextColor(31, 61, 43);
        document.text(
          `${localize(reportLocale, "Cash entry", "Entrada de efectivo", "Entrada em dinheiro")} · ${formatShortTime(entry.createdAt)}`,
          margin + 2,
          cursorY
        );
        document.setTextColor(37, 124, 74);
        document.text(
          `${localize(reportLocale, "Net +", "Neto +", "Líquido +")}${formatCurrency(entry.amount)}`,
          pageWidth - margin,
          cursorY,
          { align: "right" }
        );
        document.setFont("helvetica", "normal");
        document.setFontSize(6.5);
        document.setTextColor(109, 86, 47);
        document.text(
          `${localize(reportLocale, "Received", "Recibido", "Recebido")} ${formatCurrency(getGrossAmount(entry))} · ${getChangeAmount(entry) > 0 ? `${localize(reportLocale, "change", "cambio", "troco")} ${formatCurrency(getChangeAmount(entry))}` : localize(reportLocale, "no change", "sin cambio", "sem troco")}`,
          margin + 2,
          cursorY + 3.6
        );
        cursorY += 8;
      });
      ensureSpace(9);
      document.setFont("helvetica", "bold");
      document.setTextColor(27, 87, 52);
      document.text(localize(reportLocale, "Total cash entries", "Total acumulado en efectivo", "Total acumulado em espécie"), margin + 2, cursorY);
      document.text(
        formatCurrency(cashEntryTotal),
        pageWidth - margin,
        cursorY,
        { align: "right" }
      );
      cursorY += 7;
    }
    if (record.adjustments.length > 0) {
      sectionTitle(
        localize(reportLocale, "Movements", "Movimientos", "Lançamentos"),
        reportLocale === "en"
          ? `${record.adjustments.length} ${record.adjustments.length === 1 ? "item" : "items"}`
          : reportLocale === "es"
            ? `${record.adjustments.length} movimiento${record.adjustments.length === 1 ? "" : "s"}`
            : `${record.adjustments.length} item${record.adjustments.length === 1 ? "" : "ns"}`
      );
      record.adjustments.forEach(entry => {
        const entryColor: [number, number, number] =
          entry.type === "withdrawal" ? [171, 70, 56] : [37, 124, 74];
        ensureSpace(10);
        document.setFont("helvetica", "bold");
        document.setFontSize(7.5);
        document.setTextColor(31, 61, 43);
        document.text(
          `${entry.type === "withdrawal" ? localize(reportLocale, "Withdrawal", "Retiro", "Sangria") : localize(reportLocale, "Supply", "Ingreso", "Suprimento")} · ${formatShortTime(entry.createdAt)}`,
          margin + 2,
          cursorY
        );
        document.setTextColor(entryColor[0], entryColor[1], entryColor[2]);
        document.text(
          `${entry.type === "withdrawal" ? "−" : "+"}${formatCurrency(entry.amount)}`,
          pageWidth - margin,
          cursorY,
          { align: "right" }
        );
        document.setFont("helvetica", "normal");
        document.setTextColor(94, 112, 102);
        const notes = textLines(
          entry.note || localize(reportLocale, "No description", "Sin descripción", "Sem identificação"),
          contentWidth - 8
        );
        document.text(notes, margin + 2, cursorY + 4);
        cursorY += 5 + notes.length * 3.5;
        document.setDrawColor(220, 231, 224);
        document.line(margin, cursorY, pageWidth - margin, cursorY);
        cursorY += 5;
      });
    }
    if (record.auditTrail.length > 0) {
      sectionTitle(localize(reportLocale, "Audit trail", "Auditoría", "Trilha de auditoria"), localize(reportLocale, "Justified changes", "Cambios justificados", "Alterações justificadas"));
      record.auditTrail.forEach(event => {
        const body = `${formatShortTime(event.occurredAt)} · ${formatAuditEvent(event, reportLocale)}`;
        const reason = `${localize(reportLocale, "Reason:", "Motivo:", "Justificativa:")} ${event.justification || localize(reportLocale, "Not provided", "No informado", "Não informada")}`;
        const bodyLines = textLines(body, contentWidth - 10, 7.5);
        const reasonLines = textLines(reason, contentWidth - 10, 7.2);
        ensureSpace(7 + bodyLines.length * 3.5 + reasonLines.length * 3.5);
        document.setFillColor(250, 246, 235);
        document.roundedRect(
          margin,
          cursorY - 3,
          contentWidth,
          7 + bodyLines.length * 3.5 + reasonLines.length * 3.5,
          1.5,
          1.5,
          "F"
        );
        document.setFont("helvetica", "bold");
        document.setTextColor(91, 67, 29);
        document.text(bodyLines, margin + 4, cursorY + 2);
        document.setFont("helvetica", "normal");
        document.setTextColor(109, 86, 47);
        document.text(
          reasonLines,
          margin + 4,
          cursorY + 2 + bodyLines.length * 3.5
        );
        cursorY += 8 + bodyLines.length * 3.5 + reasonLines.length * 3.5;
      });
    }
    if (index < orderedRecords.length - 1) {
      ensureSpace(9);
      document.setDrawColor(156, 193, 173);
      document.setLineDashPattern([1.2, 1.5], 0);
      document.line(margin, cursorY + 2, pageWidth - margin, cursorY + 2);
      document.setLineDashPattern([], 0);
      cursorY += 10;
    }
  });
  drawFooter(pageNumber);
  document.setProperties({
    title: localize(reportLocale, "PixBee FechaCaixa — History Report", "PixBee FechaCaixa — Informe de historial", "PixBee FechaCaixa — Relatório de Histórico"),
    subject: localize(reportLocale, "Local shift and audit report", "Informe local de turnos y auditoría", "Relatório local de turnos e auditoria"),
  });
  const filename =
    options.filename ??
    `pixbee-relatorio-historico-${new Date().toISOString().slice(0, 10)}.pdf`;
  if (options.download ?? true) document.save(filename);
  return document;
}

function WelcomePage() {
  const [, navigate] = useLocation();
  const { t, locale } = useLanguage();
  const { resetSession } = useCashSession();
  const handleStart = () => {
    resetSession();
    navigate("/abertura");
  };
  return (
    <AppShell title="Sistema de fechamento" currentStep={1}>
      <section className="welcome-grid">
        <article className="glass-panel welcome-hero">
          <span className="panel-tag">{t("welcome.kicker")}</span>
          <h2>{t("welcome.title")}</h2>
          <p>{t("welcome.copy")}</p>
          <Button className="pixbee-primary-button" onClick={handleStart}>
            <CircleDollarSign size={19} /> {t("welcome.start")} {" "}
            <ArrowRight size={18} />
          </Button>
          <small>
            {t("welcome.local")}
          </small>
        </article>
        <article className="glass-panel welcome-about">
          <div className="glass-icon">
            <ClipboardCheck size={26} />
          </div>
          <h3>{t("welcome.flow")}</h3>
          <p>{t("welcome.flowCopy")}</p>
          <div className="feature-pills">
            <span>
              <Banknote size={15} /> {t("welcome.pillCash")}
            </span>
            <span>
              <Smartphone size={15} /> {t("welcome.pillDigital")}
            </span>
            <span>
              <CheckCircle2 size={15} /> {t("welcome.pillAudit")}
            </span>
          </div>
        </article>
        <article className="glass-panel welcome-features">
          <div>
            <WalletCards size={24} />
                          <strong>{locale === "en" ? "Assisted count" : locale === "es" ? "Conteo asistido" : "Contagem assistida"}</strong>
              <p>{t("welcome.featureCount")}</p>

          </div>
          <div>
            <Clock3 size={24} />
                          <strong>{locale === "en" ? "Shift timer" : locale === "es" ? "Cronómetro del turno" : "Tempo do turno"}</strong>
              <p>{t("welcome.featureTimer")}</p>

          </div>
          <div>
            <ReceiptText size={24} />
                          <strong>{locale === "en" ? "Final validation" : locale === "es" ? "Validación final" : "Validação final"}</strong>
              <p>{t("welcome.featureValidation")}</p>

          </div>
        </article>
        <AdSenseSlot
          slot={adsenseSettings.homeSlot}
          publicRoute="/"
          label={locale === "en" ? "Advertisement" : "Publicidade"}
        />
      </section>
    </AppShell>
  );
}

function MethodToggle({
  method,
  selected,
  onToggle,
}: {
  method: MethodId;
  selected: boolean;
  onToggle: () => void;
}) {
  const { locale } = useLanguage();
  const info = METHOD_INFO[method];
  const englishInfo: Record<MethodId, { title: string; description: string }> = {
    cash: { title: "Notes and coins", description: "Count the drawer's physical cash." },
    pix: { title: "PIX", description: "Check the total received by PIX." },
    debit: { title: "Debit card", description: "Enter the acquirer total." },
    credit: { title: "Credit card", description: "Enter the acquirer total." },
    voucher: { title: "Vouchers", description: "Record agreements and benefits." },
    withdrawal: { title: "Withdrawal", description: "Amount removed during the shift." },
    supply: { title: "Supply", description: "Amount added to the drawer." },
  };
  const displayInfo = locale === "en" ? englishInfo[method] : locale === "es" ? SPANISH_METHOD_INFO[method] : info;
  const Icon = info.icon;
  return (
    <label className={`method-toggle ${selected ? "selected" : ""}`}>
      <input type="checkbox" checked={selected} onChange={onToggle} />
      <span className={`method-toggle-icon ${info.tone}`}>
        <Icon size={21} />
      </span>
      <span>
        <strong>{displayInfo.title}</strong>
        <small>{displayInfo.description}</small>
      </span>
      <span className="toggle-check">
        {selected ? <CheckCircle2 size={20} /> : <Plus size={19} />}
      </span>
    </label>
  );
}

export function OpeningPage() {
  const [, navigate] = useLocation();
  const { locale, t } = useLanguage();
  const { session, setSession } = useCashSession();
  const [isFloatDialogOpen, setIsFloatDialogOpen] = useState(false);
  const [importPreviousCount, setImportPreviousCount] = useState(() =>
    session.openingFloat !== null && !session.startedAt
  );
  const hasPreviousPhysicalCount =
    session.openingFloat !== null &&
    !session.startedAt &&
    Object.values(session.openingQuantities).some(quantity => quantity > 0);
  const toggleMethod = (method: MethodId) =>
    setSession(current => ({
      ...current,
      selectedMethods: current.selectedMethods.includes(method)
        ? current.selectedMethods.filter(item => item !== method)
        : [...current.selectedMethods, method],
    }));
  function advance() {
    const missing = [
      !session.operator.trim() ? localize(locale, "the operator name", "el nombre de la persona operadora", "o nome do operador") : "",
      !session.company.trim() ? localize(locale, "the company name", "el nombre de la empresa", "o nome da empresa") : "",
      session.selectedMethods.length === 0 ? localize(locale, "at least one payment method", "al menos una modalidad", "ao menos uma modalidade") : "",
    ].filter(Boolean);
    if (missing.length) {
      toast.error(localize(locale, `Enter ${missing.join(", ")} to start the count.`, `Introduce ${missing.join(", ")} para iniciar el conteo.`, `Preencha ${missing.join(", ")} para iniciar a contagem.`));
      return;
    }
    if (session.shiftId && session.startedAt && session.openingFloat !== null) {
      navigate("/contagem");
      return;
    }
    if (session.openingFloat !== null && !session.startedAt) {
      if (hasPreviousPhysicalCount && !importPreviousCount) {
        setSession(current => ({
          ...current,
          openingFloat: null,
          openingQuantities: createEmptyQuantities(),
          quantities: createEmptyQuantities(),
        }));
        setIsFloatDialogOpen(true);
        return;
      }
      const now = new Date().toISOString();
      setSession(current => ({
        ...current,
        shiftId: crypto.randomUUID(),
        startedAt: now,
        extensionMinutes: 0,
        extensionUsed: false,
        closureRequired: false,
      }));
      navigate("/contagem");
      return;
    }
    setIsFloatDialogOpen(true);
  }
  function confirmOpeningFloat(quantities: Quantities, openingFloat: number) {
    const now = new Date().toISOString();
    const confirmedOpening = createQuantitiesFromOpening(quantities);
    setSession(current => ({
      ...current,
      openingFloat,
      openingQuantities: confirmedOpening,
      quantities: confirmedOpening,
      shiftId: current.shiftId ?? crypto.randomUUID(),
      startedAt: getStartedAt(current.startedAt, now),
      extensionMinutes: 0,
      extensionUsed: false,
      closureRequired: false,
      validatedAt: null,
    }));
    setIsFloatDialogOpen(false);
    navigate("/contagem");
  }
  return (
    <AppShell title={localize(locale, "Count opening", "Apertura del conteo", "Abertura de contagem")} currentStep={2}>
      <section className="glass-panel flow-panel opening-panel">
        <div className="flow-heading">
          <span>{localize(locale, "Step 01", "Etapa 01", t("opening.step"))}</span>
          <h2>{localize(locale, "Identify the drawer and choose what to reconcile.", "Identifica la caja y elige qué vas a conciliar.", t("opening.title"))}</h2>
          <p>{localize(locale, "These details form the basis of your final validation.", "Estos datos forman la base de tu validación final.", t("opening.copy"))}</p>
        </div>
        <div className="opening-fields">
          <label>
            <span>
              <UserRound size={15} /> {localize(locale, "Cash operator", "Persona operadora de caja", "Operador do caixa")}
            </span>
            <input
              value={session.operator}
              onChange={event =>
                setSession(current => ({
                  ...current,
                  operator: event.target.value,
                }))
              }
              placeholder={localize(locale, "Enter your name", "Introduce tu nombre", "Digite seu nome")}
            />
          </label>
          <label>
            <span>
              <Building2 size={15} /> {localize(locale, "Company name", "Nombre de la empresa", "Nome da empresa")}
            </span>
            <input
              value={session.company}
              onChange={event =>
                setSession(current => ({
                  ...current,
                  company: event.target.value,
                }))
              }
              placeholder={localize(locale, "Enter the company", "Introduce la empresa", "Digite a empresa")}
            />
          </label>
          <label>
            <span>
              <ReceiptText size={15} /> {localize(locale, "Shift identification", "Identificación del turno", "Identificação do turno")}
            </span>
            <input
              value={session.shiftLabel}
              onChange={event =>
                setSession(current => ({
                  ...current,
                  shiftLabel: event.target.value,
                }))
              }
              placeholder={localize(locale, "E.g. Morning, Drawer 1 or 08/24", "Ej.: Mañana, Caja 1 o 24/08", "Ex.: Manhã, Caixa 1 ou 24/08")}
            />
          </label>
          <label>
            <span>
              <Clock3 size={15} /> {locale === "en" ? "Shift duration" : locale === "es" ? "Duración del turno" : "Duração do turno"}
            </span>
            <Select
              value={String(session.durationHours)}
              onValueChange={value =>
                setSession(current => ({
                  ...current,
                  durationHours: Number(value) as ShiftDurationHours,
                }))
              }
            >
              <SelectTrigger aria-label={locale === "en" ? "Shift duration" : locale === "es" ? "Duración del turno" : "Duração do turno"}>
              <SelectValue placeholder={localize(locale, "Choose a duration", "Elige una duración", "Escolha a duração")} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="6">{locale === "en" ? "6 hours" : locale === "es" ? "6 horas" : "6 horas"}</SelectItem>
                <SelectItem value="8">{locale === "en" ? "8 hours" : locale === "es" ? "8 horas" : "8 horas"}</SelectItem>
                <SelectItem value="12">{locale === "en" ? "12 hours" : locale === "es" ? "12 horas" : "12 horas"}</SelectItem>
              </SelectContent>
            </Select>
          </label>
        </div>
        {hasPreviousPhysicalCount ? (
          <section className="opening-import-choice" aria-label={localize(locale, "Last count import", "Importación del último conteo", "Importação da última contagem")}>
            <div>
              <span>{localize(locale, "Last physical count found", "Última composición física encontrada", "Última composição física encontrada")}</span>
              <p>
                {localize(locale, "Use the final notes and coins from the previous closing, or choose manual entry.", "Usa los billetes y monedas finales del cierre anterior o elige la carga manual.", "Use as cédulas e moedas finais do fechamento anterior ou escolha o preenchimento manual.")}
              </p>
            </div>
            <div className="opening-import-actions" role="group" aria-label={localize(locale, "Import choice", "Elección de importación", "Escolha de importação")}>
              <Button
                type="button"
                variant={importPreviousCount ? "default" : "outline"}
                className={importPreviousCount ? "opening-import-button selected" : "opening-import-button"}
                onClick={() => setImportPreviousCount(true)}
              >
                {localize(locale, "Yes, import", "Sí, importar", "Sim, importar")}
              </Button>
              <Button
                type="button"
                variant={!importPreviousCount ? "default" : "outline"}
                className={!importPreviousCount ? "opening-import-button selected" : "opening-import-button"}
                onClick={() => setImportPreviousCount(false)}
              >
                {localize(locale, "No, enter manually", "No, completar manualmente", "Não, preencher manualmente")}
              </Button>
            </div>
          </section>
        ) : null}
        <div className="mode-heading">
          <div>
            <span>{localize(locale, "Count methods", "Modalidades de conteo", "Modalidades de contagem")}</span>
            <h3>{localize(locale, "What would you like to reconcile in this drawer?", "¿Qué quieres conciliar en esta caja?", "O que você quer conferir neste caixa?")}</h3>
          </div>
          <p>
            {localize(locale, "You will enter the expected and counted amounts in the next step.", "Podrás informar el importe esperado y el contado en la próxima etapa.", "Você poderá informar o valor esperado e o valor encontrado na próxima etapa.")}
          </p>
        </div>
        <div className="method-grid">
          {(Object.keys(METHOD_INFO) as MethodId[]).map(method => (
            <MethodToggle
              key={method}
              method={method}
              selected={session.selectedMethods.includes(method)}
              onToggle={() => toggleMethod(method)}
            />
          ))}
        </div>
        <div className="flow-actions">
          <Link href="/" className="pixbee-text-button">
            <ArrowLeft size={17} /> {locale === "en" ? "Back" : locale === "es" ? "Atrás" : "Voltar"}
          </Link>
          <Button className="pixbee-primary-button" onClick={advance}>
            {locale === "en" ? "Start count" : locale === "es" ? "Iniciar conteo" : "Começar contagem"} <ArrowRight size={18} />
          </Button>
        </div>
      </section>
      <OpeningFloatDialog
        open={isFloatDialogOpen}
        initialQuantities={session.openingQuantities}
        onOpenChange={setIsFloatDialogOpen}
        onConfirm={confirmOpeningFloat}
      />
    </AppShell>
  );
}
export function OpeningFloatDialog({
  open,
  initialQuantities,
  onOpenChange,
  onConfirm,
  title = "Conte o fundo de caixa",
  description = "Registre as cédulas e moedas disponíveis antes de iniciar. O total será levado automaticamente para a conferência do turno.",
  summaryLabel = "Fundo de caixa apurado",
  confirmLabel = "Confirmar fundo de caixa",
}: {
  open: boolean;
  initialQuantities: Quantities;
  onOpenChange: (open: boolean) => void;
  onConfirm: (quantities: Quantities, total: number) => void;
  title?: string;
  description?: string;
  summaryLabel?: string;
  confirmLabel?: string;
}) {
  const { locale } = useLanguage();
  const [quantities, setQuantities] = useState<Quantities>(initialQuantities);
  useEffect(() => {
    if (open) setQuantities(initialQuantities);
  }, [initialQuantities, open]);
  const openingFloat = sumDenominationQuantities(quantities);
  const updateQuantity = (key: string, value: number) =>
    setQuantities(current => ({
      ...current,
      [key]: Math.max(0, Math.trunc(value) || 0),
    }));
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="money-count-dialog">
        <DialogHeader>
          <DialogTitle>{title === "Conte o fundo de caixa" ? localize(locale, "Count the opening float", "Cuenta el fondo inicial", title) : title}</DialogTitle>
          <DialogDescription>{description === "Registre as cédulas e moedas disponíveis antes de iniciar. O total será levado automaticamente para a conferência do turno." ? localize(locale, "Record the notes and coins available before starting. The total will be carried into the shift reconciliation automatically.", "Registra los billetes y monedas disponibles antes de comenzar. El total se llevará automáticamente a la conciliación del turno.", description) : description}</DialogDescription>
        </DialogHeader>
        <div className="money-count-summary">
          <span>{summaryLabel === "Fundo de caixa apurado" ? localize(locale, "Counted opening float", "Fondo inicial contado", summaryLabel) : summaryLabel}</span>
          <strong>{formatCurrency(openingFloat)}</strong>
        </div>
        <div className="money-count-columns">
          <section>
            <div className="denomination-heading">
              <span><Banknote size={16} /> {locale === "en" ? "Notes" : locale === "es" ? "Billetes" : "Cédulas"}</span>
              <strong>{formatCurrency(sumDenominationQuantities(Object.fromEntries(NOTE_DENOMINATIONS.map(item => [item.key, quantities[item.key] ?? 0]))))}</strong>
            </div>
            {NOTE_DENOMINATIONS.map(item => (
              <QuantityControl
                key={item.key}
                item={item}
                quantity={quantities[item.key] ?? 0}
                onChange={value => updateQuantity(item.key, value)}
              />
            ))}
          </section>
          <section>
            <div className="denomination-heading">
              <span><Coins size={16} /> {locale === "en" ? "Coins" : locale === "es" ? "Monedas" : "Moedas"}</span>
              <strong>{formatCurrency(sumDenominationQuantities(Object.fromEntries(COIN_DENOMINATIONS.map(item => [item.key, quantities[item.key] ?? 0]))))}</strong>
            </div>
            {COIN_DENOMINATIONS.map(item => (
              <QuantityControl
                key={item.key}
                item={item}
                quantity={quantities[item.key] ?? 0}
                onChange={value => updateQuantity(item.key, value)}
              />
            ))}
          </section>
        </div>
        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            {locale === "en" ? "Back" : locale === "es" ? "Atrás" : "Voltar"}
          </Button>
          <Button type="button" className="pixbee-primary-button" onClick={() => onConfirm(quantities, openingFloat)}>
            {confirmLabel === "Confirmar fundo de caixa" ? localize(locale, "Confirm opening float", "Confirmar fondo inicial", confirmLabel) : confirmLabel} <ArrowRight size={17} />
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function AmountInput({
  label,
  value,
  onChange,
  placeholder = "0,00",
}: {
  label: string;
  value: number;
  onChange: (value: number) => void;
  placeholder?: string;
}) {
  return (
    <label className="amount-input">
      <span>{label}</span>
      <div>
        <b>R$</b>
        <input
          type="number"
          min="0"
          step="0.01"
          inputMode="decimal"
          value={value === 0 ? "" : value}
          placeholder={placeholder}
          onChange={event =>
            onChange(Math.max(0, Number(event.target.value) || 0))
          }
        />
      </div>
    </label>
  );
}

function QuantityControl({
  item,
  quantity,
  onChange,
  available,
}: {
  item: { key: string; label: string; value: number };
  quantity: number;
  onChange: (value: number) => void;
  available?: number;
}) {
  const { locale } = useLanguage();
  return (
    <div className={`denomination-row ${quantity > 0 ? "has-value" : ""}`}>
      <strong>
        {item.label}
        {available !== undefined ? (
          <small className="denomination-availability">
            {locale === "en" ? "Available" : locale === "es" ? "Disponible" : "Disponível"}: {available}
          </small>
        ) : null}
      </strong>
      <div className="quantity-controls">
        <button
          type="button"
          aria-label={`${localize(locale, "Decrease", "Disminuir", "Diminuir")} ${item.label}`}
          onClick={() => onChange(Math.max(0, quantity - 1))}
        >
          <Minus size={15} />
        </button>
        <input
          type="number"
          min="0"
          inputMode="numeric"
          value={quantity === 0 ? "" : quantity}
          placeholder="0"
          max={available}
          onChange={event =>
            onChange(
              Math.min(
                available ?? Number.POSITIVE_INFINITY,
                Number(event.target.value) || 0
              )
            )
          }
        />
        <button
          type="button"
          aria-label={`${localize(locale, "Increase", "Aumentar", "Aumentar")} ${item.label}`}
          disabled={available !== undefined && quantity >= available}
          onClick={() => onChange(Math.min(available ?? Number.POSITIVE_INFINITY, quantity + 1))}
        >
          <Plus size={15} />
        </button>
      </div>
      <span>{formatCurrency(quantity * item.value)}</span>
    </div>
  );
}
export function DenominationRow({
  item,
}: {
  item: { key: string; label: string; value: number };
}) {
  const { session } = useCashSession();
  const { locale } = useLanguage();
  const quantity = session.quantities[item.key] ?? 0;
  const openingQuantity = session.openingQuantities[item.key] ?? 0;
  return (
    <div
      className={`denomination-row is-locked ${quantity > 0 ? "has-value" : ""} ${openingQuantity > 0 ? "has-opening-base" : ""}`}
    >
      <strong>
        {item.label}
        <small>
          {openingQuantity > 0
            ? localize(locale, `Opening float confirmed: ${openingQuantity}`, `Fondo inicial confirmado: ${openingQuantity}`, `Fundo confirmado: ${openingQuantity}`)
            : localize(locale, "No units in opening float", "Sin unidades en el fondo inicial", "Sem unidades no fundo")}
        </small>
      </strong>
      <div className="quantity-controls">
        <button
          type="button"
          aria-label={`${localize(locale, "Decrease", "Disminuir", "Diminuir")} ${item.label}`}
          disabled
        >
          <Minus size={15} />
        </button>
        <input
          type="number"
          inputMode="numeric"
          value={quantity === 0 ? "" : quantity}
          placeholder="0"
          readOnly
          aria-label={`${localize(locale, "Protected quantity of", "Cantidad protegida de", "Quantidade protegida de")} ${item.label}`}
        />
        <button
          type="button"
          aria-label={`${localize(locale, "Increase", "Aumentar", "Aumentar")} ${item.label}`}
          disabled
        >
          <Plus size={15} />
        </button>
      </div>
      <span>{formatCurrency(quantity * item.value)}</span>
    </div>
  );
}

function LiveClock({
  startedAt,
  durationHours,
  extensionMinutes,
  closureRequired,
  onExpired,
}: {
  startedAt: string | null;
  durationHours: ShiftDurationHours;
  extensionMinutes: number;
  closureRequired: boolean;
  onExpired: () => void;
}) {
  const { locale } = useLanguage();
  const [now, setNow] = useState(() => new Date());
  const notifiedDeadline = useRef<string | null>(null);
  const start = startedAt ? new Date(startedAt).getTime() : now.getTime();
  const deadline = getShiftDeadline(startedAt, durationHours, extensionMinutes);
  const remaining = getShiftRemainingMs(startedAt, durationHours, extensionMinutes, now.getTime());

  useEffect(() => {
    const interval = window.setInterval(() => setNow(new Date()), 1000);
    return () => window.clearInterval(interval);
  }, []);

  useEffect(() => {
    if (!deadline) return;
    if (remaining > 0) {
      notifiedDeadline.current = null;
      return;
    }
    if (notifiedDeadline.current === deadline || closureRequired) return;
    notifiedDeadline.current = deadline;
    onExpired();
  }, [closureRequired, deadline, onExpired, remaining]);

  const time = new Intl.DateTimeFormat(locale === "en" ? "en-US" : "pt-BR", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  }).format(now);
  return (
    <div className="live-clock">
      <div>
        <Clock3 size={17} />
        <span>
          <small>{locale === "en" ? "Current time" : locale === "es" ? "Hora actual" : "Horário atual"}</small>
          <strong>{time}</strong>
        </span>
      </div>
      <div>
        <RotateCcw size={17} />
        <span>
          <small>{locale === "en" ? `Count time · ${durationHours}h` : locale === "es" ? `Tiempo de conteo · ${durationHours}h` : `Tempo de contagem · ${durationHours}h`}</small>
          <strong>{formatDuration(now.getTime() - start)}</strong>
        </span>
      </div>
      <div>
        <Clock3 size={17} />
        <span>
          <small>{remaining > 0 ? locale === "en" ? "Time remaining" : locale === "es" ? "Tiempo restante" : "Prazo restante" : locale === "en" ? "Closing required" : locale === "es" ? "Cierre obligatorio" : "Fechamento obrigatório"}</small>
          <strong>{remaining > 0 ? formatDuration(remaining) : locale === "en" ? "Now" : locale === "es" ? "Ahora" : "Agora"}</strong>
        </span>
      </div>
    </div>
  );
}

export function ThermalReceipt({
  session,
  variations,
  totalExpected,
  totalFound,
  difference,
  status,
  finishedAt,
}: {
  session: {
    operator: string;
    company: string;
    shiftLabel: string;
    openingFloat: number | null;
    observation: string;
    closureNote: string;
    adjustments: AdjustmentEntry[];
    auditTrail: AuditEvent[];
    cashEntries: CashEntry[];
    startedAt: string | null;
  };
  variations: Array<{
    label: string;
    expected: number;
    found: number;
    difference: number;
  }>;
  totalExpected: number;
  totalFound: number;
  difference: number;
  status: "SEM QUEBRA" | "SOBRA" | "FALTA";
  finishedAt: string | null;
}) {
  const { locale } = useLanguage();
  const date = finishedAt ? new Date(finishedAt) : new Date();
  const adjustmentTotals = getAdjustmentTotals(session.adjustments);
  const cashEntryTotal = sumCashEntries(session.cashEntries);
  return (
    <article
      className="thermal-receipt"
      aria-label={localize(locale, "Thermal closing receipt", "Comprobante térmico de cierre", "Comprovante térmico de fechamento")}
    >
      <header className="thermal-header">
        <div className="thermal-mark">
          PIX<span>BEE</span>
        </div>
        <strong>{localize(locale, "CASH CLOSING", "CIERRE DE CAJA", "FECHAMENTO DE CAIXA")}</strong>
        <small>
          {new Intl.DateTimeFormat(locale === "en" ? "en-US" : locale === "es" ? "es-ES" : "pt-BR", {
            dateStyle: "short",
            timeStyle: "short",
          }).format(date)}
        </small>
      </header>
      <div className="thermal-rule solid" />
      <dl className="thermal-meta">
        <div>
          <dt>{locale === "en" ? "Company" : locale === "es" ? "Empresa" : "Empresa"}</dt>
          <dd>{session.company || localize(locale, "Not provided", "No informada", "Não informada")}</dd>
        </div>
        <div>
          <dt>{locale === "en" ? "Operator" : locale === "es" ? "Operador" : "Operador"}</dt>
          <dd>{session.operator || localize(locale, "Not provided", "No informado", "Não informado")}</dd>
        </div>
        {session.shiftLabel && (
          <div>
            <dt>{locale === "en" ? "Shift" : locale === "es" ? "Turno" : "Turno"}</dt>
            <dd>{session.shiftLabel}</dd>
          </div>
        )}
        <div>
          <dt>{locale === "en" ? "Opening float" : locale === "es" ? "Fondo inicial" : "Fundo inicial"}</dt>
          <dd>{formatCurrency(session.openingFloat ?? 0)}</dd>
        </div>
      </dl>
      <section className="thermal-section thermal-period">
        <h3>{localize(locale, "SHIFT PERIOD", "PERÍODO DEL TURNO", "PERÍODO DO TURNO")}</h3>
        <div className="thermal-row">
          <span>{locale === "en" ? "Opening" : locale === "es" ? "Apertura" : "Abertura"}</span>
          <b>{formatDateTime(session.startedAt, locale)}</b>
        </div>
        <div className="thermal-row">
          <span>{locale === "en" ? "Closing" : locale === "es" ? "Cierre" : "Fechamento"}</span>
          <b>{formatDateTime(finishedAt, locale)}</b>
        </div>
        <div className="thermal-row">
          <span>{locale === "en" ? "Duration" : locale === "es" ? "Duración" : "Duração"}</span>
          <b>
            {finishedAt
              ? formatShiftDuration(session.startedAt, finishedAt, locale)
              : locale === "en" ? "In progress" : locale === "es" ? "En curso" : "Em andamento"}
          </b>
        </div>
      </section>
      <section className="thermal-section">
        <h3>{localize(locale, "RECONCILIATION", "CONCILIACIÓN", "CONFERÊNCIA")}</h3>
        {variations.map(item => (
          <div className="thermal-row" key={item.label}>
            <div>
              <span>{item.label}</span>
              <small>
                {localize(locale, "Expected:", "Esperado:", "Previsto:")} {formatCurrency(item.expected)} · {localize(locale, "Diff.:", "Dif.:", "Dif.:")}{" "}
                {item.difference > 0 ? "+" : ""}
                {formatCurrency(item.difference)}
              </small>
            </div>
            <b>{formatCurrency(item.found)}</b>
          </div>
        ))}
      </section>
      {session.cashEntries.length > 0 && (
        <section className="thermal-section thermal-adjustments">
          <h3>{localize(locale, "CASH ENTRIES", "ENTRADAS DE EFECTIVO", "ENTRADAS EM ESPÉCIE")}</h3>
          {session.cashEntries.map(entry => (
            <div className="thermal-row" key={entry.id}>
              <div>
                <span>{locale === "en" ? "Cash entry" : locale === "es" ? "Entrada de efectivo" : "Entrada em dinheiro"} · {formatShortTime(entry.createdAt)}</span>
                <small>
                  {localize(locale, "Received", "Recibido", "Recebido")} {formatCurrency(getGrossAmount(entry))}
                  {getChangeAmount(entry) > 0
                    ? ` · ${locale === "en" ? "change" : locale === "es" ? "cambio" : "troco"} ${formatCurrency(getChangeAmount(entry))}`
                    : ` · ${localize(locale, "no change", "sin cambio", "sem troco")}`}
                </small>
              </div>
              <b>{localize(locale, "Net +", "Neto +", "Líquido +")} {formatCurrency(entry.amount)}</b>
            </div>
          ))}
          <div className="thermal-row">
            <span>{locale === "en" ? "Total cash entries" : locale === "es" ? "Total acumulado en efectivo" : "Total acumulado em espécie"}</span>
            <b>{formatCurrency(cashEntryTotal)}</b>
          </div>
        </section>
      )}
      {session.adjustments.length > 0 && (
        <section className="thermal-section thermal-adjustments">
          <h3>{localize(locale, "CASH MOVEMENTS", "MOVIMIENTOS DE CAJA", "LANÇAMENTOS DE CAIXA")}</h3>
          {session.adjustments.map(entry => (
            <div className="thermal-row" key={entry.id}>
              <div>
                <span>
                  {entry.type === "withdrawal" ? localize(locale, "Withdrawal", "Retiro", "Sangria") : localize(locale, "Supply", "Ingreso", "Suprimento")} ·{" "}
                  {formatShortTime(entry.createdAt)}
                </span>
                {entry.note ? <small>{entry.note}</small> : null}
              </div>
              <b>{formatCurrency(entry.amount)}</b>
            </div>
          ))}
          <div className="thermal-row">
            <span>{locale === "en" ? "Total withdrawals" : locale === "es" ? "Total de retiros" : "Total de sangrias"}</span>
            <b>{formatCurrency(adjustmentTotals.withdrawal)}</b>
          </div>
          <div className="thermal-row">
            <span>{locale === "en" ? "Total supplies" : locale === "es" ? "Total de ingresos" : "Total de suprimentos"}</span>
            <b>{formatCurrency(adjustmentTotals.supply)}</b>
          </div>
        </section>
      )}
      {session.auditTrail.length > 0 && (
        <section className="thermal-section thermal-audit">
          <h3>{localize(locale, "AUDIT TRAIL", "AUDITORÍA", "AUDITORIA")}</h3>
          {session.auditTrail.map(event => (
            <div className="thermal-row" key={event.id}>
              <div>
                <span>
                  {formatShortTime(event.occurredAt)} ·{" "}
                  {formatAuditEvent(event, locale)}
                </span>
                <small>
                  {event.justification
                                          ? `${localize(locale, "Reason:", "Motivo:", "Justificativa:")} ${event.justification}`

                    : event.previous?.note ||
                      event.current?.note ||
                      localize(locale, "No description", "Sin descripción", "Sem identificação")}
                </small>
              </div>
            </div>
          ))}
        </section>
      )}
      <section className="thermal-total">
        <div>
          <span>{locale === "en" ? "Expected total" : locale === "es" ? "Total esperado" : "Total esperado"}</span>
          <strong>{formatCurrency(totalExpected)}</strong>
        </div>
        <div>
          <span>{locale === "en" ? "Counted total" : locale === "es" ? "Total contado" : "Total conferido"}</span>
          <strong>{formatCurrency(totalFound)}</strong>
        </div>
        <div className={status === "SEM QUEBRA" ? "ok" : "break"}>
          <span>
            {status === "SEM QUEBRA"
              ? localize(locale, "NO DISCREPANCY", "SIN DIFERENCIA", "SEM QUEBRA")
              : locale === "en"
                ? `DISCREPANCY — ${status === "SOBRA" ? "SURPLUS" : "SHORTAGE"}`
                : locale === "es"
                  ? `DIFERENCIA — ${status === "SOBRA" ? "SOBRANTE" : "FALTANTE"}`
                  : `QUEBRA — ${status}`}
          </span>
          <strong>
            {difference > 0 ? "+" : ""}
            {formatCurrency(difference)}
          </strong>
        </div>
      </section>
      {(session.closureNote || session.observation) && (
        <section className="thermal-note">
          <h3>{localize(locale, "NOTE", "OBSERVACIÓN", "OBSERVAÇÃO")}</h3>
          <p>{session.closureNote || session.observation}</p>
        </section>
      )}
      <div className="thermal-rule solid" />
      <footer>{locale === "en" ? "Single copy · PixBee FechaCaixa" : locale === "es" ? "Copia única · PixBee FechaCaixa" : "Via única · PixBee FechaCaixa"}</footer>
    </article>
  );
}

function AdjustmentWorkspace({ type }: { type: AdjustmentKind }) {
  const { session, setSession } = useCashSession();
  const { locale } = useLanguage();
  const [amount, setAmount] = useState("");
  const [note, setNote] = useState("");
  const [pendingDeletion, setPendingDeletion] =
    useState<AdjustmentEntry | null>(null);
  const [editingEntry, setEditingEntry] = useState<AdjustmentEntry | null>(
    null
  );
  const [editingAmount, setEditingAmount] = useState("");
  const [editingNote, setEditingNote] = useState("");
  const [editingTime, setEditingTime] = useState("");
  const [editingJustification, setEditingJustification] = useState("");
  const [deletionJustification, setDeletionJustification] = useState("");
  const [isPhysicalDialogOpen, setIsPhysicalDialogOpen] = useState(false);
  const [movementQuantities, setMovementQuantities] = useState<Quantities>(
    () => createEmptyQuantities()
  );
  const info = METHOD_INFO[type];
  const Icon = info.icon;
  const entries = session.adjustments.filter(entry => entry.type === type);
  const total = entries.reduce((sum, entry) => sum + entry.amount, 0);
  const label = type === "withdrawal"
    ? locale === "en" ? "withdrawal" : locale === "es" ? "retiro" : "sangria"
    : locale === "en" ? "supply" : locale === "es" ? "ingreso" : "suprimento";
  function validateAmount() {
    const numericAmount = Number(amount);
    if (!Number.isFinite(numericAmount) || numericAmount <= 0) {
      toast.error(locale === "en" ? `Enter a valid ${label} amount.` : locale === "es" ? `Introduce un importe válido para ${label}.` : `Informe um valor válido para a ${label}.`);
      return null;
    }
    return numericAmount;
  }
  function beginAdd() {
    if (!validateAmount()) return;
    setMovementQuantities(createEmptyQuantities());
    setIsPhysicalDialogOpen(true);
  }
  function savePhysicalMovement() {
    const numericAmount = validateAmount();
    if (!numericAmount) return;
    const composedAmount = sumDenominationQuantities(movementQuantities);
    if (Math.abs(composedAmount - numericAmount) > 0.005) {
      toast.error(
        localize(locale, `The physical composition must total ${formatCurrency(numericAmount)}.`, `La composición física debe totalizar ${formatCurrency(numericAmount)}.`, `A composição física deve totalizar ${formatCurrency(numericAmount)}.`)
      );
      return;
    }
    if (
      type === "withdrawal" &&
      Object.entries(movementQuantities).some(
        ([key, value]) =>
          (session.quantities[key] ?? 0) - value <
          (session.openingQuantities[key] ?? 0)
      )
    ) {
      toast.error(
        locale === "en" ? "A withdrawal cannot remove units belonging to the opening float." : locale === "es" ? "Un retiro no puede quitar unidades pertenecientes al fondo inicial." : "A sangria não pode retirar unidades pertencentes ao fundo de abertura."
      );
      return;
    }
    const entry: AdjustmentEntry = {
      id: crypto.randomUUID(),
      shiftId: session.shiftId ?? "turno-sem-id",
      type,
      amount: numericAmount,
      quantities: movementQuantities,
      createdAt: new Date().toISOString(),
      note: note.trim(),
    };
    const auditEvent: AuditEvent = {
      id: crypto.randomUUID(),
      shiftId: entry.shiftId,
      adjustmentId: entry.id,
      type,
      action: "created",
      occurredAt: new Date().toISOString(),
      current: {
        amount: entry.amount,
        createdAt: entry.createdAt,
        note: entry.note,
      },
    };
    setSession(current => ({
      ...current,
      adjustments: [...current.adjustments, entry],
      auditTrail: [...current.auditTrail, auditEvent],
      quantities:
        type === "supply"
          ? applyPhysicalMovement(current.quantities, movementQuantities)
          : applyPhysicalMovement(current.quantities, createEmptyQuantities(), movementQuantities, current.openingQuantities),
    }));
    setAmount("");
    setNote("");
    setMovementQuantities(createEmptyQuantities());
    setIsPhysicalDialogOpen(false);
    toast.success(
      locale === "en" ? `${type === "withdrawal" ? "Withdrawal" : "Supply"} of ${formatCurrency(numericAmount)} recorded at ${formatShortTime(entry.createdAt)}.` : `${type === "withdrawal" ? "Sangria" : "Suprimento"} de ${formatCurrency(numericAmount)} registrado às ${formatShortTime(entry.createdAt)}.`
    );
  }
  const onEnter = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === "Enter") {
      event.preventDefault();
      beginAdd();
    }
  };
  function openEdit(entry: AdjustmentEntry) {
    setEditingEntry(entry);
    setEditingAmount(String(entry.amount));
    setEditingNote(entry.note);
    setEditingTime(getTimeValue(entry.createdAt));
    setEditingJustification("");
  }
  function saveEdit() {
    if (!editingEntry) return;
    const numericAmount = Number(editingAmount);
    if (
      !Number.isFinite(numericAmount) ||
      numericAmount <= 0 ||
      !/^\d{2}:\d{2}$/.test(editingTime)
    ) {
      toast.error(locale === "en" ? "Enter a valid amount and time before saving." : locale === "es" ? "Introduce un importe y una hora válidos antes de guardar." : "Informe valor e horário válidos antes de salvar.");
      return;
    }
    if (!editingJustification.trim()) {
      toast.error(locale === "en" ? "Enter the required reason for this change." : locale === "es" ? "Introduce el motivo obligatorio para este cambio." : "Informe a justificativa obrigatória para esta alteração.");
      return;
    }
    const [hours, minutes] = editingTime.split(":").map(Number);
    const adjustedDate = new Date(editingEntry.createdAt);
    adjustedDate.setHours(hours, minutes, 0, 0);
    const updatedEntry = {
      ...editingEntry,
      amount: numericAmount,
      note: editingNote.trim(),
      createdAt: adjustedDate.toISOString(),
    };
    const auditEvent: AuditEvent = {
      id: crypto.randomUUID(),
      shiftId: updatedEntry.shiftId,
      adjustmentId: updatedEntry.id,
      type,
      action: "updated",
      occurredAt: new Date().toISOString(),
      justification: editingJustification.trim(),
      previous: {
        amount: editingEntry.amount,
        createdAt: editingEntry.createdAt,
        note: editingEntry.note,
      },
      current: {
        amount: updatedEntry.amount,
        createdAt: updatedEntry.createdAt,
        note: updatedEntry.note,
      },
    };
    setSession(current => ({
      ...current,
      adjustments: current.adjustments.map(entry =>
        entry.id === editingEntry.id ? updatedEntry : entry
      ),
      auditTrail: [...current.auditTrail, auditEvent],
    }));
    setEditingEntry(null);
    setEditingJustification("");
    toast.success(
      locale === "en" ? `${type === "withdrawal" ? "Withdrawal" : "Supply"} updated successfully.` : `${type === "withdrawal" ? "Sangria" : "Suprimento"} atualizado com sucesso.`
    );
  }
  function confirmDeletion() {
    if (!pendingDeletion) return;
    if (!deletionJustification.trim()) {
      toast.error(locale === "en" ? "Enter the required reason before deleting." : locale === "es" ? "Introduce el motivo obligatorio antes de eliminar." : "Informe a justificativa obrigatória antes de excluir.");
      return;
    }
    const auditEvent: AuditEvent = {
      id: crypto.randomUUID(),
      shiftId: pendingDeletion.shiftId,
      adjustmentId: pendingDeletion.id,
      type,
      action: "deleted",
      occurredAt: new Date().toISOString(),
      justification: deletionJustification.trim(),
      previous: {
        amount: pendingDeletion.amount,
        createdAt: pendingDeletion.createdAt,
        note: pendingDeletion.note,
      },
    };
    setSession(current => ({
      ...current,
      adjustments: current.adjustments.filter(
        entry => entry.id !== pendingDeletion.id
      ),
      auditTrail: [...current.auditTrail, auditEvent],
    }));
    toast.success(locale === "en" ? "Entry deleted from the shift." : "Lançamento excluído do turno.");
    setPendingDeletion(null);
    setDeletionJustification("");
  }
  return (
    <article className={`adjustment-workspace ${type}`}>
      <header>
        <span className={`digital-icon ${info.tone}`}>
          <Icon size={19} />
        </span>
        <div>
          <strong>{locale === "en" ? ENGLISH_METHOD_INFO[type].title : locale === "es" ? SPANISH_METHOD_INFO[type].title : info.title}</strong>
          <small>
            {type === "withdrawal"
              ? locale === "en" ? ENGLISH_METHOD_INFO.withdrawal.description : locale === "es" ? SPANISH_METHOD_INFO.withdrawal.description : "Registre cada retirada de dinheiro do caixa."
              : locale === "en" ? ENGLISH_METHOD_INFO.supply.description : locale === "es" ? SPANISH_METHOD_INFO.supply.description : "Registre cada valor colocado no caixa."}
          </small>
        </div>
        <b>{formatCurrency(total)}</b>
      </header>
      <div className="adjustment-form">
        <label className="amount-input">
          <span>{locale === "en" ? `${label[0].toUpperCase()}${label.slice(1)} amount` : locale === "es" ? `Importe del ${label}` : `Valor da ${label}`}</span>
          <div>
            <b>R$</b>
            <input
              type="number"
              min="0"
              step="0.01"
              inputMode="decimal"
              value={amount}
              placeholder="0,00"
              onKeyDown={onEnter}
              onChange={event => setAmount(event.target.value)}
            />
          </div>
        </label>
        <label className="adjustment-note-input">
          <span>
            {localize(locale, "Description", "Descripción", "Identificação")} <small>{localize(locale, "optional", "opcional", "opcional")}</small>
          </span>
          <input
            value={note}
            maxLength={48}
            placeholder={localize(locale, "E.g.: transfer to safe", "Ej.: transferencia a caja fuerte", "Ex.: retirada para cofre")}
            onKeyDown={onEnter}
            onChange={event => setNote(event.target.value)}
          />
        </label>
        <Button
          className="adjustment-add-button"
          type="button"
          onClick={beginAdd}
        >
          <Plus size={17} /> {localize(locale, "Record", "Registrar", "Registrar")}
        </Button>
      </div>
      <Dialog open={isPhysicalDialogOpen} onOpenChange={setIsPhysicalDialogOpen}>
        <DialogContent className="money-count-dialog">
          <DialogHeader>
            <DialogTitle>
              {type === "withdrawal"
                ? localize(locale, "Count the withdrawn cash", "Cuenta el efectivo retirado", "Conte a sangria retirada")
                : localize(locale, "Count the added supply", "Cuenta el ingreso añadido", "Conte o suprimento adicionado")}
            </DialogTitle>
            <DialogDescription>
              {localize(locale, "The composition must total exactly ", "La composición debe sumar exactamente ", "A composição deve somar exatamente ")}{formatCurrency(Number(amount) || 0)}.
              {type === "withdrawal"
                ? localize(locale, " Units from the opening float remain protected.", " Las unidades del fondo inicial permanecen protegidas.", " As unidades do fundo de abertura permanecem protegidas.")
                : localize(locale, " These units will be added to the drawer's physical count.", " Estas unidades se añadirán al conteo físico de la caja.", " Essas unidades serão acrescentadas à contagem física do caixa.")}
            </DialogDescription>
          </DialogHeader>
          <div className="change-summary-grid">
            <div>
              <span>{locale === "en" ? "Entered amount" : "Valor informado"}</span>
              <strong>{formatCurrency(Number(amount) || 0)}</strong>
            </div>
            <div>
              <span>{locale === "en" ? "Physical composition" : "Composição física"}</span>
              <strong>{formatCurrency(sumDenominationQuantities(movementQuantities))}</strong>
            </div>
            <div className="net">
              <span>{locale === "en" ? "Reconciliation" : "Conferência"}</span>
              <strong>
                {Math.abs(sumDenominationQuantities(movementQuantities) - (Number(amount) || 0)) < 0.005
                  ? locale === "en" ? "Amount reconciled" : "Valor conciliado"
                  : locale === "en" ? "Waiting for composition" : "Aguardando composição"}
              </strong>
            </div>
          </div>
          <div className="money-count-columns">
            <section>
              <div className="denomination-heading">
                <span><Banknote size={16} /> {locale === "en" ? "Notes" : locale === "es" ? "Billetes" : "Cédulas"}</span>
              </div>
              {NOTE_DENOMINATIONS.map(item => (
                <QuantityControl
                  key={item.key}
                  item={item}
                  quantity={movementQuantities[item.key] ?? 0}
                  onChange={value =>
                    setMovementQuantities(current => ({
                      ...current,
                      [item.key]: Math.max(0, value),
                    }))
                  }
                />
              ))}
            </section>
            <section>
              <div className="denomination-heading">
                <span><Coins size={16} /> {locale === "en" ? "Coins" : locale === "es" ? "Monedas" : "Moedas"}</span>
              </div>
              {COIN_DENOMINATIONS.map(item => (
                <QuantityControl
                  key={item.key}
                  item={item}
                  quantity={movementQuantities[item.key] ?? 0}
                  onChange={value =>
                    setMovementQuantities(current => ({
                      ...current,
                      [item.key]: Math.max(0, value),
                    }))
                  }
                />
              ))}
            </section>
          </div>
          <DialogFooter>
                          <Button type="button" variant="outline" onClick={() => setIsPhysicalDialogOpen(false)}>
                {locale === "en" ? "Cancel" : locale === "es" ? "Cancelar" : "Cancelar"}
              </Button>

                          <Button type="button" className="pixbee-primary-button" onClick={savePhysicalMovement}>
                {locale === "en" ? "Confirm composition" : locale === "es" ? "Confirmar composición" : "Confirmar composição"} <ArrowRight size={17} />
              </Button>

          </DialogFooter>
        </DialogContent>
      </Dialog>
      <div className="adjustment-history">
        <div>
          <span>
            {locale === "en" ? `History of ${type === "withdrawal" ? "withdrawals" : "supplies"}` : locale === "es" ? `Historial de ${type === "withdrawal" ? "retiros" : "ingresos"}` : `Histórico de ${type === "withdrawal" ? "sangrias" : "suprimentos"}`}
          </span>
          <small>
            {entries.length === 0
              ? locale === "en" ? "No entries in this shift." : "Nenhum lançamento neste turno."
              : locale === "en" ? `${entries.length} entr${entries.length > 1 ? "ies" : "y"} recorded.` : `${entries.length} lançamento${entries.length > 1 ? "s" : ""} registrado${entries.length > 1 ? "s" : ""}.`}
          </small>
        </div>
        {entries.map(entry => (
          <div className="adjustment-entry" key={entry.id}>
            <time dateTime={entry.createdAt}>
              {formatShortTime(entry.createdAt)}
            </time>
            <span>
              <strong>
                {entry.note ||
                                    (type === "withdrawal"
                    ? locale === "en" ? "Withdrawal recorded" : "Sangria registrada"
                    : locale === "en" ? "Supply recorded" : "Suprimento registrado")
}
              </strong>
              <small>
                {type === "withdrawal"
                  ? locale === "en" ? "Removed from drawer" : "Retirada do caixa"
                  : locale === "en" ? "Added to drawer" : "Entrada no caixa"}
              </small>
            </span>
            <b>{formatCurrency(entry.amount)}</b>
            <div className="adjustment-entry-actions">
              <button
                type="button"
                onClick={() => openEdit(entry)}
                aria-label={`${locale === "en" ? "Edit" : "Editar"} ${label} ${locale === "en" ? "of" : "de"} ${formatCurrency(entry.amount)}`}
                title={locale === "en" ? "Edit entry" : locale === "es" ? "Editar movimiento" : "Editar lançamento"}
              >
                <Pencil size={13} />
              </button>
              <button
                className="delete-entry-button"
                type="button"
                onClick={() => {
                  setPendingDeletion(entry);
                  setDeletionJustification("");
                }}
                aria-label={`${locale === "en" ? "Delete" : "Excluir"} ${label} ${locale === "en" ? "of" : "de"} ${formatCurrency(entry.amount)}`}
                title={locale === "en" ? "Delete entry" : "Excluir lançamento"}
              >
                <Trash2 size={13} />
              </button>
            </div>
          </div>
        ))}
      </div>
      <AlertDialog
        open={Boolean(pendingDeletion)}
        onOpenChange={open => {
          if (!open) {
            setPendingDeletion(null);
            setDeletionJustification("");
          }
        }}
      >
        <AlertDialogContent className="history-dialog">
          <AlertDialogHeader>
            <AlertDialogTitle>{localize(locale, "Delete this entry?", "¿Eliminar este movimiento?", "Excluir este lançamento?")}</AlertDialogTitle>
            <AlertDialogDescription>
              {localize(locale, "This action removes the ", "Esta acción elimina el ", "Esta ação remove a ")}{label} {localize(locale, "of", "de", "de")}{" "}
              {pendingDeletion ? formatCurrency(pendingDeletion.amount) : ""} {localize(locale, "from the current shift. Enter a reason to preserve the closing audit trail.", "del turno actual. Introduce un motivo para conservar la auditoría del cierre.", "do turno atual. Informe o motivo para preservar a auditoria do fechamento.")}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <label className="audit-justification-field">
            <span>
              {localize(locale, "Deletion reason", "Motivo de eliminación", "Justificativa da exclusão")} <b>{localize(locale, "required", "obligatorio", "obrigatória")}</b>
            </span>
            <textarea
              value={deletionJustification}
              maxLength={240}
              placeholder={localize(locale, "E.g.: duplicate entry or incorrectly recorded amount.", "Ej.: movimiento duplicado o importe registrado incorrectamente.", "Ex.: lançamento duplicado ou valor lançado incorretamente.")}
              onChange={event => setDeletionJustification(event.target.value)}
            />
          </label>
          <AlertDialogFooter>
            <AlertDialogCancel>{locale === "en" ? "Cancel" : locale === "es" ? "Cancelar" : "Cancelar"}</AlertDialogCancel>
            <AlertDialogAction
              className="history-delete-confirm"
              onClick={event => {
                if (!deletionJustification.trim()) event.preventDefault();
                confirmDeletion();
              }}
            >
              {localize(locale, "Delete entry", "Eliminar movimiento", "Excluir lançamento")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      <Dialog
        open={Boolean(editingEntry)}
        onOpenChange={open => {
          if (!open) {
            setEditingEntry(null);
            setEditingJustification("");
          }
        }}
      >
        <DialogContent className="history-dialog">
          <DialogHeader>
            <DialogTitle>{locale === "en" ? `Edit ${label}` : locale === "es" ? `Editar ${label}` : `Editar ${label}`}</DialogTitle>
            <DialogDescription>
              {locale === "en" ? "Adjust the amount, time, and description. The reason will be included in the audit history." : locale === "es" ? "Ajusta el importe, la hora y la descripción. El motivo se incluirá en el historial de auditoría." : "Ajuste o valor, o horário e a identificação. A justificativa será incluída no histórico de auditoria."}
            </DialogDescription>
          </DialogHeader>
          <div className="edit-adjustment-fields">
            <label className="amount-input">
              <span>{localize(locale, "Amount", "Importe", "Valor")}</span>
              <div>
                <b>R$</b>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  inputMode="decimal"
                  value={editingAmount}
                  onChange={event => setEditingAmount(event.target.value)}
                />
              </div>
            </label>
            <label className="edit-time-input">
              <span>{localize(locale, "Time", "Hora", "Horário")}</span>
              <input
                type="time"
                value={editingTime}
                onChange={event => setEditingTime(event.target.value)}
              />
            </label>
            <label className="adjustment-note-input edit-note-input">
              <span>
                {localize(locale, "Description", "Descripción", "Identificação")} <small>{localize(locale, "optional", "opcional", "opcional")}</small>
              </span>
              <input
                maxLength={48}
                value={editingNote}
                onChange={event => setEditingNote(event.target.value)}
              />
            </label>
          </div>
          <label className="audit-justification-field">
            <span>
              {localize(locale, "Change reason", "Motivo del cambio", "Justificativa da alteração")} <b>{localize(locale, "required", "obligatorio", "obrigatória")}</b>
            </span>
            <textarea
              value={editingJustification}
              maxLength={240}
              placeholder={localize(locale, "E.g.: correction after checking the amount or time.", "Ej.: corrección después de verificar el importe o la hora.", "Ex.: correção após conferência do valor ou horário.")}
              onChange={event => setEditingJustification(event.target.value)}
            />
          </label>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setEditingEntry(null)}
            >
              {locale === "en" ? "Cancel" : locale === "es" ? "Cancelar" : "Cancelar"}
            </Button>
            <Button
              type="button"
              className="pixbee-primary-button history-save-button"
              onClick={saveEdit}
            >
              {locale === "en" ? "Save changes" : locale === "es" ? "Guardar cambios" : "Salvar alterações"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </article>
  );
}

export function CashEntryWorkspace() {
  const { session, setSession } = useCashSession();
  const { locale } = useLanguage();
  const [amount, setAmount] = useState("");
  const [isChangeQuestionOpen, setIsChangeQuestionOpen] = useState(false);
  const [isChangeCountOpen, setIsChangeCountOpen] = useState(false);
  const [isEntryCountOpen, setIsEntryCountOpen] = useState(false);
  const [entryHasChange, setEntryHasChange] = useState(false);
  const [editingEntry, setEditingEntry] = useState<CashEntry | null>(null);
  const [availableQuantities, setAvailableQuantities] = useState<Quantities>(() => createEmptyQuantities());
  const [changeQuantities, setChangeQuantities] = useState<Quantities>(() => createEmptyQuantities());
  const [entryQuantities, setEntryQuantities] = useState<Quantities>(() => createEmptyQuantities());
  const entries = session.cashEntries;
  const grossAmount = Number(amount);
  const changeAmount = sumDenominationQuantities(changeQuantities);
  function startEntry() {
    if (!Number.isFinite(grossAmount) || grossAmount <= 0) {
      toast.error(locale === "en" ? "Enter a valid cash entry amount." : "Informe um valor válido para a entrada em dinheiro.");
      return;
    }
    setIsChangeQuestionOpen(true);
  }
  function saveEntry(change = 0, quantities = createEmptyQuantities(), received = entryQuantities) {
    if (change > grossAmount) {
      toast.error(locale === "en" ? "Change cannot be greater than the amount received." : "O troco não pode ser maior que o valor recebido.");
      return;
    }
    const receivedTotal = sumDenominationQuantities(received);
    if (Math.abs(receivedTotal - grossAmount) > 0.005) {
      toast.error(locale === "en" ? `The received composition must total ${formatCurrency(grossAmount)}.` : `A composição recebida deve totalizar ${formatCurrency(grossAmount)}.`);
      return;
    }
    const netAmount = getNetCashEntryAmount(grossAmount, change);
    const entry: CashEntry = {
      id: crypto.randomUUID(),
      shiftId: session.shiftId ?? "turno-sem-id",
      grossAmount,
      changeAmount: change,
      receivedQuantities: received,
      changeQuantities: quantities,
      amount: netAmount,
      createdAt: new Date().toISOString(),
    };
    setSession(current => ({
      ...current,
      expected: {
        ...current.expected,
        cash: current.expected.cash + netAmount,
      },
      quantities: applyPhysicalMovement(current.quantities, received, quantities),
      cashEntries: [...current.cashEntries, entry],
    }));
    setAmount("");
    setChangeQuantities(createEmptyQuantities());
    setEntryQuantities(createEmptyQuantities());
    setIsChangeQuestionOpen(false);
    setIsChangeCountOpen(false);
    setIsEntryCountOpen(false);
    setEntryHasChange(false);
    setEditingEntry(null);
    setAvailableQuantities(createEmptyQuantities());
    toast.success(
      change > 0
        ? locale === "en" ? `Net entry of ${formatCurrency(netAmount)} recorded after ${formatCurrency(change)} in change.` : `Entrada líquida de ${formatCurrency(netAmount)} registrada após troco de ${formatCurrency(change)}.`
        : locale === "en" ? `Cash entry of ${formatCurrency(netAmount)} added to expected cash.` : `Entrada de ${formatCurrency(netAmount)} adicionada ao esperado em espécie.`
    );
  }
  function answerHasChange(hasChange: boolean) {
    setEntryHasChange(hasChange);
    setEntryQuantities(createEmptyQuantities());
    setIsChangeQuestionOpen(false);
    setIsEntryCountOpen(true);
  }
  function confirmReceivedQuantities(quantities: Quantities, total: number) {
    if (Math.abs(total - grossAmount) > 0.005) {
      toast.error(locale === "en" ? `The received composition must total ${formatCurrency(grossAmount)}.` : `A composição recebida deve totalizar ${formatCurrency(grossAmount)}.`);
      return;
    }
    setEntryQuantities(quantities);
    setIsEntryCountOpen(false);
    if (entryHasChange) {
      setAvailableQuantities(applyPhysicalMovement(session.quantities, quantities));
      setChangeQuantities(createEmptyQuantities());
      setIsChangeCountOpen(true);
      return;
    }
    saveEntry(0, createEmptyQuantities(), quantities);
  }
  function openChangeEditor(entry: CashEntry) {
    const received = entry.receivedQuantities ?? createEmptyQuantities();
    const oldChange = entry.changeQuantities ?? createEmptyQuantities();
    const availableForCorrection = applyPhysicalMovement(
      session.quantities,
      oldChange,
      createEmptyQuantities(),
      session.openingQuantities
    );
    setAmount(String(getGrossAmount(entry)));
    setEditingEntry(entry);
    setEntryHasChange(true);
    setEntryQuantities(received);
    setAvailableQuantities(availableForCorrection);
    setChangeQuantities(oldChange);
    setIsChangeCountOpen(true);
  }
  function saveEditedEntry(change: number, quantities: Quantities) {
    if (!editingEntry) return;
    if (change > grossAmount) {
      toast.error(locale === "en" ? "Change cannot be greater than the amount received." : "O troco não pode ser maior que o valor recebido.");
      return;
    }
    if (Object.entries(quantities).some(([key, value]) => value > (availableQuantities[key] ?? 0))) {
      toast.error(locale === "en" ? "Change cannot use more notes or coins than are available in the drawer." : "O troco não pode usar mais cédulas ou moedas do que as disponíveis no caixa.");
      return;
    }
    const netAmount = getNetCashEntryAmount(grossAmount, change);
    const updatedEntry: CashEntry = {
      ...editingEntry,
      grossAmount,
      changeAmount: change,
      receivedQuantities: entryQuantities,
      changeQuantities: quantities,
      amount: netAmount,
    };
    setSession(current => {
      return {
        ...current,
        expected: {
          ...current.expected,
          cash: current.expected.cash - editingEntry.amount + netAmount,
        },
        quantities: applyPhysicalMovement(
          current.quantities,
          editingEntry.changeQuantities ?? createEmptyQuantities(),
          quantities
        ),
        cashEntries: current.cashEntries.map(entry =>
          entry.id === editingEntry.id ? updatedEntry : entry
        ),
      };
    });
    setEditingEntry(null);
    setIsChangeCountOpen(false);
    setEntryHasChange(false);
    setEntryQuantities(createEmptyQuantities());
    setChangeQuantities(createEmptyQuantities());
    setAvailableQuantities(createEmptyQuantities());
    toast.success(locale === "en" ? "Change corrected and the drawer composition updated." : "Troco corrigido e composição física do caixa atualizada.");
  }
  function handleEnter(event: React.KeyboardEvent<HTMLInputElement>) {
    if (event.key !== "Enter") return;
    event.preventDefault();
    startEntry();
  }

  return (
    <article className="adjustment-workspace cash-entry-workspace">
      <header>
        <span className="digital-icon aqua">
          <Plus size={19} />
        </span>
        <div>
          <strong>{localize(locale, "Add cash entry", "Añadir entrada de efectivo", "Adicionar entrada em espécie")}</strong>
          <small>
            {localize(locale, "Each amount is added to expected cash. Press Enter to record it quickly.", "Cada importe se añade al efectivo esperado. Pulsa Enter para registrarlo rápidamente.", "Cada valor é somado ao esperado em dinheiro. Pressione Enter para registrar rapidamente.")}
          </small>
        </div>
        <b>{formatCurrency(session.expected.cash)}</b>
      </header>
      <div className="adjustment-form">
        <label className="amount-input">
          <span>{localize(locale, "Amount received", "Importe recibido", "Valor recebido")}</span>
          <div>
            <b>R$</b>
            <input
              type="number"
              min="0"
              step="0.01"
              inputMode="decimal"
              value={amount}
              placeholder="0,00"
              onKeyDown={handleEnter}
              onChange={event => setAmount(event.target.value)}
            />
          </div>
        </label>
        <Button
          className="adjustment-add-button"
          type="button"
          onClick={startEntry}
        >
          <Plus size={17} /> {localize(locale, "Add entry", "Añadir entrada", "Adicionar entrada")}
        </Button>
      </div>
      <div className="adjustment-history">
        <div>
          <span>{localize(locale, "Entries recorded this shift", "Entradas registradas en este turno", "Entradas registradas neste turno")}</span>
          <small>
            {entries.length === 0
              ? localize(locale, "No entries recorded.", "No hay entradas registradas.", "Nenhuma entrada registrada.")
              : locale === "en"
                ? `${entries.length} cash entr${entries.length > 1 ? "ies" : "y"} recorded.`
                : locale === "es"
                  ? `${entries.length} entrada${entries.length > 1 ? "s" : ""} registrada${entries.length > 1 ? "s" : ""}.`
                  : `${entries.length} entrada${entries.length > 1 ? "s" : ""} somada${entries.length > 1 ? "s" : ""}.`}
          </small>
        </div>
        {entries.map(entry => (
          <div className="adjustment-entry" key={entry.id}>
            <time dateTime={entry.createdAt}>
              {formatShortTime(entry.createdAt)}
            </time>
            <span>
              <strong>{locale === "en" ? "Cash entry" : locale === "es" ? "Entrada de efectivo" : "Entrada em dinheiro"}</strong>
              <small>
                {locale === "en" ? "Received" : "Recebido"} {formatCurrency(getGrossAmount(entry))}
                {getChangeAmount(entry) > 0
                  ? ` · troco ${formatCurrency(getChangeAmount(entry))}`
                  : locale === "en" ? " · no change" : " · sem troco"}
              </small>
            </span>
            <b>+ {formatCurrency(entry.amount)}</b>
            {getChangeAmount(entry) > 0 ? (
              <button
                type="button"
                className="edit-entry-button"
                aria-label={locale === "en" ? "Correct change for this entry" : "Corrigir troco desta entrada"}
                onClick={() => openChangeEditor(entry)}
              >
                <Pencil size={14} />
              </button>
            ) : null}
          </div>
        ))}
      </div>
      <OpeningFloatDialog
        open={isEntryCountOpen}
        initialQuantities={entryQuantities}
        onOpenChange={setIsEntryCountOpen}
        onConfirm={confirmReceivedQuantities}
        title={localize(locale, "Count the cash received", "Cuenta el efectivo recibido", "Conte o dinheiro recebido")}
        description={localize(locale, `Record the notes and coins totaling ${formatCurrency(grossAmount)}. This composition will be added to the physical cash.`, `Registra los billetes y monedas que suman ${formatCurrency(grossAmount)}. Esta composición se añadirá al efectivo físico.`, `Registre as cédulas e moedas que totalizam ${formatCurrency(grossAmount)}. Essa composição será adicionada ao caixa físico.`)}
        summaryLabel={localize(locale, "Counted cash received", "Efectivo recibido contado", "Dinheiro recebido apurado")}
        confirmLabel={localize(locale, "Confirm cash received", "Confirmar efectivo recibido", "Confirmar dinheiro recebido")}
      />
      <Dialog open={isChangeQuestionOpen} onOpenChange={setIsChangeQuestionOpen}>
        <DialogContent className="change-dialog">
          <DialogHeader>
            <DialogTitle>{localize(locale, "Did this entry include change?", "¿Esta entrada incluyó cambio?", "Essa entrada teve troco?")}</DialogTitle>
            <DialogDescription>
              {localize(locale, `You received ${formatCurrency(grossAmount)}. Tell us whether part of this amount was returned to the customer before recording the entry.`, `Recibiste ${formatCurrency(grossAmount)}. Indica si una parte de este importe se devolvió a la persona cliente antes de registrar la entrada.`, `Você recebeu ${formatCurrency(grossAmount)}. Informe se parte desse valor voltou para o cliente antes de registrar a entrada.`)}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setIsChangeQuestionOpen(false)}>
              {locale === "en" ? "Cancel" : locale === "es" ? "Cancelar" : "Cancelar"}
            </Button>
            <Button type="button" variant="secondary" onClick={() => answerHasChange(false)}>
              {localize(locale, "No change", "Sin cambio", "Não teve troco")}
            </Button>
            <Button type="button" className="pixbee-primary-button" onClick={() => answerHasChange(true)}>
              {localize(locale, "Yes, enter change", "Sí, informar cambio", "Sim, informar troco")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      <Dialog open={isChangeCountOpen} onOpenChange={setIsChangeCountOpen}>
        <DialogContent className="money-count-dialog">
          <DialogHeader>
            <DialogTitle>{editingEntry ? localize(locale, "Correct returned change", "Corrige el cambio devuelto", "Corrija o troco devolvido") : localize(locale, "Count the returned change", "Cuenta el cambio devuelto", "Conte o troco devolvido")}</DialogTitle>
            <DialogDescription>
              {editingEntry
                ? localize(locale, "The previous composition was imported. Adjust the returned notes and coins according to the cash available.", "La composición anterior fue importada. Ajusta los billetes y monedas devueltos según el efectivo disponible.", "A composição anterior foi importada. Ajuste as notas e moedas devolvidas conforme o caixa disponível.")
                : localize(locale, "The available composition was imported. Enter the returned notes and coins below. The system will calculate the net entry automatically.", "La composición disponible fue importada. Registra abajo los billetes y monedas devueltos. El sistema calculará automáticamente la entrada neta.", "A composição disponível foi importada. Registre abaixo as notas e moedas devolvidas. O sistema calculará a entrada líquida automaticamente.")}
            </DialogDescription>
          </DialogHeader>
          <div className="change-summary-grid">
            <div><span>{localize(locale, "Received", "Recibido", "Recebido")}</span><strong>{formatCurrency(grossAmount)}</strong></div>
            <div><span>{localize(locale, "Change returned", "Cambio devuelto", "Troco devolvido")}</span><strong>{formatCurrency(changeAmount)}</strong></div>
            <div className="net"><span>{locale === "en" ? "Net entry" : locale === "es" ? "Entrada neta" : "Entrada líquida"}</span><strong>{formatCurrency(getNetCashEntryAmount(grossAmount, changeAmount))}</strong></div>
          </div>
          <div className="money-count-columns">
            <section>
              <div className="denomination-heading"><span><Banknote size={16} /> {localize(locale, "Notes", "Billetes", "Cédulas")}</span></div>
              {NOTE_DENOMINATIONS.map(item => (
                <QuantityControl key={item.key} item={item} quantity={changeQuantities[item.key] ?? 0}
                    available={availableQuantities[item.key] ?? 0}
                    onChange={value =>
                      setChangeQuantities(current => ({
                        ...current,
                        [item.key]: Math.min(availableQuantities[item.key] ?? 0, Math.max(0, value)),
                      }))
                    }
                  />
              ))}
            </section>
            <section>
              <div className="denomination-heading"><span><Coins size={16} /> {localize(locale, "Coins", "Monedas", "Moedas")}</span></div>
              {COIN_DENOMINATIONS.map(item => (
                <QuantityControl key={item.key} item={item} quantity={changeQuantities[item.key] ?? 0}
                    available={availableQuantities[item.key] ?? 0}
                    onChange={value =>
                      setChangeQuantities(current => ({
                        ...current,
                        [item.key]: Math.min(availableQuantities[item.key] ?? 0, Math.max(0, value)),
                      }))
                    }
                  />
              ))}
            </section>
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setIsChangeCountOpen(false);
                setEditingEntry(null);
                setAmount("");
              }}
            >{locale === "en" ? "Back" : locale === "es" ? "Atrás" : "Voltar"}</Button>
            <Button
              type="button"
              className="pixbee-primary-button"
              onClick={() =>
                editingEntry
                  ? saveEditedEntry(changeAmount, changeQuantities)
                  : saveEntry(changeAmount, changeQuantities)
              }
            >
              {editingEntry ? locale === "en" ? "Save correction" : locale === "es" ? "Guardar corrección" : "Salvar correção" : locale === "en" ? "Confirm net entry" : locale === "es" ? "Confirmar entrada neta" : "Confirmar entrada líquida"} <ArrowRight size={17} />
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </article>
  );
}

function CountPage() {
  const [, navigate] = useLocation();
  const { locale, t } = useLanguage();
  const { session, setSession } = useCashSession();
  const selected = session.selectedMethods;
  const cashSelected = selected.includes("cash");
  const [isDeadlineDialogOpen, setIsDeadlineDialogOpen] = useState(false);
  const handleShiftExpired = () => {
    if (session.extensionUsed) {
      setSession(current => ({ ...current, closureRequired: true }));
    }
    setIsDeadlineDialogOpen(true);
  };
  const extendShift = (minutes: number) => {
    setSession(current => ({
      ...current,
      extensionMinutes: minutes,
      extensionUsed: true,
      closureRequired: false,
    }));
    setIsDeadlineDialogOpen(false);
    const extensionLabel = minutes === 60
      ? locale === "en" ? "1 hour" : "1 hora"
      : locale === "en" ? `${minutes} minutes` : `${minutes} minutos`;
    toast.success(locale === "en" ? `Deadline extended by ${extensionLabel}.` : `Prazo estendido por ${extensionLabel}.`);
  };
  const startMandatoryClosing = () => {
    setSession(current => ({ ...current, closureRequired: true }));
    setIsDeadlineDialogOpen(false);
    navigate("/validacao");
  };
  const computed = useMemo(() => {
    const notes = NOTE_DENOMINATIONS.reduce(
      (total, item) => total + item.value * (session.quantities[item.key] ?? 0),
      0
    );
    const coins = COIN_DENOMINATIONS.reduce(
      (total, item) => total + item.value * (session.quantities[item.key] ?? 0),
      0
    );
    const adjustmentTotals = getAdjustmentTotals(session.adjustments);
    const cashExpected = cashSelected
      ? (session.openingFloat ?? 0) +
        session.expected.cash +
        adjustmentTotals.supply -
        adjustmentTotals.withdrawal
      : 0;
    const digitalExpected = DIGITAL_METHODS.filter(method =>
      selected.includes(method)
    ).reduce((total, method) => total + session.expected[method], 0);
    const digitalFound = DIGITAL_METHODS.filter(method =>
      selected.includes(method)
    ).reduce((total, method) => total + session.confirmed[method], 0);
    const totalExpected = cashExpected + digitalExpected;
    const totalFound = (cashSelected ? notes + coins : 0) + digitalFound;
    return {
      notes,
      coins,
      cashFound: notes + coins,
      cashExpected,
      digitalExpected,
      digitalFound,
      totalExpected,
      totalFound,
      difference: totalFound - totalExpected,
      adjustmentTotals,
    };
  }, [cashSelected, selected, session]);
  const updateExpected = (method: MethodId, value: number) =>
    setSession(current => ({
      ...current,
      expected: { ...current.expected, [method]: value },
    }));
  const updateConfirmed = (method: MethodId, value: number) =>
    setSession(current => ({
      ...current,
      confirmed: { ...current.confirmed, [method]: value },
    }));
  function moveToValidation() {
    const hasAnyValue =
      Object.values(session.quantities).some(value => value > 0) ||
      DIGITAL_METHODS.some(method => session.confirmed[method] > 0) ||
      session.expected.cash > 0 ||
      session.adjustments.length > 0;
    if (!hasAnyValue) {
      toast.error(
        locale === "en" ? "Record at least one counted amount before reviewing the closing." : locale === "es" ? "Registra al menos un importe contado antes de revisar el cierre." : "Registre ao menos um valor conferido antes de revisar o fechamento."
      );
      return;
    }
    navigate("/validacao");
  }
  return (
    <AppShell title={locale === "en" ? "Count in progress" : "Contagem em andamento"} currentStep={3}>
      <LiveClock
        startedAt={session.startedAt}
        durationHours={session.durationHours}
        extensionMinutes={session.extensionMinutes}
        closureRequired={session.closureRequired}
        onExpired={handleShiftExpired}
      />
      <Dialog open={isDeadlineDialogOpen} onOpenChange={() => undefined}>
        <DialogContent className="deadline-dialog" onEscapeKeyDown={event => event.preventDefault()} onPointerDownOutside={event => event.preventDefault()}>
          <DialogHeader>
            <DialogTitle>{session.closureRequired ? locale === "en" ? "Mandatory closing" : locale === "es" ? "Cierre obligatorio" : "Fechamento obrigatório" : locale === "en" ? "The shift has ended" : "O turno chegou ao fim"}</DialogTitle>
            <DialogDescription>
              {session.closureRequired
                ? locale === "en" ? "The additional time has been used. Validate the closing to continue and open a new count." : "O prazo adicional já foi utilizado. Valide o fechamento para continuar e abrir uma nova contagem."
                : locale === "en" ? "The selected period has ended. You can start closing now or use one extension." : locale === "es" ? "El período seleccionado terminó. Puedes iniciar el cierre ahora o usar una única extensión." : "O período selecionado terminou. Você pode iniciar o fechamento agora ou usar uma única extensão."
              }
            </DialogDescription>
          </DialogHeader>
          {!session.closureRequired && !session.extensionUsed ? (
            <div className="deadline-options">
              <Button type="button" variant="outline" onClick={() => extendShift(20)}>{locale === "en" ? "Add 20 min" : locale === "es" ? "Añadir 20 min" : "Adicionar 20 min"}</Button>
              <Button type="button" variant="outline" onClick={() => extendShift(30)}>{locale === "en" ? "Add 30 min" : locale === "es" ? "Añadir 30 min" : "Adicionar 30 min"}</Button>
              <Button type="button" variant="outline" onClick={() => extendShift(60)}>{locale === "en" ? "Add 1 hour" : locale === "es" ? "Añadir 1 hora" : "Adicionar 1 hora"}</Button>
            </div>
          ) : null}
          <DialogFooter>
            <Button type="button" className="pixbee-primary-button" onClick={startMandatoryClosing}>
              {locale === "en" ? "Start closing" : locale === "es" ? "Iniciar cierre" : "Iniciar fechamento"} <ArrowRight size={17} />
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      {session.closureRequired ? (
        <div className="mandatory-closure-lock" role="alert">
          <div className="mandatory-closure-lock-card">
            <Clock3 size={24} />
            <strong>{locale === "en" ? "Mandatory closing" : locale === "es" ? "Cierre obligatorio" : "Fechamento obrigatório"}</strong>
            <span>{locale === "en" ? "This shift's deadline has ended. Validate the drawer to unlock a new count." : locale === "es" ? "El plazo de este turno terminó. Valida la caja para habilitar un nuevo conteo." : "O prazo deste turno terminou. Valide o caixa para liberar uma nova contagem."}</span>
            <Button className="pixbee-primary-button" onClick={() => navigate("/validacao")}>
              {locale === "en" ? "Go to validation" : locale === "es" ? "Ir a validación" : "Ir para validação"} <ArrowRight size={17} />
            </Button>
          </div>
        </div>
      ) : null}
      <div className="count-layout">
        <section className="glass-panel flow-panel count-panel">
          <div className="flow-heading compact">
            <span>{locale === "en" ? "Step 02" : locale === "es" ? "Etapa 02" : t("count.step")}</span>
            <h2>{locale === "en" ? "Record the shift values." : locale === "es" ? "Registra los valores del turno." : t("count.title")}</h2>
            <p>{locale === "en" ? "Expected values are compared with the amounts actually counted." : locale === "es" ? "Los valores esperados se comparan con los importes contados." : t("count.copy")}</p>
          </div>
          {cashSelected && (
            <section className="count-section">
              <div className="section-title">
                <div>
                  <Banknote size={19} />
                  <span>{locale === "en" ? "Physical cash" : locale === "es" ? "Efectivo" : "Dinheiro físico"}</span>
                </div>
                <strong>{formatCurrency(computed.cashFound)}</strong>
              </div>
              <div className="cash-expected-grid">
                <div className="opening-amount">
                  <span>{locale === "en" ? "Opening float" : locale === "es" ? "Fondo inicial" : "Fundo inicial"}</span>
                  <strong>{formatCurrency(session.openingFloat ?? 0)}</strong>
                </div>
                <div className="opening-amount">
                  <span>{locale === "en" ? "Accumulated entries" : locale === "es" ? "Ingresos acumulados" : "Entradas acumuladas"}</span>
                  <strong>{formatCurrency(session.expected.cash)}</strong>
                </div>
                <div className="opening-amount total">
                  <span>{locale === "en" ? "Expected cash" : locale === "es" ? "Efectivo esperado" : "Esperado em espécie"}</span>
                  <strong>{formatCurrency(computed.cashExpected)}</strong>
                </div>
              </div>
              <CashEntryWorkspace />
              <div className="denomination-columns">
                <div>
                  <div className="denomination-heading">
                    <span>
                      <Banknote size={16} /> {locale === "en" ? "Notes" : locale === "es" ? "Billetes" : "Cédulas"}
                    </span>
                    <strong>{formatCurrency(computed.notes)}</strong>
                  </div>
                  {NOTE_DENOMINATIONS.map(item => (
                    <DenominationRow key={item.key} item={item} />
                  ))}
                </div>
                <div>
                  <div className="denomination-heading">
                    <span>
                      <Coins size={16} /> {locale === "en" ? "Coins" : locale === "es" ? "Monedas" : "Moedas"}
                    </span>
                    <strong>{formatCurrency(computed.coins)}</strong>
                  </div>
                  {COIN_DENOMINATIONS.map(item => (
                    <DenominationRow key={item.key} item={item} />
                  ))}
                </div>
              </div>
            </section>
          )}
          {DIGITAL_METHODS.some(method => selected.includes(method)) && (
            <section className="count-section digital-section">
              <div className="section-title">
                <div>
                  <WalletCards size={19} />
                  <span>{locale === "en" ? "Digital payments" : locale === "es" ? "Pagos digitales" : "Recebimentos digitais"}</span>
                </div>
                <strong>{formatCurrency(computed.digitalFound)}</strong>
              </div>
              <div className="digital-list">
                {DIGITAL_METHODS.filter(method =>
                  selected.includes(method)
                ).map(method => {
                  const info = METHOD_INFO[method];
                  const Icon = info.icon;
                  return (
                    <article className="digital-row" key={method}>
                      <span className={`digital-icon ${info.tone}`}>
                        <Icon size={19} />
                      </span>
                      <div className="digital-meta">
                        <strong>{locale === "en" ? ENGLISH_METHOD_INFO[method].title : info.title}</strong>
                        <small>{locale === "en" ? ENGLISH_METHOD_INFO[method].description : info.description}</small>
                      </div>
                      <AmountInput
                        label={locale === "en" ? "Expected" : locale === "es" ? "Esperado" : "Esperado"}
                        value={session.expected[method]}
                        onChange={value => updateExpected(method, value)}
                      />
                      <AmountInput
                        label={locale === "en" ? "Counted" : locale === "es" ? "Contado" : "Conferido"}
                        value={session.confirmed[method]}
                        onChange={value => updateConfirmed(method, value)}
                      />
                    </article>
                  );
                })}
              </div>
            </section>
          )}
          {ADJUSTMENT_METHODS.some(method => selected.includes(method)) && (
            <section className="count-section adjustment-section">
              <div className="section-title">
                <div>
                  <ReceiptText size={19} />
                  <span>{locale === "en" ? "Cash movements" : locale === "es" ? "Movimientos de caja" : "Lançamentos de caixa"}</span>
                </div>
                <small>
                  {locale === "en"
                    ? "Each event updates expected cash and is logged with a timestamp."
                    : "Cada evento atualiza o esperado e fica registrado com horário."}
                </small>
              </div>
              <div className="adjustment-list">
                {ADJUSTMENT_METHODS.filter(method =>
                  selected.includes(method)
                ).map(method => (
                  <AdjustmentWorkspace key={method} type={method} />
                ))}
              </div>
            </section>
          )}
          <div className="flow-actions">
            <Link href="/abertura" className="pixbee-text-button">
              <ArrowLeft size={17} /> {locale === "en" ? "Back" : locale === "es" ? "Atrás" : "Voltar"}
            </Link>
            <Button
              className="pixbee-primary-button"
              onClick={moveToValidation}
            >
              {locale === "en" ? "Review closing" : locale === "es" ? "Revisar cierre" : "Revisar fechamento"} <ArrowRight size={18} />
            </Button>
          </div>
        </section>
        <aside className="count-summary glass-panel">
          <span>{locale === "en" ? "Live summary" : locale === "es" ? "Resumen en tiempo real" : "Resumo em tempo real"}</span>
          <div className="summary-total">
            <small>{locale === "en" ? "Total counted" : locale === "es" ? "Total contado" : "Total conferido"}</small>
            <strong>{formatCurrency(computed.totalFound)}</strong>
          </div>
          <div className="summary-line">
            <span>{locale === "en" ? "Expected amount" : locale === "es" ? "Importe esperado" : "Valor esperado"}</span>
            <strong>{formatCurrency(computed.totalExpected)}</strong>
          </div>
          <div className="summary-line">
            <span>{locale === "en" ? "Physical cash" : locale === "es" ? "Efectivo" : "Dinheiro físico"}</span>
            <strong>{formatCurrency(computed.cashFound)}</strong>
          </div>
          <div className="summary-line">
            <span>{locale === "en" ? "Withdrawals" : locale === "es" ? "Retiros" : "Sangrias"}</span>
            <strong>
              - {formatCurrency(computed.adjustmentTotals.withdrawal)}
            </strong>
          </div>
          <div className="summary-line">
            <span>{locale === "en" ? "Supplies" : locale === "es" ? "Ingresos" : "Suprimentos"}</span>
            <strong>
              + {formatCurrency(computed.adjustmentTotals.supply)}
            </strong>
          </div>
          <div
            className={`summary-difference ${Math.abs(computed.difference) < 0.005 ? "balanced" : computed.difference > 0 ? "positive" : "negative"}`}
          >
            <span>{locale === "en" ? "Difference so far" : locale === "es" ? "Diferencia hasta ahora" : "Diferença até agora"}</span>
            <strong>
              {computed.difference > 0 ? "+" : ""}
              {formatCurrency(computed.difference)}
            </strong>
          </div>
          <p>
            {localize(locale, "Continue entering values. The difference breakdown appears in the final step.", "Continúa registrando valores. El detalle de la diferencia aparece en la etapa final.", "Continue preenchendo. O detalhamento da diferença aparece na etapa final.")}
          </p>
        </aside>
      </div>
    </AppShell>
  );
}

export function ValidationPage() {
  const [, navigate] = useLocation();
  const { locale } = useLanguage();
  const { session, setSession, startNextSession } = useCashSession();
  const englishMethodTitles: Record<MethodId, string> = {
    cash: "Physical cash",
    pix: "PIX",
    debit: "Debit card",
    credit: "Credit card",
    voucher: "Vouchers",
    withdrawal: "Withdrawal",
    supply: "Supply",
  };
  const [isValidating, setIsValidating] = useState(false);
  const [isPrinting, setIsPrinting] = useState(false);
  const isPrintPreview = isDevelopmentPreviewEnabled(
    typeof window === "undefined" ? "" : window.location.search,
    import.meta.env.DEV,
    "preview-print"
  );
  const canPrintReceipt = Boolean(session.validatedAt) || isPrintPreview;
  const cashSelected = session.selectedMethods.includes("cash");
  const notes = NOTE_DENOMINATIONS.reduce(
    (total, item) => total + item.value * (session.quantities[item.key] ?? 0),
    0
  );
  const coins = COIN_DENOMINATIONS.reduce(
    (total, item) => total + item.value * (session.quantities[item.key] ?? 0),
    0
  );
  const adjustmentTotals = getAdjustmentTotals(session.adjustments);
  const cashExpected = cashSelected
    ? (session.openingFloat ?? 0) +
      session.expected.cash +
      adjustmentTotals.supply -
      adjustmentTotals.withdrawal
    : 0;
  const cashFound = cashSelected ? notes + coins : 0;
  const variations = [
    ...(cashSelected
      ? [
          {
            method: "cash" as MethodId,
            label: locale === "en" ? "Physical cash" : locale === "es" ? "Efectivo" : "Dinheiro físico",
            expected: cashExpected,
            found: cashFound,
          },
        ]
      : []),
    ...DIGITAL_METHODS.filter(method =>
      session.selectedMethods.includes(method)
    ).map(method => ({
      method,
      label: locale === "en" ? englishMethodTitles[method] : METHOD_INFO[method].title,
      expected: session.expected[method],
      found: session.confirmed[method],
    })),
  ].map(item => ({ ...item, difference: item.found - item.expected }));
  const totalExpected = variations.reduce(
    (total, item) => total + item.expected,
    0
  );
  const totalFound = variations.reduce((total, item) => total + item.found, 0);
  const difference = totalFound - totalExpected;
  const balanced = Math.abs(difference) < 0.005;
  const localizedClosureStatus = locale === "en"
    ? balanced ? "balanced" : difference > 0 ? "surplus" : "shortage"
    : locale === "es"
      ? balanced ? "sin diferencia" : difference > 0 ? "sobrante" : "faltante"
      : balanced ? "sem quebra" : difference > 0 ? "sobra" : "falta";
  const closureStatus: "SEM QUEBRA" | "SOBRA" | "FALTA" = balanced
    ? "SEM QUEBRA"
    : difference > 0
      ? "SOBRA"
      : "FALTA";
  function validateClosure() {
    const record: ShiftHistoryRecord = {
      id: crypto.randomUUID(),
      shiftId: session.shiftId ?? crypto.randomUUID(),
      company: session.company,
      operator: session.operator,
      shiftLabel: session.shiftLabel,
      startedAt: session.startedAt,
      totalExpected,
      totalFound,
      difference,
      finishedAt: new Date().toISOString(),
      status: closureStatus,
      cashEntries: session.cashEntries.map(entry => ({
        ...entry,
        shiftId: session.shiftId ?? entry.shiftId,
      })),
      adjustments: session.adjustments.map(entry => ({
        ...entry,
        shiftId: session.shiftId ?? entry.shiftId,
      })),
      auditTrail: session.auditTrail.map(event => ({
        ...event,
        shiftId: session.shiftId ?? event.shiftId,
      })),
    };
    const history = getStoredHistory();
    localStorage.setItem(
      HISTORY_KEY,
      JSON.stringify([record, ...history].slice(0, 20))
    );
    setSession(current => ({
      ...current,
      shiftId: record.shiftId,
      validatedAt: record.finishedAt,
    }));
    toast.success(
              balanced
        ? locale === "en" ? "Closing reconciled and saved to local history." : locale === "es" ? "Cierre conciliado y guardado en el historial local." : "Fechamento conciliado e registrado no histórico local."
        : locale === "en" ? `Closing validated with a ${localizedClosureStatus} of ${formatCurrency(Math.abs(difference))}.` : `Fechamento validado com ${closureStatus.toLowerCase()} de ${formatCurrency(Math.abs(difference))}.`

    );
  }

  function handleValidateClosure() {
    setIsValidating(true);
    window.setTimeout(() => {
      validateClosure();
      setIsValidating(false);
    }, 180);
  }

  function handlePrintReceipt() {
    setIsPrinting(true);
    window.setTimeout(() => {
      window.print();
      setIsPrinting(false);
    }, 80);
  }
  return (
    <>
      <AppShell title={locale === "en" ? "Closing validation" : locale === "es" ? "Validación del cierre" : "Validação do fechamento"} currentStep={4}>
        <section className="glass-panel validation-panel">
          <div className="validation-heading">
            <span
              className={`validation-icon ${balanced ? "balanced" : difference > 0 ? "positive" : "negative"}`}
            >
              {balanced ? (
                <CheckCircle2 size={35} />
              ) : (
                <ClipboardCheck size={35} />
              )}
            </span>
            <div>
              <span>{locale === "en" ? "Step 03" : locale === "es" ? "Etapa 03" : "Etapa 03"}</span>
              <h2>
                {balanced
                  ? locale === "en" ? "Cash drawer reconciled" : locale === "es" ? "Caja conciliada" : "Caixa conciliado"
                  : difference > 0
                    ? locale === "en" ? "Closing with surplus" : locale === "es" ? "Cierre con sobrante" : "Fechamento com sobra"
                    : locale === "en" ? "Closing with shortage" : locale === "es" ? "Cierre con faltante" : "Fechamento com falta"}
              </h2>
              <p>
                {balanced
                  ? localize(locale, "The counted amounts match the expected total for this shift.", "Los importes contados coinciden con el total esperado para este turno.", "Os valores encontrados correspondem ao total esperado para este turno.")
                  : localize(locale, "The discrepancy will be recorded in history and on the receipt. You can complete the closing normally.", "La diferencia se registrará en el historial y en el comprobante. Puedes completar el cierre normalmente.", "A quebra será registrada no histórico e no comprovante. Você pode concluir o fechamento normalmente.")}
              </p>
            </div>
          </div>
          <div className="validation-totals">
            <article>
              <span>{locale === "en" ? "Expected at closing" : locale === "es" ? "Esperado al cerrar" : "Esperado no fechamento"}</span>
              <strong>{formatCurrency(totalExpected)}</strong>
            </article>
            <article>
              <span>{locale === "en" ? "Counted at reconciliation" : locale === "es" ? "Contado en la conciliación" : "Encontrado na conferência"}</span>
              <strong>{formatCurrency(totalFound)}</strong>
            </article>
            <article
              className={
                balanced ? "balanced" : difference > 0 ? "positive" : "negative"
              }
            >
              <span>{locale === "en" ? "Overall difference" : locale === "es" ? "Diferencia general" : "Divergência geral"}</span>
              <strong>
                {difference > 0 ? "+" : ""}
                {formatCurrency(difference)}
              </strong>
            </article>
          </div>
          <div className="variation-table">
            <div className="variation-head">
              <span>{locale === "en" ? "Method" : locale === "es" ? "Modalidad" : "Modalidade"}</span>
              <span>{locale === "en" ? "Expected" : locale === "es" ? "Esperado" : "Esperado"}</span>
              <span>{locale === "en" ? "Counted" : locale === "es" ? "Contado" : "Conferido"}</span>
              <span>{locale === "en" ? "Difference" : locale === "es" ? "Diferencia" : "Diferença"}</span>
            </div>
            {variations.map(item => (
              <div className="variation-row" key={item.method}>
                <span>
                  <i
                    className={
                      Math.abs(item.difference) < 0.005
                        ? "ok"
                        : item.difference > 0
                          ? "up"
                          : "down"
                    }
                  />
                  {item.label}
                </span>
                <strong>{formatCurrency(item.expected)}</strong>
                <strong>{formatCurrency(item.found)}</strong>
                <strong
                  className={
                    Math.abs(item.difference) < 0.005
                      ? "balanced"
                      : item.difference > 0
                        ? "positive"
                        : "negative"
                  }
                >
                  {item.difference > 0 ? "+" : ""}
                  {formatCurrency(item.difference)}
                </strong>
              </div>
            ))}
          </div>
          {session.adjustments.length > 0 && (
            <section className="adjustment-review">
              <div className="adjustment-note">
                <ReceiptText size={18} />
                <span>
                  <strong>{localize(locale, "Movements included in physical cash:", "Movimientos incluidos en el efectivo físico:", "Lançamentos considerados no dinheiro físico:")}</strong>{" "}
                  {localize(locale, `withdrawals of ${formatCurrency(adjustmentTotals.withdrawal)} and supplies of ${formatCurrency(adjustmentTotals.supply)}.`, `retiros de ${formatCurrency(adjustmentTotals.withdrawal)} e ingresos de ${formatCurrency(adjustmentTotals.supply)}.`, `sangrias de ${formatCurrency(adjustmentTotals.withdrawal)} e suprimentos de ${formatCurrency(adjustmentTotals.supply)}.`)}
                </span>
              </div>
              <div className="adjustment-review-list">
                {session.adjustments.map(entry => (
                  <div key={entry.id}>
                    <time>{formatShortTime(entry.createdAt)}</time>
                    <span>
                      {entry.type === "withdrawal" ? localize(locale, "Withdrawal", "Retiro", "Sangria") : localize(locale, "Supply", "Ingreso", "Suprimento")}
                      {entry.note ? ` · ${entry.note}` : ""}
                    </span>
                    <strong
                      className={
                        entry.type === "withdrawal" ? "negative" : "positive"
                      }
                    >
                      {entry.type === "withdrawal" ? "−" : "+"}
                      {formatCurrency(entry.amount)}
                    </strong>
                  </div>
                ))}
              </div>
            </section>
          )}
          {!balanced && (
            <label className="closure-note">
              <span>
                {localize(locale, "Notes about the discrepancy", "Observaciones sobre la diferencia", "Observação sobre a quebra")} <b>{localize(locale, "recommended", "recomendado", "recomendado")}</b>
              </span>
              <textarea
                value={session.closureNote}
                onChange={event =>
                  setSession(current => ({
                    ...current,
                    closureNote: event.target.value,
                  }))
                }
                rows={3}
                placeholder={localize(locale, "E.g.: difference identified while counting coins or checking the card acquirer.", "Ej.: diferencia identificada al contar monedas o verificar la operadora de tarjetas.", "Ex.: diferença identificada na conferência de moedas ou na operadora de cartão.")}
              />
            </label>
          )}
          {session.validatedAt ? (
            <div className="validated-banner">
              <CheckCircle2 size={22} />
              <div>
                <strong>
                  {locale === "en" ? "Closing validated " : locale === "es" ? "Cierre validado " : "Fechamento validado "}
                  {balanced
                    ? localize(locale, "with no discrepancy", "sin diferencia", "sem quebra")
                    : locale === "en" ? `with ${localizedClosureStatus}` : locale === "es" ? `con ${localizedClosureStatus}` : `com ${closureStatus.toLowerCase()}`}
                  .
                </strong>
                <span>
                  {localize(locale, "Record saved to local history at ", "Registro guardado en el historial local el ", "Registro salvo no histórico local em ")}
                  {new Intl.DateTimeFormat(locale === "en" ? "en-US" : locale === "es" ? "es-ES" : "pt-BR", {
                    dateStyle: "short",
                    timeStyle: "short",
                  }).format(new Date(session.validatedAt))}
                  .
                </span>
              </div>
            </div>
          ) : isPrintPreview ? (
            <div className="validated-banner">
              <CheckCircle2 size={22} />
              <div>
                <strong>{locale === "en" ? "Thermal receipt preview." : locale === "es" ? "Vista previa del comprobante térmico." : "Prévia do comprovante térmico."}</strong>
                <span>
                  {localize(locale, "The print action appears here after validating a closing.", "La acción de impresión aparece aquí después de validar un cierre.", "A ação de impressão aparece aqui após validar um fechamento.")}
                </span>
              </div>
            </div>
          ) : null}
          <div className="flow-actions closure-actions">
            <Link href="/contagem" className="pixbee-text-button">
              <ArrowLeft size={17} /> {localize(locale, "Adjust count", "Ajustar conteo", "Ajustar contagem")}
            </Link>
            <div>
              {canPrintReceipt ? (
                <Button
                  className="pixbee-print-button"
                  onClick={handlePrintReceipt}
                  disabled={isPrinting}
                >
                  {isPrinting ? (
                    <LoadingIndicator compact label={localize(locale, "Opening print dialog...", "Abriendo el diálogo de impresión...", "Abrindo impressão...")} />
                  ) : (
                    <>
                      <Printer size={18} /> {localize(locale, "Print receipt", "Imprimir comprobante", "Imprimir comprovante")}
                    </>
                  )}
                </Button>
              ) : null}
              {canPrintReceipt ? (
                <Button
                  className="pixbee-primary-button"
                  onClick={() => {
                    startNextSession(true);
                    navigate("/abertura");
                  }}
                >
                  {localize(locale, "Open new count", "Abrir nuevo conteo", "Abrir nova contagem")} <ArrowRight size={18} />
                </Button>
              ) : (
                <Button
                  className="pixbee-primary-button"
                  onClick={handleValidateClosure}
                  disabled={isValidating}
                >
                  {isValidating ? (
                    <LoadingIndicator compact label={localize(locale, "Saving closing...", "Guardando cierre...", "Registrando fechamento...")} />
                  ) : (
                    <>
                      <CheckCircle2 size={18} /> {locale === "en" ? "Validate " : locale === "es" ? "Validar " : "Validar "}
                      {balanced ? locale === "en" ? "closing" : locale === "es" ? "cierre" : "fechamento" : locale === "en" ? "with discrepancy" : locale === "es" ? "con diferencia" : "com quebra"}
                    </>
                  )}
                </Button>
              )}
            </div>
          </div>
        </section>
      </AppShell>
      <ThermalReceipt
        session={session}
        variations={variations}
        totalExpected={totalExpected}
        totalFound={totalFound}
        difference={difference}
        status={closureStatus}
        finishedAt={session.validatedAt}
      />
    </>
  );
}

function ThermalHistoryReport({ records }: { records: ShiftHistoryRecord[] }) {
  const { locale } = useLanguage();
  return (
    <article
      className="thermal-history-report"
      aria-label={locale === "en" ? "Thermal shift history report" : "Relatório térmico de histórico de turnos"}
    >
      <header className="thermal-header">
        <div className="thermal-mark">
          PIX<span>BEE</span>
        </div>
        <strong>{locale === "en" ? "LOCAL REPORT · 3 DAYS" : "RELATÓRIO LOCAL · 3 DIAS"}</strong>
        <small>{locale === "en" ? "Generated on" : "Gerado em"} {formatDateTime(new Date().toISOString(), locale)}</small>
      </header>
      <div className="thermal-rule solid" />
      {records.map(record => (
        <section className="thermal-history-shift" key={record.id}>
          <h3>{record.company}</h3>
          <div className="thermal-row">
            <span>{locale === "en" ? "Operator" : locale === "es" ? "Operador" : "Operador"}</span>
            <b>{record.operator}</b>
          </div>
          <div className="thermal-row">
            <span>{locale === "en" ? "Opening" : locale === "es" ? "Apertura" : "Abertura"}</span>
            <b>{formatDateTime(record.startedAt, locale)}</b>
          </div>
          <div className="thermal-row">
            <span>{locale === "en" ? "Closing" : locale === "es" ? "Cierre" : "Fechamento"}</span>
            <b>{formatDateTime(record.finishedAt, locale)}</b>
          </div>
          <div className="thermal-row">
            <span>{locale === "en" ? "Duration" : locale === "es" ? "Duración" : "Duração"}</span>
            <b>{formatShiftDuration(record.startedAt, record.finishedAt, locale)}</b>
          </div>
          <div className="thermal-row">
            <span>{locale === "en" ? "Expected" : locale === "es" ? "Esperado" : "Esperado"}</span>
            <b>{formatCurrency(record.totalExpected)}</b>
          </div>
          <div className="thermal-row">
            <span>{locale === "en" ? "Counted" : locale === "es" ? "Contado" : "Conferido"}</span>
            <b>{formatCurrency(record.totalFound)}</b>
          </div>
          <div className="thermal-row">
            <span>
              {record.status === "SEM QUEBRA"
                ? locale === "en" ? "No discrepancy" : "Sem quebra"
                : locale === "en" ? `Discrepancy — ${record.status === "SOBRA" ? "surplus" : "shortage"}` : `Quebra — ${record.status.toLowerCase()}`}
            </span>
            <b>
              {record.difference > 0 ? "+" : ""}
              {formatCurrency(record.difference)}
            </b>
          </div>
          {record.cashEntries.length > 0 && (
            <>
              <h3>{locale === "en" ? "CASH ENTRIES" : "ENTRADAS EM ESPÉCIE"}</h3>
              {record.cashEntries.map(entry => (
                <div className="thermal-row" key={entry.id}>
                  <div>
                    <span>
                      {locale === "en" ? "Cash entry" : locale === "es" ? "Entrada de efectivo" : "Entrada em dinheiro"} · {formatShortTime(entry.createdAt)}
                    </span>
                    <small>
                      {locale === "en" ? "Received" : "Recebido"} {formatCurrency(getGrossAmount(entry))}
                      {getChangeAmount(entry) > 0
                        ? ` · ${locale === "en" ? "change" : locale === "es" ? "cambio" : "troco"} ${formatCurrency(getChangeAmount(entry))}`
                        : locale === "en" ? " · no change" : " · sem troco"}
                    </small>
                  </div>
                  <b>{locale === "en" ? "Net +" : "Líquido +"} {formatCurrency(entry.amount)}</b>
                </div>
              ))}
              <div className="thermal-row">
                <span>{locale === "en" ? "Total cash entries" : locale === "es" ? "Total acumulado en efectivo" : "Total acumulado em espécie"}</span>
                <b>
                  {formatCurrency(sumCashEntries(record.cashEntries))}
                </b>
              </div>
            </>
          )}
          {record.adjustments.length > 0 && (
            <>
              <h3>{locale === "en" ? "MOVEMENTS" : "LANÇAMENTOS"}</h3>
              {record.adjustments.map(entry => (
                <div className="thermal-row" key={entry.id}>
                  <div>
                    <span>
                      {entry.type === "withdrawal" ? locale === "en" ? "Withdrawal" : "Sangria" : locale === "en" ? "Supply" : "Suprimento"} ·{" "}
                      {formatShortTime(entry.createdAt)}
                    </span>
                    <small>{entry.note || (locale === "en" ? "No description" : "Sem identificação")}</small>
                  </div>
                  <b>
                    {entry.type === "withdrawal" ? "−" : "+"}
                    {formatCurrency(entry.amount)}
                  </b>
                </div>
              ))}
            </>
          )}
          {record.auditTrail.length > 0 && (
            <>
              <h3>{locale === "en" ? "AUDIT TRAIL" : "AUDITORIA"}</h3>
              {record.auditTrail.map(event => (
                <div className="thermal-row" key={event.id}>
                  <div>
                    <span>
                      {formatShortTime(event.occurredAt)} ·{" "}
                      {formatAuditEvent(event, locale)}
                    </span>
                    <small>
                      {event.previous?.note ||
                        event.current?.note ||
                        "Sem identificação"}
                    </small>
                  </div>
                </div>
              ))}
            </>
          )}
          <div className="thermal-rule" />
        </section>
      ))}
      <footer>{locale === "en" ? "Local report · Single copy · PixBee FechaCaixa" : "Relatório local · Via única · PixBee FechaCaixa"}</footer>
    </article>
  );
}

export function HistoryPage() {
  const { locale } = useLanguage();
  const [records, setRecords] = useState<ShiftHistoryRecord[]>(() =>
    getStoredHistory()
  );
  const [selectedShift, setSelectedShift] = useState("all");
  const [retentionNoticeOpen, setRetentionNoticeOpen] = useState(() =>
    isHistoryExpired(getStoredHistory())
  );
  const [reportForPrint, setReportForPrint] = useState(false);
  const [awaitingPrintConfirmation, setAwaitingPrintConfirmation] =
    useState(false);
  const [clearAfterPrint, setClearAfterPrint] = useState(false);
  const [isExportingPdf, setIsExportingPdf] = useState(false);
  const [isPrintingReport, setIsPrintingReport] = useState(false);
  const filteredRecords =
    selectedShift === "all"
      ? records
      : records.filter(record => record.shiftId === selectedShift);
  const clearLocalHistory = () => {
    localStorage.removeItem(HISTORY_KEY);
    setRecords([]);
    setSelectedShift("all");
    setRetentionNoticeOpen(false);
    setAwaitingPrintConfirmation(false);
    toast.success(locale === "en" ? "Local history cleared after report generation." : locale === "es" ? "Historial local limpiado después de generar el informe." : "Histórico local limpo após a geração do relatório.");
  };
  const exportPdfReport = (clearAfterDownload = false) => {
    if (records.length === 0) {
      toast.error(localize(locale, "There are no shifts to export in this report.", "No hay turnos para exportar en este informe.", "Não há turnos para exportar neste relatório."));
      return;
    }
    setIsExportingPdf(true);
    window.setTimeout(() => {
      exportHistoryPdf(records, { locale });
      if (clearAfterDownload) clearLocalHistory();
      else toast.success(localize(locale, "PDF report exported for archiving.", "Informe PDF exportado para archivar.", "Relatório em PDF exportado para arquivamento."));
      setIsExportingPdf(false);
    }, 120);
  };
  const printReport = (requestClear = false) => {
    setIsPrintingReport(true);
    setClearAfterPrint(requestClear);
    setReportForPrint(true);
    window.setTimeout(() => window.print(), 80);
  };
  useEffect(() => {
    const afterPrint = () => {
      setReportForPrint(false);
      setIsPrintingReport(false);
      if (clearAfterPrint) setAwaitingPrintConfirmation(true);
      setClearAfterPrint(false);
    };
    window.addEventListener("afterprint", afterPrint);
    return () => window.removeEventListener("afterprint", afterPrint);
  }, [clearAfterPrint]);
  return (
    <>
      <AppShell title={locale === "en" ? "Shift history" : locale === "es" ? "Historial de turnos" : "Histórico de turnos"} currentStep={3}>
        <section className="history-page">
          <div className="glass-panel history-heading">
            <div>
              <span>{localize(locale, "Entry lookup", "Consulta de movimientos", "Consulta de lançamentos")}</span>
              <h2>
                {localize(locale, "Find every cash entry, withdrawal, and supply by the shift where it was recorded.", "Encuentra cada entrada de efectivo, retiro e ingreso por el turno en que fue registrado.", "Encontre cada entrada em espécie, sangria e suprimento pelo turno em que foram registrados.")}
              </h2>
              <p>
                {localize(locale, "Records remain available in this browser for up to three days; audit actions are retained only for the report and receipt.", "Los registros permanecen disponibles hasta tres días en este navegador; las acciones de auditoría se conservan solo para el informe y el comprobante.", "Os registros ficam disponíveis por até três dias neste navegador; as ações de auditoria seguem somente para o relatório e o canhoto.")}
              </p>
            </div>
            <div className="history-filter">
              <label>{localize(locale, "Filter by shift", "Filtrar por turno", "Filtrar por turno")}</label>
              <Select value={selectedShift} onValueChange={setSelectedShift}>
                <SelectTrigger>
                  <SelectValue placeholder={localize(locale, "Select a shift", "Selecciona un turno", "Selecione um turno")} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{localize(locale, "All shifts", "Todos los turnos", "Todos os turnos")}</SelectItem>
                  {records.map(record => (
                    <SelectItem value={record.shiftId} key={record.shiftId}>
                      {getShiftLabel(record, locale)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <div className="history-report-actions">
                <Button
                  type="button"
                  className="pixbee-print-button"
                  onClick={() => printReport(false)}
                  disabled={isPrintingReport}
                >
                  {isPrintingReport ? (
                    <LoadingIndicator compact label={localize(locale, "Opening print dialog...", "Abriendo el diálogo de impresión...", "Abrindo impressão...")} />
                  ) : (
                    <>
                      <Printer size={16} /> {localize(locale, "Print report", "Imprimir informe", "Imprimir relatório")}
                    </>
                  )}
                </Button>
                <Button
                  type="button"
                  className="history-download-button"
                  onClick={() => exportPdfReport(false)}
                  disabled={isExportingPdf}
                >
                  {isExportingPdf ? (
                    <LoadingIndicator compact label={localize(locale, "Generating PDF...", "Generando PDF...", "Gerando PDF...")} />
                  ) : (
                    <>
                      <Download size={16} /> {localize(locale, "Download PDF", "Descargar PDF", "Baixar PDF")}
                    </>
                  )}
                </Button>
              </div>
            </div>
          </div>
          {filteredRecords.length === 0 ? (
            <div className="glass-panel history-empty">
              <History size={30} />
              <div>
                <strong>{locale === "en" ? "No closed shifts in this filter." : locale === "es" ? "No hay turnos cerrados en este filtro." : "Nenhum turno fechado neste filtro."}</strong>
                <span>
                  {localize(locale, "Validate a closing to view entries and totals here.", "Valida un cierre para consultar aquí los movimientos y totales.", "Valide um fechamento para consultar os lançamentos e totais aqui.")}
                </span>
              </div>
              <Button
                className="pixbee-primary-button"
                onClick={() => window.location.assign("/abertura")}
              >
                {localize(locale, "Start count", "Iniciar conteo", "Iniciar contagem")} <ArrowRight size={17} />
              </Button>
            </div>
          ) : (
            <div className="history-record-list">
              {filteredRecords.map(record => (
                <article className="glass-panel history-record" key={record.id}>
                  <header>
                    <div>
                      <span>
                        {new Intl.DateTimeFormat(locale === "en" ? "en-US" : locale === "es" ? "es-ES" : "pt-BR", {
                          dateStyle: "long",
                          timeStyle: "short",
                        }).format(new Date(record.finishedAt))}
                      </span>
                      <h3>{record.company}</h3>
                      <p>
                        {localize(locale, "Operator:", "Operador:", "Operador:")} <strong>{record.operator}</strong>
                      </p>
                    </div>
                    <b
                      className={`history-status ${record.status === "SEM QUEBRA" ? "balanced" : record.status === "SOBRA" ? "positive" : "negative"}`}
                    >
                      {record.status === "SEM QUEBRA"
                        ? localize(locale, "No discrepancy", "Sin diferencia", "Sem quebra")
                        : `${record.status === "SOBRA" ? localize(locale, "Surplus", "Sobrante", "Sobra") : localize(locale, "Shortage", "Faltante", "Falta")} ${localize(locale, "of", "de", "de")} ${formatCurrency(Math.abs(record.difference))}`}
                    </b>
                  </header>
                  <div className="history-period">
                    <span>
                      {localize(locale, "Opening:", "Apertura:", "Abertura:")}{" "}
                      <strong>{formatDateTime(record.startedAt, locale)}</strong>
                    </span>
                    <span>
                      {locale === "en" ? "Closing:" : locale === "es" ? "Cierre:" : "Fechamento:"}{" "}
                      <strong>{formatDateTime(record.finishedAt, locale)}</strong>
                    </span>
                    <span>
                      {localize(locale, "Duration:", "Duración:", "Duração:")}{" "}
                      <strong>
                        {formatShiftDuration(
                          record.startedAt,
                          record.finishedAt,
                          locale
                        )}
                      </strong>
                    </span>
                  </div>
                  <div className="history-record-totals">
                    <div>
                      <span>{locale === "en" ? "Expected" : locale === "es" ? "Esperado" : "Esperado"}</span>
                      <strong>{formatCurrency(record.totalExpected)}</strong>
                    </div>
                    <div>
                      <span>{locale === "en" ? "Counted" : locale === "es" ? "Contado" : "Conferido"}</span>
                      <strong>{formatCurrency(record.totalFound)}</strong>
                    </div>
                    <div>
                      <span>{locale === "en" ? "Difference" : locale === "es" ? "Diferencia" : "Diferença"}</span>
                      <strong
                        className={
                          record.difference === 0
                            ? "balanced"
                            : record.difference > 0
                              ? "positive"
                              : "negative"
                        }
                      >
                        {record.difference > 0 ? "+" : ""}
                        {formatCurrency(record.difference)}
                      </strong>
                    </div>
                  </div>
                  <div className="history-adjustments">
                    <div className="history-adjustments-title">
                      <span>{locale === "en" ? "Cash entries" : locale === "es" ? "Entradas en efectivo" : "Entradas em espécie"}</span>
                      <small>
                        {record.cashEntries.length === 0
                          ? locale === "en" ? "No additional entries" : locale === "es" ? "No hay entradas adicionales" : "Nenhuma entrada adicional"
                          : locale === "en"
                            ? `${record.cashEntries.length} cash entr${record.cashEntries.length > 1 ? "ies" : "y"} · ${formatCurrency(sumCashEntries(record.cashEntries))}`
                            : locale === "es"
                              ? `${record.cashEntries.length} entrada${record.cashEntries.length > 1 ? "s" : ""} · ${formatCurrency(sumCashEntries(record.cashEntries))}`
                              : `${record.cashEntries.length} entrada${record.cashEntries.length > 1 ? "s" : ""} · ${formatCurrency(sumCashEntries(record.cashEntries))}`}
                      </small>
                    </div>
                    {record.cashEntries.length > 0 && (
                      <div className="history-adjustment-list">
                        {record.cashEntries.map(entry => (
                          <div key={entry.id}>
                            <time>{formatShortTime(entry.createdAt)}</time>
                            <span>
                              <strong>{locale === "en" ? "Cash entry" : locale === "es" ? "Entrada de efectivo" : "Entrada em dinheiro"}</strong>
                              <small>
                                {localize(locale, "Received", "Recibido", "Recebido")} {formatCurrency(getGrossAmount(entry))}
                                {getChangeAmount(entry) > 0
                                  ? ` · ${locale === "en" ? "change" : locale === "es" ? "cambio" : "troco"} ${formatCurrency(getChangeAmount(entry))}`
                                  : ` · ${localize(locale, "no change", "sin cambio", "sem troco")}`}
                              </small>
                            </span>
                            <b className="positive">{localize(locale, "Net +", "Neto +", "Líquido +")} {formatCurrency(entry.amount)}</b>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                  <div className="history-adjustments">
                    <div className="history-adjustments-title">
                      <span>{localize(locale, "Shift movements", "Movimientos del turno", "Lançamentos do turno")}</span>
                      <small>
                        {record.adjustments.length === 0
                          ? localize(locale, "No withdrawals or supplies", "Sin retiros ni ingresos", "Sem sangrias ou suprimentos")
                          : locale === "en"
                            ? `${record.adjustments.length} movement${record.adjustments.length > 1 ? "s" : ""}`
                            : locale === "es"
                              ? `${record.adjustments.length} movimiento${record.adjustments.length > 1 ? "s" : ""}`
                              : `${record.adjustments.length} registro${record.adjustments.length > 1 ? "s" : ""}`}
                      </small>
                    </div>
                    {record.adjustments.length > 0 && (
                      <div className="history-adjustment-list">
                        {record.adjustments.map(entry => (
                          <div key={entry.id}>
                            <time>{formatShortTime(entry.createdAt)}</time>
                            <span>
                              <strong>
                                {entry.type === "withdrawal"
                                  ? localize(locale, "Withdrawal", "Retiro", "Sangria")
                                  : localize(locale, "Supply", "Ingreso", "Suprimento")}
                              </strong>
                              <small>{entry.note || localize(locale, "No description", "Sin descripción", "Sem identificação")}</small>
                            </span>
                            <b
                              className={
                                entry.type === "withdrawal"
                                  ? "negative"
                                  : "positive"
                              }
                            >
                              {entry.type === "withdrawal" ? "−" : "+"}
                              {formatCurrency(entry.amount)}
                            </b>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </article>
              ))}
            </div>
          )}
        </section>
      </AppShell>
      {reportForPrint && <ThermalHistoryReport records={records} />}
      <AlertDialog
        open={retentionNoticeOpen}
        onOpenChange={setRetentionNoticeOpen}
      >
        <AlertDialogContent className="history-dialog retention-dialog">
          <AlertDialogHeader>
            <span className="retention-dialog-icon">
              <History size={22} />
            </span>
            <AlertDialogTitle>
              {localize(locale, "Your local history is ready for archiving", "Tu historial local está listo para archivar", "Seu histórico local está pronto para arquivamento")}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {localize(locale, "Some records are more than three days old. Print or export the PDF now; afterward, PixBee can safely clear only this machine's cache.", "Algunos registros tienen más de tres días. Imprime o exporta el PDF ahora; después, PixBee podrá borrar de forma segura solo la caché de este dispositivo.", "Há registros com mais de três dias. Imprima ou exporte o PDF agora; depois, o PixBee poderá limpar somente o cache desta máquina com segurança.")}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="retention-dialog-note">
            <strong>{localize(locale, "What will be preserved in the report", "Qué se conservará en el informe", "O que será preservado no relatório")}</strong>
            <span>
              {locale === "en" ? "Shifts, times, entries, and audit reasons." : locale === "es" ? "Turnos, horarios, movimientos y motivos de auditoría." : "Turnos, horários, lançamentos e justificativas de auditoria."}
            </span>
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel>{localize(locale, "Clear later", "Limpiar después", "Limpar depois")}</AlertDialogCancel>
            <Button
              type="button"
              variant="outline"
              className="retention-pdf-button"
              disabled={isExportingPdf}
              onClick={() => {
                setRetentionNoticeOpen(false);
                exportPdfReport(true);
              }}
            >
              {isExportingPdf ? (
                                    <LoadingIndicator compact label={localize(locale, "Generating PDF...", "Generando PDF...", "Gerando PDF...")} />

              ) : (
                <>
                  <Download size={16} /> {localize(locale, "Download PDF and clear", "Descargar PDF y limpiar", "Baixar PDF e limpar")}
                </>
              )}
            </Button>
            <AlertDialogAction
              className="retention-print-button"
              disabled={isPrintingReport}
              onClick={() => {
                setRetentionNoticeOpen(false);
                printReport(true);
              }}
            >
              {isPrintingReport ? (
                                    <LoadingIndicator compact label={localize(locale, "Opening print dialog...", "Abriendo el diálogo de impresión...", "Abrindo impressão...")} />

              ) : (
                <>
                  <Printer size={16} /> {localize(locale, "Print report", "Imprimir informe", "Imprimir relatório")}
                </>
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      <AlertDialog
        open={awaitingPrintConfirmation}
        onOpenChange={setAwaitingPrintConfirmation}
      >
        <AlertDialogContent className="history-dialog">
          <AlertDialogHeader>
            <AlertDialogTitle>
              {localize(locale, "Confirm report printing?", "¿Confirmas la impresión del informe?", "Confirma a impressão do relatório?")}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {localize(locale, "Confirm only after printing the report. This confirmation clears the expired local history from this machine.", "Confirma solo después de imprimir el informe. Esta confirmación limpia el historial local vencido de este dispositivo.", "Confirme somente após imprimir o relatório. Esta confirmação limpa o histórico local vencido desta máquina.")}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{localize(locale, "Keep history", "Conservar historial", "Manter histórico")}</AlertDialogCancel>
            <AlertDialogAction
              className="history-delete-confirm"
              onClick={clearLocalHistory}
            >
              {locale === "en" ? "Confirm and clear" : locale === "es" ? "Confirmar y limpiar" : "Confirmar e limpar"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

function CreatorAboutPage() {
  const { locale } = useLanguage();
  const [pixCopied, setPixCopied] = useState(false);
  const pixKey = "51.063.137/0001-26";
  async function copyPixKey() {
    try {
      await navigator.clipboard.writeText(pixKey);
      setPixCopied(true);
      toast.success(locale === "en" ? "Pix key copied. Thank you for your support!" : "Chave Pix copiada. Obrigada pelo apoio!");
    } catch {
      toast.message(locale === "en" ? `Pix key: ${pixKey}` : `Chave Pix: ${pixKey}`);
    }
  }
  return (
    <AppShell title={localize(locale, "About PixBee", "Sobre PixBee", "Sobre o PixBee")} currentStep={1}>
    <section className="creator-about-page">
        <article className="glass-panel creator-profile">
          <div className="creator-photo-frame">
            <img
              src="/assets/khaleesi-saithe-profile.webp"
              alt={localize(locale, "Khaleesi Saithe, creator of PixBee FechaCaixa", "Khaleesi Saithe, creadora de PixBee FechaCaixa", "Khaleesi Saithe, criadora do PixBee FechaCaixa")}
            />
          </div>
          <div className="creator-profile-copy">
            <span className="panel-tag">{localize(locale, "Behind the project", "Detrás del proyecto", "Por trás do projeto")}</span>
            <p className="creator-kicker">KHALEESI SAITHE</p>
            <h2>{localize(locale, "Turning operational experience into useful tools.", "Transformando la experiencia operativa en herramientas útiles.", "Transformando experiência de operação em ferramentas úteis.")}</h2>
            <p>
              {localize(locale, "Moving from operations and retail into Data Science, Khaleesi studies at Estácio de Sá and creates products born from real problems faced by people who work with customer service and cash reconciliation.", "En transición desde operaciones y comercio minorista hacia la Ciencia de Datos, Khaleesi estudia en Estácio de Sá y crea productos nacidos de problemas reales de quienes trabajan con atención al cliente y conciliación de caja.", "Em transição de operações e varejo para a Ciência de Dados, Khaleesi cursa Estácio de Sá e cria produtos que nascem de problemas reais de quem trabalha com atendimento e conferência de caixa.")}
            </p>
            <p>
              {locale === "en" ? <>Projects include <strong>PDFToolkit</strong>, for PDF sales reports, and <strong>PixBee/ContaCaixa</strong>, designed to make daily cash closing easier.</> : locale === "es" ? <>Entre los proyectos se encuentran <strong>PDFToolkit</strong>, para informes de ventas en PDF, y <strong>PixBee/ContaCaixa</strong>, pensado para facilitar el cierre diario de caja.</> : <>Entre os projetos estão o <strong>PDFToolkit</strong>, para relatórios de vendas em PDF, e o <strong>PixBee/ContaCaixa</strong>, pensado para facilitar o fechamento de caixa no dia a dia.</>}
            </p>
          </div>
        </article>
        <aside className="glass-panel creator-connect">
          <div className="creator-connect-intro">
            <span>{localize(locale, "Let's connect", "Conectemos", "Vamos nos conectar")}</span>
            <h2>{localize(locale, "Follow the projects and the creative journey.", "Sigue los proyectos y el recorrido creativo.", "Acompanhe os projetos e a jornada de criação.")}</h2>
            <p>
              {localize(locale, "This page brings together the creator's professional channels.", "Esta página reúne los canales profesionales de la creadora de PixBee.", "Esta página reúne os canais profissionais da criadora do PixBee.")}
            </p>
          </div>
          <div className="creator-link-list">
            <a
              href="https://khaleesi-portifolio.vercel.app/"
              target="_blank"
              rel="noreferrer"
            >
              <span>
                <Store size={20} />
              </span>
              <div>
                <strong>{localize(locale, "Portfolio", "Portafolio", "Portfólio")}</strong>
                <small>khaleesi-portifolio.vercel.app</small>
              </div>
              <ArrowRight size={18} />
            </a>
            <a
              href="https://www.linkedin.com/in/khaleesisaithen"
              target="_blank"
              rel="noreferrer"
            >
              <span>
                <UserRound size={20} />
              </span>
              <div>
                <strong>LinkedIn</strong>
                <small>linkedin.com/in/khaleesisaithen</small>
              </div>
              <ArrowRight size={18} />
            </a>
            <a
              href="https://github.com/khaleesisaithe"
              target="_blank"
              rel="noreferrer"
            >
              <span>
                <Settings size={20} />
              </span>
              <div>
                <strong>GitHub</strong>
                <small>github.com/khaleesisaithe</small>
              </div>
              <ArrowRight size={18} />
            </a>
          </div>
          <section className="pix-support-card">
            <div>
              <span className="pix-support-label">{localize(locale, "SUPPORT THE PROJECT", "APOYA EL PROYECTO", "APOIE O PROJETO")}</span>
                              <strong>{localize(locale, "Support via Pix", "Contribución vía PIX", "Contribuição via Pix")}</strong>

              <small>
                {localize(locale, "If PixBee is useful to you, any support helps keep the project evolving.", "Si PixBee te resulta útil, cualquier apoyo ayuda a mantener la evolución del proyecto.", "Se o PixBee for útil para você, qualquer apoio ajuda a manter a evolução do projeto.")}
              </small>
            </div>
            <div className="pix-key">
              <span>{localize(locale, "Pix key", "Clave PIX", "Chave Pix")}</span>
              <b>{pixKey}</b>
            </div>
            <Button
              type="button"
              className="pix-copy-button"
              onClick={copyPixKey}
            >
              {pixCopied ? (
                <CheckCircle2 size={17} />
              ) : (
                <ReceiptText size={17} />
              )}
              {pixCopied ? localize(locale, "Key copied", "Clave copiada", "Chave copiada") : localize(locale, "Copy Pix key", "Copiar clave PIX", "Copiar chave Pix")}
            </Button>
          </section>
        </aside>
        <AdSenseSlot
          slot={adsenseSettings.aboutSlot}
          publicRoute="/sobre"
          label={localize(locale, "Advertisement", "Publicidad", "Publicidade")}
        />
      </section>
    </AppShell>
  );
}

function AboutPage() {
  const { locale } = useLanguage();
  const contactItems = [
    { label: locale === "en" ? "Portfolio" : "Portfólio", detail: locale === "en" ? "Your portfolio link" : "Link do seu portfólio", icon: Store },
    { label: "LinkedIn", detail: locale === "en" ? "Professional profile" : "Perfil profissional", icon: UserRound },
    { label: "GitHub", detail: locale === "en" ? "Projects and code" : "Projetos e código", icon: Settings },
    {
      label: locale === "en" ? "Contribute" : "Contribuir",
      detail: locale === "en" ? "Support this project" : "Apoie este projeto",
      icon: CircleDollarSign,
    },
  ];
  return (
    <AppShell title={locale === "en" ? "About PixBee" : "Sobre o PixBee"} currentStep={1}>
      <section className="about-page">
        <article className="glass-panel about-intro">
          <span className="panel-tag">{locale === "en" ? "Behind the project" : "Por trás do projeto"}</span>
          <div className="creator-avatar">
            <UserRound size={46} />
          </div>
          <h2>
            {locale === "en" ? "This space belongs to someone turning learning into a product." : "Este espaço é de quem está transformando aprendizado em produto."}
          </h2>
          <p>
            {locale === "en" ? "PixBee FechaCaixa began as an applied study project: a way to learn programming by creating a useful tool for real operations." : "O PixBee FechaCaixa nasceu como um projeto de estudo aplicado: uma forma de aprender programação criando uma ferramenta útil para operações reais."}
          </p>
          <div className="about-placeholder">
            <strong>{locale === "en" ? "Your name here" : "Seu nome aqui"}</strong>
            <span>{locale === "en" ? "PixBee FechaCaixa creator" : "Criador do PixBee FechaCaixa"}</span>
            <small>
              {locale === "en" ? "Send your photo, a short introduction, and your links to personalize this profile." : "Envie sua foto, uma breve apresentação e seus links para personalizar este perfil."}
            </small>
          </div>
        </article>
        <article className="glass-panel about-connect">
                        <div>
                <span>{locale === "en" ? "Connect" : "Conecte-se"}</span>
                <h2>{locale === "en" ? "Meet the creator and follow the project's progress." : "Conheça o criador e acompanhe a evolução do projeto."}</h2>
                <p>
                  {locale === "en" ? "The shortcuts below are ready for your official links." : "Os atalhos abaixo estão estruturados para receber seus links oficiais."}
                </p>

          </div>
          <div className="about-link-list">
            {contactItems.map(item => {
              const Icon = item.icon;
              return (
                <button
                  type="button"
                  key={item.label}
                  onClick={() =>
                    toast.message(
                      locale === "en" ? `The ${item.label} link will be activated when the creator's details are added.` : `O link de ${item.label} será ativado quando os dados do criador forem adicionados.`
                    )
                  }
                >
                  <span>
                    <Icon size={20} />
                  </span>
                  <div>
                    <strong>{item.label}</strong>
                    <small>{item.detail}</small>
                  </div>
                  <ArrowRight size={18} />
                </button>
              );
            })}
          </div>
        </article>
      </section>
    </AppShell>
  );
}

function LegalPage() {
  const { locale } = useLanguage();
  return (
    <AppShell title={localize(locale, "Privacy and rights", "Privacidad y derechos", "Privacidade e direitos")} currentStep={1}>
      <section className="legal-page">
        <header className="glass-panel legal-hero">
          <span className="panel-tag">{localize(locale, "PixBee transparency", "Transparencia de PixBee", "Transparência do PixBee")}</span>
          <h2>
            {localize(locale, "Cash data stays in your browser. The rules of use remain visible.", "Los datos de caja permanecen en tu navegador. Las reglas de uso siguen visibles.", "Dados do caixa ficam no seu navegador. As regras de uso ficam visíveis.")}
          </h2>
          <p>
            {localize(locale, "This page explains how the current version of PixBee FechaCaixa handles shift information, the operator's responsibilities, and the declared rights over the software.", "Esta página explica cómo la versión actual de PixBee FechaCaixa trata la información del turno, las responsabilidades de la persona operadora y los derechos declarados sobre el software.", "Esta página explica como a versão atual do PixBee FechaCaixa trata as informações do turno, quais são as responsabilidades do operador e como os direitos sobre o software são declarados.")}
          </p>
          <p className="legal-updated">{localize(locale, "Updated on August 21, 2026", "Actualizado el 21 de agosto de 2026", "Atualizado em 21 de agosto de 2026")}</p>
        </header>
        <div className="legal-grid">
          <article className="glass-panel legal-card">
            <span>{localize(locale, "01 · PRIVACY", "01 · PRIVACIDAD", "01 · PRIVACIDADE")}</span>
            <h3>{localize(locale, "What is stored", "Qué se almacena", "O que é guardado")}</h3>
            <p>
              {localize(locale, "PixBee may store the operator's name, company, opening and counted amounts, withdrawals and supplies, times, notes, audit reasons, and shift history in the browser.", "PixBee puede almacenar en el navegador el nombre de la persona operadora, la empresa, los importes de apertura y conteo, retiros e ingresos, horarios, observaciones, motivos de auditoría y el historial de turnos.", "O PixBee pode armazenar no navegador o nome do operador, a empresa, os valores de abertura e conferência, os lançamentos de sangria e suprimento, horários, observações, justificativas de auditoria e o histórico de turnos.")}
            </p>
            <p>
              {localize(locale, "This data is used only to calculate, review, print, and export the cash closing on the device where it was entered.", "Estos datos se usan solo para calcular, revisar, imprimir y exportar el cierre de caja en el dispositivo donde se registraron.", "Esses dados são usados apenas para calcular, revisar, imprimir e exportar o fechamento de caixa no dispositivo em que foram lançados.")}
            </p>
          </article>
          <article className="glass-panel legal-card">
            <span>{localize(locale, "02 · STORAGE", "02 · ALMACENAMIENTO", "02 · ARMAZENAMENTO")}</span>
            <h3>{localize(locale, "Where data stays", "Dónde permanecen los datos", "Onde ficam os dados")}</h3>
            <p>
              {localize(locale, "In this version, operational data stays in the browser's local storage. Shift history remains available for up to three days unless the operator removes it sooner.", "En esta versión, los datos operativos permanecen en el almacenamiento local del navegador. El historial de turnos está disponible hasta tres días, salvo que la persona operadora lo elimine antes.", "Nesta versão, os dados operacionais ficam no armazenamento local do navegador. O histórico de turnos permanece disponível por até três dias, salvo quando o próprio operador o remove antes disso.")}
            </p>
            <p>
              {localize(locale, "PixBee does not send local financial history to a system-owned database. Clearing browser data or using another device may remove or separate these records.", "PixBee no envía el historial financiero local a una base de datos propia del sistema. Borrar los datos del navegador o usar otro dispositivo puede eliminar o separar estos registros.", "O PixBee não envia o histórico financeiro local para uma base de dados própria do sistema. Limpar os dados do navegador ou usar outro dispositivo pode remover ou separar esses registros.")}
            </p>
          </article>
          <article className="glass-panel legal-card">
            <span>{localize(locale, "03 · SECURITY", "03 · SEGURIDAD", "03 · SEGURANÇA")}</span>
            <h3>{localize(locale, "Operator precautions", "Precauciones de la persona operadora", "Cuidados do operador")}</h3>
            <p>
              {localize(locale, "On a shared computer, finish the shift, export or print the required report, and remove the history when you finish. Protect the device and browser profile with a password.", "En un equipo compartido, finaliza el turno, exporta o imprime el informe necesario y elimina el historial al terminar. Protege el dispositivo y el perfil del navegador con una contraseña.", "Em computador compartilhado, finalize o turno, exporte ou imprima o relatório necessário e remova o histórico ao encerrar o uso. Proteja o dispositivo e o perfil do navegador com senha.")}
            </p>
            <p>
              {localize(locale, "Local storage reduces data circulation, but it does not replace internal policies, access controls, or security procedures of the company using the system.", "El almacenamiento local reduce la circulación de datos, pero no sustituye las políticas internas, los controles de acceso ni los procedimientos de seguridad de la empresa usuaria.", "O armazenamento local reduz a circulação dos dados, mas não substitui políticas internas, controles de acesso ou procedimentos de segurança da empresa usuária.")}
            </p>
          </article>
          <article className="glass-panel legal-card">
            <span>{localize(locale, "04 · YOUR CONTROLS", "04 · TUS CONTROLES", "04 · SEUS CONTROLES")}</span>
            <h3>{localize(locale, "Access, correction, and deletion", "Acceso, corrección y eliminación", "Acesso, correção e exclusão")}</h3>
            <p>
              {localize(locale, "The operator can review local history, edit entries with a recorded reason, and remove device data through PixBee history or browser settings. Deleted entries remain recorded in the shift audit trail while the history exists.", "La persona operadora puede revisar el historial local, editar movimientos con un motivo registrado y eliminar los datos del dispositivo mediante el historial de PixBee o la configuración del navegador. Los movimientos eliminados permanecen registrados en la auditoría del turno mientras exista el historial.", "O operador pode revisar o histórico local, editar lançamentos com justificativa registrada e remover os dados do dispositivo pelo histórico do PixBee ou pelas configurações do navegador. A exclusão de lançamentos continua registrada na trilha de auditoria do turno enquanto o histórico existir.")}
            </p>
          </article>
          <article className="glass-panel legal-card">
            <span>{localize(locale, "05 · COPYRIGHT", "05 · DERECHOS DE AUTOR", "05 · DIREITOS AUTORAIS")}</span>
            <h3>PixBee FechaCaixa</h3>
            <p>
              {localize(locale, "© 2026 Khaleesi Saithe. All rights to the original code, visual identity, text, interface structure, and PixBee materials are reserved, except where an express license states otherwise.", "© 2026 Khaleesi Saithe. Todos los derechos sobre el código original, la identidad visual, los textos, la estructura de interfaz y los materiales de PixBee están reservados, salvo que una licencia expresa indique lo contrario.", "© 2026 Khaleesi Saithe. Todos os direitos sobre o código original, identidade visual, textos, estrutura de interface e materiais do PixBee são reservados, exceto onde houver licença expressa em contrário.")}
            </p>
            <p>
              {localize(locale, "Third-party libraries and assets used by the project remain subject to their respective licenses. Commercial reproduction, redistribution, or creation of a derivative product from the original code is not authorized without the rights holder's written permission.", "Las bibliotecas y los recursos de terceros utilizados por el proyecto siguen sujetos a sus respectivas licencias. No se autoriza la reproducción comercial, redistribución ni creación de productos derivados del código original sin autorización escrita de la titular de los derechos.", "Bibliotecas e ativos de terceiros usados pelo projeto permanecem sujeitos às respectivas licenças. Não é autorizada a reprodução comercial, redistribuição ou criação de produto derivado do código original sem autorização escrita da titular.")}
            </p>
          </article>
          <article className="glass-panel legal-card legal-contact">
            <span>{localize(locale, "06 · CONTACT AND UPDATES", "06 · CONTACTO Y ACTUALIZACIONES", "06 · CONTATO E ATUALIZAÇÕES")}</span>
            <h3>{localize(locale, "Questions or requests", "Preguntas o solicitudes", "Dúvidas ou pedidos")}</h3>
            <p>
              {localize(locale, "For questions about this policy, use of the project, or authorship rights, contact the creator through her professional profile. If PixBee starts using accounts, a database, payments, or an external register integration, this page must be reviewed before activation.", "Para preguntas sobre esta política, el uso del proyecto o los derechos de autoría, contacta a la creadora a través de su perfil profesional. Si PixBee comienza a usar cuentas, una base de datos, pagos o una integración externa de caja, esta página deberá revisarse antes de activarse.", "Para dúvidas sobre esta política, uso do projeto ou direitos de autoria, entre em contato pelo perfil profissional da criadora. Quando o PixBee passar a usar cadastro, banco de dados, pagamentos ou integração com caixa externo, esta página deverá ser revisada antes da ativação.")}
            </p>
            <a
              href="https://github.com/khaleesisaithe"
              target="_blank"
              rel="noreferrer"
            >
              {localize(locale, "Contact Khaleesi Saithe", "Contactar a Khaleesi Saithe", "Falar com Khaleesi Saithe")} <ArrowRight size={16} />
            </a>
          </article>
          <article className="glass-panel legal-card">
            <span>{localize(locale, "07 · CUSTOMER FEEDBACK", "07 · EXPERIENCIA DEL CLIENTE", "07 · EXPERIÊNCIA DO CLIENTE")}</span>
            <h3>{localize(locale, "Reports sent through the form", "Mensajes enviados mediante el formulario", "Relatos enviados pelo formulário")}</h3>
            <p>
              {localize(locale, "Submission is optional. When someone fills out the experience form, PixBee forwards a contact email, profile, company, tax ID, report, and suggestion through the hosted service", "El envío es opcional. Cuando una persona completa el formulario de experiencia, PixBee envía correo de contacto, perfil, empresa, identificación fiscal, relato y sugerencia mediante el servicio alojado", "O envio é opcional. Quando a pessoa preenche o formulário de experiência, o PixBee encaminha e-mail de contato, perfil, empresa, CNPJ, relato e sugestão pelo serviço hospedado")}
              {" "}
              <a
                href="https://formspree.io/legal/privacy-policy/"
                target="_blank"
                rel="noreferrer"
              >
                Formspree
              </a>
              {" "}
              {localize(locale, "so the creator can reply and evaluate improvements to the system.", "para que la creadora pueda responder y evaluar mejoras del sistema.", "para a criadora responder e avaliar melhorias no sistema.")}
            </p>
            <p>
              {localize(locale, "This data is not mixed with the local financial history of the drawer. Do not send passwords, card details, Pix keys, or other payment information through the form; submissions are subject to the hosted service's privacy policy.", "Estos datos no se mezclan con el historial financiero local de la caja. No envíes contraseñas, datos de tarjeta, claves PIX u otra información de pago mediante el formulario; los envíos están sujetos a la política de privacidad del servicio alojado.", "Esses dados não se misturam ao histórico financeiro local do caixa. Não envie senhas, dados de cartão, chaves Pix ou outras informações de pagamento pelo formulário; o envio fica sujeito à política de privacidade do serviço hospedado.")}
            </p>
          </article>
          <article className="glass-panel legal-card">
            <span>{localize(locale, "08 · ADVERTISING", "08 · PUBLICIDAD", "08 · PUBLICIDADE")}</span>
            <h3>{localize(locale, "Optional advertising", "Publicidad opcional", "Publicidade opcional")}</h3>
            <p>
              {localize(locale, "Google AdSense is prepared as an optional monetization feature and remains disabled until the site is approved and the publisher configuration is completed. No advertising script is loaded in the cash opening, counting, validation, or history flows.", "Google AdSense está preparado como un recurso de monetización opcional y permanece desactivado hasta que el sitio sea aprobado y se complete la configuración de la cuenta editora. No se carga ningún script publicitario en los flujos de apertura, conteo, validación o historial de caja.", "O Google AdSense está preparado como recurso opcional de monetização e permanece desativado até a aprovação do site e a conclusão da configuração do editor. Nenhum script de publicidade é carregado nos fluxos de abertura, contagem, validação ou histórico do caixa.")}
            </p>
            <p>
              {localize(locale, "If advertising is enabled later, ads will be limited to public institutional areas and handled under Google's policies and the applicable privacy and consent requirements.", "Si la publicidad se activa en el futuro, los anuncios se limitarán a áreas públicas institucionales y se gestionarán de acuerdo con las políticas de Google y los requisitos aplicables de privacidad y consentimiento.", "Se a publicidade for ativada futuramente, os anúncios ficarão limitados às áreas públicas institucionais e serão tratados conforme as políticas do Google e os requisitos aplicáveis de privacidade e consentimento.")}
            </p>
          </article>
        </div>
        <aside className="glass-panel legal-note">
          <strong>{localize(locale, "Important", "Importante", "Importante")}</strong>
          <p>
            {localize(locale, "This content describes the current local version of PixBee and serves as a transparency baseline. For commercial use, remote data collection, or integration with third-party systems, review the documents with specialized legal guidance.", "Este contenido describe la versión local actual de PixBee y sirve como base de transparencia. Para uso comercial, recopilación remota de datos o integración con sistemas de terceros, revisa los documentos con asesoramiento jurídico especializado.", "Este conteúdo descreve a versão local atual do PixBee e é uma base de transparência. Para uso comercial, coleta remota de dados ou integração com sistemas de terceiros, revise os documentos com orientação jurídica especializada.")}
          </p>
          <div>
            <a
              href="https://www.planalto.gov.br/ccivil_03/_ato2015-2018/2018/lei/l13709.htm"
              target="_blank"
              rel="noreferrer"
            >
              {localize(locale, "LGPD — Law No. 13,709/2018", "LGPD — Ley n.º 13.709/2018", "LGPD — Lei nº 13.709/2018")}
            </a>
            <a
              href="https://www.planalto.gov.br/ccivil_03/leis/l9609.htm"
              target="_blank"
              rel="noreferrer"
            >
              {localize(locale, "Software Law — Law No. 9,609/1998", "Ley de Software — Ley n.º 9.609/1998", "Lei do Software — Lei nº 9.609/1998")}
            </a>
          </div>
        </aside>
        <AdSenseSlot
          slot={adsenseSettings.privacySlot}
          publicRoute="/privacidade"
          label={localize(locale, "Advertisement", "Publicidad", "Publicidade")}
        />
      </section>
    </AppShell>
  );
}

function RetentionShell({ children }: { children: React.ReactNode }) {
  const [location, navigate] = useLocation();
  const { locale } = useLanguage();
  const [open, setOpen] = useState(
    () => location !== "/historico" && isHistoryExpired(getStoredHistory())
  );
  return (
    <>
      {children}
      <AlertDialog open={open} onOpenChange={setOpen}>
        <AlertDialogContent className="history-dialog">
          <AlertDialogHeader>
            <AlertDialogTitle>
              {locale === "en" ? "Local history available for a report" : locale === "es" ? "Historial local disponible para informe" : "Histórico local disponível para relatório"}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {localize(locale, "Some shifts are more than three days old in this browser. Generate the report before clearing the cache to preserve the records and audit trail.", "Algunos turnos tienen más de tres días en este navegador. Genera el informe antes de borrar la caché para preservar los registros y la auditoría.", "Há turnos com mais de três dias neste navegador. Gere o relatório antes da limpeza do cache para preservar os registros e a auditoria no canhoto.")}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{localize(locale, "Do this later", "Hacerlo después", "Fazer depois")}</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                setOpen(false);
                navigate("/historico");
              }}
            >
              <History size={16} /> {localize(locale, "Open report", "Abrir informe", "Abrir relatório")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

export default function Home() {
  const [location] = useLocation();
  const page =
    location === "/abertura" ? (
      <OpeningPage />
    ) : location === "/contagem" ? (
      <CountPage />
    ) : location === "/validacao" ? (
      <ValidationPage />
    ) : location === "/historico" ? (
      <HistoryPage />
    ) : location === "/sobre" ? (
      <CreatorAboutPage />
    ) : location === "/privacidade" ? (
      <LegalPage />
    ) : (
      <WelcomePage />
    );
  return <RetentionShell>{page}</RetentionShell>;
}
