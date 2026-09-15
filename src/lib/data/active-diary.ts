import { cookies } from "next/headers";

/**
 * Which diary someone is looking at, for people who belong to more than one.
 *
 * Only a preference: couple-context picks it among the diaries the user is
 * actually a member of, so a stale or hand-edited value falls back to their
 * first diary instead of granting anything. RLS still guards every row.
 */
export const ACTIVE_DIARY_COOKIE = "mh-diary";

/** Sets the active diary. Server Functions only — cookies can't be written mid-render. */
export async function setActiveDiary(coupleId: string) {
  const cookieStore = await cookies();
  cookieStore.set(ACTIVE_DIARY_COOKIE, coupleId, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    maxAge: 60 * 60 * 24 * 365,
    path: "/",
  });
}
