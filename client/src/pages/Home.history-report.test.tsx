import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import {
  isHistoryExpired,
  sumDenominationQuantities,
  ThermalReceipt,
  type ShiftHistoryRecord,
} from "./Home";
import { LanguageProvider } from "../contexts/LanguageContext";
import { createEmptyQuantities } from "../contexts/CashSessionContext";

const pdf = vi.hoisted(() => {
  const text = vi.fn();
  const noop = vi.fn();
  return {
    text,
    createDocument: () => ({
      setFillColor: noop,
      rect: noop,
      roundedRect: noop,
      setFont: noop,
      setFontSize: noop,
      setTextColor: noop,
      text,
      setDrawColor: noop,
      line: noop,
      addPage: noop,
      setLineDashPattern: noop,
      splitTextToSize: (value: string) => [value],
      setProperties: noop,
      save: noop,
    }),
  };
});

vi.mock("jspdf", () => ({
  jsPDF: function MockJsPDF() {
    return pdf.createDocument();
  },
}));

import { exportHistoryPdf } from "./Home";

const record: ShiftHistoryRecord = {
  id: "turno-1",
  shiftId: "turno-1",
  company: "Empresa de teste",
  operator: "Operador de teste",
  startedAt: "2026-08-22T05:00:00.000Z",
  finishedAt: "2026-08-22T05:10:00.000Z",
  totalExpected: 255,
  totalFound: 255,
  difference: 0,
  status: "SEM QUEBRA",
  cashEntries: [
    {
      id: "entrada-1",
      shiftId: "turno-1",
      grossAmount: 30,
      changeAmount: 5,
      amount: 25,
      createdAt: "2026-08-22T05:01:00.000Z",
    },
    {
      id: "entrada-2",
      shiftId: "turno-1",
      amount: 35,
      createdAt: "2026-08-22T05:02:00.000Z",
    },
    {
      id: "entrada-3",
      shiftId: "turno-1",
      amount: 95,
      createdAt: "2026-08-22T05:03:00.000Z",
    },
  ],
  adjustments: [],
  auditTrail: [],
};

describe("relatório PDF de histórico", () => {
  it("lista as entradas em espécie e o total acumulado do turno", () => {
    pdf.text.mockClear();

    exportHistoryPdf([record]);

    const writtenText = pdf.text.mock.calls
      .flatMap(([content]) => (Array.isArray(content) ? content : [content]))
      .join(" ");

    expect(writtenText).toContain("ENTRADAS EM ESPÉCIE");
    expect(writtenText).toContain("Entrada em dinheiro");
    expect(writtenText).toContain("Recebido");
    expect(writtenText).toContain("troco");
    expect(writtenText).toContain("Líquido");
    expect(writtenText).toContain("Total acumulado em espécie");
    expect(writtenText).toContain("R$ 155,00");
  });

  it("identifica somente os turnos que alcançaram a retenção de três dias", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-08-25T12:00:00.000Z"));

    expect(
      isHistoryExpired([
        { ...record, finishedAt: "2026-08-22T12:00:00.000Z" },
      ])
    ).toBe(true);
    expect(
      isHistoryExpired([
        { ...record, finishedAt: "2026-08-22T12:00:01.000Z" },
      ])
    ).toBe(false);

    vi.useRealTimers();
  });

  it("totaliza o fundo de caixa a partir de cédulas e moedas", () => {
    const quantities = createEmptyQuantities();
    quantities.n10 = 2;
    quantities.m50 = 3;

    expect(sumDenominationQuantities(quantities)).toBe(21.5);
  });

  it("gera o relatório PDF em inglês quando o locale é solicitado", () => {
    pdf.text.mockClear();

    exportHistoryPdf([record], { locale: "en", download: false });

    const writtenText = pdf.text.mock.calls
      .flatMap(([content]) => (Array.isArray(content) ? content : [content]))
      .join(" ");

    expect(writtenText).toContain("LOCAL HISTORY REPORT");
    expect(writtenText).toContain("CASH ENTRIES");
    expect(writtenText).toContain("Received");
    expect(writtenText).toContain("Net +");
  });

  it("inclui identificação do turno, troco e valor líquido no comprovante térmico", () => {
    const receipt = renderToStaticMarkup(
      <LanguageProvider>
        <ThermalReceipt
        session={{
          operator: "Operador de teste",
          company: "Empresa de teste",
          shiftLabel: "Turno manhã",
          openingFloat: 10,
          observation: "",
          closureNote: "",
          adjustments: [],
          auditTrail: [],
          cashEntries: [record.cashEntries[0]],
          startedAt: "2026-08-22T05:00:00.000Z",
        }}
        variations={[]}
        totalExpected={25}
        totalFound={25}
        difference={0}
        status="SEM QUEBRA"
        finishedAt="2026-08-22T05:10:00.000Z"
        />
      </LanguageProvider>
    );

    expect(receipt).toContain("Turno manhã");
    expect(receipt).toContain("Recebido");
    expect(receipt).toContain("troco");
    expect(receipt).toContain("Líquido");
  });
});
