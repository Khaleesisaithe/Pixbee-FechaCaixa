import { useEffect, useState } from "react";

const HIGH_CONTRAST_STORAGE_KEY = "pixbee-high-contrast-v1";

/** Mantém a escolha de alto contraste no navegador do operador. */
export function useHighContrastMode() {
  const [enabled, setEnabled] = useState(
    () => localStorage.getItem(HIGH_CONTRAST_STORAGE_KEY) === "true"
  );

  useEffect(() => {
    document.documentElement.classList.toggle("pixbee-high-contrast", enabled);
    localStorage.setItem(HIGH_CONTRAST_STORAGE_KEY, String(enabled));
  }, [enabled]);

  return {
    enabled,
    toggle: () => setEnabled(current => !current),
  };
}
