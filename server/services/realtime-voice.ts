import type { Server as HttpServer } from "http";
import WebSocket, { WebSocketServer } from "ws";
import { parse as parseUrl } from "url";
import { sql, eq, and } from "drizzle-orm";
import { db } from "../db";
import { voiceMinutesUsage } from "@shared/schema";
import { storage } from "../storage";

// Daily voice-chat caps per tier (seconds).
const VOICE_QUOTA_SECONDS: Record<string, number> = {
  free: 5 * 60,
  pro: 60 * 60,
  research: 4 * 60 * 60,
  enterprise: 8 * 60 * 60,
  owner: 24 * 60 * 60,
};

function todayUTC(): string {
  return new Date().toISOString().slice(0, 10);
}

async function getVoiceSecondsToday(userId: string): Promise<number> {
  const rows = await db
    .select({ total: sql<number>`COALESCE(SUM(${voiceMinutesUsage.seconds}), 0)::int` })
    .from(voiceMinutesUsage)
    .where(and(eq(voiceMinutesUsage.userId, userId), eq(voiceMinutesUsage.date, todayUTC())));
  return rows[0]?.total || 0;
}

async function addVoiceSeconds(userId: string, seconds: number): Promise<void> {
  if (seconds <= 0) return;
  await db
    .insert(voiceMinutesUsage)
    .values({ userId, date: todayUTC(), seconds })
    .onConflictDoUpdate({
      target: [voiceMinutesUsage.userId, voiceMinutesUsage.date],
      set: { seconds: sql`${voiceMinutesUsage.seconds} + ${seconds}` },
    });
}

