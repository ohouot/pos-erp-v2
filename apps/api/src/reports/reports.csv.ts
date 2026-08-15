import type { FinancialSummary } from "@pos-erp-v2/shared";

function csvEscape(value: string): string {
  return /[",\r\n]/.test(value) ? `"${value.replace(/"/g, '""')}"` : value;
}

function row(cells: string[]): string {
  return cells.map((value) => csvEscape(value)).join(",");
}

// Export CSV (compatible Excel/Sheets) plutôt qu'un PDF/Excel binaire — pas
// de nouvelle dépendance serveur, cohérent avec l'export produits/employés
// déjà en place. La mise en page imprimable (façon PDF) est gérée côté
// client via window.print(), comme pour le ticket de caisse.
export function exportFinancialSummaryToCsv(summary: FinancialSummary): string {
  const lines = [
    row(["Résumé financier", `${summary.from} → ${summary.to}`]),
    "",
    row(["Indicateur", "Montant (XOF)"]),
    row(["Chiffre d'affaires", summary.revenue]),
    row(["Coût des achats", summary.purchaseCost]),
    row(["Dépenses", summary.expenses]),
    row(["Marge brute", summary.grossMargin]),
    row(["Marge brute (%)", summary.grossMarginPercent]),
    row(["Résultat net", summary.netResult]),
    "",
    row(["Dépenses par catégorie", ""]),
    row(["Catégorie", "Montant (XOF)"]),
    ...summary.expensesByCategory.map((entry) =>
      row([entry.categoryName, entry.total]),
    ),
  ];
  return lines.join("\r\n");
}
