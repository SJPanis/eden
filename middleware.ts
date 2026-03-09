import { NextResponse, type NextRequest } from "next/server";
import { getToken } from "next-auth/jwt";
import {
  buildAuthSignInPath,
  edenAuthJsPlatformRoleClaim,
  getCanonicalRouteForRole,
  parseAuthenticatedRoleClaim,
  resolveRequiredRoleForPath,
  shouldEnforceProtectedRouteAuth,
} from "@/modules/core/session/access-control";

export async function middleware(request: NextRequest) {
  if (!shouldEnforceProtectedRouteAuth()) {
    return NextResponse.next();
  }

  const routeMatch = resolveRequiredRoleForPath(request.nextUrl.pathname);

  if (!routeMatch) {
    return NextResponse.next();
  }

  const token = await getToken({
    req: request,
    secret: process.env.NEXTAUTH_SECRET ?? process.env.AUTH_SECRET ?? undefined,
  });
  const authenticatedRole = parseAuthenticatedRoleClaim(
    token?.[edenAuthJsPlatformRoleClaim],
  );

  if (!token || !authenticatedRole) {
    return routeMatch.kind === "api"
      ? NextResponse.json(
          {
            ok: false,
            error: "Authentication required.",
            signInPath: buildAuthSignInPath(
              `${request.nextUrl.pathname}${request.nextUrl.search}`,
            ),
          },
          { status: 401 },
        )
      : NextResponse.redirect(
          new URL(
            buildAuthSignInPath(
              `${request.nextUrl.pathname}${request.nextUrl.search}`,
            ),
            request.url,
          ),
        );
  }

  if (authenticatedRole !== routeMatch.role) {
    const redirectPath = getCanonicalRouteForRole(authenticatedRole);

    return routeMatch.kind === "api"
      ? NextResponse.json(
          {
            ok: false,
            error: "Forbidden for the current role.",
            redirectTo: redirectPath,
          },
          { status: 403 },
        )
      : NextResponse.redirect(new URL(redirectPath, request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/consumer/:path*",
    "/business/:path*",
    "/owner/:path*",
    "/api/credits/top-up/checkout",
    "/api/credits/top-up/confirm",
    "/api/mock-transactions",
    "/api/mock-business",
    "/api/mock-services",
    "/api/mock-pipeline",
    "/api/mock-assistant-history",
    "/api/mock-admin",
    "/api/mock-payout-settlements",
    "/api/mock-state",
  ],
};
