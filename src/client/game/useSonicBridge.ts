"use client";

import { useCallback, useEffect, useRef, useState } from "react";

// React side of the engine postMessage bridge (see vendor/opensonic/.../bridge.ts).
// Lets the tutoring app pause/resume the playable level and react to in-world
// events (engine-ready, reach-terminal, ring-collected, goal-reached, …).

export interface SonicEvent {
  type: string;
  payload?: unknown;
}

export function useSonicBridge(iframeRef: React.RefObject<HTMLIFrameElement | null>) {
  const [ready, setReady] = useState(false);
  const [lastEvent, setLastEvent] = useState<SonicEvent | null>(null);
  const handlers = useRef<Map<string, (payload?: unknown) => void>>(new Map());

  useEffect(() => {
    let gotReady = false;

    const onMsg = (e: MessageEvent) => {
      const d = e.data;
      if (!d || d.source !== "sonic-engine") return;
      if (d.type === "engine-ready") {
        gotReady = true;
        setReady(true);
      }
      setLastEvent({ type: d.type, payload: d.payload });
      handlers.current.get(d.type)?.(d.payload);
    };
    window.addEventListener("message", onMsg);

    // Handshake: poll "ping" until the engine answers "engine-ready", removing
    // the race where the engine's one-shot ready event fires before this
    // listener (or the iframe) is attached.
    const interval = setInterval(() => {
      if (gotReady) return;
      iframeRef.current?.contentWindow?.postMessage({ target: "sonic-engine", type: "ping" }, "*");
    }, 250);

    return () => {
      clearInterval(interval);
      window.removeEventListener("message", onMsg);
    };
  }, [iframeRef]);

  const send = useCallback(
    (type: string, payload?: unknown) => {
      iframeRef.current?.contentWindow?.postMessage({ target: "sonic-engine", type, payload }, "*");
    },
    [iframeRef]
  );

  /** Subscribe to a specific engine event type; returns an unsubscribe fn. */
  const on = useCallback((type: string, fn: (payload?: unknown) => void) => {
    handlers.current.set(type, fn);
    return () => handlers.current.delete(type);
  }, []);

  const pause = useCallback(() => send("pause"), [send]);
  const resume = useCallback(() => send("resume"), [send]);

  return { ready, lastEvent, send, on, pause, resume };
}
