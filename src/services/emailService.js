import { Resend } from 'resend';

export function validateEmailConfig(config) {
  const required = [
    ['RESEND_API_KEY', config.resendApiKey],
    ['EMAIL_FROM', config.emailFrom],
    ['EMAIL_TO', config.emailTo],
  ];
  const missing = required.filter(([, value]) => typeof value !== 'string' || !value.trim());
  if (missing.length) {
    throw new Error(`Missing email settings: ${missing.map(([name]) => name).join(', ')}.`);
  }

  const addressPattern = /^[^\s@<>,;]+@[^\s@<>,;]+\.[^\s@<>,;]+$/;
  for (const [name, address] of [['EMAIL_FROM', config.emailFrom], ['EMAIL_TO', config.emailTo]]) {
    if (!addressPattern.test(address)) throw new Error(`${name} must be a single email address.`);
  }
}

export async function sendEmail(email, config, client) {
  validateEmailConfig(config);
  for (const field of ['subject', 'html', 'text']) {
    if (typeof email[field] !== 'string' || !email[field].trim()) {
      throw new Error(`Email ${field} is required.`);
    }
  }
  if (/[\r\n]/.test(email.subject)) throw new Error('Email subject must be a single line.');

  const resend = client ?? new Resend(config.resendApiKey);
  const signal = AbortSignal.timeout(30000);
  const { data, error } = await resend.emails.send({
    from: config.emailFrom,
    to: config.emailTo,
    subject: email.subject,
    html: email.html,
    text: email.text,
  }, { signal });

  if (error) {
    if (signal.aborted) throw new Error('Email request timed out; Resend acceptance is unconfirmed.');
    throw new Error(`Resend email request failed: ${error.message || error.name || 'Unknown error'}`);
  }
  if (typeof data?.id !== 'string' || !data.id.trim()) {
    throw new Error('Resend did not return an accepted email ID.');
  }

  return { id: data.id };
}
