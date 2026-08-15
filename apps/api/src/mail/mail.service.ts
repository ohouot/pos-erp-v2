import { Injectable, Logger, OnModuleInit } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { createTransport, type Transporter } from "nodemailer";

export interface SendMailInput {
  to: string;
  subject: string;
  html: string;
}

// Nodemailer (STACK.md) au lieu de l'appel direct à l'API REST Resend du
// projet de référence — le transport SMTP de Resend est compatible, même
// contenu d'email. Inerte (journalise seulement) sans RESEND_API_KEY, ou en
// environnement de test : jamais d'appel réseau réel pendant les tests.
@Injectable()
export class MailService implements OnModuleInit {
  private readonly logger = new Logger(MailService.name);
  private transporter: Transporter | null = null;
  private fromAddress = "onboarding@resend.dev";

  constructor(private readonly config: ConfigService) {}

  onModuleInit() {
    const apiKey = this.config.get<string>("RESEND_API_KEY");
    const nodeEnv = this.config.get<string>("NODE_ENV");
    this.fromAddress =
      this.config.get<string>("RESEND_FROM_EMAIL") ?? this.fromAddress;

    if (!apiKey || nodeEnv === "test") {
      return;
    }

    this.transporter = createTransport({
      host: "smtp.resend.com",
      port: 465,
      secure: true,
      auth: { user: "resend", pass: apiKey },
    });
  }

  get isEnabled(): boolean {
    return this.transporter !== null;
  }

  async send(input: SendMailInput): Promise<void> {
    if (!this.transporter) {
      this.logger.log(
        `Email désactivé (RESEND_API_KEY absent) — ${input.subject} -> ${input.to}`,
      );
      return;
    }
    try {
      await this.transporter.sendMail({
        from: this.fromAddress,
        to: input.to,
        subject: input.subject,
        html: input.html,
      });
    } catch (error) {
      this.logger.error("Échec de l'envoi d'email", error as Error);
    }
  }
}
