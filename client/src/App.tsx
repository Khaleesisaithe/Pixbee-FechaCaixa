/** Design: PixBee original — rotas diretas entre início, abertura, contagem e validação. */
import React from "react";
import { Analytics } from "@vercel/analytics/react";
import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { CashSessionProvider } from "@/contexts/CashSessionContext";
import { ThemeProvider } from "@/contexts/ThemeContext";
import { LanguageProvider } from "@/contexts/LanguageContext";
import { LoadingIndicator } from "@/components/LoadingIndicator";
import NotFound from "@/pages/NotFound";
import { useEffect, useState } from "react";
import { Route, Switch } from "wouter";
import ErrorBoundary from "./components/ErrorBoundary";
import Home from "./pages/Home";
function Router() {
  // make sure to consider if you need authentication for certain routes
  return (
    <Switch>
      <Route path="/" component={Home} />
      <Route path="/abertura" component={Home} />
      <Route path="/contagem" component={Home} />
      <Route path="/validacao" component={Home} />
      <Route path="/historico" component={Home} />
      <Route path="/sobre" component={Home} />
      <Route path="/privacidade" component={Home} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  const [isBooting, setIsBooting] = useState(true);
  const isLoaderPreview =
    import.meta.env.DEV &&
    new URLSearchParams(window.location.search).has("preview-loader");

  useEffect(() => {
    const timeout = window.setTimeout(() => setIsBooting(false), 260);
    return () => window.clearTimeout(timeout);
  }, []);

  return (
    <ErrorBoundary>
      <CashSessionProvider>
        <ThemeProvider defaultTheme="emerald" switchable>
          <LanguageProvider>
            <TooltipProvider>
              <Toaster position="top-center" richColors />
              <Router />
              <Analytics />
              {isBooting || isLoaderPreview ? (
                <div className="pixbee-app-loader" aria-label="Carregando PixBee">
                  <LoadingIndicator label="Preparando seu fechamento" />
                </div>
              ) : null}
            </TooltipProvider>
          </LanguageProvider>
        </ThemeProvider>
      </CashSessionProvider>
    </ErrorBoundary>
  );
}

export default App;
