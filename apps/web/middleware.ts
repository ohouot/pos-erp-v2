import { NextResponse } from "next/server";
import { getToken } from "next-auth/jwt";
import type { NextRequest } from "next/server";

// Équivalent Next.js de ProtectedRoute/PublicOnlyRoute (React Router) côté
// projet de référence : redirige les visiteurs non authentifiés vers
// /login, et les utilisateurs déjà connectés loin de /login /register.
const PUBLIC_ONLY_PATHS = [
  "/login",
  "/register",
  "/forgot-password",
  "/reset-password",
];
// Ni ProtectedRoute ni PublicOnlyRoute : le lien de confirmation d'email doit
// fonctionner qu'on soit connecté ou non (voir routes/index.tsx du projet de
// référence, VerifyEmailPage hors des deux branches gardées).
const UNGUARDED_PATHS = ["/verify-email"];

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (UNGUARDED_PATHS.some((path) => pathname.startsWith(path))) {
    return NextResponse.next();
  }

  const token = await getToken({
    req: request,
    secret: process.env.NEXTAUTH_SECRET,
  });

  const isPublicOnly = PUBLIC_ONLY_PATHS.some((path) =>
    pathname.startsWith(path),
  );

  if (isPublicOnly) {
    if (token) {
      return NextResponse.redirect(new URL("/", request.url));
    }
    return NextResponse.next();
  }

  if (!token) {
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("callbackUrl", pathname);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    // Toutes les routes sauf les assets Next.js, les fichiers statiques et
    // les routes API next-auth elles-mêmes (jamais gardées, sous peine de
    // boucle de redirection).
    "/((?!api/auth|_next/static|_next/image|favicon.ico).*)",
  ],
};
