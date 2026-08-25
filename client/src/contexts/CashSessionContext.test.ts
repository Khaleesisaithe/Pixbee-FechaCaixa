import { describe, expect, it } from "vitest";
import {
  applyPhysicalMovement,
  createEmptyQuantities,
  createNewSession,
  createNextSession,
  createQuantitiesFromOpening,
  getInheritedOpening,
  getNetCashEntryAmount,
  getShiftDeadline,
  getShiftRemainingMs,
  getStartedAt,
  sumCashEntries,
  type CashEntry,
} from "./CashSessionContext";

describe("entradas acumulativas em espécie", () => {
  it("inicia uma sessão com a coleção de entradas pronta para persistência", () => {
    const session = createNewSession();

    expect(session.cashEntries).toEqual([]);
    expect(session.openingQuantities).toEqual(createEmptyQuantities());
    expect(session.startedAt).toBeNull();
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

  it("mantém somente o valor líquido da entrada quando existe troco", () => {
    expect(getNetCashEntryAmount(20, 7.5)).toBe(12.5);
    expect(getNetCashEntryAmount(20)).toBe(20);
    expect(getNetCashEntryAmount(20, 25)).toBe(0);
  });

  it("preserva o início original ao navegar entre as etapas do mesmo turno", () => {
    const original = "2026-08-25T12:00:00.000Z";
    const subsequentAttempt = "2026-08-25T12:05:00.000Z";

    expect(getStartedAt(original, subsequentAttempt)).toBe(original);
    expect(getStartedAt(null, subsequentAttempt)).toBe(subsequentAttempt);
  });

  it("copia as cédulas e moedas do fundo como base independente da contagem", () => {
    const opening = {
      ...createEmptyQuantities(),
      n20: 2,
      n5: 1,
      m50: 4,
    };

    const quantities = createQuantitiesFromOpening(opening);

    expect(quantities).toEqual(opening);
    expect(quantities).not.toBe(opening);
  });

  it("calcula um prazo persistente a partir do início e da duração escolhida", () => {
    const startedAt = "2026-08-25T12:00:00.000Z";
    expect(getShiftDeadline(startedAt, 6)).toBe("2026-08-25T18:00:00.000Z");
    expect(getShiftDeadline(startedAt, 12, 30)).toBe("2026-08-26T00:30:00.000Z");
  });

  it("mantém o tempo restante determinístico e zera depois do prazo", () => {
    const startedAt = "2026-08-25T12:00:00.000Z";
    const deadline = getShiftDeadline(startedAt, 8);
    expect(getShiftRemainingMs(startedAt, 8, 0, Date.parse("2026-08-25T15:00:00.000Z"))).toBe(5 * 60 * 60 * 1000);
    expect(getShiftRemainingMs(startedAt, 8, 0, Date.parse(deadline!))).toBe(0);
  });

  it("herda a composição física e calcula o novo fundo sem carregar identidade ou lançamentos", () => {
    const inherited = getInheritedOpening({ ...createEmptyQuantities(), n20: 2, m50: 3 });
    expect(inherited.quantities).toEqual({ ...createEmptyQuantities(), n20: 2, m50: 3 });
    expect(inherited.openingFloat).toBe(41.5);
  });

  it("importa a composição final quando a nova contagem é iniciada com Sim", () => {
    const current = {
      ...createNewSession(),
      operator: "Operador anterior",
      company: "Empresa anterior",
      quantities: { ...createEmptyQuantities(), n20: 2, m100: 3, m50: 2 },
    };

    const next = createNextSession(current, true);

    expect(next.quantities).toEqual({ ...createEmptyQuantities(), n20: 2, m100: 3, m50: 2 });
    expect(next.openingQuantities).toEqual(next.quantities);
    expect(next.openingFloat).toBe(44);
    expect(next.operator).toBe("");
    expect(next.company).toBe("");
    expect(next.cashEntries).toEqual([]);
  });

  it("mantém o preenchimento manual quando a nova contagem é iniciada com Não", () => {
    const current = {
      ...createNewSession(),
      quantities: { ...createEmptyQuantities(), n20: 2 },
    };

    const next = createNextSession(current, false);

    expect(next.quantities).toEqual(createEmptyQuantities());
    expect(next.openingQuantities).toEqual(createEmptyQuantities());
    expect(next.openingFloat).toBeNull();
  });

  it("aplica entradas e saídas físicas sem permitir que a sangria consuma o fundo", () => {
    const current = { ...createEmptyQuantities(), n20: 2, n10: 1 };
    const incoming = { ...createEmptyQuantities(), n5: 2 };
    const outgoing = { ...createEmptyQuantities(), n20: 1, n10: 1 };
    const minimum = { ...createEmptyQuantities(), n20: 1 };
    expect(applyPhysicalMovement(current, incoming)).toMatchObject({ n20: 2, n10: 1, n5: 2 });
    expect(applyPhysicalMovement(current, incoming, outgoing, minimum)).toMatchObject({ n20: 1, n10: 0, n5: 2 });
  });
});
