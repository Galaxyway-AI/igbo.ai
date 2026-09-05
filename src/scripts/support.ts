import { prepareTurnstile, formData, submitJSON } from './forms';
const form = document.querySelector<HTMLFormElement>('#support-form');
if (form) {
  fetch('/api/config')
    .then((r) => {
      if (!r.ok) throw Error();
      return r.json();
    })
    .then((config) => {
      if (config.paymentsEnabled) {
        form.hidden = false;
        document.querySelector('#support-opening')?.setAttribute('hidden', '');
        return prepareTurnstile(form);
      }
    })
    .catch(() => {});
  const amount = form.querySelector<HTMLInputElement>('[name=amount]')!;
  const choices = form.querySelectorAll<HTMLButtonElement>('[data-amount]');
  choices.forEach((button) =>
    button.addEventListener('click', () => {
      amount.value = button.dataset.amount!;
      choices.forEach((b) =>
        b.setAttribute('aria-pressed', String(b === button)),
      );
    }),
  );
  amount.addEventListener('input', () =>
    choices.forEach((b) =>
      b.setAttribute('aria-pressed', String(b.dataset.amount === amount.value)),
    ),
  );
  form.querySelector('#public-consent')?.addEventListener('change', (e) => {
    const checked = (e.target as HTMLInputElement).checked;
    form.querySelector('#public-fields')?.toggleAttribute('hidden', !checked);
    form.querySelector<HTMLInputElement>(
      '[name=public_display_name]',
    )!.required = checked;
  });
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const status = form.querySelector<HTMLElement>('.form-status')!;
    const button = form.querySelector<HTMLButtonElement>(
      'button[type=submit]',
    )!;
    button.disabled = true;
    try {
      const values = formData(form);
      values.amount = Number(values.amount);
      const data = await submitJSON('support/checkout', values);
      const url = new URL(data.url);
      if (url.protocol !== 'https:')
        throw Error('Payment service returned an invalid checkout URL.');
      window.location.assign(url.href);
    } catch (error) {
      status.textContent =
        error instanceof Error
          ? error.message
          : 'Payments are not available yet.';
    } finally {
      button.disabled = false;
      if (form.dataset.widgetId) window.turnstile?.reset(form.dataset.widgetId);
    }
  });
}
