/**
 * Design: PixBee — fundo verde, vidro translúcido, marca de abelha minimalista,
 * botões arredondados e acentos verde/turquesa. Fluxo: início → abertura → contagem → validação.
 */
import { Button } from "@/components/ui/button";
import { AppShell } from "@/components/AppShell";
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
import { useEffect, useMemo, useState } from "react";
import { Link, useLocation } from "wouter";
import { toast } from "sonner";
import { jsPDF } from "jspdf";

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
const HISTORY_KEY = "pixbee-fecha-caixa-history-v2";
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
  >
) =>
  `${new Intl.DateTimeFormat("pt-BR", { dateStyle: "short", timeStyle: "short" }).format(new Date(record.startedAt ?? record.finishedAt))} · ${record.company} · ${record.operator}`;
const getTimeValue = (timestamp: string) => {
  const date = new Date(timestamp);
  return `${date.getHours().toString().padStart(2, "0")}:${date.getMinutes().toString().padStart(2, "0")}`;
};
const formatDateTime = (timestamp: string | null) =>
  timestamp
    ? new Intl.DateTimeFormat("pt-BR", {
        dateStyle: "short",
        timeStyle: "short",
      }).format(new Date(timestamp))
    : "Não informado";
const formatShiftDuration = (startedAt: string | null, finishedAt: string) =>
  startedAt
    ? formatDuration(
        new Date(finishedAt).getTime() - new Date(startedAt).getTime()
      )
    : "Não informado";
const isHistoryExpired = (records: ShiftHistoryRecord[]) =>
  records.some(
    record => Date.now() - new Date(record.finishedAt).getTime() >= RETENTION_MS
  );
