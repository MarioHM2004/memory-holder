"use client";

import { useEffect, useRef, useState } from "react";
import type { RealtimeChannel } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/client";

export interface Editor {
  userId: string;
  name: string;
}

interface Payload extends Editor {
  /** The memory whose edit form this tab has open, or null for none. */
  memoryId: string | null;
}

/**
 * The other people among `editors`, as a list for a sentence ("Siqi", "Siqi
 * and Ana"), or null when every entry is the viewer themselves in another tab.
 */
export function editorNames(editors: Editor[], userId: string, locale: string) {
  const names = [...new Set(editors.filter((e) => e.userId !== userId).map((e) => e.name))];
  return names.length ? new Intl.ListFormat(locale, { type: "conjunction" }).format(names) : null;
}

/**
 * Who else has a memory's edit form open right now, via Supabase Realtime
 * presence.
 *
 * Every admin panel in a diary joins one channel and announces which memory it
 * is editing, so a second person can be kept out of a form that's already
 * open. It's not a database lock: two edit buttons pressed in the same instant
 * can both get through before either announcement arrives. The channel is
 * private, so the RLS policies in 0002_editing_presence.sql decide who may
 * join it.
 *
 * Presence is keyed per tab rather than per user, so the same person with the
 * form open on their phone and their laptop shows up too.
 */
export function useEditingPresence({
  coupleId,
  userId,
  name,
  memoryId,
}: {
  coupleId: string;
  userId: string;
  name: string;
  memoryId: string | null;
}) {
  const [tab] = useState(() => crypto.randomUUID());
  const [editorsByMemory, setEditorsByMemory] = useState<Map<string, Editor[]>>(new Map());
  const channelRef = useRef<RealtimeChannel | null>(null);
  const joined = useRef(false);
  const currentMemoryId = useRef(memoryId);

  useEffect(() => {
    const supabase = createClient();
    const channel = supabase.channel(`editing:${coupleId}`, {
      config: { private: true, presence: { key: tab } },
    });

    channel
      .on("presence", { event: "sync" }, () => {
        const next = new Map<string, Editor[]>();
        for (const [key, metas] of Object.entries(channel.presenceState<Payload>())) {
          if (key === tab) continue;
          // Re-tracking from a tab can briefly leave its old entry alongside
          // the new one; the last is the current state.
          const meta = metas.at(-1);
          if (!meta?.memoryId) continue;
          next.set(meta.memoryId, [
            ...(next.get(meta.memoryId) ?? []),
            { userId: meta.userId, name: meta.name },
          ]);
        }
        setEditorsByMemory(next);
      })
      .subscribe((status) => {
        if (status === "SUBSCRIBED") {
          joined.current = true;
          void channel.track({ userId, name, memoryId: currentMemoryId.current });
        } else if (status === "CHANNEL_ERROR") {
          // Most likely the 0002 migration hasn't been run. Editing still
          // works, there's just no warning — say why instead of failing silently.
          console.warn("Editing presence unavailable: could not join the realtime channel.");
        }
      });
    channelRef.current = channel;

    return () => {
      joined.current = false;
      channelRef.current = null;
      void supabase.removeChannel(channel);
    };
  }, [coupleId, userId, name, tab]);

  // Opening or closing a form updates this tab's entry in place.
  useEffect(() => {
    currentMemoryId.current = memoryId;
    if (joined.current) void channelRef.current?.track({ userId, name, memoryId });
  }, [memoryId, userId, name]);

  return (id: string) => editorsByMemory.get(id) ?? [];
}
