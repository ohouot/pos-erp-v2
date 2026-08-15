import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service.js";
import { PaymentsRepository } from "./payments.repository.js";
import { OrdersRepository } from "../orders/orders.repository.js";
import { CashierRepository } from "../cashier/cashier.repository.js";
import { PaymentMethodsRepository } from "../payment-methods/payment-methods.repository.js";
import { TablesRepository } from "../tables/tables.repository.js";
import { CustomersRepository } from "../customers/customers.repository.js";
import { RealtimeService } from "../realtime/realtime.service.js";
import type { CreatePaymentDto } from "./dto/create-payment.dto.js";

// Tolère les écarts d'arrondi Decimal/flottant dans les comparaisons de
// montants (solde restant dû, seuil "payé intégralement").
const EPSILON = 0.01;

@Injectable()
export class PaymentsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly paymentsRepository: PaymentsRepository,
    private readonly ordersRepository: OrdersRepository,
    private readonly cashierRepository: CashierRepository,
    private readonly paymentMethodsRepository: PaymentMethodsRepository,
    private readonly tablesRepository: TablesRepository,
    private readonly customersRepository: CustomersRepository,
    private readonly realtimeService: RealtimeService,
  ) {}

  listForOrder(establishmentId: string, orderId: string) {
    return this.paymentsRepository.findAllForOrder(establishmentId, orderId);
  }

  // Encaisse une commande, éventuellement en plusieurs fois (paiement mixte :
  // plusieurs appels successifs, une ligne Payment par méthode). Bascule la
  // commande en PAID (numéro de facture assigné, tables en CLEANING) dès
  // que le solde cumulé atteint le total — pas d'endpoint de finalisation
  // séparé, tout se joue dans la même transaction que ce dernier paiement.
  async createPayment(
    establishmentId: string,
    orderId: string,
    employeeId: string,
    input: CreatePaymentDto,
  ) {
    const order = await this.ordersRepository.findById(
      this.prisma,
      establishmentId,
      orderId,
    );
    if (!order) throw new NotFoundException("Commande introuvable");

    if (order.status === "OPEN") {
      throw new BadRequestException(
        "Envoyez la commande en cuisine avant d'encaisser",
      );
    }
    if (order.status === "CANCELLED") {
      throw new BadRequestException("Cette commande est annulée");
    }
    if (order.status === "PAID") {
      throw new BadRequestException("Cette commande est déjà payée");
    }

    const session = await this.cashierRepository.findOpenSession(
      this.prisma,
      establishmentId,
    );
    if (!session) {
      throw new BadRequestException(
        "Ouvrez une session de caisse avant d'encaisser",
      );
    }

    const paymentMethod = await this.paymentMethodsRepository.findById(
      establishmentId,
      input.paymentMethodId,
    );
    if (!paymentMethod || !paymentMethod.isActive) {
      throw new BadRequestException("Moyen de paiement invalide ou désactivé");
    }

    const existingPayments = await this.paymentsRepository.findAllForOrder(
      establishmentId,
      orderId,
    );
    const alreadyPaid = existingPayments.reduce(
      (sum, p) => sum + Number(p.amount),
      0,
    );
    const remaining = Number(order.totalAmount) - alreadyPaid;
    if (input.amount > remaining + EPSILON) {
      throw new BadRequestException(
        `Le montant dépasse le solde restant dû (${remaining.toFixed(2)})`,
      );
    }

    let amountReceived: number | undefined;
    let changeGiven: number | undefined;
    if (paymentMethod.code === "CASH") {
      amountReceived = input.amountReceived ?? input.amount;
      if (amountReceived < input.amount) {
        throw new BadRequestException(
          "Le montant reçu est inférieur au montant encaissé",
        );
      }
      changeGiven = amountReceived - input.amount;
    }

    const newTotalPaid = alreadyPaid + input.amount;
    const willBePaid = newTotalPaid >= Number(order.totalAmount) - EPSILON;

    const updatedOrder = await this.prisma.$transaction(async (tx) => {
      await this.paymentsRepository.createPayment(
        tx,
        establishmentId,
        orderId,
        session.id,
        employeeId,
        {
          paymentMethodId: input.paymentMethodId,
          amount: input.amount,
          amountReceived,
          changeGiven,
          reference: input.reference,
        },
      );

      if (willBePaid) {
        await this.ordersRepository.assignInvoiceNumber(
          tx,
          establishmentId,
          orderId,
        );
        await this.ordersRepository.updateOrderStatus(
          tx,
          orderId,
          "PAID",
          new Date(),
        );
        const tableIds = order.orderTables.map((ot) => ot.tableId);
        await this.tablesRepository.markTablesCleaning(tx, tableIds);
        if (order.customerId) {
          await this.customersRepository.creditLoyalty(
            tx,
            order.customerId,
            Number(order.totalAmount),
          );
        }
      }

      return this.ordersRepository.findById(tx, establishmentId, orderId);
    });

    if (willBePaid) {
      this.realtimeService.emitToEstablishment(
        establishmentId,
        "table:updated",
        {},
      );
    }

    return updatedOrder;
  }
}
