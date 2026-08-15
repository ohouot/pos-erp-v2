export interface PaymentMethod {
  id: string;
  establishmentId: string;
  // Identifiant stable (ex: "CASH"), jamais modifié après création — utilisé
  // par les rapports/le calcul de monnaie, voir payments.service.createPayment.
  code: string;
  label: string;
  displayOrder: number;
  isActive: boolean;
}
