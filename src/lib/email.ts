import { urlPublica } from "@/lib/origenes"

export type EmailMessage = { to: string; subject: string; text: string }

export interface EmailProvider {
  send(message: EmailMessage): Promise<void>
}

export class ConsoleEmailProvider implements EmailProvider {
  async send(message: EmailMessage) {
    console.log(`[correo] Para: ${message.to}\nAsunto: ${message.subject}\n${message.text}\n`)
  }
}

export class MemoryEmailProvider implements EmailProvider {
  readonly messages: EmailMessage[] = []
  async send(message: EmailMessage) {
    this.messages.push(message)
  }
}

export class SmtpEmailProvider implements EmailProvider {
  async send(message: EmailMessage) {
    const nodemailer = await import("nodemailer")
    const port = Number(process.env.SMTP_PORT || 587)
    const transport = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port,
      secure: process.env.SMTP_SECURE === "true" || port === 465,
      auth: process.env.SMTP_USER
        ? { user: process.env.SMTP_USER, pass: process.env.SMTP_PASSWORD }
        : undefined,
    })
    await transport.sendMail({
      from: process.env.EMAIL_FROM || "Mesa CIFES <mesa@cifes.edu.co>",
      to: message.to,
      subject: message.subject,
      text: message.text,
    })
  }
}

export function correoSmtpActivo() {
  return process.env.EMAIL_PROVIDER === "smtp" && Boolean(process.env.SMTP_HOST)
}

export function createEmailProvider(): EmailProvider {
  if (process.env.EMAIL_PROVIDER === "smtp") return new SmtpEmailProvider()
  if (process.env.EMAIL_PROVIDER === "memory") return new MemoryEmailProvider()
  return new ConsoleEmailProvider()
}

export function appBaseUrl() {
  return urlPublica()
}
