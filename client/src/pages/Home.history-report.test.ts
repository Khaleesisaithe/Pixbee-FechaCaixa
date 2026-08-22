import { describe, expect, it, vi } from "vitest";
import type { ShiftHistoryRecord } from "./Home";

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
    expect(writtenText).toContain("Total acumulado em espécie");
    expect(writtenText).toContain("R$ 155,00");
  });
});
