import { offlineDb, type OfflineOrder } from "./offlineDb";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4100";

function toCreateOrderInput(order: OfflineOrder) {
  return {
    orderType: order.orderType,
    tableIds: order.tableIds,
    customerId: order.customerId,
    notes: order.notes,
    // Les paliers de prix et remises ne sont pas gérés hors ligne : le
    // serveur recalcule taxes/remises comme source de vérité à la
    // synchronisation, le total affiché hors ligne n'est qu'une estimation.
    items: order.items.map((item) => ({
      productId: item.productId,
      quantity: item.quantity,
      priceTier: 1 as const,
      discountAmount: 0,
      notes: item.notes,
    })),
    clientTicketId: order.localId,
  };
}

// Un seul run à la fois — protège contre un déclenchement concurrent
// (événement "online" du navigateur + clic manuel "Synchroniser" au même
// moment). Ne survit qu'à l'échelle du module côté client (jamais importé
// côté serveur, voir offlineDb.ts).
let syncing = false;

export async function syncOfflineOrders(accessToken: string): Promise<void> {
  if (syncing) return;
  syncing = true;
  try {
    const pending = await offlineDb.orders
      .where("status")
      .anyOf("pending", "failed")
      .sortBy("createdAt");

    for (const order of pending) {
      await offlineDb.orders.update(order.localId, {
        status: "syncing",
        error: undefined,
      });
      try {
        const res = await fetch(`${API_URL}/api/v1/orders`, {
          method: "POST",
          headers: {
            Authorization: `Bearer ${accessToken}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify(toCreateOrderInput(order)),
        });
        if (!res.ok) {
          const body = await res.json().catch(() => null);
          throw new Error(body?.message ?? `HTTP ${res.status}`);
        }
        const data = (await res.json()) as { order: { id: string } };
        await offlineDb.orders.update(order.localId, {
          status: "synced",
          syncedOrderId: data.order.id,
        });
        await offlineDb.orders.delete(order.localId);
      } catch (error) {
        await offlineDb.orders.update(order.localId, {
          status: "failed",
          error:
            error instanceof Error
              ? error.message
              : "Échec de la synchronisation",
        });
      }
    }
  } finally {
    syncing = false;
  }
}
