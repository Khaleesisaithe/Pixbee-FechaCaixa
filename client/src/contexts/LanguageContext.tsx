import React, { createContext, useContext, useEffect, useState } from "react";

export type Locale = "pt-BR" | "en";

export const PIXBEE_LANGUAGES: Array<{ id: Locale; label: string; description: string }> = [
  { id: "pt-BR", label: "Português", description: "Idioma padrão do PixBee." },
  { id: "en", label: "English", description: "English interface for daily operations." },
];

const messages = {
  "pt-BR": {
    "nav.home": "Início",
    "nav.newCount": "Nova contagem",
    "nav.history": "Histórico",
    "nav.privacy": "Privacidade",
    "nav.about": "Sobre o PixBee",
    "tools.title": "Preferências rápidas",
    "tools.subtitle": "Ajustes salvos neste navegador",
    "tools.contrast": "Alto contraste",
    "tools.contrastOn": "Alto contraste ativo",
    "tools.feedback": "Falar sobre a experiência",
    "tools.theme": "Escolha uma paleta",
    "tools.language": "Idioma da interface",
    "tools.open": "Abrir preferências rápidas",
    "tools.close": "Fechar preferências rápidas",
    "page.system": "Sistema de fechamento",
    "page.opening": "Abertura de contagem",
    "page.count": "Contagem em andamento",
    "page.validation": "Validação do fechamento",
    "page.history": "Histórico de turnos",
    "welcome.kicker": "Controle local e seguro",
    "welcome.title": "Feche o caixa com clareza, controle e menos retrabalho.",
    "welcome.copy": "Abra o turno, informe o fundo em cédulas e moedas, registre entradas e confira o resultado antes de validar.",
    "welcome.start": "Iniciar contagem",
    "welcome.local": "Dados locais no navegador; histórico disponível por até três dias.",
    "welcome.flow": "Como o PixBee organiza seu fechamento",
    "welcome.flowCopy": "1. Identifique o turno e escolha as modalidades. 2. Registre entradas, troco, suprimentos e sangrias. 3. Confira o dinheiro físico e os totais. 4. Valide, imprima e abra a próxima contagem.",
    "welcome.pillCash": "Fundo, notas e moedas",
    "welcome.pillDigital": "PIX, cartões e vales",
    "welcome.pillAudit": "Histórico e auditoria",
    "welcome.featureCount": "Cédulas, moedas e entradas atualizam os subtotais na hora.",
    "welcome.featureTimer": "Escolha 6, 8 ou 12 horas; o cronômetro continua entre telas.",
    "welcome.featureValidation": "Compare esperado e encontrado, corrija o troco e imprima em 80 mm",
    "count.step": "Etapa 02",
    "count.title": "Registre os valores do turno.",
    "count.copy": "O valor esperado é comparado com aquilo que foi efetivamente conferido.",
    "opening.step": "Etapa 01",
    "opening.title": "Identifique o caixa e escolha o que será conferido.",
    "opening.copy": "Esses dados formam a base da sua validação final.",
    "history.start": "Iniciar contagem",
  },
  en: {
    "nav.home": "Home",
    "nav.newCount": "New count",
    "nav.history": "History",
    "nav.privacy": "Privacy",
    "nav.about": "About PixBee",
    "tools.title": "Quick preferences",
    "tools.subtitle": "Settings saved in this browser",
    "tools.contrast": "High contrast",
    "tools.contrastOn": "High contrast on",
    "tools.feedback": "Share your experience",
    "tools.theme": "Choose a palette",
    "tools.language": "Interface language",
    "tools.open": "Open quick preferences",
    "tools.close": "Close quick preferences",
    "page.system": "Closing dashboard",
    "page.opening": "Count opening",
    "page.count": "Count in progress",
    "page.validation": "Closing validation",
    "page.history": "Shift history",
    "welcome.kicker": "Local and secure control",
    "welcome.title": "Close your drawer with clarity, control, and less rework.",
    "welcome.copy": "Open the shift, enter notes and coins in the starting float, record entries, and review the result before validation.",
    "welcome.start": "Start count",
    "welcome.local": "Local browser data; shift history is available for up to three days.",
    "welcome.flow": "How PixBee organizes your closing",
    "welcome.flowCopy": "1. Identify the shift and choose payment methods. 2. Record entries, change, supplies, and withdrawals. 3. Count physical cash and review totals. 4. Validate, print, and open the next count.",
    "welcome.pillCash": "Float, notes, and coins",
    "welcome.pillDigital": "PIX, cards, and vouchers",
    "welcome.pillAudit": "History and audit trail",
    "welcome.featureCount": "Notes, coins, and cash entries update subtotals instantly.",
    "welcome.featureTimer": "Choose 6, 8, or 12 hours; the timer persists between screens.",
    "welcome.featureValidation": "Compare expected and found values, correct change, and print at 80 mm",
    "count.step": "Step 02",
    "count.title": "Record the shift values.",
    "count.copy": "Expected values are compared with the amounts actually counted.",
    "opening.step": "Step 01",
    "opening.title": "Identify the cash drawer and choose what to reconcile.",
    "opening.copy": "These details form the basis of your final validation.",
    "history.start": "Start count",
  },
} as const;

type TranslationKey = keyof (typeof messages)["pt-BR"];

type LanguageContextValue = {
  locale: Locale;
  setLocale: (locale: Locale) => void;
  t: (key: TranslationKey) => string;
};

const LanguageContext = createContext<LanguageContextValue | undefined>(undefined);

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  const [locale, setLocale] = useState<Locale>(() => {
    const previewLocale = typeof window === "undefined"
      ? null
      : new URLSearchParams(window.location.search).get("lang");
    if (previewLocale === "en") return "en";
    const stored = typeof window === "undefined" ? null : localStorage.getItem("pixbee-locale");
    return stored === "en" ? "en" : "pt-BR";
  });

  useEffect(() => {
    document.documentElement.lang = locale;
    localStorage.setItem("pixbee-locale", locale);
  }, [locale]);

  const t = (key: TranslationKey) => messages[locale][key];

  return (
    <LanguageContext.Provider value={{ locale, setLocale, t }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  const context = useContext(LanguageContext);
  if (!context) throw new Error("useLanguage must be used within LanguageProvider");
  return context;
}
