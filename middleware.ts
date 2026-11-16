import { NextResponse, type NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";

// Pagine dell'app aperte a tutti (accesso, registrazione, benvenuto)
const LIBERE = ["/app/accesso", "/app/registrati", "/app/benvenuto", "/app/recupero"];

export async function middleware(req: NextRequest) {
  let res = NextResponse.next({ request: req });
  const sb = createServerClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, {
    cookies: {
      getAll: () => req.cookies.getAll(),
      setAll: (list) => {
        list.forEach(({ name, value }) => req.cookies.set(name, value));
        res = NextResponse.next({ request: req });
        list.forEach(({ name, value, options }) => res.cookies.set(name, value, options));
      },
    },
  });
  const { data } = await sb.auth.getUser();
  const p = req.nextUrl.pathname;
  if (p.startsWith("/app") && !data.user && !LIBERE.some((l) => p.startsWith(l))) {
    const url = req.nextUrl.clone();
    url.pathname = "/app/benvenuto";
    url.searchParams.set("dopo", p);
    return NextResponse.redirect(url);
  }
  return res;
}

export const config = { matcher: ["/app/:path*", "/admin/:path*", "/api/:path*"] };