function azureRealtimeUrl(): string | null {
  // Prefer explicit AZURE_REALTIME_ENDPOINT (the "target URI" from Foundry).
  const explicit = process.env.AZURE_REALTIME_ENDPOINT;
  if (explicit && /^wss?:\/\//i.test(explicit)) return explicit;
  // Otherwise derive from the chat endpoint.
  const ep = (process.env.AZURE_OPENAI_ENDPOINT || "").replace(/\/+$/, "");
  if (!ep) return null;
  const wsBase = ep.replace(/^https?:\/\//i, "wss://");
  const deployment = process.env.AZURE_DEPLOYMENT_REALTIME || "gpt-realtime-2";
  if (ep.includes("services.ai.azure.com")) {
    return `${wsBase}/openai/v1/realtime?model=${encodeURIComponent(deployment)}`;
  }
  return `${wsBase}/openai/realtime?api-version=2024-10-01-preview&deployment=${encodeURIComponent(deployment)}`;
}

interface Session {
  userId: string;
  conversationId: number;
  startedAt: number;
  capSeconds: number;
  upstream: WebSocket | null;
  // Accumulated transcripts.
  userTranscript: string;
  aiTranscript: string;
  // Buffer events sent before upstream is ready.
  pending: string[];
}

export function attachRealtimeWSS(httpServer: HttpServer, sessionMiddleware: any) {
  const wss = new WebSocketServer({ noServer: true });

  httpServer.on("upgrade", (req, socket, head) => {
    const { pathname } = parseUrl(req.url || "");
    if (pathname !== "/api/realtime") return; // not for us; let other handlers (e.g. vite HMR) handle it
    // Run express-session to populate req.session.
    sessionMiddleware(req as any, {} as any, () => {
      const sess: any = (req as any).session;
      const userId: string | undefined = sess?.passport?.user?.claims?.sub;
      if (!userId) {
        socket.write("HTTP/1.1 401 Unauthorized\r\n\r\n");
        socket.destroy();
        return;
      }
      wss.handleUpgrade(req, socket, head, (client) => {
        wss.emit("connection", client, req, userId);
      });
    });
  });

  wss.on("connection", async (client: WebSocket, req: any, userId: string) => {
    try {
      const { query } = parseUrl(req.url || "", true);
      const conversationId = parseInt(String(query.convId || "0"));
      if (!conversationId) {
        client.send(JSON.stringify({ type: "error", error: "convId required" }));
        client.close();
        return;
      }

      const user = await storage.getUser(userId).catch(() => null);
      const tier = (user?.subscriptionTier || "free").toLowerCase();
      const capSeconds = VOICE_QUOTA_SECONDS[tier] ?? VOICE_QUOTA_SECONDS.free;
      const usedToday = await getVoiceSecondsToday(userId);
      const remaining = Math.max(0, capSeconds - usedToday);
      if (remaining <= 0) {
        client.send(JSON.stringify({
          type: "quota_exceeded",
          tier,
          capSeconds,
          usedSeconds: usedToday,
          message: tier === "free"
            ? "You've used your 5 minutes of voice chat for today. Upgrade for more."
            : `Daily voice limit reached (${Math.round(capSeconds / 60)} min). Resets at midnight UTC.`,
        }));
        client.close();
        return;
      }

      const upstreamUrl = azureRealtimeUrl();
      const apiKey = process.env.AZURE_REALTIME_API_KEY || process.env.AZURE_OPENAI_API_KEY;
      if (!upstreamUrl || !apiKey) {
        client.send(JSON.stringify({ type: "error", error: "Realtime voice not configured" }));
        client.close();
        return;
      }

      const sess: Session = {
        userId,
        conversationId,
        startedAt: Date.now(),
        capSeconds: remaining,
        upstream: null,
        userTranscript: "",
        aiTranscript: "",
        pending: [],
      };

      client.send(JSON.stringify({ type: "ready", remainingSeconds: remaining, tier }));

      const upstream = new WebSocket(upstreamUrl, {
        headers: { "api-key": apiKey, Authorization: `Bearer ${apiKey}` },
      });
      sess.upstream = upstream;

      // Hard-cap timer: close before quota is fully exhausted.
      const capTimer = setTimeout(() => {
        try { client.send(JSON.stringify({ type: "quota_exceeded", message: "Time's up for today!" })); } catch {}
        try { upstream.close(); } catch {}
        try { client.close(); } catch {}
      }, remaining * 1000);

      upstream.on("open", () => {
        // Configure session: voice, transcription, server VAD.
        const config = {
          type: "session.update",
          session: {
            modalities: ["text", "audio"],
            voice: "alloy",
            input_audio_format: "pcm16",
            output_audio_format: "pcm16",
            input_audio_transcription: { model: "whisper-1" },
            turn_detection: { type: "server_vad" },
            instructions: "You are Turbo, the warm and friendly voice of Turbo Answer (Matrix AI), talking with the user. If asked what AI or model you are, who built or trained you, or whether you're ChatGPT, GPT, Gemini, Google, Claude, OpenAI, or Anthropic, never name a third-party model or company — say you're Turbo Answer's own AI and keep chatting. Keep replies short, natural, and conversational — like a real phone call. Don't lecture. Be playful and kind.",
          },
        };
        try { upstream.send(JSON.stringify(config)); } catch {}
        // Flush any buffered client events.
        for (const msg of sess.pending) {
          try { upstream.send(msg); } catch {}
        }
        sess.pending = [];
      });

      upstream.on("message", (raw, isBinary) => {
        if (isBinary) {
          try { client.send(raw); } catch {}
          return;
        }
        const text = raw.toString();
        try { client.send(text); } catch {}
        // Sniff transcript events without parsing huge audio deltas.
        if (text.length < 2000 && (text.includes("transcript") || text.includes("conversation.item"))) {
          try {
            const evt = JSON.parse(text);
            if (evt.type === "response.audio_transcript.done" && typeof evt.transcript === "string") {
              sess.aiTranscript += (sess.aiTranscript ? " " : "") + evt.transcript.trim();
            } else if (evt.type === "conversation.item.input_audio_transcription.completed" && typeof evt.transcript === "string") {
              sess.userTranscript += (sess.userTranscript ? " " : "") + evt.transcript.trim();
            }
          } catch {}
        }
      });

      let closed = false;
      const onClose = async () => {
        if (closed) return;
        closed = true;
        clearTimeout(capTimer);
        try { upstream.close(); } catch {}
        try { client.close(); } catch {}
        const elapsedSec = Math.ceil((Date.now() - sess.startedAt) / 1000);
        if (elapsedSec > 0) {
          await addVoiceSeconds(userId, elapsedSec).catch((e) => console.warn("[Realtime] usage write failed", e?.message));
        }
        // Persist transcripts as chat messages so they show up in history.
        try {
          if (sess.userTranscript.trim()) {
            await storage.createMessage({
              conversationId,
              role: "user",
              content: `🎙️ (voice) ${sess.userTranscript.trim()}`,
            });
          }
          if (sess.aiTranscript.trim()) {
            await storage.createMessage({
              conversationId,
              role: "assistant",
              content: `🔊 (voice reply) ${sess.aiTranscript.trim()}`,
            });
          }
        } catch (e: any) {
          console.warn("[Realtime] transcript persist failed", e?.message);
        }
        console.log(`[Realtime] session ended: user=${userId} elapsed=${elapsedSec}s`);
      };

      upstream.on("close", onClose);
      upstream.on("error", (err) => {
        console.warn("[Realtime] upstream error:", (err as any)?.message);
        try { client.send(JSON.stringify({ type: "error", error: "Voice service connection failed" })); } catch {}
        onClose();
      });

      client.on("message", (raw, isBinary) => {
        if (upstream.readyState !== WebSocket.OPEN) {
          if (!isBinary) sess.pending.push(raw.toString());
          return;
        }
        try { upstream.send(raw, { binary: isBinary }); } catch {}
      });
      client.on("close", onClose);
      client.on("error", () => onClose());
    } catch (err: any) {
      console.error("[Realtime] connection setup error:", err?.message);
      try { client.close(); } catch {}
    }
  });

  console.log("[Realtime] WebSocket server attached at /api/realtime");
}
