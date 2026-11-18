const HTML_ENTITIES = {
  '&': '&amp;',
  '<': '&lt;',
  '>': '&gt;',
  '"': '&quot;',
  "'": '&#39;',
};

function escapeHtml(value) {
  return String(value ?? '').replace(/[&<>"']/g, (character) => HTML_ENTITIES[character]);
}

function renderArticle(article, index) {
  let url;
  try {
    url = new URL(article.link);
  } catch {
    throw new Error('Article links must be valid HTTP or HTTPS URLs.');
  }
  if (url.protocol !== 'http:' && url.protocol !== 'https:') {
    throw new Error('Article links must be valid HTTP or HTTPS URLs.');
  }

  return `<h2 style="font-size:18px;margin:24px 0 8px;padding-top:16px;border-top:1px solid #e5e7eb;">
    ${index + 1}. <a href="${escapeHtml(article.link)}" style="color:#2563eb;">${escapeHtml(article.title)}</a>
  </h2>
  <p style="font-size:12px;color:#6b7280;margin:0 0 8px;">Source: ${escapeHtml(article.source)}</p>
  <p style="font-size:15px;line-height:1.6;margin:0;">${escapeHtml(article.summary)}</p>`;
}

export function formatEmail(articles, now = new Date()) {
  const date = new Intl.DateTimeFormat('en-IN', {
    dateStyle: 'full',
    timeZone: 'Asia/Kolkata',
  }).format(now);
  const count = `${articles.length} ${articles.length === 1 ? 'story' : 'stories'} selected.`;
  const content = articles.length
    ? articles.map(renderArticle).join('\n')
    : '<p>No new stories today.</p>';
  const footer = 'AI summaries based on source feed titles and descriptions.';

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Briefly</title>
</head>
<body style="margin:0;padding:24px 12px;background-color:#f3f4f6;font-family:Arial,sans-serif;color:#111827;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
    <tr><td align="center">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:640px;background-color:#ffffff;">
        <tr><td style="padding:24px;">
          <h1 style="font-size:26px;margin:0 0 8px;">Briefly</h1>
          <p style="color:#6b7280;font-size:14px;margin:0 0 16px;">${date}</p>
          <p>${count}</p>
          ${content}
          <p style="font-size:12px;color:#6b7280;margin-top:32px;">${footer}</p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;

  const lines = ['BRIEFLY', date, count, ''];
  if (articles.length === 0) lines.push('No new stories today.', '');
  for (const [index, article] of articles.entries()) {
    lines.push(`${index + 1}. ${article.title}`, `Source: ${article.source}`, article.summary, `Read: ${article.link}`, '');
  }
  lines.push(footer);

  return {
    subject: `Briefly — ${date}`,
    html,
    text: lines.join('\n'),
  };
}
