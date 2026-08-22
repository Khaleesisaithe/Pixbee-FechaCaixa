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
export type AdjustmentEntry = {
  id: string;
  shiftId: string;
  type: AdjustmentKind;
  amount: number;
  createdAt: string;
  note: string;
};
export type CashEntry = {
  id: string;
  shiftId: string;
  amount: number;
  createdAt: string;
};
export const sumCashEntries = (entries: CashEntry[]) =>
  entries.reduce((total, entry) => total + entry.amount, 0);
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
  openingFloat: number | null;
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
  closureNote: string;
  validatedAt: string | null;
};

type CashSessionContextValue = {
  session: CashSession;
  setSession: React.Dispatch<React.SetStateAction<CashSession>>;
  resetSession: () => void;
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

export const createNewSession = (): CashSession => ({
  operator: "",
  company: "",
  openingFloat: null,
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
  closureNote: "",
  validatedAt: null,
});

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
        cashEntries: Array.isArray(parsed.cashEntries)
          ? parsed.cashEntries.map(entry => ({
              ...entry,
              shiftId: entry.shiftId ?? parsed.shiftId ?? "turno-legado",
            }))
          : [],
        adjustments: Array.isArray(parsed.adjustments)
          ? parsed.adjustments.map(entry => ({
              ...entry,
              shiftId: entry.shiftId ?? parsed.shiftId ?? "turno-legado",
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

  return (
    <CashSessionContext.Provider value={{ session, setSession, resetSession }}>
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
