import { useCashSession } from "@/contexts/CashSessionContext";
import { useLanguage } from "@/contexts/LanguageContext";
import { PIXBEE_THEMES, useTheme } from "@/contexts/ThemeContext";
import { useHighContrastMode } from "@/hooks/useHighContrastMode";
import { CustomerFeedbackWidget } from "./CustomerFeedbackWidget";
import {
  Accessibility,
  CircleDollarSign,
  History,
  Home as HomeIcon,
  MessageCircle,
  Menu,
  Palette,
  Settings,
  SlidersHorizontal,
  X,
} from "lucide-react";
import React, { type ReactNode, useState } from "react";
import { toast } from "sonner";
import { Link, useLocation } from "wouter";

type AppShellProps = {
  children: ReactNode;
  title: string;
  currentStep: 1 | 2 | 3 | 4;
};

/** Estrutura compartilhada de navegação, cabeçalho de etapas e acessibilidade. */
export function AppShell({ children, title, currentStep }: AppShellProps) {
  const [location, navigate] = useLocation();
  const { resetSession, session } = useCashSession();
  const { enabled: highContrast, toggle: toggleHighContrast } =
    useHighContrastMode();
  const { theme, setTheme } = useTheme();
  const { t, locale, setLocale } = useLanguage();
  const [toolsOpen, setToolsOpen] = useState(false);

  const localizedTitle = locale === "en"
    ? ({
        "Sistema de fechamento": "Closing system",
        "Abertura de contagem": t("page.opening"),
        "Contagem em andamento": t("page.count"),
        "Validação do fechamento": t("page.validation"),
        "Histórico de turnos": t("page.history"),
      } as Record<string, string>)[title] ?? title
    : title;
  const isCountRoute = ["/abertura", "/contagem", "/validacao"].includes(
    location
  );
  const navClass = (active: boolean) =>
    `pixbee-nav-button ${active ? "active" : ""}`;

  function startNewCount() {
    if (session.closureRequired && !session.validatedAt) {
      toast.error(locale === "en" ? "Validate the current closing before starting a new count." : "Valide o fechamento atual antes de iniciar uma nova contagem.");
      navigate("/validacao");
      return;
    }
    resetSession();
    navigate("/abertura");
  }

  function toggleAccessibility() {
    toggleHighContrast();
    toast.success(
              highContrast
        ? locale === "en" ? "High contrast mode disabled." : "Modo de alto contraste desativado."
        : locale === "en" ? "High contrast mode enabled." : "Modo de alto contraste ativado."

    );
  }

  function openFeedback() {
    window.dispatchEvent(new Event("pixbee:open-feedback"));
    setToolsOpen(false);
  }

  return (
    <div className="pixbee-page">
      <aside className="pixbee-sidebar" aria-label={locale === "en" ? "PixBee navigation" : "Navegação do PixBee"}>
        <Link
          href="/"
          className="pixbee-logo"
          aria-label={locale === "en" ? "PixBee home page" : "Página inicial do PixBee"}
        >
          <span className="pixbee-mark" aria-hidden="true">
            <i />
            <i />
            <b>✓</b>
          </span>
          <span className="logo-word">
            <em>PIX</em>
            <strong>BEE</strong>
          </span>
        </Link>

        <nav className="pixbee-nav">
          <Link
            href="/"
            className={navClass(location === "/")}
            aria-label={locale === "en" ? "Home" : "Início"}
            title={locale === "en" ? "Home" : "Início"}
          >
            <HomeIcon size={22} />
            <span>{t("nav.home")}</span>
          </Link>
          <button
            className={navClass(isCountRoute)}
            type="button"
            onClick={startNewCount}
            aria-label={locale === "en" ? "New count" : "Nova contagem"}
            title={locale === "en" ? "New count" : "Nova contagem"}
          >
            <CircleDollarSign size={22} />
            <span>{t("nav.newCount")}</span>
          </button>
          <button
            className={navClass(location === "/historico")}
            type="button"
            onClick={() => navigate("/historico")}
            aria-label={locale === "en" ? "History" : "Histórico"}
            title={locale === "en" ? "History" : "Histórico"}
          >
            <History size={22} />
            <span>{t("nav.history")}</span>
          </button>
          <button
            className={navClass(location === "/privacidade")}
            type="button"
            onClick={() => navigate("/privacidade")}
            aria-label={locale === "en" ? "Privacy and rights" : "Privacidade e direitos"}
            title={locale === "en" ? "Privacy and rights" : "Privacidade e direitos"}
          >
            <Settings size={22} />
            <span>{t("nav.privacy")}</span>
          </button>
        </nav>

        <button
          className={`${navClass(location === "/sobre")} pixbee-menu-button`}
          type="button"
          onClick={() => navigate("/sobre")}
          aria-label={locale === "en" ? "About PixBee" : "Sobre o PixBee"}
          title={locale === "en" ? "About PixBee" : "Sobre o PixBee"}
        >
          <Menu size={22} />
          <span>{t("nav.about")}</span>
        </button>
      </aside>

      <main className="pixbee-main">
        <header className="pixbee-topbar">
          <div className="topbar-title-wrap">
            <Link
              href="/"
              className="topbar-brand"
              aria-label={locale === "en" ? "PixBee home page" : "Página inicial do PixBee"}
            >
              <span className="pixbee-mark" aria-hidden="true">
                <i />
                <i />
                <b>✓</b>
              </span>
              <span>
                <strong>
                  <em>PIX</em>BEE
                </strong>
                <small>FechaCaixa</small>
              </span>
            </Link>
            <div className="topbar-title">
              <p>{locale === "en" ? "Count with confidence" : "Conferir sem dúvida"}</p>
              <h1>{localizedTitle}</h1>
            </div>
          </div>

          <div
            className="topbar-steps"
                          aria-label={locale === "en" ? `Step ${currentStep} of 4` : `Etapa ${currentStep} de 4`}

          >
            {[1, 2, 3, 4].map(step => (
              <span
                className={
                  step === currentStep
                    ? "current"
                    : step < currentStep
                      ? "done"
                      : ""
                }
                key={step}
              >
                {step}
              </span>
            ))}
          </div>
        </header>
        {children}
      </main>

      <div className={`quick-tools ${toolsOpen ? "is-open" : ""}`}>
        <div id="pixbee-preferencias-rapidas" className="quick-tools-panel" aria-hidden={!toolsOpen}>
          <div className="quick-tools-heading">
              <span>{t("tools.title")}</span>
              <small>{t("tools.subtitle")}</small>
          </div>
          <div className="quick-tools-actions">
            <button
              type="button"
              className={highContrast ? "is-selected" : ""}
              onClick={toggleAccessibility}
              aria-pressed={highContrast}
            >
              <Accessibility size={17} />
              <span>{highContrast ? t("tools.contrastOn") : t("tools.contrast")}</span>
            </button>
            <button type="button" onClick={openFeedback}>
              <MessageCircle size={17} />
              <span>{t("tools.feedback")}</span>
            </button>
          </div>
          <div className="quick-tools-theme-title">
            <Palette size={16} /> <span>{t("tools.theme")}</span>
          </div>
          <div className="quick-tools-themes" role="group" aria-label={t("tools.theme")}>
            <div className="quick-tools-language" role="group" aria-label={t("tools.language")}>
              <button type="button" className={locale === "pt-BR" ? "is-selected" : ""} onClick={() => setLocale("pt-BR")} aria-pressed={locale === "pt-BR"}>PT-BR</button>
              <button type="button" className={locale === "en" ? "is-selected" : ""} onClick={() => setLocale("en")} aria-pressed={locale === "en"}>EN</button>
            </div>
            {PIXBEE_THEMES.map(option => (
              <button
                key={option.id}
                type="button"
                className={theme === option.id ? "is-selected" : ""}
                onClick={() => setTheme(option.id)}
                aria-pressed={theme === option.id}
              >
                <i className={`theme-swatch ${option.id}`} aria-hidden="true" />
                <span>
                  <strong>{option.label}</strong>
                  <small>{option.description}</small>
                </span>
              </button>
            ))}
          </div>
        </div>
        <button
          className="quick-tools-trigger"
          type="button"
          onClick={() => setToolsOpen(current => !current)}
          aria-label={toolsOpen ? t("tools.close") : t("tools.open")}
          aria-expanded={toolsOpen}
          aria-controls="pixbee-preferencias-rapidas"
        >
          {toolsOpen ? <X size={21} /> : <SlidersHorizontal size={21} />}
        </button>
      </div>
      <CustomerFeedbackWidget showTrigger={false} />
    </div>
  );
}
