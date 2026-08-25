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
    : locale === "es"
      ? ({
          "Sistema de fechamento": "Sistema de cierre",
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
  const localizedThemeCopy: Record<string, { label: string; description: string }> = {
    emerald: { label: "Esmeralda", description: "Verde operativo con detalles turquesa." },
    midnight: { label: "Índigo nocturno", description: "Azul profundo con violeta de alta intensidad." },
    daylight: { label: "Brisa clara", description: "Fondo claro, azul marino y detalles coral." },
  };

  function startNewCount() {
    if (session.closureRequired && !session.validatedAt) {
      toast.error(locale === "en" ? "Validate the current closing before starting a new count." : locale === "es" ? "Valida el cierre actual antes de iniciar un nuevo conteo." : "Valide o fechamento atual antes de iniciar uma nova contagem.");
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
        ? locale === "en" ? "High contrast mode disabled." : locale === "es" ? "Modo de alto contraste desactivado." : "Modo de alto contraste desativado."
        : locale === "en" ? "High contrast mode enabled." : locale === "es" ? "Modo de alto contraste activado." : "Modo de alto contraste ativado."
    );
  }

  function openFeedback() {
    window.dispatchEvent(new Event("pixbee:open-feedback"));
    setToolsOpen(false);
  }

  return (
    <div className="pixbee-page">
      <aside className="pixbee-sidebar" aria-label={locale === "en" ? "PixBee navigation" : locale === "es" ? "Navegación de PixBee" : "Navegação do PixBee"}>
        <Link
          href="/"
          className="pixbee-logo"
          aria-label={locale === "en" ? "PixBee home page" : locale === "es" ? "Página de inicio de PixBee" : "Página inicial do PixBee"}
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
            aria-label={locale === "en" ? "Home" : locale === "es" ? "Inicio" : "Início"}
            title={locale === "en" ? "Home" : locale === "es" ? "Inicio" : "Início"}
          >
            <HomeIcon size={22} />
            <span>{t("nav.home")}</span>
          </Link>
          <button
            className={navClass(isCountRoute)}
            type="button"
            onClick={startNewCount}
            aria-label={locale === "en" ? "New count" : locale === "es" ? "Nuevo conteo" : "Nova contagem"}
            title={locale === "en" ? "New count" : locale === "es" ? "Nuevo conteo" : "Nova contagem"}
          >
            <CircleDollarSign size={22} />
            <span>{t("nav.newCount")}</span>
          </button>
          <button
            className={navClass(location === "/historico")}
            type="button"
            onClick={() => navigate("/historico")}
            aria-label={locale === "en" ? "History" : locale === "es" ? "Historial" : "Histórico"}
            title={locale === "en" ? "History" : locale === "es" ? "Historial" : "Histórico"}
          >
            <History size={22} />
            <span>{t("nav.history")}</span>
          </button>
          <button
            className={navClass(location === "/privacidade")}
            type="button"
            onClick={() => navigate("/privacidade")}
            aria-label={locale === "en" ? "Privacy and rights" : locale === "es" ? "Privacidad y derechos" : "Privacidade e direitos"}
            title={locale === "en" ? "Privacy and rights" : locale === "es" ? "Privacidad y derechos" : "Privacidade e direitos"}
          >
            <Settings size={22} />
            <span>{t("nav.privacy")}</span>
          </button>
        </nav>

        <button
          className={`${navClass(location === "/sobre")} pixbee-menu-button`}
          type="button"
          onClick={() => navigate("/sobre")}
          aria-label={locale === "en" ? "About PixBee" : locale === "es" ? "Sobre PixBee" : "Sobre o PixBee"}
          title={locale === "en" ? "About PixBee" : locale === "es" ? "Sobre PixBee" : "Sobre o PixBee"}
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
              aria-label={locale === "en" ? "PixBee home page" : locale === "es" ? "Página de inicio de PixBee" : "Página inicial do PixBee"}
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
              <p>{locale === "en" ? "Count with confidence" : locale === "es" ? "Cuenta con confianza" : "Conferir sem dúvida"}</p>
              <h1>{localizedTitle}</h1>
            </div>
          </div>

          <div
            className="topbar-steps"
                          aria-label={locale === "en" ? `Step ${currentStep} of 4` : locale === "es" ? `Etapa ${currentStep} de 4` : `Etapa ${currentStep} de 4`}

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
              <button type="button" className={locale === "es" ? "is-selected" : ""} onClick={() => setLocale("es")} aria-pressed={locale === "es"}>ES</button>
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
                  <strong>{locale === "es" ? localizedThemeCopy[option.id].label : option.label}</strong>
                  <small>{locale === "es" ? localizedThemeCopy[option.id].description : option.description}</small>
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
