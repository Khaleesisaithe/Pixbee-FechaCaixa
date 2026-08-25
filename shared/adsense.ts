export function isValidAdSenseClientId(clientId: string) {
  return /^ca-pub-\d{6,30}$/.test(clientId.trim());
}

export function getPublisherId(clientId: string) {
  const normalized = clientId.trim();
  return isValidAdSenseClientId(normalized)
    ? `pub-${normalized.slice("ca-pub-".length)}`
    : "";
}

export function buildAdsTxtContent(enabled: boolean, clientId: string) {
  const publisherId = enabled ? getPublisherId(clientId) : "";
  if (!publisherId) {
    return "# PixBee FechaCaixa — Google AdSense\n# Publisher ID not configured or monetization is disabled.\n";
  }

  return `google.com, ${publisherId}, DIRECT, f08c47fec0942fa0\n`;
}
