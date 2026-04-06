import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { OWNER_ONLY_ROUTES, OWNER_ONLY_PREFIXES } from "@/types/auth";

const publicRoutes = [
  "/sign-in",
  "/register",
  "/forgot-password",
  "/reset-password",
  "/auth/callback",
];

const authRoutes = ["/sign-in", "/register", "/forgot-password"];

export async function middleware(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request });

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !anonKey) {
    throw new Error("Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY environment variable");
  }

  const supabase = createServerClient(supabaseUrl, anonKey, {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          );
          supabaseResponse = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const pathname = request.nextUrl.pathname;

  // Redirect authenticated users away from auth pages
  if (user && authRoutes.some((route) => pathname.startsWith(route))) {
    const url = request.nextUrl.clone();
    url.pathname = "/dashboard";
    return NextResponse.redirect(url);
  }

  // Redirect unauthenticated users to sign-in
  if (
    !user &&
    !publicRoutes.some((route) => pathname.startsWith(route)) &&
    pathname !== "/"
  ) {
    const url = request.nextUrl.clone();
    url.pathname = "/sign-in";
    return NextResponse.redirect(url);
  }

  // Role-based access control for authenticated users
  if (user) {
    const { data: profile } = await supabase
      .from("profiles")
      .select("role, status")
      .eq("id", user.id)
      .single();

    // Auto-activate pending users on first login (invitation accepted)
    if (profile && profile.status === "pending") {
      await supabase
        .from("profiles")
        .update({ status: "active" })
        .eq("id", user.id);
    }

    // Block inactive users
    if (profile && profile.status === "inactive") {
      await supabase.auth.signOut();
      const url = request.nextUrl.clone();
      url.pathname = "/sign-in";
      return NextResponse.redirect(url);
    }

    // Block vendeur from owner-only routes
    if (profile?.role !== "proprietaire" && profile?.role !== "super_admin") {
      const isOwnerRoute =
        OWNER_ONLY_ROUTES.some((r) => pathname === r) ||
        OWNER_ONLY_PREFIXES.some((r) => pathname.startsWith(r));
      if (isOwnerRoute) {
        const url = request.nextUrl.clone();
        url.pathname = "/dashboard";
        return NextResponse.redirect(url);
      }
    }
  }

  return supabaseResponse;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
