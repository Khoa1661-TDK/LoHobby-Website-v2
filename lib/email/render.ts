// lib/email/render.ts — turn a plain-text campaign body into text + HTML parts

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

/** Render a campaign body to both a plain-text and a minimal HTML representation. */
export function renderCampaignBody(body: string): { text: string; html: string } {
  const html = escapeHtml(body).replace(/\n/g, '<br>');
  return { text: body, html };
}
