// Inline styles only, no external CSS or web fonts — email clients strip
// <style> blocks and ignore @font-face unpredictably. Colours are Loupe's
// tailwind tokens (tailwind.config.ts).

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function layout(bodyHtml: string): string {
  return `
    <div style="background:#F6F7F2;padding:32px 16px;font-family:Georgia,'Times New Roman',serif;">
      <div style="max-width:440px;margin:0 auto;background:#FDFDFA;border:1px solid #DDE1D6;border-radius:12px;padding:32px;">
        <div style="font-size:22px;font-weight:bold;color:#1E2420;">Loupe</div>
        <div style="height:2px;width:32px;background:#3F6D5C;margin:12px 0 24px;"></div>
        ${bodyHtml}
      </div>
    </div>`;
}

export interface EmailContent {
  subject: string;
  html: string;
  text: string;
}

export function confirmSignupEmail(opts: { name?: string; confirmUrl: string }): EmailContent {
  const greeting = opts.name ? `Hi ${escapeHtml(opts.name)},` : "Hi,";
  const url = escapeHtml(opts.confirmUrl);
  return {
    subject: "Confirm your email for Loupe",
    html: layout(`
        <p style="font-family:Arial,sans-serif;font-size:14px;color:#3A453E;margin:0 0 20px;">
          ${greeting} confirm your email address to activate your clinic on Loupe.
        </p>
        <a href="${url}" style="display:inline-block;font-family:Arial,sans-serif;font-size:15px;font-weight:bold;color:#ECEEE4;background:#3F6D5C;border-radius:8px;padding:12px 24px;text-decoration:none;">
          Confirm email
        </a>
        <p style="font-family:Arial,sans-serif;font-size:13px;color:#5F6B62;margin:20px 0 0;">
          Or paste this link into your browser:<br />
          <span style="word-break:break-all;color:#3A453E;">${url}</span>
        </p>
        <p style="font-family:Arial,sans-serif;font-size:13px;color:#8FA094;margin:20px 0 0;">
          If you didn't create a Loupe account, you can safely ignore this email.
        </p>`),
    text: `${opts.name ? `Hi ${opts.name},` : "Hi,"} confirm your email address to activate your clinic on Loupe:\n\n${opts.confirmUrl}\n\nIf you didn't create a Loupe account, ignore this email.`,
  };
}
