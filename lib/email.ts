import nodemailer from "nodemailer";

type VerificationEmailInput = {
  to: string;
  verificationLink: string;
};

function getSmtpConfig() {
  const host = process.env.SMTP_HOST;
  const port = process.env.SMTP_PORT;
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;
  const from = process.env.SMTP_FROM;

  if (!host || !port || !user || !pass || !from) {
    throw new Error(
      "SMTP configuration is incomplete. Set SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS, and SMTP_FROM.",
    );
  }

  return {
    host,
    port: Number(port),
    user,
    pass,
    from,
  };
}

function createTransporter() {
  const config = getSmtpConfig();

  return nodemailer.createTransport({
    host: config.host,
    port: config.port,
    secure: config.port === 465,
    auth: {
      user: config.user,
      pass: config.pass,
    },
  });
}

export async function sendVerificationEmail({
  to,
  verificationLink,
}: VerificationEmailInput) {
  const config = getSmtpConfig();
  const transporter = createTransporter();

  await transporter.sendMail({
    from: config.from,
    to,
    subject: "Verify your Private Social account",
    text: [
      "Your Private Social account is ready.",
      "",
      "Open the link below to decide whether you want to verify this account now:",
      verificationLink,
      "",
      "If you did not create this account, you can ignore this email.",
    ].join("\n"),
    html: `
      <div style="background:#060606;padding:32px;font-family:Arial,sans-serif;color:#f6e7bf;">
        <div style="max-width:560px;margin:0 auto;border:1px solid rgba(212,175,55,0.24);border-radius:24px;background:#0d0b08;padding:32px;">
          <p style="margin:0 0 12px;font-size:12px;letter-spacing:0.28em;text-transform:uppercase;color:#d4af37;">
            Private Social
          </p>
          <h1 style="margin:0 0 16px;font-size:30px;line-height:1.1;color:#f6e7bf;">
            Verify your account
          </h1>
          <p style="margin:0 0 24px;font-size:15px;line-height:1.7;color:rgba(246,231,191,0.78);">
            Open the link below to review this account and choose whether you want to verify it now.
          </p>
          <a href="${verificationLink}" style="display:inline-block;padding:14px 20px;border-radius:16px;background:#d4af37;color:#060606;text-decoration:none;font-weight:700;">
            Review verification
          </a>
        </div>
      </div>
    `,
  });
}
