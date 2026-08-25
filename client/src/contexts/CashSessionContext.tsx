/**
 * Design: PixBee original — dados locais que alimentam o fluxo de abertura,
 * contagem e validação mantendo a experiência de painel em vidro.
 */
import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import React from "react";

export type MethodId =
  | "cash"
  | "pix"
  | "debit"
  | "credit"
  | "voucher"
  | "withdrawal"
  | "supply";
export type Amounts = Record<MethodId, number>;
export type Quantities = Record<string, number>;
export type AdjustmentKind = "withdrawal" | "supply";
export type ShiftDurationHours = 6 | 8 | 12;
export type AdjustmentEntry = {
  id: string;
  shiftId: string;
  type: AdjustmentKind;
  amount: number;
  /** Cédulas e moedas movimentadas no lançamento. */
  quantities?: Quantities;
  createdAt: string;
  note: string;
};
export type CashEntry = {
  id: string;
  shiftId: string;
  /** Valor recebido antes do eventual troco. */
  grossAmount?: number;
  /** Valor efetivamente devolvido ao cliente. */
  changeAmount?: number;
  /** Composição opcional do dinheiro recebido por cédulas e moedas. */
  receivedQuantities?: Quantities;
  /** Composição opcional do troco por cédulas e moedas. */
  changeQuantities?: Quantities;
  /** Valor líquido que permanece no caixa e compõe o esperado. */
  amount: number;
  createdAt: string;
};
export const sumCashEntries = (entries: CashEntry[]) =>
  entries.reduce((total, entry) => total + entry.amount, 0);
export const getNetCashEntryAmount = (grossAmount: number, changeAmount = 0) =>
  Math.max(0, grossAmount - changeAmount);
export const getStartedAt = (startedAt: string | null, now: string) =>
  startedAt ?? now;
export const getShiftDeadline = (
  startedAt: string | null,
  durationHours: ShiftDurationHours,
  extensionMinutes = 0
) =>
  startedAt
    ? new Date(
        new Date(startedAt).getTime() +
          (durationHours * 60 + extensionMinutes) * 60 * 1000
      ).toISOString()
    : null;
export const getShiftRemainingMs = (
  startedAt: string | null,
  durationHours: ShiftDurationHours,
  extensionMinutes: number,
  now = Date.now()
) => {
  const deadline = getShiftDeadline(startedAt, durationHours, extensionMinutes);
  return deadline ? Math.max(0, new Date(deadline).getTime() - now) : 0;
};
export type AdjustmentSnapshot = Pick<
  AdjustmentEntry,
  "amount" | "createdAt" | "note"
>;
export type AuditEvent = {
  id: string;
  shiftId: string;
  adjustmentId: string;
  type: AdjustmentKind;
  action: "created" | "updated" | "deleted";
  occurredAt: string;
  justification?: string;
  previous?: AdjustmentSnapshot;
  current?: AdjustmentSnapshot;
};

export type CashSession = {
  operator: string;
  company: string;
  shiftLabel: string;
  openingFloat: number | null;
  openingQuantities: Quantities;
  observation: string;
  selectedMethods: MethodId[];
  expected: Amounts;
  confirmed: Amounts;
  quantities: Quantities;
  cashEntries: CashEntry[];
  adjustments: AdjustmentEntry[];
  auditTrail: AuditEvent[];
  shiftId: string | null;
  startedAt: string | null;
  durationHours: ShiftDurationHours;
  extensionMinutes: number;
  extensionUsed: boolean;
  closureRequired: boolean;
  closureNote: string;
  validatedAt: string | null;
};

type CashSessionContextValue = {
  session: CashSession;
  setSession: React.Dispatch<React.SetStateAction<CashSession>>;
  resetSession: () => void;
  startNextSession: (importPhysical?: boolean) => void;
};

const SESSION_KEY = "pixbee-fecha-caixa-session-v2";

export const createEmptyAmounts = (): Amounts => ({
  cash: 0,
  pix: 0,
  debit: 0,
  credit: 0,
  voucher: 0,
  withdrawal: 0,
  supply: 0,
});

export const createEmptyQuantities = (): Quantities => ({
  n200: 0,
  n100: 0,
  n50: 0,
  n20: 0,
  n10: 0,
  n5: 0,
  n2: 0,
  m100: 0,
  m50: 0,
  m25: 0,
  m10: 0,
  m5: 0,
  m1: 0,
});

/** A contagem inicia com o fundo confirmado e nunca com chaves ausentes. */
export const createQuantitiesFromOpening = (opening: Quantities): Quantities => ({
  ...createEmptyQuantities(),
  ...opening,
});

