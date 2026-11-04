import { redirect } from "next/navigation";
import type { NextRequest } from "next/server";
import type { EmailOtpType } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";

/**
 * Where the links in our auth emails land.
 *
 * Supabase's stock template points at its own /auth/v1/verify endpoint, which
 * hands the session to the browser as a URL fragment. That suits a
 * client-only app; this one signs in on the server, so the fragment never
 * reaches it and the link appeared to do nothing. The templates in
 * supabase/emails send a token hash here instead, and verifyOtp below turns
 * it into the session cookies the rest of the app reads.
 *
 * Verifying server-side also means the link works in a different browser from
 * the one that signed up — a phone opening a mail app, say.
 */

const OTP_TYPES: EmailOtpType[] = ["signup", "email", "recovery", "invite", "email_change", "magiclink"];

function isOtpType(value: string | null): value is EmailOtpType {
  return OTP_TYPES.includes(value as EmailOtpType);
}

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const tokenHash = searchParams.get("token_hash");
  const type = searchParams.get("type");
  const next = searchParams.get("next");

  // Only our own paths: "next" arrives from the email, and following an
  // absolute URL from there would make this an open redirect. Home is enough
  // anyway — the app layout sends anyone without a diary on to onboarding.
  const destination = next?.startsWith("/") && !next.startsWith("//") ? next : "/";

  if (tokenHash && isOtpType(type)) {
    const supabase = await createClient();
    const { error } = await supabase.auth.verifyOtp({ type, token_hash: tokenHash });
    if (!error) redirect(destination);
  }

  // Expired, already used, or tampered with. The login page explains it.
  redirect("/login?error=link");
}
