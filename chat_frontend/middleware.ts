import { NextRequest, NextResponse } from "next/server";

export function middleware(req: NextRequest) {
  // Controlla il token dai cookie (se accessibile) o dagli header
  const token = req.cookies.get("access_token_chat") || req.headers.get("Authorization");

  const { pathname } = req.nextUrl;

  // Se l'utente NON è autenticato e non è già su /auth/signin, lo reindirizza
  if (!token && pathname !== "/auth/signin") {
    return NextResponse.redirect(new URL("/auth/signin", req.url));
  }

  // Se l'utente È autenticato e prova ad accedere a /auth/signin, lo manda alla dashboard
  if (token && pathname === "/auth/signin") {
    return NextResponse.redirect(new URL("/", req.url));
  }

  // Continua la navigazione normalmente
  return NextResponse.next();
}

// Applica il middleware anche a /auth/signin per gestire il redirect
export const config = {
  matcher: ["/", "/auth/signin"], 
};
