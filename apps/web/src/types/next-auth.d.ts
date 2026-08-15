import type { DefaultSession } from "next-auth";

interface NestUserProfile {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  phone: string | null;
  avatarUrl: string | null;
  isSuperAdmin: boolean;
  permissions: string[];
  establishments: Array<{
    establishmentId: string;
    establishmentName: string;
    roleId: string;
    roleName: string;
  }>;
}

declare module "next-auth" {
  interface Session extends DefaultSession {
    accessToken: string;
    activeEstablishmentId: string | null;
    error?: string;
    user: NestUserProfile;
  }

  interface User {
    nestAccessToken: string;
    nestRefreshToken: string;
    nestAccessTokenExpiresAt: number;
    activeEstablishmentId: string | null;
    profile: NestUserProfile;
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    nestAccessToken?: string;
    nestRefreshToken?: string;
    nestAccessTokenExpiresAt?: number;
    activeEstablishmentId?: string | null;
    profile?: NestUserProfile;
    error?: string;
  }
}
