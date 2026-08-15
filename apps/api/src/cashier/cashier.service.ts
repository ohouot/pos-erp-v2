import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import type { Prisma } from "@prisma/client";
import { PrismaService } from "../prisma/prisma.service.js";
import { CashierRepository } from "./cashier.repository.js";
import { MailService } from "../mail/mail.service.js";
import type { OpenSessionDto } from "./dto/open-session.dto.js";
import type { CashMovementDto } from "./dto/cash-movement.dto.js";
import type { CloseSessionDto } from "./dto/close-session.dto.js";

interface CashSessionSummary {
  totalSalesByMethod: Record<string, string>;
  totalSales: string;
  orderCount: number;
  invoiceNumberRange: { first: string; last: string } | null;
  totalDeposits: string;
  totalWithdrawals: string;
}

@Injectable()
export class CashierService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly cashierRepository: CashierRepository,
    private readonly mailService: MailService,
  ) {}

  list(establishmentId: string, params: { page: number; pageSize: number }) {
    return this.cashierRepository.findAllPaginated(establishmentId, params);
  }

  getCurrent(establishmentId: string) {
    return this.cashierRepository.findOpenSession(this.prisma, establishmentId);
  }

  private async findOrThrow(establishmentId: string, id: string) {
    const session = await this.cashierRepository.findById(establishmentId, id);
    if (!session) throw new NotFoundException("Session de caisse introuvable");
    return session;
  }

  get(establishmentId: string, id: string) {
    return this.findOrThrow(establishmentId, id);
  }

  // Une seule session ouverte à la fois par établissement — vérifiée et
  // créée dans une transaction "Serializable" pour fermer la fenêtre de
  // course qu'aurait un simple read-then-write sous deux ouvertures
  // concurrentes (durcissement volontaire par rapport au projet de
  // référence, qui n'utilise qu'un findFirst non transactionnel ici).
  async openSession(
    establishmentId: string,
    employeeId: string,
    input: OpenSessionDto,
  ) {
    return this.prisma.$transaction(
      async (tx) => {
        const existing = await this.cashierRepository.findOpenSession(
          tx,
          establishmentId,
        );
        if (existing) {
          throw new ConflictException(
            "Une session de caisse est déjà ouverte pour cet établissement",
          );
        }
        return tx.cashSession.create({
          data: { establishmentId, employeeId, ...input },
          include: { movements: true },
        });
      },
      { isolationLevel: "Serializable" },
    );
  }

  private async assertOpen(establishmentId: string, id: string) {
    const session = await this.findOrThrow(establishmentId, id);
    if (session.status !== "OPEN") {
      throw new BadRequestException("Cette session de caisse est déjà fermée");
    }
    return session;
  }

  async deposit(
    establishmentId: string,
    sessionId: string,
    employeeId: string,
    input: CashMovementDto,
  ) {
    await this.assertOpen(establishmentId, sessionId);
    return this.cashierRepository.createMovement(
      sessionId,
      employeeId,
      "DEPOSIT",
      input,
    );
  }

  async withdraw(
    establishmentId: string,
    sessionId: string,
    employeeId: string,
    input: CashMovementDto,
  ) {
    await this.assertOpen(establishmentId, sessionId);
    return this.cashierRepository.createMovement(
      sessionId,
      employeeId,
      "WITHDRAWAL",
      input,
    );
  }

  private buildSummary(
    payments: Array<{
      amount: Prisma.Decimal;
      paymentMethod: { code: string };
      order: { invoiceNumber: string | null; id: string };
    }>,
    deposits: number,
    withdrawals: number,
  ): CashSessionSummary {
    const totalSalesByMethod: Record<string, number> = {};
    let totalSales = 0;
    const orderIds = new Set<string>();
    const invoiceNumbers: string[] = [];

    for (const payment of payments) {
      const amount = Number(payment.amount);
      totalSalesByMethod[payment.paymentMethod.code] =
        (totalSalesByMethod[payment.paymentMethod.code] ?? 0) + amount;
      totalSales += amount;
      orderIds.add(payment.order.id);
      if (payment.order.invoiceNumber)
        invoiceNumbers.push(payment.order.invoiceNumber);
    }
    invoiceNumbers.sort();

    return {
      totalSalesByMethod: Object.fromEntries(
        Object.entries(totalSalesByMethod).map(([code, amount]) => [
          code,
          amount.toFixed(2),
        ]),
      ),
      totalSales: totalSales.toFixed(2),
      orderCount: orderIds.size,
      invoiceNumberRange:
        invoiceNumbers.length > 0
          ? {
              first: invoiceNumbers[0],
              last: invoiceNumbers[invoiceNumbers.length - 1],
            }
          : null,
      totalDeposits: deposits.toFixed(2),
      totalWithdrawals: withdrawals.toFixed(2),
    };
  }

  // Solde théorique = fonds de caisse initial + encaissements espèces +
  // dépôts - retraits. L'écart avec le comptage physique révèle les
  // erreurs de caisse — jamais bloquant, seulement enregistré. Le numéro
  // de clôture et le résumé figé sont écrits dans la même transaction que
  // le passage à CLOSED : soit tout, soit rien.
  async closeSession(
    establishmentId: string,
    sessionId: string,
    input: CloseSessionDto,
  ) {
    const session = await this.assertOpen(establishmentId, sessionId);

    const cashPayments =
      await this.cashierRepository.sumCashPayments(sessionId);
    const deposits = session.movements
      .filter((m) => m.type === "DEPOSIT")
      .reduce((sum, m) => sum + Number(m.amount), 0);
    const withdrawals = session.movements
      .filter((m) => m.type === "WITHDRAWAL")
      .reduce((sum, m) => sum + Number(m.amount), 0);

    const closingBalanceExpected =
      Number(session.openingBalance) + cashPayments + deposits - withdrawals;
    const difference = input.closingBalanceCounted - closingBalanceExpected;

    const payments =
      await this.cashierRepository.findPaymentsForSummary(sessionId);
    const summary = this.buildSummary(payments, deposits, withdrawals);

    const closed = await this.prisma.$transaction(async (tx) => {
      const { nextClosureNumber } =
        await this.cashierRepository.incrementClosureNumber(
          tx,
          establishmentId,
        );
      const closureNumber = nextClosureNumber - 1;
      return this.cashierRepository.closeSession(tx, sessionId, {
        closingBalanceExpected,
        closingBalanceCounted: input.closingBalanceCounted,
        difference,
        notes: input.notes,
        closureNumber,
        summary: summary as unknown as Prisma.InputJsonValue,
      });
    });

    await this.sendClosureEmailIfEnabled(
      establishmentId,
      closed.closureNumber ?? 0,
      summary,
    );
    return closed;
  }

  private async sendClosureEmailIfEnabled(
    establishmentId: string,
    closureNumber: number,
    summary: CashSessionSummary,
  ): Promise<void> {
    if (!this.mailService.isEnabled) return;
    const establishment = await this.prisma.establishment.findUnique({
      where: { id: establishmentId },
      select: { email: true, name: true, settings: true },
    });
    const settings = establishment?.settings as {
      sendClosureEmail?: boolean;
    } | null;
    if (!establishment?.email || !settings?.sendClosureEmail) return;

    await this.mailService.send({
      to: establishment.email,
      subject: `Clôture de caisse n°${closureNumber} — ${establishment.name}`,
      html: `<p>Clôture n°${closureNumber}</p><p>Total des ventes : ${summary.totalSales}</p><p>Nombre de tickets : ${summary.orderCount}</p>`,
    });
  }
}
