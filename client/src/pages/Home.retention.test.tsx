// @vitest-environment jsdom
import React from "react";
import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import { CashSessionProvider } from "../contexts/CashSessionContext";
import { ThemeProvider } from "../contexts/ThemeContext";
import { LanguageProvider } from "../contexts/LanguageContext";
import { HISTORY_KEY, HistoryPage, type ShiftHistoryRecord } from "./Home";

const savedReports = vi.hoisted(() => vi.fn());

vi.mock("jspdf", () => ({
  jsPDF: function MockJsPDF() {
    return {
      setFillColor: vi.fn(),
      rect: vi.fn(),
      roundedRect: vi.fn(),
      setFont: vi.fn(),
      setFontSize: vi.fn(),
      setTextColor: vi.fn(),
      text: vi.fn(),
      setDrawColor: vi.fn(),
      line: vi.fn(),
      addPage: vi.fn(),
      setLineDashPattern: vi.fn(),
      splitTextToSize: (value: string) => [value],
      setProperties: vi.fn(),
      save: savedReports,
    };
  },
}));

const expiredRecord: ShiftHistoryRecord = {
  id: "turno-vencido",
  shiftId: "turno-vencido",
  company: "Empresa de teste",
  operator: "Operador de teste",
  startedAt: "2026-08-20T08:00:00.000Z",
  finishedAt: "2026-08-20T09:00:00.000Z",
  totalExpected: 10,
  totalFound: 10,
  difference: 0,
  status: "SEM QUEBRA",
  cashEntries: [],
  adjustments: [],
  auditTrail: [],
};

function renderHistory() {
  return render(
      <CashSessionProvider>
        <ThemeProvider>
          <LanguageProvider>
            <HistoryPage />
          </LanguageProvider>
        </ThemeProvider>
      </CashSessionProvider>
  );
}

afterEach(() => {
  cleanup();
  vi.useRealTimers();
  window.localStorage.clear();
  savedReports.mockClear();
});

describe("retenção local de histórico", () => {
  it("mantém os turnos vencidos quando o operador escolhe limpar depois", async () => {
    window.localStorage.setItem(HISTORY_KEY, JSON.stringify([expiredRecord]));
    const user = userEvent.setup();

    renderHistory();
    await user.click(screen.getByRole("button", { name: "Limpar depois" }));

    expect(window.localStorage.getItem(HISTORY_KEY)).toContain("turno-vencido");
  });

  it("remove o histórico somente depois de gerar o PDF de arquivamento", async () => {
    window.localStorage.setItem(HISTORY_KEY, JSON.stringify([expiredRecord]));
    const user = userEvent.setup();

    renderHistory();
    await user.click(
      screen.getByRole("button", { name: /Baixar PDF e limpar/i })
    );
    await new Promise(resolve => window.setTimeout(resolve, 160));

    expect(savedReports).toHaveBeenCalledTimes(1);
    expect(window.localStorage.getItem(HISTORY_KEY)).toBeNull();
  });
});
