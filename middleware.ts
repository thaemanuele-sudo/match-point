import { NextResponse, type NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { SUPABASE_URL, SUPABASE_KEY } from "@/lib/supabase/config";

// Pagine dell'app aperte a tutti (accesso, registrazione, benvenuto)
const LIBERE = ["/app/accesso", "/app/registrati", "/app/benvenuto", "/app/recupero"];

export async function middleware(req: NextRequest) {
  let res = NextResponse.next({ request: req });
  const sb = createServerClient(SUPABASE_URL, SUPABASE_KEY, {
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
  // App dei centri: serve l'accesso, ma il manifest PWA deve restare pubblico (il browser lo scarica senza cookie)
  const centri = (p.startsWith("/c/") || p.startsWith("/centro/")) && !p.endsWith("/manifest.webmanifest");
  if (centri && !data.user) {
    const url = req.nextUrl.clone();
    url.pathname = "/app/benvenuto";
    url.search = "";
    url.searchParams.set("dopo", p + req.nextUrl.search);
    return NextResponse.redirect(url);
  }
  if (p.startsWith("/app") && !data.user && !LIBERE.some((l) => p.startsWith(l))) {
    const url = req.nextUrl.clone();
    url.pathname = "/app/benvenuto";
    // la query va conservata: /app/unisciti?c=CODICE non deve perdere il codice dell'invito dopo l'accesso
    url.search = "";
    url.searchParams.set("dopo", p + req.nextUrl.search);
    return NextResponse.redirect(url);
  }
  return res;
}

export const config = { matcher: ["/app/:path*", "/admin/:path*", "/api/:path*", "/c/:path*", "/centro/:path*"] };
