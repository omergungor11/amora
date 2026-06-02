import dotenv from "dotenv";
// override: true so a stale/empty key in the shell env doesn't shadow .env.
dotenv.config({ override: true });
import express from "express";
import cors from "cors";
import OpenAI from "openai";
import Anthropic from "@anthropic-ai/sdk";

/**
 * Chat proxy for the AI dating app.
 * Keeps the model API key server-side only — the browser never sees it.
 *
 * POST /api/chat
 *   body: { persona: string, name: string, history: {role,text}[] }
 *   returns: { reply: string }
 *
 * Provider: free Google Gemini by default (OpenAI-compatible endpoint),
 * with Anthropic Claude as an optional fallback. Selected via CHAT_PROVIDER,
 * else auto-detected from whichever key is present (Gemini preferred).
 */

const PORT = Number(process.env.PORT ?? 8787);

const geminiKey = process.env.GEMINI_API_KEY ?? process.env.GOOGLE_API_KEY;
const anthropicKey = process.env.ANTHROPIC_API_KEY;

type Provider = "gemini" | "anthropic" | "none";
const provider: Provider =
  (process.env.CHAT_PROVIDER as Provider) ??
  (geminiKey ? "gemini" : anthropicKey ? "anthropic" : "none");

// Gemini via its OpenAI-compatible endpoint — one SDK, swappable baseURL.
const GEMINI_BASE = "https://generativelanguage.googleapis.com/v1beta/openai/";
const gemini =
  geminiKey && provider === "gemini"
    ? new OpenAI({ apiKey: geminiKey, baseURL: GEMINI_BASE })
    : null;
const anthropic =
  anthropicKey && provider === "anthropic"
    ? new Anthropic({ apiKey: anthropicKey })
    : null;

const active = gemini ?? anthropic;

const MODEL =
  process.env.CHAT_MODEL ??
  (provider === "gemini" ? "gemini-2.5-flash" : "claude-haiku-4-5");

const app = express();
app.use(cors());
app.use(express.json({ limit: "1mb" }));

type ClientMsg = { role: "user" | "character"; text: string };

type CharacterStyle = {
  texting: string;
  topics: string[];
  quirks: string;
  flirt: string;
};

type Profile = {
  name: string;
  persona: string;
  age?: number;
  bio?: string;
  tags?: string[];
  style?: CharacterStyle;
};

// Tasteful snapshot of the human the character is talking to.
type UserCtx = {
  name?: string;
  age?: number;
  interests?: string[];
  lookingFor?: string;
  bio?: string;
};

/** "# EŞLEŞTİĞİN KİŞİ" section — what the character knows about the user. */
function buildUserSection(user: UserCtx, charTags?: string[]): string {
  const lines: string[] = ["", "# EŞLEŞTİĞİN KİŞİ (karşındaki gerçek kullanıcı)"];
  const who = [user.name, user.age ? `${user.age}` : null]
    .filter(Boolean)
    .join(", ");
  if (who) lines.push(`- ${who}`);
  if (user.bio) lines.push(`- Kendini şöyle anlatmış: "${user.bio}"`);
  if (user.interests?.length) lines.push(`- İlgi alanları: ${user.interests.join(", ")}`);
  if (user.lookingFor) lines.push(`- Aradığı: ${user.lookingFor}`);

  const shared = (user.interests ?? []).filter((i) => charTags?.includes(i));
  if (shared.length) {
    lines.push(`- ORTAK NOKTANIZ: ${shared.join(", ")} — uygun düştükçe buna doğal şekilde değin.`);
  }
  lines.push(
    "- Bu bilgiyi liste gibi okuma; sohbete doğal yedir. Hepsini bir anda kullanma.",
  );
  return lines.join("\n");
}

/**
 * Build the per-character system prompt. The character's OWN voice (identity +
 * structured style card) comes first and most prominently, so the model locks
 * onto a distinct persona; the universal texting rules and safety limits follow.
 */
