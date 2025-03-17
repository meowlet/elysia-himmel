import nodemailer, { Transporter } from "nodemailer";

interface EmailOptions {
  from: string;
  to: string;
  subject: string;
  text?: string;
  html?: string;
  attachments?: any[];
}

class EmailService {
  private transporter: Transporter;

  constructor() {
    this.transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: Number(process.env.SMTP_PORT) || 587,
      secure: true,
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
    });
  }

  async sendMail(options: EmailOptions): Promise<void> {
    try {
      const info = await this.transporter.sendMail(options);
      console.log("Email sent: %s", info.messageId);
    } catch (error) {
      console.error("Error sending email: ", error);
      throw new Error("Could not send email.");
    }
  }
}

export default EmailService;
