import React, { useEffect, useRef } from "react";
import { adsenseSettings, isAdSenseReady, isPublicAdRoute, type PublicAdRoute } from "@/lib/adsense";

type AdSenseWindow = Window & {
  adsbygoogle?: unknown[];
};

type AdSenseSlotProps = {
  slot: string;
  publicRoute: PublicAdRoute;
  label?: string;
  variant?: "standard" | "thin" | "compact";
  format?: "auto" | "horizontal";
  settings?: typeof adsenseSettings;
};

export function AdSenseSlot({
  slot,
  publicRoute,
  label = "Publicidade",
  variant = "standard",
  format = "auto",
  settings = adsenseSettings,
}: AdSenseSlotProps) {
  const adRef = useRef<HTMLModElement>(null);
  const ready = isPublicAdRoute(publicRoute) && isAdSenseReady({
    enabled: settings.enabled,
    clientId: settings.clientId,
    slot,
  });

  useEffect(() => {
    if (!ready || !adRef.current || typeof window === "undefined") return;

    const scriptId = "pixbee-adsense-script";
    let script = document.getElementById(scriptId) as HTMLScriptElement | null;
    const pushAd = () => {
      try {
        const adsWindow = window as AdSenseWindow;
        adsWindow.adsbygoogle = adsWindow.adsbygoogle ?? [];
        adsWindow.adsbygoogle.push({});
      } catch {
        // O Google pode rejeitar o preenchimento até concluir a análise do site.
      }
    };

    if (!script) {
      script = document.createElement("script");
      script.id = scriptId;
      script.async = true;
      script.crossOrigin = "anonymous";
      script.src = `https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${settings.clientId}`;
      script.addEventListener("load", pushAd, { once: true });
      document.head.appendChild(script);
    } else if (script.dataset.loaded === "true") {
      pushAd();
    } else {
      script.addEventListener("load", pushAd, { once: true });
    }

    const markLoaded = () => {
      script?.setAttribute("data-loaded", "true");
    };
    script.addEventListener("load", markLoaded, { once: true });

    return () => {
      script?.removeEventListener("load", pushAd);
      script?.removeEventListener("load", markLoaded);
    };
  }, [ready, slot]);

  if (!ready) return null;

  return (
    <aside className={`adsense-slot adsense-slot--${variant}`} aria-label={label}>
      <span className="adsense-slot-label">{label}</span>
      <ins
        ref={adRef}
        className="adsbygoogle"
        style={{ display: "block" }}
        data-ad-client={settings.clientId}
        data-ad-slot={slot}
        data-ad-format={format}
        data-full-width-responsive="true"
      />
    </aside>
  );
}