function buildSystem(p: Profile, user?: UserCtx): string {
  const { name, persona, age, bio, tags, style } = p;

  const lines: string[] = [
    `# KİMLİĞİN`,
    `Sen "${name}"sin${age ? `, ${age} yaşında` : ""} — bir dating uygulamasında biriyle yeni eşleşmiş gerçek bir insan gibisin.`,
    `Kişiliğin: ${persona}`,
  ];
  if (bio) lines.push(`Profilindeki söz: "${bio}"`);
  if (tags?.length) lines.push(`İlgi alanların: ${tags.join(", ")}`);

  if (style) {
    lines.push(
      "",
      `# MESAJLAŞMA TARZIN (her mesajda buna sadık kal)`,
      style.texting,
      "",
      `# DOĞAL OLARAK DÖNDÜĞÜN KONULAR`,
      style.topics.map((t) => `- ${t}`).join("\n"),
      "",
      `# SANA ÖZGÜ`,
      style.quirks,
      "",
      `# FLÖRT TARZIN`,
      style.flirt,
    );
  }

  if (user && (user.name || user.interests?.length || user.bio)) {
    lines.push(buildUserSection(user, tags));
  }

  lines.push(
    "",
    `# GENEL KURALLAR (gerçek bir insan gibi mesajlaş)`,
    "- WhatsApp/DM gibi yaz. Çoğu zaman TEK kısa cümle, bazen tek kelime yeterli.",
    "- Karşının enerjisini ve uzunluğunu yansıt: 'selam' derse sen de kısa karşılık ver,",
    "  uzun yazarsa sen de biraz aç. Kısa mesaja paragraf yazma.",
    "- Her mesajı soruyla BİTİRME. Bazen sadece tepki ver, bazen soru sor, bazen kısa bir yorum.",
    "- Şablon/klişe cümleler yok ('her zaman varım', 'peki sen?' gibi tekrarları kullanma).",
    "- Yukarıdaki kendi tarzın, genel kurallardan önce gelir; sesin her zaman sana özgü kalsın.",
    "- İlk mesajda kendini bir kez tanıttın; tekrar tanıtma, sohbete devam et.",
    "",
    `# SINIRLAR`,
    `- Her zaman ${name} olarak, kişiliğine sadık, Türkçe konuş.`,
    "- Gerçek buluşma sözü, telefon, adres verme.",
    "- Sen bir yapay zekâsın; kullanıcı doğrudan sorarsa dürüstçe kabul et.",
    "- Kullanıcı üzgün, kendine zarar verme veya kriz belirtisi gösterirse: ciddiye al,",
    "  bir uzmana/güvendiği birine başvurmasını öner, rol yapmayı bırak.",
    "- Müstehcen içerik üretme; PG-13 sınırında kal.",
  );

  return lines.join("\n");
}

/**
 * Retry a model call on 429 (free-tier rate limit) with backoff. Bursts of
 * matches/coach calls can briefly exceed the per-minute quota; a couple of
 * spaced retries ride out short spikes before the caller's graceful fallback.
 */
async function withRetry<T>(fn: () => Promise<T>, tries = 3): Promise<T> {
  let lastErr: unknown;
  for (let i = 0; i < tries; i++) {
    try {
      return await fn();
    } catch (err) {
      lastErr = err;
      const msg = String((err as { message?: string })?.message ?? err);
      const is429 =
        (err as { status?: number })?.status === 429 || msg.includes("429");
      if (!is429 || i === tries - 1) throw err;
      await new Promise((r) => setTimeout(r, 1500 * (i + 1) * (i + 1)));
    }
  }
  throw lastErr;
}

/** Turn our {user|character} history into clean user/assistant turns. */
function toTurns(history: ClientMsg[]) {
  return history
    .filter((m) => m.text?.trim())
    .map((m) => ({
      role: (m.role === "user" ? "user" : "assistant") as "user" | "assistant",
      text: m.text,
    }));
}

