/**
 * Utilities for Kite token input detection and save button labels.
 */

/** Detect if input looks like full callback URL vs direct access token */
export function isCallbackUrl(input: string): boolean {
  const t = input.trim();
  return (
    t.includes('request_token=') ||
    (t.startsWith('http') && t.includes('request_token'))
  );
}

/** Detect if input looks like direct access token (alphanumeric, 20+ chars) */
export function looksLikeAccessToken(input: string): boolean {
  const t = input.trim();
  if (!t || t.length < 20) return false;
  return /^[a-zA-Z0-9_-]+$/.test(t) && !t.includes(' ') && !t.includes('http');
}

export function getSaveButtonLabel(pasteInput: string, submitting: boolean): string {
  if (submitting) return 'Saving...';
  if (isCallbackUrl(pasteInput)) return 'Generate & Save';
  if (looksLikeAccessToken(pasteInput)) return 'Validate & Save';
  return 'Save Token';
}
