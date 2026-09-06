// Bindings and non-secret vars come from `npm run types` (wrangler.jsonc).
export type AppEnv = Env & {
  TURNSTILE_SECRET_KEY?: string;
  RESEND_API_KEY?: string;
  PAYMENT_API_KEY?: string;
  PAYMENT_WEBHOOK_SECRET?: string;
  AI_API_KEY?: string;
};