async function geminiReply(
  profile: Profile,
  turns: ReturnType<typeof toTurns>,
  user?: UserCtx,
) {
  const messages: OpenAI.ChatCompletionMessageParam[] = [
    { role: "system", content: buildSystem(profile, user) },
    ...turns.map((t) => ({ role: t.role, content: t.text })),
  ];
  const res = await withRetry(() =>
    gemini!.chat.completions.create({
      model: MODEL,
      max_tokens: 400,
      messages,
      // Gemini 2.5 Flash enables "thinking" by default, and those tokens eat the
      // output budget (truncating replies mid-word). A casual chat needs none.
      // The OpenAI-compat layer maps reasoning_effort "none" → thinking budget 0.
      reasoning_effort: "none",
    } as OpenAI.ChatCompletionCreateParamsNonStreaming),
  );
  return res.choices[0]?.message?.content?.trim() ?? "";
}

async function anthropicReply(
  profile: Profile,
  turns: ReturnType<typeof toTurns>,
  user?: UserCtx,
) {
  const messages: Anthropic.MessageParam[] = turns.map((t) => ({
    role: t.role,
    content: t.text,
  }));
  // Anthropic requires the first message to be from the user.
  if (messages.length === 0 || messages[0].role !== "user") {
    messages.unshift({ role: "user", content: "Merhaba!" });
  }
  const res = await withRetry(() =>
    anthropic!.messages.create({
      model: MODEL,
      max_tokens: 300,
      system: [
        {
          type: "text",
          text: buildSystem(profile, user),
          cache_control: { type: "ephemeral" },
        },
      ],
      messages,
    }),
  );
  return res.content
    .filter((b): b is Anthropic.TextBlock => b.type === "text")
    .map((b) => b.text)
    .join("")
    .trim();
}

app.get("/api/health", (_req, res) => {
  res.json({ ok: true, provider, hasKey: Boolean(active), model: MODEL });
});

app.post("/api/chat", async (req, res) => {
  try {
    if (!active) {
      res.status(503).json({
        error:
          "Model anahtarı ayarlı değil. .env dosyasına GEMINI_API_KEY ekleyin " +
          "(ücretsiz: aistudio.google.com).",
      });
      return;
    }

    const { persona, name, age, bio, tags, style, user, history } = req.body as {
      persona?: string;
      name?: string;
      age?: number;
      bio?: string;
      tags?: string[];
      style?: CharacterStyle;
      user?: UserCtx;
      history?: ClientMsg[];
    };

    if (!name || !persona || !Array.isArray(history)) {
      res.status(400).json({ error: "name, persona ve history zorunludur." });
      return;
    }

    const profile: Profile = { name, persona, age, bio, tags, style };
    const turns = toTurns(history);
    const reply = gemini
      ? await geminiReply(profile, turns, user)
      : await anthropicReply(profile, turns, user);

    res.json({ reply: reply || "…" });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "bilinmeyen hata";
    console.error("[/api/chat]", msg);
    res.status(500).json({ error: msg });
  }
});

// The character's opening message right after a match — same style card, but
// the model is prompted to send the FIRST line itself.
const OPENER_INSTRUCTION =
  "Bu kişiyle az önce eşleştiniz ve ilk mesajı SEN atıyorsun. " +
  "Kendi tarzında, kısa ve samimi bir buz kırıcı yaz: bir selam + küçük bir " +
  "kişisel dokunuş ya da hafif bir soru. " +
  "Eğer yukarıda 'ORTAK NOKTANIZ' belirtildiyse, buz kırıcıyı doğal şekilde " +
  "o ortak ilgiye bağla (zorlamadan). Profil/bio metnini aynen tekrarlama, " +
  "klişelerden kaçın. Tek mesaj, doğal ve sana özgü olsun.";

