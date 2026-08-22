import { describe, expect, it } from "vitest";
import {
  createNewSession,
  sumCashEntries,
  type CashEntry,
} from "./CashSessionContext";

describe("entradas acumulativas em espécie", () => {
  it("inicia uma sessão com a coleção de entradas pronta para persistência", () => {
    expect(createNewSession().cashEntries).toEqual([]);
  });

  it("totaliza cada entrada individual para uso consistente no fechamento", () => {
    const entries: CashEntry[] = [
      {
        id: "entrada-1",
        shiftId: "turno-1",
        amount: 25,
        createdAt: "2026-08-22T05:00:00.000Z",
      },
      {
        id: "entrada-2",
        shiftId: "turno-1",
        amount: 35,
        createdAt: "2026-08-22T05:01:00.000Z",
      },
      {
        id: "entrada-3",
        shiftId: "turno-1",
        amount: 95,
        createdAt: "2026-08-22T05:02:00.000Z",
      },
    ];

    expect(sumCashEntries(entries)).toBe(155);
  });
});
