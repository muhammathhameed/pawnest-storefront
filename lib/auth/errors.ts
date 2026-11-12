/**
 * PKCE: signUp() stores a code_verifier cookie in the browser that signed up.
 * If the confirmation link is opened in another browser/device, Supabase has
 * already confirmed the email but exchangeCodeForSession() cannot complete.
 */
export function isMissingVerifier(message: string | undefined | null): boolean {
  return /code verifier|verifier|both auth code and code verifier/i.test(message ?? "");
}
