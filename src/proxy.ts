import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

// Keeps the Supabase auth cookie fresh on every request. Actual route
// protection (redirecting unauthenticated users, checking couple membership)
// happens in `src/app/(app)/layout.tsx`, not here — proxy is a network
// boundary, not the authorization layer.
//
// Refreshing has to happen here because a Server Component cannot write
// cookies mid-render, so it could never persist a rotated access token.
export async function proxy(request: NextRequest) {
  let response = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          response = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options),
          );
        },
      },
    },
  );

  // getSession, not getUser: getUser always makes a network call to Supabase
  // (~120ms) even when the access token is nowhere near expiring, and this ran
  // on every request. getSession reads the cookie and only goes to the network
  // when the token has actually expired and needs rotating — which is all this
  // middleware is here to do.
  //
  // The usual "don't trust getSession on the server" warning is about using it
  // to make authorization decisions, since it doesn't verify the token's
  // signature. Nothing is authorized here: getCoupleContext() still calls
  // getUser() (server-validated) and RLS enforces access in Postgres, so a
  // forged token gets past this line and fails at the checks that matter.
  await supabase.auth.getSession();

  return response;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)"],
};
