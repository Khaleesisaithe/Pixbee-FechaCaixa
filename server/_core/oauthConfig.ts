/**
 * Login is optional for PixBee's local cash-closing flow. Enable OAuth only
 * when all values needed to initiate and complete the redirect are present.
 */
export function isOAuthConfigured(
  environment: Record<string, string | undefined>
): boolean {
  return Boolean(
    environment.OAUTH_SERVER_URL?.trim() &&
      environment.VITE_APP_ID?.trim() &&
      environment.VITE_OAUTH_PORTAL_URL?.trim()
  );
}
