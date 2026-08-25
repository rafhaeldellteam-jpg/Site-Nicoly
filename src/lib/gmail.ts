import nodemailer from "nodemailer";

const transporter = () =>
  nodemailer.createTransport({
    host: "smtp.gmail.com",
    port: 465,
    secure: true,
    auth: {
      user: process.env.GMAIL_USER,
      pass: process.env.GMAIL_APP_PASSWORD,
    },
  });

export function emailConfigurado(): boolean {
  return !!(process.env.GMAIL_USER && process.env.GMAIL_APP_PASSWORD);
}

export async function sendNicEmail(to: string, subject: string, html: string) {
  if (!emailConfigurado()) {
    console.error("E-mail não configurado (GMAIL_USER / GMAIL_APP_PASSWORD)");
    return false;
  }
  const text = html
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  await transporter().sendMail({
    from: `Nicbeautty Lash Designer <${process.env.GMAIL_USER}>`,
    to,
    subject,
    html,
    text,
    replyTo: process.env.GMAIL_USER,
  });
  return true;
}
