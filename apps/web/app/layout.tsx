import type { Metadata } from "next";
import "./globals.css";
import { AuthSessionProvider } from "@/components/AuthSessionProvider";
import { OfflineProvider } from "@/components/OfflineProvider";
import { OfflineIndicator } from "@/components/OfflineIndicator";

export const metadata: Metadata = {
  title: "POS/ERP",
  description: "Reconstruction Next.js/NestJS de pos-erp",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="fr">
      <body>
        <AuthSessionProvider>
          <OfflineProvider>
            <div className="fixed right-4 top-4 z-50">
              <OfflineIndicator />
            </div>
            {children}
          </OfflineProvider>
        </AuthSessionProvider>
      </body>
    </html>
  );
}
