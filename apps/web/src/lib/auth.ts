import type { NextAuthOptions, User } from "next-auth";
import type { JWT } from "next-auth/jwt";
import CredentialsProvider from "next-auth/providers/credentials";

const API_URL = process.env.API_URL ?? "http://localhost:4100";
// Doit rester cohérent avec JWT_ACCESS_EXPIRES_IN côté apps/api (.env) — le
// bridge n'a aucun moyen de lire cette valeur depuis l'API, donc on la
// duplique ici volontairement (voir plan §C, "Pont d'authentification").
const ACCESS_TOKEN_TTL_MS = 15 * 60 * 1000;

interface NestEstablishmentMembership {
  establishmentId: string;
  establishmentName: string;
  roleId: string;
  roleName: string;
}

interface NestAuthenticatedUser {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  phone: string | null;
  avatarUrl: string | null;
  isSuperAdmin: boolean;
  permissions: string[];
  establishments: NestEstablishmentMembership[];
}

interface NestLoginResponse {
  user: NestAuthenticatedUser;
  accessToken: string;
  refreshToken: string;
}

async function selectSoleEstablishment(
  accessToken: string,
  establishments: NestEstablishmentMembership[],
): Promise<{ accessToken: string; establishmentId: string } | null> {
  if (establishments.length !== 1) return null;
  const res = await fetch(
    `${API_URL}/api/v1/establishments/${establishments[0].establishmentId}/select`,
    { method: "POST", headers: { Authorization: `Bearer ${accessToken}` } },
  );
  if (!res.ok) return null;
  const data = (await res.json()) as {
    accessToken: string;
    establishment: { id: string };
  };
  return {
    accessToken: data.accessToken,
    establishmentId: data.establishment.id,
  };
}

// Le callback authorize() est le pont : il appelle l'API NestJS (seule
// source de vérité pour mot de passe/RBAC/multi-tenant), jamais next-auth
// lui-même. Le champ `mode` distingue connexion/inscription pour éviter un
// second aller-retour de connexion après une inscription réussie.
async function authenticateWithNest(
  credentials: Record<string, string> | undefined,
): Promise<User | null> {
  if (!credentials?.email || !credentials.password) return null;
  const isRegister = credentials.mode === "register";
  const endpoint = isRegister ? "/api/v1/auth/register" : "/api/v1/auth/login";
  const body = isRegister
    ? {
        email: credentials.email,
        password: credentials.password,
        firstName: credentials.firstName,
        lastName: credentials.lastName,
        establishmentName: credentials.establishmentName,
        establishmentType: credentials.establishmentType,
      }
    : { email: credentials.email, password: credentials.password };

  const res = await fetch(`${API_URL}${endpoint}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const errorBody = (await res.json().catch(() => null)) as {
      message?: string | string[];
    } | null;
    const message = Array.isArray(errorBody?.message)
      ? errorBody.message.join(", ")
      : (errorBody?.message ?? "Échec de l'authentification");
    throw new Error(message);
  }

  const data = (await res.json()) as NestLoginResponse;

  let accessToken = data.accessToken;
  let activeEstablishmentId: string | null = null;
  const selected = await selectSoleEstablishment(
    accessToken,
    data.user.establishments,
  );
  if (selected) {
    accessToken = selected.accessToken;
    activeEstablishmentId = selected.establishmentId;
  }

  return {
    id: data.user.id,
    email: data.user.email,
    name: `${data.user.firstName} ${data.user.lastName}`,
    nestAccessToken: accessToken,
    nestRefreshToken: data.refreshToken,
    nestAccessTokenExpiresAt: Date.now() + ACCESS_TOKEN_TTL_MS,
    activeEstablishmentId,
    profile: data.user,
  } as User;
}

// Rejoue la même chaîne à deux appels que l'ancien refreshAccessToken()
// côté SPA (voir apps/web/src/lib/axios.ts du projet de référence) :
// /auth/refresh n'émet jamais de token porteur d'un établissement actif —
// il faut le re-sélectionner ensuite si un établissement était actif.
async function refreshNestSession(token: JWT): Promise<JWT> {
  try {
    const res = await fetch(`${API_URL}/api/v1/auth/refresh`, {
      method: "POST",
      headers: { Cookie: `refreshToken=${token.nestRefreshToken as string}` },
    });
    if (!res.ok) throw new Error("refresh failed");

    const data = (await res.json()) as { accessToken: string };
    const setCookieValues = res.headers.getSetCookie?.() ?? [];
    const newRefreshCookie = setCookieValues
      .find((c) => c.startsWith("refreshToken="))
      ?.split(";")[0]
      ?.split("=")[1];

    let accessToken = data.accessToken;
    if (token.activeEstablishmentId) {
      const selected = await selectSoleEstablishment(accessToken, [
        {
          establishmentId: token.activeEstablishmentId as string,
        } as NestEstablishmentMembership,
      ]);
      if (selected) accessToken = selected.accessToken;
    }

    return {
      ...token,
      nestAccessToken: accessToken,
      nestRefreshToken: newRefreshCookie ?? token.nestRefreshToken,
      nestAccessTokenExpiresAt: Date.now() + ACCESS_TOKEN_TTL_MS,
      error: undefined,
    };
  } catch {
    return { ...token, error: "RefreshFailed" as const };
  }
}

export const authOptions: NextAuthOptions = {
  session: { strategy: "jwt", maxAge: 7 * 24 * 60 * 60 },
  pages: { signIn: "/login" },
  providers: [
    CredentialsProvider({
      name: "credentials",
      credentials: {
        mode: { label: "mode", type: "text" },
        email: { label: "email", type: "email" },
        password: { label: "password", type: "password" },
        firstName: { label: "firstName", type: "text" },
        lastName: { label: "lastName", type: "text" },
        establishmentName: { label: "establishmentName", type: "text" },
        establishmentType: { label: "establishmentType", type: "text" },
      },
      authorize: authenticateWithNest,
    }),
  ],
  callbacks: {
    async jwt({ token, user, trigger, session }) {
      if (user) {
        return { ...token, ...user };
      }
      // Déclenché par useSession().update({...}) côté client — voir
      // EstablishmentSwitcher, qui appelle d'abord la route /api/establishments/select
      // (laquelle vérifie l'accès et réémet un token scopé côté NestJS) puis
      // pousse le résultat ici pour rafraîchir la session sans reconnexion.
      if (trigger === "update" && session) {
        const update = session as {
          activeEstablishmentId?: string;
          nestAccessToken?: string;
        };
        return {
          ...token,
          activeEstablishmentId:
            update.activeEstablishmentId ?? token.activeEstablishmentId,
          nestAccessToken: update.nestAccessToken ?? token.nestAccessToken,
          nestAccessTokenExpiresAt: update.nestAccessToken
            ? Date.now() + ACCESS_TOKEN_TTL_MS
            : token.nestAccessTokenExpiresAt,
        };
      }
      if (
        typeof token.nestAccessTokenExpiresAt === "number" &&
        Date.now() < token.nestAccessTokenExpiresAt - 60_000
      ) {
        return token;
      }
      return refreshNestSession(token);
    },
    async session({ session, token }) {
      session.accessToken = token.nestAccessToken as string;
      session.activeEstablishmentId = token.activeEstablishmentId as
        string | null;
      session.error = token.error as string | undefined;
      session.user = {
        ...session.user,
        ...(token.profile as object),
      };
      return session;
    },
  },
};
