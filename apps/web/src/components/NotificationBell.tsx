"use client";

import { useCallback, useEffect, useState } from "react";
import { useNestApi } from "@/hooks/useNestApi";
import { useRealtimeSocket } from "@/hooks/useRealtimeSocket";

interface Notification {
  id: string;
  title: string;
  message: string;
  isRead: boolean;
  createdAt: string;
}

export function NotificationBell() {
  const { authFetch } = useNestApi();
  const [isOpen, setIsOpen] = useState(false);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);

  const loadUnreadCount = useCallback(async () => {
    const res = await authFetch("/notifications/unread-count");
    if (!res.ok) return;
    const data = (await res.json()) as { count: number };
    setUnreadCount(data.count);
  }, [authFetch]);

  const loadNotifications = useCallback(async () => {
    const res = await authFetch("/notifications?pageSize=10");
    if (!res.ok) return;
    const data = (await res.json()) as { data: Notification[] };
    setNotifications(data.data);
  }, [authFetch]);

  useEffect(() => {
    loadUnreadCount();
  }, [loadUnreadCount]);

  useEffect(() => {
    if (isOpen) loadNotifications();
  }, [isOpen, loadNotifications]);

  // Diffusion en direct (Socket.io/Ably, voir useRealtimeSocket) : une
  // nouvelle notification rafraîchit le compteur immédiatement, sans
  // attendre l'ouverture du panneau.
  useRealtimeSocket("notification", () => {
    loadUnreadCount();
    if (isOpen) loadNotifications();
  });

  async function markRead(id: string) {
    await authFetch(`/notifications/${id}/read`, { method: "POST" });
    loadUnreadCount();
    loadNotifications();
  }

  async function markAllRead() {
    await authFetch("/notifications/read-all", { method: "POST" });
    loadUnreadCount();
    loadNotifications();
  }

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen((v) => !v)}
        className="relative rounded border border-neutral-300 px-3 py-1.5 text-sm hover:bg-neutral-100"
      >
        Notifications
        {unreadCount > 0 && (
          <span className="absolute -right-2 -top-2 flex h-5 min-w-5 items-center justify-center rounded-full bg-red-600 px-1 text-xs font-medium text-white">
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
      </button>

      {isOpen && (
        <>
          <div
            className="fixed inset-0 z-10"
            onClick={() => setIsOpen(false)}
          />
          <div className="absolute right-0 top-full z-20 mt-2 w-80 rounded border border-neutral-300 bg-white shadow-lg">
            <div className="flex items-center justify-between border-b border-neutral-200 px-3 py-2">
              <span className="text-sm font-medium">Notifications</span>
              {unreadCount > 0 && (
                <button
                  onClick={markAllRead}
                  className="text-xs text-neutral-500 hover:underline"
                >
                  Tout marquer comme lu
                </button>
              )}
            </div>
            <ul className="max-h-96 overflow-y-auto">
              {notifications.map((n) => (
                <li
                  key={n.id}
                  onClick={() => !n.isRead && markRead(n.id)}
                  className={`cursor-pointer border-b border-neutral-100 px-3 py-2 text-sm last:border-0 hover:bg-neutral-50 ${
                    n.isRead ? "" : "bg-neutral-50"
                  }`}
                >
                  <p className="font-medium">{n.title}</p>
                  <p className="text-xs text-neutral-600">{n.message}</p>
                  <p className="mt-1 text-xs text-neutral-400">
                    {new Date(n.createdAt).toLocaleString("fr-FR")}
                  </p>
                </li>
              ))}
              {notifications.length === 0 && (
                <li className="px-3 py-6 text-center text-sm text-neutral-500">
                  Aucune notification.
                </li>
              )}
            </ul>
          </div>
        </>
      )}
    </div>
  );
}