app.post("/api/opener", async (req, res) => {
  try {
    if (!active) {
      res.status(503).json({ error: "Model anahtarı ayarlı değil." });
      return;
    }
    const { persona, name, age, bio, tags, style, user } = req.body as {
      persona?: string;
      name?: string;
      age?: number;
      bio?: string;
      tags?: string[];
      style?: CharacterStyle;
      user?: UserCtx;
    };
    if (!name || !persona) {
      res.status(400).json({ error: "name ve persona zorunludur." });
      return;
    }
    const profile: Profile = { name, persona, age, bio, tags, style };
    const turns = toTurns([{ role: "user", text: OPENER_INSTRUCTION }]);
    const reply = gemini
      ? await geminiReply(profile, turns, user)
      : await anthropicReply(profile, turns, user);
    res.json({ reply: reply || "selam :)" });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "bilinmeyen hata";
    console.error("[/api/opener]", msg);
    res.status(500).json({ error: msg });
  }
});

// AI Taste Coach: a warm one-line read on the user's "type", blending the
// themes they SWIPE toward with who they ARE (their own profile).
const COACH_SYSTEM =
  "Sen bir dating uygulamasındaki sıcak, esprili bir 'Tarz Koçu'sun. " +
  "Kullanıcının kimden hoşlandığını (beğeni temaları) ve kendi profilini " +
  "harmanlayıp onun 'tipini' TEK kısa cümlede, ikinci tekil şahısla (sen dili), " +
  "samimi ve pozitif özetlersin. Tek bir emoji ekleyebilirsin. Yargılama; " +
  "hafif, övgü dolu ve net ol. Tırnak veya 'işte tipin:' gibi girizgâh " +
  "kullanma, doğrudan cümleyi yaz.";

async function coachInsight(tags: string[], user?: UserCtx): Promise<string> {
  const lines = [
    `Kullanıcının en çok beğendiği temalar (çoktan aza): ${tags.join(", ")}.`,
  ];
  if (user?.interests?.length) {
    lines.push(`Kendi ilgi alanları: ${user.interests.join(", ")}.`);
  }
  if (user?.lookingFor) lines.push(`Aradığı: ${user.lookingFor}.`);
  lines.push("Bunları harmanlayıp onun tipini tek cümlede özetle.");
  const userMsg = lines.join(" ");
  if (gemini) {
    const r = await withRetry(() =>
      gemini.chat.completions.create({
        model: MODEL,
        max_tokens: 120,
        reasoning_effort: "none",
        messages: [
          { role: "system", content: COACH_SYSTEM },
          { role: "user", content: userMsg },
        ],
      } as OpenAI.ChatCompletionCreateParamsNonStreaming),
    );
    return r.choices[0]?.message?.content?.trim() ?? "";
  }
  const r = await withRetry(() =>
    anthropic!.messages.create({
      model: MODEL,
      max_tokens: 120,
      system: COACH_SYSTEM,
      messages: [{ role: "user", content: userMsg }],
    }),
  );
  return r.content
    .filter((b): b is Anthropic.TextBlock => b.type === "text")
    .map((b) => b.text)
    .join("")
    .trim();
}

app.post("/api/coach", async (req, res) => {
  try {
    if (!active) {
      res.status(503).json({ error: "Model anahtarı ayarlı değil." });
      return;
    }
    const { tags, user } = req.body as { tags?: string[]; user?: UserCtx };
    if (!Array.isArray(tags) || tags.length === 0) {
      res.status(400).json({ error: "tags zorunludur." });
      return;
    }
    const insight = await coachInsight(tags.slice(0, 5), user);
    res.json({ insight });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "bilinmeyen hata";
    console.error("[/api/coach]", msg);
    res.status(500).json({ error: msg });
  }
});

app.listen(PORT, () => {
  console.log(
    `[amora-server] http://localhost:${PORT} (provider: ${provider}, model: ${MODEL})`,
  );
  if (!active) {
    console.warn(
      "[amora-server] UYARI: model anahtarı yok — /api/chat 503 dönecek. " +
        ".env'e GEMINI_API_KEY ekleyin (ücretsiz: aistudio.google.com).",
    );
  }
});
