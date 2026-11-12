"use client";

import { useEffect } from "react";

/**
 * Registers the worker in public/sw.js.
 *
 * `signedOut` is set on the login page, which is where signing out lands:
 * it tells the worker to drop the photos it has kept. The worker holds
 * nothing else of anyone's — pages and data are never cached.
 */
export function ServiceWorker({ signedOut = false }: { signedOut?: boolean }) {
  useEffect(() => {
    if (!("serviceWorker" in navigator)) return;

    navigator.serviceWorker
      .register("/sw.js")
      .then(async (registration) => {
        // Asks whether a newer worker has been deployed. Without this a
        // phone can sit on an old one for a day, which is the failure worth
        // guarding against with anything that installs itself.
        registration.update().catch(() => {});

        if (!signedOut) return;
        // `controller` is empty on a first visit, before any worker has
        // taken over; `ready` resolves once one is in charge.
        await navigator.serviceWorker.ready;
        navigator.serviceWorker.controller?.postMessage({ type: "signout" });
      })
      .catch(() => {
        // No worker means no offline page and a slower first paint, which is
        // a smaller problem than a page that refuses to load over it.
      });
  }, [signedOut]);

  return null;
}