const formatAuditEvent = (event: AuditEvent) => {
  const method = event.type === "withdrawal" ? "Sangria" : "Suprimento";
  if (event.action === "created")
    return `${method} incluído: ${formatCurrency(event.current?.amount ?? 0)}.`;
  if (event.action === "deleted")
    return `${method} excluído: ${formatCurrency(event.previous?.amount ?? 0)}.`;
  return `${method} alterado: ${formatCurrency(event.previous?.amount ?? 0)} → ${formatCurrency(event.current?.amount ?? 0)}.`;
};
export function exportHistoryPdf(
  records: ShiftHistoryRecord[],
  options: { download?: boolean; filename?: string } = {}
) {
  const document = new jsPDF({ unit: "mm", format: "a4" });
  const pageWidth = 210;
  const pageHeight = 297;
  const margin = 14;
  const contentWidth = pageWidth - margin * 2;
  const generatedAt = formatDateTime(new Date().toISOString());
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
        ? "RELATÓRIO DE HISTÓRICO · CONTINUAÇÃO"
        : "RELATÓRIO DE HISTÓRICO LOCAL",
      pageWidth - margin,
      14,
      { align: "right" }
    );
    document.setFont("helvetica", "normal");
    document.setFontSize(7.4);
    document.setTextColor(211, 237, 220);
    document.text(
      "Arquivamento operacional · Retenção local de até 3 dias",
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
      `Gerado em ${generatedAt} · Histórico local desta máquina`,
      margin,
      pageHeight - 8
    );
    document.text(`Página ${page}`, pageWidth - margin, pageHeight - 8, {
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
  document.text(`Emitido em ${generatedAt}`, margin, cursorY);
  document.text(
    `${records.length} turno${records.length === 1 ? "" : "s"} no período`,
    pageWidth - margin,
    cursorY,
    { align: "right" }
  );
  cursorY += 7;
  sectionTitle("Resumo do período", "Consolidação dos registros disponíveis");
  metric(margin, "Turnos fechados", String(records.length), "green");
  metric(
    margin + 45,
    "Total esperado",
    formatCurrency(summary.expected),
    "dark"
  );
  metric(margin + 90, "Total conferido", formatCurrency(summary.found), "aqua");
  metric(
    margin + 135,
    "Divergência",
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
    `${summary.breaks} turno${summary.breaks === 1 ? "" : "s"} com quebra · ${summary.audits} evento${summary.audits === 1 ? "" : "s"} de auditoria registrados`,
    margin + 4,
    cursorY + 7.5
  );
  cursorY += 20;
  sectionTitle(
    "Turnos consolidados",
    "Valores, lançamentos e trilha de auditoria"
  );

  orderedRecords.forEach((record, index) => {
    const statusLabel =
      record.status === "SEM QUEBRA"
        ? "SEM QUEBRA"
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
    document.text(`Operador: ${record.operator}`, margin + 6, cursorY + 14);
    document.text(
      `Abertura: ${formatDateTime(record.startedAt)} · Fechamento: ${formatDateTime(record.finishedAt)}`,
      margin + 6,
      cursorY + 20
    );
    document.text(
      `Duração: ${formatShiftDuration(record.startedAt, record.finishedAt)}`,
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
    metric(margin, "Esperado", formatCurrency(record.totalExpected), "dark");
    metric(margin + 45, "Conferido", formatCurrency(record.totalFound), "aqua");
    metric(
      margin + 90,
      "Diferença",
      `${record.difference > 0 ? "+" : ""}${formatCurrency(record.difference)}`,
      record.difference === 0 ? "green" : "alert"
    );
    metric(
      margin + 135,
      "Auditoria",
      `${record.auditTrail.length} evento${record.auditTrail.length === 1 ? "" : "s"}`,
      "green"
    );
    cursorY = metricY + 27;
    if (record.cashEntries.length > 0) {
      const cashEntryTotal = sumCashEntries(record.cashEntries);
      sectionTitle(
        "Entradas em espécie",
        `${record.cashEntries.length} lançamento${record.cashEntries.length === 1 ? "" : "s"}`
      );
      record.cashEntries.forEach(entry => {
        ensureSpace(10);
        document.setFont("helvetica", "bold");
        document.setFontSize(7.5);
        document.setTextColor(31, 61, 43);
        document.text(
          `Entrada em dinheiro · ${formatShortTime(entry.createdAt)}`,
          margin + 2,
          cursorY
        );
        document.setTextColor(37, 124, 74);
        document.text(
          `+${formatCurrency(entry.amount)}`,
          pageWidth - margin,
          cursorY,
          { align: "right" }
        );
        cursorY += 6;
      });
      ensureSpace(9);
      document.setFont("helvetica", "bold");
      document.setTextColor(27, 87, 52);
      document.text("Total acumulado em espécie", margin + 2, cursorY);
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
        "Lançamentos",
        `${record.adjustments.length} item${record.adjustments.length === 1 ? "" : "ns"}`
      );
      record.adjustments.forEach(entry => {
        const entryColor: [number, number, number] =
          entry.type === "withdrawal" ? [171, 70, 56] : [37, 124, 74];
        ensureSpace(10);
        document.setFont("helvetica", "bold");
        document.setFontSize(7.5);
        document.setTextColor(31, 61, 43);
        document.text(
          `${entry.type === "withdrawal" ? "Sangria" : "Suprimento"} · ${formatShortTime(entry.createdAt)}`,
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
          entry.note || "Sem identificação",
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
      sectionTitle("Trilha de auditoria", "Alterações justificadas");
      record.auditTrail.forEach(event => {
        const body = `${formatShortTime(event.occurredAt)} · ${formatAuditEvent(event)}`;
        const reason = `Justificativa: ${event.justification || "Não informada"}`;
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
    title: "PixBee FechaCaixa — Relatório de Histórico",
    subject: "Relatório local de turnos e auditoria",
  });
  const filename =
    options.filename ??
    `pixbee-relatorio-historico-${new Date().toISOString().slice(0, 10)}.pdf`;
  if (options.download ?? true) document.save(filename);
  return document;
}

function WelcomePage() {
  const [, navigate] = useLocation();
  const { resetSession } = useCashSession();
  const handleStart = () => {
    resetSession();
    navigate("/abertura");
  };
  return (
    <AppShell title="Sistema de fechamento" currentStep={1}>
      <section className="welcome-grid">
        <article className="glass-panel welcome-hero">
          <span className="panel-tag">Controle local e seguro</span>
          <h2>Feche o caixa com mais clareza e menos retrabalho.</h2>
          <p>
            Organize a abertura, registre cada forma de recebimento e descubra
            qualquer divergência antes de validar o turno.
          </p>
          <Button className="pixbee-primary-button" onClick={handleStart}>
            <CircleDollarSign size={19} /> Iniciar contagem{" "}
            <ArrowRight size={18} />
          </Button>
          <small>
            Os dados desta versão são guardados somente no navegador.
          </small>
        </article>
        <article className="glass-panel welcome-about">
          <div className="glass-icon">
            <ClipboardCheck size={26} />
          </div>
          <h3>Um fluxo em quatro etapas</h3>
          <p>
            Primeiro identifique o turno. Depois selecione os recebimentos, faça
            a contagem com cronômetro e valide o resultado.
          </p>
          <div className="feature-pills">
            <span>
              <Banknote size={15} /> Cédulas e moedas
            </span>
            <span>
              <Smartphone size={15} /> PIX e cartões
            </span>
            <span>
              <CheckCircle2 size={15} /> Conciliação
            </span>
          </div>
        </article>
        <article className="glass-panel welcome-features">
          <div>
            <WalletCards size={24} />
            <strong>Contagem assistida</strong>
            <p>Subtotais atualizados na hora.</p>
          </div>
          <div>
            <Clock3 size={24} />
            <strong>Tempo do turno</strong>
            <p>Relógio e cronômetro na contagem.</p>
          </div>
          <div>
            <ReceiptText size={24} />
            <strong>Validação final</strong>
            <p>Diferença geral e por modalidade.</p>
          </div>
        </article>
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
  const info = METHOD_INFO[method];
  const Icon = info.icon;
  return (
    <label className={`method-toggle ${selected ? "selected" : ""}`}>
      <input type="checkbox" checked={selected} onChange={onToggle} />
      <span className={`method-toggle-icon ${info.tone}`}>
        <Icon size={21} />
      </span>
      <span>
        <strong>{info.title}</strong>
        <small>{info.description}</small>
      </span>
      <span className="toggle-check">
        {selected ? <CheckCircle2 size={20} /> : <Plus size={19} />}
      </span>
    </label>
  );
}

function OpeningPage() {
  const [, navigate] = useLocation();
  const { session, setSession } = useCashSession();
  const toggleMethod = (method: MethodId) =>
    setSession(current => ({
      ...current,
      selectedMethods: current.selectedMethods.includes(method)
        ? current.selectedMethods.filter(item => item !== method)
        : [...current.selectedMethods, method],
    }));
  function advance() {
    const missing = [
      !session.operator.trim() ? "nome do operador" : "",
      !session.company.trim() ? "nome da empresa" : "",
      session.openingFloat === null ? "valor inicial do caixa" : "",
      session.selectedMethods.length === 0 ? "ao menos uma modalidade" : "",
    ].filter(Boolean);
    if (missing.length) {
      toast.error(`Preencha ${missing.join(", ")} para iniciar a contagem.`);
      return;
    }
    setSession(current => ({
      ...current,
      shiftId: crypto.randomUUID(),
      startedAt: new Date().toISOString(),
      validatedAt: null,
    }));
    navigate("/contagem");
  }
  return (
    <AppShell title="Abertura de contagem" currentStep={2}>
      <section className="glass-panel flow-panel opening-panel">
        <div className="flow-heading">
          <span>Etapa 01</span>
          <h2>Identifique o caixa e escolha o que será conferido.</h2>
          <p>Esses dados formam a base da sua validação final.</p>
        </div>
        <div className="opening-fields">
          <label>
            <span>
              <UserRound size={15} /> Operador do caixa
            </span>
            <input
              value={session.operator}
              onChange={event =>
                setSession(current => ({
                  ...current,
                  operator: event.target.value,
                }))
              }
              placeholder="Digite seu nome"
            />
          </label>
          <label>
            <span>
              <Building2 size={15} /> Nome da empresa
            </span>
            <input
              value={session.company}
              onChange={event =>
                setSession(current => ({
                  ...current,
                  company: event.target.value,
                }))
              }
              placeholder="Digite a empresa"
            />
          </label>
          <label>
            <span>
              <Landmark size={15} /> Fundo inicial (R$)
            </span>
            <input
              type="number"
              min="0"
              step="0.01"
              inputMode="decimal"
              value={session.openingFloat ?? ""}
              onChange={event =>
                setSession(current => ({
                  ...current,
                  openingFloat: parseOptionalMoney(event.target.value),
                }))
              }
              placeholder="0,00"
            />
          </label>
        </div>
        <label className="wide-field">
          <span>
            <ReceiptText size={15} /> Observações do turno{" "}
            <small>opcional</small>
          </span>
          <input
            value={session.observation}
            onChange={event =>
              setSession(current => ({
                ...current,
                observation: event.target.value,
              }))
            }
            placeholder="Anote algum detalhe importante antes de começar."
          />
        </label>
        <div className="mode-heading">
          <div>
            <span>Modalidades de contagem</span>
            <h3>O que você quer conferir neste caixa?</h3>
          </div>
          <p>
            Você poderá informar o valor esperado e o valor encontrado na
            próxima etapa.
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
            <ArrowLeft size={17} /> Voltar
          </Link>
          <Button className="pixbee-primary-button" onClick={advance}>
            Começar contagem <ArrowRight size={18} />
          </Button>
        </div>
      </section>
    </AppShell>
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

function DenominationRow({
  item,
}: {
  item: { key: string; label: string; value: number };
}) {
  const { session, setSession } = useCashSession();
  const quantity = session.quantities[item.key] ?? 0;
  const updateQuantity = (value: number) =>
    setSession(current => ({
      ...current,
      quantities: { ...current.quantities, [item.key]: Math.max(0, value) },
    }));
  return (
    <div className={`denomination-row ${quantity > 0 ? "has-value" : ""}`}>
      <strong>{item.label}</strong>
      <div className="quantity-controls">
        <button
          type="button"
          aria-label={`Diminuir ${item.label}`}
          onClick={() => updateQuantity(quantity - 1)}
        >
          <Minus size={15} />
        </button>
        <input
          type="number"
          min="0"
          inputMode="numeric"
          value={quantity === 0 ? "" : quantity}
          placeholder="0"
          onChange={event => updateQuantity(Number(event.target.value) || 0)}
        />
        <button
          type="button"
          aria-label={`Aumentar ${item.label}`}
          onClick={() => updateQuantity(quantity + 1)}
        >
          <Plus size={15} />
        </button>
      </div>
      <span>{formatCurrency(quantity * item.value)}</span>
    </div>
  );
}

function LiveClock({ startedAt }: { startedAt: string | null }) {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const interval = window.setInterval(() => setNow(new Date()), 1000);
    return () => window.clearInterval(interval);
  }, []);
  const start = startedAt ? new Date(startedAt).getTime() : now.getTime();
  const time = new Intl.DateTimeFormat("pt-BR", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  }).format(now);
  return (
    <div className="live-clock">
      <div>
        <Clock3 size={17} />
        <span>
          <small>Horário atual</small>
          <strong>{time}</strong>
        </span>
      </div>
      <div>
        <RotateCcw size={17} />
        <span>
          <small>Tempo de contagem</small>
          <strong>{formatDuration(now.getTime() - start)}</strong>
        </span>
      </div>
    </div>
  );
}

function ThermalReceipt({
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
  const date = finishedAt ? new Date(finishedAt) : new Date();
  const adjustmentTotals = getAdjustmentTotals(session.adjustments);
  const cashEntryTotal = sumCashEntries(session.cashEntries);
  return (
    <article
      className="thermal-receipt"
      aria-label="Comprovante térmico de fechamento"
    >
      <header className="thermal-header">
        <div className="thermal-mark">
          PIX<span>BEE</span>
        </div>
        <strong>FECHAMENTO DE CAIXA</strong>
        <small>
          {new Intl.DateTimeFormat("pt-BR", {
            dateStyle: "short",
            timeStyle: "short",
          }).format(date)}
        </small>
      </header>
      <div className="thermal-rule solid" />
      <dl className="thermal-meta">
        <div>
          <dt>Empresa</dt>
          <dd>{session.company || "Não informada"}</dd>
        </div>
        <div>
          <dt>Operador</dt>
          <dd>{session.operator || "Não informado"}</dd>
        </div>
        <div>
          <dt>Fundo inicial</dt>
          <dd>{formatCurrency(session.openingFloat ?? 0)}</dd>
        </div>
      </dl>
      <section className="thermal-section thermal-period">
        <h3>PERÍODO DO TURNO</h3>
        <div className="thermal-row">
          <span>Abertura</span>
          <b>{formatDateTime(session.startedAt)}</b>
        </div>
        <div className="thermal-row">
          <span>Fechamento</span>
          <b>{formatDateTime(finishedAt)}</b>
        </div>
        <div className="thermal-row">
          <span>Duração</span>
          <b>
            {finishedAt
              ? formatShiftDuration(session.startedAt, finishedAt)
              : "Em andamento"}
          </b>
        </div>
      </section>
      <section className="thermal-section">
        <h3>CONFERÊNCIA</h3>
        {variations.map(item => (
          <div className="thermal-row" key={item.label}>
            <div>
              <span>{item.label}</span>
              <small>
                Previsto: {formatCurrency(item.expected)} · Dif.:{" "}
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
          <h3>ENTRADAS EM ESPÉCIE</h3>
          {session.cashEntries.map(entry => (
            <div className="thermal-row" key={entry.id}>
              <div>
                <span>Entrada em dinheiro · {formatShortTime(entry.createdAt)}</span>
                <small>Incluída no valor esperado em espécie</small>
              </div>
              <b>+ {formatCurrency(entry.amount)}</b>
            </div>
          ))}
          <div className="thermal-row">
            <span>Total acumulado em espécie</span>
            <b>{formatCurrency(cashEntryTotal)}</b>
          </div>
        </section>
      )}
      {session.adjustments.length > 0 && (
        <section className="thermal-section thermal-adjustments">
          <h3>LANÇAMENTOS DE CAIXA</h3>
          {session.adjustments.map(entry => (
            <div className="thermal-row" key={entry.id}>
              <div>
                <span>
                  {entry.type === "withdrawal" ? "Sangria" : "Suprimento"} ·{" "}
                  {formatShortTime(entry.createdAt)}
                </span>
                {entry.note ? <small>{entry.note}</small> : null}
              </div>
              <b>{formatCurrency(entry.amount)}</b>
            </div>
          ))}
          <div className="thermal-row">
            <span>Total de sangrias</span>
            <b>{formatCurrency(adjustmentTotals.withdrawal)}</b>
          </div>
          <div className="thermal-row">
            <span>Total de suprimentos</span>
            <b>{formatCurrency(adjustmentTotals.supply)}</b>
          </div>
        </section>
      )}
      {session.auditTrail.length > 0 && (
        <section className="thermal-section thermal-audit">
          <h3>AUDITORIA DE LANÇAMENTOS</h3>
          {session.auditTrail.map(event => (
            <div className="thermal-row" key={event.id}>
              <div>
                <span>
                  {formatShortTime(event.occurredAt)} ·{" "}
                  {formatAuditEvent(event)}
                </span>
                <small>
                  {event.justification
                    ? `Justificativa: ${event.justification}`
                    : event.previous?.note ||
                      event.current?.note ||
                      "Sem identificação"}
                </small>
              </div>
            </div>
          ))}
        </section>
      )}
      <section className="thermal-total">
        <div>
          <span>Total esperado</span>
          <strong>{formatCurrency(totalExpected)}</strong>
        </div>
        <div>
          <span>Total conferido</span>
          <strong>{formatCurrency(totalFound)}</strong>
        </div>
        <div className={status === "SEM QUEBRA" ? "ok" : "break"}>
          <span>
            {status === "SEM QUEBRA" ? "SEM QUEBRA" : `QUEBRA — ${status}`}
          </span>
          <strong>
            {difference > 0 ? "+" : ""}
            {formatCurrency(difference)}
          </strong>
        </div>
      </section>
      {(session.closureNote || session.observation) && (
        <section className="thermal-note">
          <h3>OBSERVAÇÃO</h3>
          <p>{session.closureNote || session.observation}</p>
        </section>
      )}
      <div className="thermal-rule solid" />
      <footer>Via única · PixBee FechaCaixa</footer>
    </article>
  );
}

function AdjustmentWorkspace({ type }: { type: AdjustmentKind }) {
  const { session, setSession } = useCashSession();
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
  const info = METHOD_INFO[type];
  const Icon = info.icon;
  const entries = session.adjustments.filter(entry => entry.type === type);
  const total = entries.reduce((sum, entry) => sum + entry.amount, 0);
  const label = type === "withdrawal" ? "sangria" : "suprimento";
  function addEntry() {
    const numericAmount = Number(amount);
    if (!Number.isFinite(numericAmount) || numericAmount <= 0) {
      toast.error(`Informe um valor válido para a ${label}.`);
      return;
    }
    const entry: AdjustmentEntry = {
      id: crypto.randomUUID(),
      shiftId: session.shiftId ?? "turno-sem-id",
      type,
      amount: numericAmount,
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
    }));
    setAmount("");
    setNote("");
    toast.success(
      `${type === "withdrawal" ? "Sangria" : "Suprimento"} de ${formatCurrency(numericAmount)} registrado às ${formatShortTime(entry.createdAt)}.`
    );
  }
  const onEnter = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === "Enter") {
      event.preventDefault();
      addEntry();
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
      toast.error("Informe valor e horário válidos antes de salvar.");
      return;
    }
    if (!editingJustification.trim()) {
      toast.error("Informe a justificativa obrigatória para esta alteração.");
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
      `${type === "withdrawal" ? "Sangria" : "Suprimento"} atualizado com sucesso.`
    );
  }
  function confirmDeletion() {
    if (!pendingDeletion) return;
    if (!deletionJustification.trim()) {
      toast.error("Informe a justificativa obrigatória antes de excluir.");
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
    toast.success("Lançamento excluído do turno.");
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
          <strong>{info.title}</strong>
          <small>
            {type === "withdrawal"
              ? "Registre cada retirada de dinheiro do caixa."
              : "Registre cada valor colocado no caixa."}
          </small>
        </div>
        <b>{formatCurrency(total)}</b>
      </header>
      <div className="adjustment-form">
        <label className="amount-input">
          <span>Valor da {label}</span>
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
            Identificação <small>opcional</small>
          </span>
          <input
            value={note}
            maxLength={48}
            placeholder="Ex.: retirada para cofre"
            onKeyDown={onEnter}
            onChange={event => setNote(event.target.value)}
          />
        </label>
        <Button
          className="adjustment-add-button"
          type="button"
          onClick={addEntry}
        >
          <Plus size={17} /> Registrar
        </Button>
      </div>
      <div className="adjustment-history">
        <div>
          <span>
            Histórico de {type === "withdrawal" ? "sangrias" : "suprimentos"}
          </span>
          <small>
            {entries.length === 0
              ? "Nenhum lançamento neste turno."
              : `${entries.length} lançamento${entries.length > 1 ? "s" : ""} registrado${entries.length > 1 ? "s" : ""}.`}
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
                    ? "Sangria registrada"
                    : "Suprimento registrado")}
              </strong>
              <small>
                {type === "withdrawal"
                  ? "Retirada do caixa"
                  : "Entrada no caixa"}
              </small>
            </span>
            <b>{formatCurrency(entry.amount)}</b>
            <div className="adjustment-entry-actions">
              <button
                type="button"
                onClick={() => openEdit(entry)}
                aria-label={`Editar ${label} de ${formatCurrency(entry.amount)}`}
                title="Editar lançamento"
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
                aria-label={`Excluir ${label} de ${formatCurrency(entry.amount)}`}
                title="Excluir lançamento"
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
            <AlertDialogTitle>Excluir este lançamento?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta ação remove a {label} de{" "}
              {pendingDeletion ? formatCurrency(pendingDeletion.amount) : ""} do
              turno atual. Informe o motivo para preservar a auditoria do
              fechamento.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <label className="audit-justification-field">
            <span>
              Justificativa da exclusão <b>obrigatória</b>
            </span>
            <textarea
              value={deletionJustification}
              maxLength={240}
              placeholder="Ex.: lançamento duplicado ou valor lançado incorretamente."
              onChange={event => setDeletionJustification(event.target.value)}
            />
          </label>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              className="history-delete-confirm"
              onClick={event => {
                if (!deletionJustification.trim()) event.preventDefault();
                confirmDeletion();
              }}
            >
              Excluir lançamento
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
            <DialogTitle>Editar {label}</DialogTitle>
            <DialogDescription>
              Ajuste o valor, o horário e a identificação. A justificativa será
              incluída no histórico de auditoria.
            </DialogDescription>
          </DialogHeader>
          <div className="edit-adjustment-fields">
            <label className="amount-input">
              <span>Valor</span>
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
              <span>Horário</span>
              <input
                type="time"
                value={editingTime}
                onChange={event => setEditingTime(event.target.value)}
              />
            </label>
            <label className="adjustment-note-input edit-note-input">
              <span>
                Identificação <small>opcional</small>
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
              Justificativa da alteração <b>obrigatória</b>
            </span>
            <textarea
              value={editingJustification}
              maxLength={240}
              placeholder="Ex.: correção após conferência do valor ou horário."
              onChange={event => setEditingJustification(event.target.value)}
            />
          </label>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setEditingEntry(null)}
            >
              Cancelar
            </Button>
            <Button
              type="button"
              className="pixbee-primary-button history-save-button"
              onClick={saveEdit}
            >
              Salvar alterações
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </article>
  );
}

function CashEntryWorkspace() {
  const { session, setSession } = useCashSession();
  const [amount, setAmount] = useState("");
  const entries = session.cashEntries;

  function addEntry() {
    const numericAmount = Number(amount);
    if (!Number.isFinite(numericAmount) || numericAmount <= 0) {
      toast.error("Informe um valor válido para a entrada em dinheiro.");
      return;
    }

    const entry: CashEntry = {
      id: crypto.randomUUID(),
      shiftId: session.shiftId ?? "turno-sem-id",
      amount: numericAmount,
      createdAt: new Date().toISOString(),
    };

    setSession(current => ({
      ...current,
      expected: {
        ...current.expected,
        cash: current.expected.cash + numericAmount,
      },
      cashEntries: [...current.cashEntries, entry],
    }));
    setAmount("");
    toast.success(
      `Entrada de ${formatCurrency(numericAmount)} adicionada ao esperado em espécie.`
    );
  }

  function handleEnter(event: React.KeyboardEvent<HTMLInputElement>) {
    if (event.key !== "Enter") return;
    event.preventDefault();
    addEntry();
  }

  return (
    <article className="adjustment-workspace cash-entry-workspace">
      <header>
        <span className="digital-icon aqua">
          <Plus size={19} />
        </span>
        <div>
          <strong>Adicionar entrada em espécie</strong>
          <small>
            Cada valor é somado ao esperado em dinheiro. Pressione Enter para
            registrar rapidamente.
          </small>
        </div>
        <b>{formatCurrency(session.expected.cash)}</b>
      </header>
      <div className="adjustment-form">
        <label className="amount-input">
          <span>Valor recebido</span>
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
          onClick={addEntry}
        >
          <Plus size={17} /> Adicionar entrada
        </Button>
      </div>
      <div className="adjustment-history">
        <div>
          <span>Entradas registradas neste turno</span>
          <small>
            {entries.length === 0
              ? "Nenhuma entrada registrada."
              : `${entries.length} entrada${entries.length > 1 ? "s" : ""} somada${entries.length > 1 ? "s" : ""}.`}
          </small>
        </div>
        {entries.map(entry => (
          <div className="adjustment-entry" key={entry.id}>
            <time dateTime={entry.createdAt}>
              {formatShortTime(entry.createdAt)}
            </time>
            <span>
              <strong>Entrada em dinheiro</strong>
              <small>Incluída no valor esperado em espécie</small>
            </span>
            <b>+ {formatCurrency(entry.amount)}</b>
          </div>
        ))}
      </div>
    </article>
  );
}

function CountPage() {
  const [, navigate] = useLocation();
  const { session, setSession } = useCashSession();
  const selected = session.selectedMethods;
  const cashSelected = selected.includes("cash");
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
        "Registre ao menos um valor conferido antes de revisar o fechamento."
      );
      return;
    }
    navigate("/validacao");
  }
  return (
    <AppShell title="Contagem em andamento" currentStep={3}>
      <LiveClock startedAt={session.startedAt} />
      <div className="count-layout">
        <section className="glass-panel flow-panel count-panel">
          <div className="flow-heading compact">
            <span>Etapa 02</span>
            <h2>Registre os valores do turno.</h2>
            <p>
              O valor esperado é comparado com aquilo que foi efetivamente
              conferido.
            </p>
          </div>
          {cashSelected && (
            <section className="count-section">
              <div className="section-title">
                <div>
                  <Banknote size={19} />
                  <span>Dinheiro físico</span>
                </div>
                <strong>{formatCurrency(computed.cashFound)}</strong>
              </div>
              <div className="cash-expected-grid">
                <div className="opening-amount">
                  <span>Fundo inicial</span>
                  <strong>{formatCurrency(session.openingFloat ?? 0)}</strong>
                </div>
                <div className="opening-amount">
                  <span>Entradas acumuladas</span>
                  <strong>{formatCurrency(session.expected.cash)}</strong>
                </div>
                <div className="opening-amount total">
                  <span>Esperado em espécie</span>
                  <strong>{formatCurrency(computed.cashExpected)}</strong>
                </div>
              </div>
              <CashEntryWorkspace />
              <div className="denomination-columns">
                <div>
                  <div className="denomination-heading">
                    <span>
                      <Banknote size={16} /> Cédulas
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
                      <Coins size={16} /> Moedas
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
                  <span>Recebimentos digitais</span>
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
                        <strong>{info.title}</strong>
                        <small>{info.description}</small>
                      </div>
                      <AmountInput
                        label="Esperado"
                        value={session.expected[method]}
                        onChange={value => updateExpected(method, value)}
                      />
                      <AmountInput
                        label="Conferido"
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
                  <span>Lançamentos de caixa</span>
                </div>
                <small>
                  Cada evento atualiza o esperado e fica registrado com horário.
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
              <ArrowLeft size={17} /> Voltar
            </Link>
            <Button
              className="pixbee-primary-button"
              onClick={moveToValidation}
            >
              Revisar fechamento <ArrowRight size={18} />
            </Button>
          </div>
        </section>
        <aside className="count-summary glass-panel">
          <span>Resumo em tempo real</span>
          <div className="summary-total">
            <small>Total conferido</small>
            <strong>{formatCurrency(computed.totalFound)}</strong>
          </div>
          <div className="summary-line">
            <span>Valor esperado</span>
            <strong>{formatCurrency(computed.totalExpected)}</strong>
          </div>
          <div className="summary-line">
            <span>Dinheiro físico</span>
            <strong>{formatCurrency(computed.cashFound)}</strong>
          </div>
          <div className="summary-line">
            <span>Sangrias</span>
            <strong>
              - {formatCurrency(computed.adjustmentTotals.withdrawal)}
            </strong>
          </div>
          <div className="summary-line">
            <span>Suprimentos</span>
            <strong>
              + {formatCurrency(computed.adjustmentTotals.supply)}
            </strong>
          </div>
          <div
            className={`summary-difference ${Math.abs(computed.difference) < 0.005 ? "balanced" : computed.difference > 0 ? "positive" : "negative"}`}
          >
            <span>Diferença até agora</span>
            <strong>
              {computed.difference > 0 ? "+" : ""}
              {formatCurrency(computed.difference)}
            </strong>
          </div>
          <p>
            Continue preenchendo. O detalhamento da diferença aparece na etapa
            final.
          </p>
        </aside>
      </div>
    </AppShell>
  );
}

function ValidationPage() {
  const [, navigate] = useLocation();
  const { session, setSession, resetSession } = useCashSession();
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
            label: "Dinheiro físico",
            expected: cashExpected,
            found: cashFound,
          },
        ]
      : []),
    ...DIGITAL_METHODS.filter(method =>
      session.selectedMethods.includes(method)
    ).map(method => ({
      method,
      label: METHOD_INFO[method].title,
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
        ? "Fechamento conciliado e registrado no histórico local."
        : `Fechamento validado com ${closureStatus.toLowerCase()} de ${formatCurrency(Math.abs(difference))}.`
    );
  }
  return (
    <>
      <AppShell title="Validação do fechamento" currentStep={4}>
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
              <span>Etapa 03</span>
              <h2>
                {balanced
                  ? "Caixa conciliado"
                  : difference > 0
                    ? "Fechamento com sobra"
                    : "Fechamento com falta"}
              </h2>
              <p>
                {balanced
                  ? "Os valores encontrados correspondem ao total esperado para este turno."
                  : "A quebra será registrada no histórico e no comprovante. Você pode concluir o fechamento normalmente."}
              </p>
            </div>
          </div>
          <div className="validation-totals">
            <article>
              <span>Esperado no fechamento</span>
              <strong>{formatCurrency(totalExpected)}</strong>
            </article>
            <article>
              <span>Encontrado na conferência</span>
              <strong>{formatCurrency(totalFound)}</strong>
            </article>
            <article
              className={
                balanced ? "balanced" : difference > 0 ? "positive" : "negative"
              }
            >
              <span>Divergência geral</span>
              <strong>
                {difference > 0 ? "+" : ""}
                {formatCurrency(difference)}
              </strong>
            </article>
          </div>
          <div className="variation-table">
            <div className="variation-head">
              <span>Modalidade</span>
              <span>Esperado</span>
              <span>Conferido</span>
              <span>Diferença</span>
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
                  <strong>Lançamentos considerados no dinheiro físico:</strong>{" "}
                  sangrias de {formatCurrency(adjustmentTotals.withdrawal)} e
                  suprimentos de {formatCurrency(adjustmentTotals.supply)}.
                </span>
              </div>
              <div className="adjustment-review-list">
                {session.adjustments.map(entry => (
                  <div key={entry.id}>
                    <time>{formatShortTime(entry.createdAt)}</time>
                    <span>
                      {entry.type === "withdrawal" ? "Sangria" : "Suprimento"}
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
                Observação sobre a quebra <b>recomendado</b>
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
                placeholder="Ex.: diferença identificada na conferência de moedas ou na operadora de cartão."
              />
            </label>
          )}
          {session.validatedAt ? (
            <div className="validated-banner">
              <CheckCircle2 size={22} />
              <div>
                <strong>
                  Fechamento validado{" "}
                  {balanced
                    ? "sem quebra"
                    : `com ${closureStatus.toLowerCase()}`}
                  .
                </strong>
                <span>
                  Registro salvo no histórico local em{" "}
                  {new Intl.DateTimeFormat("pt-BR", {
                    dateStyle: "short",
                    timeStyle: "short",
                  }).format(new Date(session.validatedAt))}
                  .
                </span>
              </div>
            </div>
          ) : null}
          <div className="flow-actions closure-actions">
            <Link href="/contagem" className="pixbee-text-button">
              <ArrowLeft size={17} /> Ajustar contagem
            </Link>
            <div>
              {session.validatedAt ? (
                <Button
                  className="pixbee-print-button"
                  onClick={() => window.print()}
                >
                  <Printer size={18} /> Imprimir comprovante
                </Button>
              ) : null}
              {session.validatedAt ? (
                <Button
                  className="pixbee-primary-button"
                  onClick={() => {
                    resetSession();
                    navigate("/abertura");
                  }}
                >
                  Nova contagem <ArrowRight size={18} />
                </Button>
              ) : (
                <Button
                  className="pixbee-primary-button"
                  onClick={validateClosure}
                >
                  <CheckCircle2 size={18} /> Validar{" "}
                  {balanced ? "fechamento" : "com quebra"}
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
  return (
    <article
      className="thermal-history-report"
      aria-label="Relatório térmico de histórico de turnos"
    >
      <header className="thermal-header">
        <div className="thermal-mark">
          PIX<span>BEE</span>
        </div>
        <strong>RELATÓRIO LOCAL · 3 DIAS</strong>
        <small>Gerado em {formatDateTime(new Date().toISOString())}</small>
      </header>
      <div className="thermal-rule solid" />
      {records.map(record => (
        <section className="thermal-history-shift" key={record.id}>
          <h3>{record.company}</h3>
          <div className="thermal-row">
            <span>Operador</span>
            <b>{record.operator}</b>
          </div>
          <div className="thermal-row">
            <span>Abertura</span>
            <b>{formatDateTime(record.startedAt)}</b>
          </div>
          <div className="thermal-row">
            <span>Fechamento</span>
            <b>{formatDateTime(record.finishedAt)}</b>
          </div>
          <div className="thermal-row">
            <span>Duração</span>
            <b>{formatShiftDuration(record.startedAt, record.finishedAt)}</b>
          </div>
          <div className="thermal-row">
            <span>Esperado</span>
            <b>{formatCurrency(record.totalExpected)}</b>
          </div>
          <div className="thermal-row">
            <span>Conferido</span>
            <b>{formatCurrency(record.totalFound)}</b>
          </div>
          <div className="thermal-row">
            <span>
              {record.status === "SEM QUEBRA"
                ? "Sem quebra"
                : `Quebra — ${record.status.toLowerCase()}`}
            </span>
            <b>
              {record.difference > 0 ? "+" : ""}
              {formatCurrency(record.difference)}
            </b>
          </div>
          {record.cashEntries.length > 0 && (
            <>
              <h3>ENTRADAS EM ESPÉCIE</h3>
              {record.cashEntries.map(entry => (
                <div className="thermal-row" key={entry.id}>
                  <div>
                    <span>
                      Entrada em dinheiro · {formatShortTime(entry.createdAt)}
                    </span>
                    <small>Incluída no valor esperado em espécie</small>
                  </div>
                  <b>+ {formatCurrency(entry.amount)}</b>
                </div>
              ))}
              <div className="thermal-row">
                <span>Total acumulado em espécie</span>
                <b>
                  {formatCurrency(sumCashEntries(record.cashEntries))}
                </b>
              </div>
            </>
          )}
          {record.adjustments.length > 0 && (
            <>
              <h3>LANÇAMENTOS</h3>
              {record.adjustments.map(entry => (
                <div className="thermal-row" key={entry.id}>
                  <div>
                    <span>
                      {entry.type === "withdrawal" ? "Sangria" : "Suprimento"} ·{" "}
                      {formatShortTime(entry.createdAt)}
                    </span>
                    <small>{entry.note || "Sem identificação"}</small>
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
              <h3>AUDITORIA</h3>
              {record.auditTrail.map(event => (
                <div className="thermal-row" key={event.id}>
                  <div>
                    <span>
                      {formatShortTime(event.occurredAt)} ·{" "}
                      {formatAuditEvent(event)}
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
      <footer>Relatório local · Via única · PixBee FechaCaixa</footer>
    </article>
  );
}

function HistoryPage() {
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
    toast.success("Histórico local limpo após a geração do relatório.");
  };
  const exportPdfReport = (clearAfterDownload = false) => {
    if (records.length === 0) {
      toast.error("Não há turnos para exportar neste relatório.");
      return;
    }
    exportHistoryPdf(records);
    if (clearAfterDownload) clearLocalHistory();
    else toast.success("Relatório em PDF exportado para arquivamento.");
  };
  const printReport = (requestClear = false) => {
    setClearAfterPrint(requestClear);
    setReportForPrint(true);
    window.setTimeout(() => window.print(), 80);
  };
  useEffect(() => {
    const afterPrint = () => {
      setReportForPrint(false);
      if (clearAfterPrint) setAwaitingPrintConfirmation(true);
      setClearAfterPrint(false);
    };
    window.addEventListener("afterprint", afterPrint);
    return () => window.removeEventListener("afterprint", afterPrint);
  }, [clearAfterPrint]);
  return (
    <>
      <AppShell title="Histórico de turnos" currentStep={3}>
        <section className="history-page">
          <div className="glass-panel history-heading">
            <div>
              <span>Consulta de lançamentos</span>
              <h2>
                Encontre cada entrada em espécie, sangria e suprimento pelo
                turno em que foram registrados.
              </h2>
              <p>
                Os registros ficam disponíveis por até três dias neste
                navegador; as ações de auditoria seguem somente para o relatório
                e o canhoto.
              </p>
            </div>
            <div className="history-filter">
              <label>Filtrar por turno</label>
              <Select value={selectedShift} onValueChange={setSelectedShift}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione um turno" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos os turnos</SelectItem>
                  {records.map(record => (
                    <SelectItem value={record.shiftId} key={record.shiftId}>
                      {getShiftLabel(record)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <div className="history-report-actions">
                <Button
                  type="button"
                  className="pixbee-print-button"
                  onClick={() => printReport(false)}
                >
                  <Printer size={16} /> Imprimir relatório
                </Button>
                <Button
                  type="button"
                  className="history-download-button"
                  onClick={() => exportPdfReport(false)}
                >
                  <Download size={16} /> Baixar PDF
                </Button>
              </div>
            </div>
          </div>
          {filteredRecords.length === 0 ? (
            <div className="glass-panel history-empty">
              <History size={30} />
              <div>
                <strong>Nenhum turno fechado neste filtro.</strong>
                <span>
                  Valide um fechamento para consultar os lançamentos e totais
                  aqui.
                </span>
              </div>
              <Button
                className="pixbee-primary-button"
                onClick={() => window.location.assign("/abertura")}
              >
                Iniciar contagem <ArrowRight size={17} />
              </Button>
            </div>
          ) : (
            <div className="history-record-list">
              {filteredRecords.map(record => (
                <article className="glass-panel history-record" key={record.id}>
                  <header>
                    <div>
                      <span>
                        {new Intl.DateTimeFormat("pt-BR", {
                          dateStyle: "long",
                          timeStyle: "short",
                        }).format(new Date(record.finishedAt))}
                      </span>
                      <h3>{record.company}</h3>
                      <p>
                        Operador: <strong>{record.operator}</strong>
                      </p>
                    </div>
                    <b
                      className={`history-status ${record.status === "SEM QUEBRA" ? "balanced" : record.status === "SOBRA" ? "positive" : "negative"}`}
                    >
                      {record.status === "SEM QUEBRA"
                        ? "Sem quebra"
                        : `${record.status === "SOBRA" ? "Sobra" : "Falta"} de ${formatCurrency(Math.abs(record.difference))}`}
                    </b>
                  </header>
                  <div className="history-period">
                    <span>
                      Abertura:{" "}
                      <strong>{formatDateTime(record.startedAt)}</strong>
                    </span>
                    <span>
                      Fechamento:{" "}
                      <strong>{formatDateTime(record.finishedAt)}</strong>
                    </span>
                    <span>
                      Duração:{" "}
                      <strong>
                        {formatShiftDuration(
                          record.startedAt,
                          record.finishedAt
                        )}
                      </strong>
                    </span>
                  </div>
                  <div className="history-record-totals">
                    <div>
                      <span>Esperado</span>
                      <strong>{formatCurrency(record.totalExpected)}</strong>
                    </div>
                    <div>
                      <span>Conferido</span>
                      <strong>{formatCurrency(record.totalFound)}</strong>
                    </div>
                    <div>
                      <span>Diferença</span>
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
                      <span>Entradas em espécie</span>
                      <small>
                        {record.cashEntries.length === 0
                          ? "Nenhuma entrada adicional"
                          : `${record.cashEntries.length} entrada${record.cashEntries.length > 1 ? "s" : ""} · ${formatCurrency(sumCashEntries(record.cashEntries))}`}
                      </small>
                    </div>
                    {record.cashEntries.length > 0 && (
                      <div className="history-adjustment-list">
                        {record.cashEntries.map(entry => (
                          <div key={entry.id}>
                            <time>{formatShortTime(entry.createdAt)}</time>
                            <span>
                              <strong>Entrada em dinheiro</strong>
                              <small>
                                Incluída no valor esperado em espécie
                              </small>
                            </span>
                            <b className="positive">
                              +{formatCurrency(entry.amount)}
                            </b>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                  <div className="history-adjustments">
                    <div className="history-adjustments-title">
                      <span>Lançamentos do turno</span>
                      <small>
                        {record.adjustments.length === 0
                          ? "Sem sangrias ou suprimentos"
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
                                  ? "Sangria"
                                  : "Suprimento"}
                              </strong>
                              <small>{entry.note || "Sem identificação"}</small>
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
              Seu histórico local está pronto para arquivamento
            </AlertDialogTitle>
            <AlertDialogDescription>
              Há registros com mais de três dias. Imprima ou exporte o PDF
              agora; depois, o PixBee poderá limpar somente o cache desta
              máquina com segurança.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="retention-dialog-note">
            <strong>O que será preservado no relatório</strong>
            <span>
              Turnos, horários, lançamentos e justificativas de auditoria.
            </span>
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel>Limpar depois</AlertDialogCancel>
            <Button
              type="button"
              variant="outline"
              className="retention-pdf-button"
              onClick={() => {
                setRetentionNoticeOpen(false);
                exportPdfReport(true);
              }}
            >
              <Download size={16} /> Baixar PDF e limpar
            </Button>
            <AlertDialogAction
              className="retention-print-button"
              onClick={() => {
                setRetentionNoticeOpen(false);
                printReport(true);
              }}
            >
              <Printer size={16} /> Imprimir relatório
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
              Confirma a impressão do relatório?
            </AlertDialogTitle>
            <AlertDialogDescription>
              Confirme somente após imprimir o relatório. Esta confirmação limpa
              o histórico local vencido desta máquina.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Manter histórico</AlertDialogCancel>
            <AlertDialogAction
              className="history-delete-confirm"
              onClick={clearLocalHistory}
            >
              Confirmar e limpar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

function CreatorAboutPage() {
  const [pixCopied, setPixCopied] = useState(false);
  const pixKey = "51.063.137/0001-26";
  async function copyPixKey() {
    try {
      await navigator.clipboard.writeText(pixKey);
      setPixCopied(true);
      toast.success("Chave Pix copiada. Obrigada pelo apoio!");
    } catch {
      toast.message(`Chave Pix: ${pixKey}`);
    }
  }
  return (
    <AppShell title="Sobre o PixBee" currentStep={1}>
      <section className="creator-about-page">
        <article className="glass-panel creator-profile">
          <div className="creator-photo-frame">
            <img
              src="/assets/khaleesi-saithe-profile.png"
              alt="Khaleesi Saithe, criadora do PixBee FechaCaixa"
            />
          </div>
          <div className="creator-profile-copy">
            <span className="panel-tag">Por trás do projeto</span>
            <p className="creator-kicker">KHALEESI SAITHE</p>
            <h2>Transformando experiência de operação em ferramentas úteis.</h2>
            <p>
              Em transição de operações e varejo para a Ciência de Dados,
              Khaleesi cursa Estácio de Sá e cria produtos que nascem de
              problemas reais de quem trabalha com atendimento e conferência de
              caixa.
            </p>
            <p>
              Entre os projetos estão o <strong>PDFToolkit</strong>, para
              relatórios de vendas em PDF, e o{" "}
              <strong>PixBee/ContaCaixa</strong>, pensado para facilitar o
              fechamento de caixa no dia a dia.
            </p>
          </div>
        </article>
        <aside className="glass-panel creator-connect">
          <div className="creator-connect-intro">
            <span>Vamos nos conectar</span>
            <h2>Acompanhe os projetos e a jornada de criação.</h2>
            <p>
              Esta página reúne os canais profissionais da criadora do PixBee.
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
                <strong>Portfólio</strong>
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
              <span className="pix-support-label">APOIE O PROJETO</span>
              <strong>Contribuição via Pix</strong>
              <small>
                Se o PixBee for útil para você, qualquer apoio ajuda a manter a
                evolução do projeto.
              </small>
            </div>
            <div className="pix-key">
              <span>Chave Pix</span>
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
              {pixCopied ? "Chave copiada" : "Copiar chave Pix"}
            </Button>
          </section>
        </aside>
      </section>
    </AppShell>
  );
}

function AboutPage() {
  const contactItems = [
    { label: "Portfólio", detail: "Link do seu portfólio", icon: Store },
    { label: "LinkedIn", detail: "Perfil profissional", icon: UserRound },
    { label: "GitHub", detail: "Projetos e código", icon: Settings },
    {
      label: "Contribuir",
      detail: "Apoie este projeto",
      icon: CircleDollarSign,
    },
  ];
  return (
    <AppShell title="Sobre o PixBee" currentStep={1}>
      <section className="about-page">
        <article className="glass-panel about-intro">
          <span className="panel-tag">Por trás do projeto</span>
          <div className="creator-avatar">
            <UserRound size={46} />
          </div>
          <h2>
            Este espaço é de quem está transformando aprendizado em produto.
          </h2>
          <p>
            O PixBee FechaCaixa nasceu como um projeto de estudo aplicado: uma
            forma de aprender programação criando uma ferramenta útil para
            operações reais.
          </p>
          <div className="about-placeholder">
            <strong>Seu nome aqui</strong>
            <span>Criador do PixBee FechaCaixa</span>
            <small>
              Envie sua foto, uma breve apresentação e seus links para
              personalizar este perfil.
            </small>
          </div>
        </article>
        <article className="glass-panel about-connect">
          <div>
            <span>Conecte-se</span>
            <h2>Conheça o criador e acompanhe a evolução do projeto.</h2>
            <p>
              Os atalhos abaixo estão estruturados para receber seus links
              oficiais.
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
                      `O link de ${item.label} será ativado quando os dados do criador forem adicionados.`
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
  return (
    <AppShell title="Privacidade e direitos" currentStep={1}>
      <section className="legal-page">
        <header className="glass-panel legal-hero">
          <span className="panel-tag">Transparência do PixBee</span>
          <h2>
            Dados do caixa ficam no seu navegador. As regras de uso ficam
            visíveis.
          </h2>
          <p>
            Esta página explica como a versão atual do PixBee FechaCaixa trata
            as informações do turno, quais são as responsabilidades do operador
            e como os direitos sobre o software são declarados.
          </p>
          <p className="legal-updated">Atualizado em 21 de agosto de 2026</p>
        </header>
        <div className="legal-grid">
          <article className="glass-panel legal-card">
            <span>01 · PRIVACIDADE</span>
            <h3>O que é guardado</h3>
            <p>
              O PixBee pode armazenar no navegador o nome do operador, a
              empresa, os valores de abertura e conferência, os lançamentos de
              sangria e suprimento, horários, observações, justificativas de
              auditoria e o histórico de turnos.
            </p>
            <p>
              Esses dados são usados apenas para calcular, revisar, imprimir e
              exportar o fechamento de caixa no dispositivo em que foram
              lançados.
            </p>
          </article>
          <article className="glass-panel legal-card">
            <span>02 · ARMAZENAMENTO</span>
            <h3>Onde ficam os dados</h3>
            <p>
              Nesta versão, os dados operacionais ficam no armazenamento local
              do navegador. O histórico de turnos permanece disponível por até
              três dias, salvo quando o próprio operador o remove antes disso.
            </p>
            <p>
              O PixBee não envia o histórico financeiro local para uma base de
              dados própria do sistema. Limpar os dados do navegador ou usar
              outro dispositivo pode remover ou separar esses registros.
            </p>
          </article>
          <article className="glass-panel legal-card">
            <span>03 · SEGURANÇA</span>
            <h3>Cuidados do operador</h3>
            <p>
              Em computador compartilhado, finalize o turno, exporte ou imprima
              o relatório necessário e remova o histórico ao encerrar o uso.
              Proteja o dispositivo e o perfil do navegador com senha.
            </p>
            <p>
              O armazenamento local reduz a circulação dos dados, mas não
              substitui políticas internas, controles de acesso ou procedimentos
              de segurança da empresa usuária.
            </p>
          </article>
          <article className="glass-panel legal-card">
            <span>04 · SEUS CONTROLES</span>
            <h3>Acesso, correção e exclusão</h3>
            <p>
              O operador pode revisar o histórico local, editar lançamentos com
              justificativa registrada e remover os dados do dispositivo pelo
              histórico do PixBee ou pelas configurações do navegador. A
              exclusão de lançamentos continua registrada na trilha de auditoria
              do turno enquanto o histórico existir.
            </p>
          </article>
          <article className="glass-panel legal-card">
            <span>05 · DIREITOS AUTORAIS</span>
            <h3>PixBee FechaCaixa</h3>
            <p>
              © 2026 Khaleesi Saithe. Todos os direitos sobre o código
              original, identidade visual, textos, estrutura de interface e
              materiais do PixBee são reservados, exceto onde houver licença
              expressa em contrário.
            </p>
            <p>
              Bibliotecas e ativos de terceiros usados pelo projeto permanecem
              sujeitos às respectivas licenças. Não é autorizada a reprodução
              comercial, redistribuição ou criação de produto derivado do código
              original sem autorização escrita da titular.
            </p>
          </article>
          <article className="glass-panel legal-card legal-contact">
            <span>06 · CONTATO E ATUALIZAÇÕES</span>
            <h3>Dúvidas ou pedidos</h3>
            <p>
              Para dúvidas sobre esta política, uso do projeto ou direitos de
              autoria, entre em contato pelo perfil profissional da criadora.
              Quando o PixBee passar a usar cadastro, banco de dados, pagamentos
              ou integração com caixa externo, esta página deverá ser revisada
              antes da ativação.
            </p>
            <a
              href="https://github.com/khaleesisaithe"
              target="_blank"
              rel="noreferrer"
            >
              Falar com Khaleesi Saithe <ArrowRight size={16} />
            </a>
          </article>
          <article className="glass-panel legal-card">
            <span>07 · EXPERIÊNCIA DO CLIENTE</span>
            <h3>Relatos enviados pelo formulário</h3>
            <p>
              O envio é opcional. Quando a pessoa preenche o formulário de
              experiência, o PixBee encaminha e-mail de contato, perfil,
              empresa, CNPJ, relato e sugestão pelo serviço hospedado
              {" "}
              <a
                href="https://formspree.io/legal/privacy-policy/"
                target="_blank"
                rel="noreferrer"
              >
                Formspree
              </a>
              {" "}
              para a criadora responder e avaliar melhorias no sistema.
            </p>
            <p>
              Esses dados não se misturam ao histórico financeiro local do
              caixa. Não envie senhas, dados de cartão, chaves Pix ou outras
              informações de pagamento pelo formulário; o envio fica sujeito
              à política de privacidade do serviço hospedado.
            </p>
          </article>
        </div>
        <aside className="glass-panel legal-note">
          <strong>Importante</strong>
          <p>
            Este conteúdo descreve a versão local atual do PixBee e é uma base
            de transparência. Para uso comercial, coleta remota de dados ou
            integração com sistemas de terceiros, revise os documentos com
            orientação jurídica especializada.
          </p>
          <div>
            <a
              href="https://www.planalto.gov.br/ccivil_03/_ato2015-2018/2018/lei/l13709.htm"
              target="_blank"
              rel="noreferrer"
            >
              LGPD — Lei nº 13.709/2018
            </a>
            <a
              href="https://www.planalto.gov.br/ccivil_03/leis/l9609.htm"
              target="_blank"
              rel="noreferrer"
            >
              Lei do Software — Lei nº 9.609/1998
            </a>
          </div>
        </aside>
      </section>
    </AppShell>
  );
}

function RetentionShell({ children }: { children: React.ReactNode }) {
  const [location, navigate] = useLocation();
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
              Histórico local disponível para relatório
            </AlertDialogTitle>
            <AlertDialogDescription>
              Há turnos com mais de três dias neste navegador. Gere o relatório
              antes da limpeza do cache para preservar os registros e a
              auditoria no canhoto.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Fazer depois</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                setOpen(false);
                navigate("/historico");
              }}
            >
              <History size={16} /> Abrir relatório
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
