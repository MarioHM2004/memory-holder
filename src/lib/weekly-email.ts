/**
 * The Sunday email: one memory, pulled at random out of someone's diaries.
 *
 * Built as a string rather than from components because mail clients are not
 * browsers — tables and inline styles are the only layout that survives
 * Outlook, and nothing here is ever rendered in the app.
 */

export interface WeeklyEmailStrings {
  greeting: string;
  from: string;
  open: string;
  why: string;
  unsubscribe: string;
}

export interface WeeklyEmailContent {
  title: string;
  description: string;
  date: string;
  photoUrl: string | null;
  memoryUrl: string;
  unsubscribeUrl: string;
  strings: WeeklyEmailStrings;
}

/** Keeps a diary title with an ampersand in it from breaking the markup. */
function escapeHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export function renderWeeklyEmail({
  title,
  description,
  date,
  photoUrl,
  memoryUrl,
  unsubscribeUrl,
  strings,
}: WeeklyEmailContent) {
  // The photo carries this email — a line of text about a day you half
  // remember is a notification; the picture is the thing that stops you.
  const photo = photoUrl
    ? `<tr><td style="padding:0 0 24px">
         <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
           <tr><td align="center" style="background:#ffffff;border:2px solid #171614;padding:14px 14px 34px">
             <img src="${escapeHtml(photoUrl)}" alt="" width="420"
                  style="display:block;width:100%;max-width:420px;height:auto;border:1px solid rgba(23,22,20,0.2)" />
           </td></tr>
         </table>
       </td></tr>`
    : "";

  const body = description
    ? `<tr><td style="padding:0 0 24px;font-size:15px;line-height:1.6;color:#56534c">${escapeHtml(description)}</td></tr>`
    : "";

  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0"
  style="background:#fbfaf7;margin:0;padding:32px 12px;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI','Helvetica Neue',Arial,'PingFang SC','Microsoft YaHei',sans-serif">
  <tr><td align="center">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0"
      style="max-width:520px;background:#ffffff;border:2px solid #171614;border-radius:255px 15px 225px 15px/15px 225px 15px 255px">
      <tr><td style="padding:32px 32px 28px">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
          <tr><td style="padding:0 0 20px;font-size:13px;letter-spacing:3px;text-transform:uppercase;color:#8e8a80">Memory&nbsp;Holder</td></tr>
          <tr><td style="padding:0 0 4px;font-size:15px;color:#56534c">${escapeHtml(strings.greeting)}</td></tr>
          <tr><td style="padding:0 0 20px;font-size:13px;letter-spacing:1.5px;text-transform:uppercase;color:#8e8a80">${escapeHtml(strings.from)} · ${escapeHtml(date)}</td></tr>
          <tr><td style="padding:0 0 16px;font-size:24px;line-height:1.3;font-weight:700;color:#171614">${escapeHtml(title)}</td></tr>
          ${photo}
          ${body}
          <tr><td style="padding:0 0 28px">
            <table role="presentation" cellpadding="0" cellspacing="0">
              <tr><td align="center" style="background:#171614;border-radius:2px">
                <a href="${escapeHtml(memoryUrl)}" style="display:inline-block;padding:14px 26px;font-size:15px;font-weight:700;color:#ffffff;text-decoration:none">${escapeHtml(strings.open)}</a>
              </td></tr>
            </table>
          </td></tr>
          <tr><td style="border-top:1px solid rgba(23,22,20,0.18);padding:16px 0 0;font-size:12px;line-height:1.6;color:#8e8a80">
            ${escapeHtml(strings.why)}
            <a href="${escapeHtml(unsubscribeUrl)}" style="color:#3a5b8c">${escapeHtml(strings.unsubscribe)}</a>
          </td></tr>
        </table>
      </td></tr>
    </table>
  </td></tr>
</table>`;
}