const DENOMINATION_VALUES: Record<string, number> = {
  n200: 200,
  n100: 100,
  n50: 50,
  n20: 20,
  n10: 10,
  n5: 5,
  n2: 2,
  m100: 1,
  m50: 0.5,
  m25: 0.25,
  m10: 0.1,
  m5: 0.05,
  m1: 0.01,
};
export const getInheritedOpening = (quantities: Quantities) => {
  const inheritedQuantities = createQuantitiesFromOpening(quantities);
  const inheritedFloat = Object.entries(inheritedQuantities).reduce(
    (total, [key, quantity]) => total + (DENOMINATION_VALUES[key] ?? 0) * quantity,
    0
  );
  return { quantities: inheritedQuantities, openingFloat: inheritedFloat };
};

export const applyPhysicalMovement = (
  current: Quantities,
  incoming: Quantities = createEmptyQuantities(),
  outgoing: Quantities = createEmptyQuantities(),
  minimum: Quantities = createEmptyQuantities()
): Quantities =>
  Object.fromEntries(
    Object.keys({ ...current, ...incoming, ...outgoing, ...minimum }).map(key => [
      key,
      Math.max(minimum[key] ?? 0, (current[key] ?? 0) + (incoming[key] ?? 0) - (outgoing[key] ?? 0)),
    ])
  );

export const createNewSession = (): CashSession => ({
  operator: "",
  company: "",
  shiftLabel: "",
  openingFloat: null,
  openingQuantities: createEmptyQuantities(),
  observation: "",
  selectedMethods: ["cash"],
  expected: createEmptyAmounts(),
  confirmed: createEmptyAmounts(),
  quantities: createEmptyQuantities(),
  cashEntries: [],
  adjustments: [],
  auditTrail: [],
  shiftId: null,
  startedAt: null,
  durationHours: 8,
  extensionMinutes: 0,
  extensionUsed: false,
  closureRequired: false,
  closureNote: "",
  validatedAt: null,
});

export const createNextSession = (current: CashSession, importPhysical = true): CashSession => {
  const next = createNewSession();
  if (!importPhysical) return next;
  const inherited = getInheritedOpening(current.quantities);
  return {
    ...next,
    openingFloat: inherited.openingFloat,
    openingQuantities: inherited.quantities,
    quantities: inherited.quantities,
  };
};

const CashSessionContext = createContext<CashSessionContextValue | null>(null);

export function CashSessionProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<CashSession>(() => {
    try {
      const saved = localStorage.getItem(SESSION_KEY);
      if (!saved) return createNewSession();
      const parsed = JSON.parse(saved) as Partial<CashSession>;
      return {
        ...createNewSession(),
        ...parsed,
        expected: { ...createEmptyAmounts(), ...parsed.expected },
        confirmed: { ...createEmptyAmounts(), ...parsed.confirmed },
        quantities: { ...createEmptyQuantities(), ...parsed.quantities },
        openingQuantities: {
          ...createEmptyQuantities(),
          ...parsed.openingQuantities,
        },
        cashEntries: Array.isArray(parsed.cashEntries)
          ? parsed.cashEntries.map(entry => ({
              ...entry,
              shiftId: entry.shiftId ?? parsed.shiftId ?? "turno-legado",
              grossAmount: entry.grossAmount ?? entry.amount,
              changeAmount: entry.changeAmount ?? 0,
              receivedQuantities: {
                ...createEmptyQuantities(),
                ...entry.receivedQuantities,
              },
              changeQuantities: {
                ...createEmptyQuantities(),
                ...entry.changeQuantities,
              },
            }))
          : [],
        adjustments: Array.isArray(parsed.adjustments)
          ? parsed.adjustments.map(entry => ({
              ...entry,
              shiftId: entry.shiftId ?? parsed.shiftId ?? "turno-legado",
              quantities: {
                ...createEmptyQuantities(),
                ...entry.quantities,
              },
            }))
          : [],
        auditTrail: Array.isArray(parsed.auditTrail) ? parsed.auditTrail : [],
      };
    } catch {
      return createNewSession();
    }
  });

  useEffect(() => {
    localStorage.setItem(SESSION_KEY, JSON.stringify(session));
  }, [session]);

  function resetSession() {
    setSession(createNewSession());
  }

  function startNextSession(importPhysical = true) {
    setSession(current => createNextSession(current, importPhysical));
  }

  return (
    <CashSessionContext.Provider value={{ session, setSession, resetSession, startNextSession }}>
      {children}
    </CashSessionContext.Provider>
  );
}

export function useCashSession() {
  const context = useContext(CashSessionContext);
  if (!context)
    throw new Error(
      "useCashSession deve ser usado dentro de CashSessionProvider."
    );
  return context;
}
