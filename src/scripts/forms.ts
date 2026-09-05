interface TurnstileAPI {
  render: (
    el: HTMLElement,
    options: { sitekey: string; action: string },
  ) => string;
  reset: (id: string) => void;
}
declare global {
  interface Window {
    turnstile?: TurnstileAPI;
  }
}
export interface SiteConfig {
  turnstileSiteKey: string;
  formsEnabled: boolean;
  paymentsEnabled: boolean;
}
let configPromise: Promise<SiteConfig> | undefined;
export function config() {
  return (configPromise ??= fetch('/api/config').then((r) => {
    if (!r.ok)
      throw Error('The service is not available. Please try again later.');
    return r.json();
  }));
}
export async function prepareTurnstile(form: HTMLFormElement) {
  const settings = await config();
  if (!settings.turnstileSiteKey) return;
  const mount = form.querySelector<HTMLElement>('[data-turnstile]');
  if (!mount) return;
  if (!document.querySelector('script[data-turnstile-script]')) {
    const script = document.createElement('script');
    script.src =
      'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit';
    script.dataset.turnstileScript = 'true';
    script.async = true;
    document.head.append(script);
  }
  let tries = 0;
  const timer = setInterval(() => {
    if (window.turnstile) {
      clearInterval(timer);
      form.dataset.widgetId = window.turnstile.render(mount, {
        sitekey: settings.turnstileSiteKey,
        action: 'submit',
      });
    } else if (++tries > 100) {
      clearInterval(timer);
    }
  }, 100);
}
export function formData(form: HTMLFormElement) {
  const values: Record<string, unknown> = Object.fromEntries(
    new FormData(form),
  );
  form
    .querySelectorAll<HTMLInputElement>('input[type=checkbox]')
    .forEach((el) => {
      values[el.name] = el.checked;
    });
  return values;
}
export async function submitJSON(
  endpoint: string,
  values: Record<string, unknown>,
) {
  const response = await fetch('/api/' + endpoint, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(values),
  });
  const data = await response.json();
  if (!response.ok)
    throw Error(data.error || 'Unable to submit. Please try again.');
  return data;
}
document
  .querySelectorAll<HTMLFormElement>('[data-api-form]')
  .forEach((form) => {
    prepareTurnstile(form).catch(() => {});
    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      const status = form.querySelector<HTMLElement>('.form-status')!;
      const button = form.querySelector<HTMLButtonElement>(
        'button[type=submit]',
      )!;
      button.disabled = true;
      status.textContent = 'Sending your expression of interest…';
      status.dataset.error = 'false';
      try {
        await submitJSON(form.dataset.apiForm!, formData(form));
        status.textContent =
          'Thank you. Your expression of interest has been received. The team will review it and contact you when appropriate.';
        form.reset();
      } catch (error) {
        status.textContent =
          error instanceof Error ? error.message : 'Unable to submit.';
        status.dataset.error = 'true';
      } finally {
        button.disabled = false;
        if (form.dataset.widgetId)
          window.turnstile?.reset(form.dataset.widgetId);
      }
    });
  });
