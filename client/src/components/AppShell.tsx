import { useCashSession } from "@/contexts/CashSessionContext";
import { useHighContrastMode } from "@/hooks/useHighContrastMode";
import { CustomerFeedbackWidget } from "./CustomerFeedbackWidget";
import {
  Accessibility,
  CircleDollarSign,
  History,
  Home as HomeIcon,
  Menu,
  Settings,
} from "lucide-react";
import type { ReactNode } from "react";
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
  const { resetSession } = useCashSession();
  const { enabled: highContrast, toggle: toggleHighContrast } =
    useHighContrastMode();

  const isCountRoute = ["/abertura", "/contagem", "/validacao"].includes(
    location
  );
  const navClass = (active: boolean) =>
    `pixbee-nav-button ${active ? "active" : ""}`;

  function startNewCount() {
    resetSession();
    navigate("/abertura");
  }

  function toggleAccessibility() {
    toggleHighContrast();
    toast.success(
      highContrast
        ? "Modo de alto contraste desativado."
        : "Modo de alto contraste ativado."
    );
  }

  return (
    <div className="pixbee-page">
      <aside className="pixbee-sidebar" aria-label="Navegação do PixBee">
        <Link
          href="/"
          className="pixbee-logo"
          aria-label="Página inicial do PixBee"
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
            aria-label="Início"
            title="Início"
          >
            <HomeIcon size={22} />
            <span>Início</span>
          </Link>
          <button
            className={navClass(isCountRoute)}
            type="button"
            onClick={startNewCount}
            aria-label="Nova contagem"
            title="Nova contagem"
          >
            <CircleDollarSign size={22} />
            <span>Nova contagem</span>
          </button>
          <button
            className={navClass(location === "/historico")}
            type="button"
            onClick={() => navigate("/historico")}
            aria-label="Histórico"
            title="Histórico"
          >
            <History size={22} />
            <span>Histórico</span>
          </button>
          <button
            className={navClass(location === "/privacidade")}
            type="button"
            onClick={() => navigate("/privacidade")}
            aria-label="Privacidade e direitos"
            title="Privacidade e direitos"
          >
            <Settings size={22} />
            <span>Privacidade</span>
          </button>
        </nav>

        <button
          className={`${navClass(location === "/sobre")} pixbee-menu-button`}
          type="button"
          onClick={() => navigate("/sobre")}
          aria-label="Sobre o PixBee"
          title="Sobre o PixBee"
        >
          <Menu size={22} />
          <span>Sobre o PixBee</span>
        </button>
      </aside>

      <main className="pixbee-main">
        <header className="pixbee-topbar">
          <div className="topbar-title-wrap">
            <Link
              href="/"
              className="topbar-brand"
              aria-label="Página inicial do PixBee"
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
              <p>Conferir sem dúvida</p>
              <h1>{title}</h1>
            </div>
          </div>

          <div
            className="topbar-steps"
            aria-label={`Etapa ${currentStep} de 4`}
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

      <button
        className={`accessibility-fab ${highContrast ? "is-active" : ""}`}
        type="button"
        onClick={toggleAccessibility}
        aria-label={
          highContrast ? "Desativar alto contraste" : "Ativar alto contraste"
        }
        aria-pressed={highContrast}
        title={
          highContrast ? "Desativar alto contraste" : "Ativar alto contraste"
        }
      >
        <Accessibility size={21} />
        <span>{highContrast ? "Alto contraste ativo" : "Alto contraste"}</span>
      </button>
      <CustomerFeedbackWidget />
    </div>
  );
}
