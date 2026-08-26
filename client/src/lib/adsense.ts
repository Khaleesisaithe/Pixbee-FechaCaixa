import { isValidAdSenseClientId } from "@shared/adsense";

export { isValidAdSenseClientId } from "@shared/adsense";

export const PUBLIC_AD_ROUTES = ["/", "/sobre", "/privacidade", "/historico"] as const;
export type PublicAdRoute = (typeof PUBLIC_AD_ROUTES)[number];

export function isPublicAdRoute(route: string): route is PublicAdRoute {
  return PUBLIC_AD_ROUTES.includes(route as PublicAdRoute);
}

export type AdSenseSettings = {
  enabled: boolean;
  clientId: string;
  homeSlot: string;
  aboutSlot: string;
  privacySlot: string;
};

const readEnv = (key: string) => String(import.meta.env[key] ?? "").trim();

export const adsenseSettings: AdSenseSettings = {
  enabled: readEnv("VITE_ADSENSE_ENABLED").toLowerCase() === "true",
  clientId: readEnv("VITE_ADSENSE_CLIENT_ID"),
  homeSlot: readEnv("VITE_ADSENSE_HOME_SLOT"),
  aboutSlot: readEnv("VITE_ADSENSE_ABOUT_SLOT"),
  privacySlot: readEnv("VITE_ADSENSE_PRIVACY_SLOT"),
};

export function isAdSenseReady({
  enabled,
  clientId,
  slot,
}: Pick<AdSenseSettings, "enabled" | "clientId"> & { slot: string }) {
  return enabled && isValidAdSenseClientId(clientId) && /^\d{4,20}$/.test(slot.trim());
}
