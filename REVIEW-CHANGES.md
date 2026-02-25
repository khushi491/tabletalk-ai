# Code review: TableTalk AI changes

**Scope:** Changes since initial chat + DB integration (conversation persistence, voice I/O, TTS switch, real-talk flow, mic UX).  
**Baseline:** `d3521f4` through current `main` + uncommitted edits.

---

## 1. Summary of changes by area

| Area | Files | What changed |
|------|--------|----------------|
| **Conversation persistence** | `api/conversations/route.ts` (new), `api/chat/route.ts`, `chat-interface.tsx` | New `POST /api/conversations`; chat requires `conversationId`; client creates conversation on load and sends it with every message; messages appended to one conversation. |
| **Chat API** | `api/chat/route.ts` | Zod validation for body; UI messages (with `parts`) converted to `ModelMessage[]` (with `content`); `OPENAI_BASE_URL` + `OPENAI_MODEL` wired; 400/404 JSON error responses. |
| **TTS** | `api/tts/route.ts`, README | Switched from ElevenLabs to OpenAI `/v1/audio/speech`; uses `OPENAI_API_KEY`, `OPENAI_BASE_URL`, `OPENAI_TTS_MODEL`, `OPENAI_TTS_VOICE`; returns MP3; structured error body on non-200. |
| **Voice input (mic)** | `chat-interface.tsx` | Browser SpeechRecognition; live transcript in input; secure-context and support checks with user-visible reasons; mic button always shown (disabled when unsupported); error states (permission, no-speech, etc.). |
| **Real talk** | `chat-interface.tsx` | On recognition `onend`, if transcript non-empty, auto-call `sendMessage({ text })` and clear input; copy updated (“Tap mic, speak, then hear the reply”). |
| **App metadata / PWA** | `layout.tsx`, `public/manifest.json` (new) | Title/description and `manifest` in metadata; minimal PWA manifest. |

---

## 2. What’s working well

- **Conversation + chat**
  - Single conversation per session, validated by `conversationId` + `restaurantId`; no duplicate conversations per message.
  - Message conversion from `parts` to `content` is correct and avoids schema errors.
  - Validation and error responses are consistent (JSON, status codes).

- **Voice**
  - TTS: One provider (OpenAI), shared env with chat; input capped at 4096 chars; voice whitelist; errors returned as JSON.
  - Mic: Ref-based transcript for auto-send; cleanup on unmount (`abort`); secure-context and support checks with clear messages; real-talk flow (speak → auto-send → reply played) is coherent.

- **UX**
  - Subtitle and empty state explain real-talk and typing; mic tooltip explains when/why it’s disabled.
  - TTS object URLs revoked after playback; no obvious leaks.

- **Code**
  - Types for SpeechRecognition are self-contained and avoid global types; Zod 4 `z.record(z.string(), z.unknown())` used correctly.
  - Prisma singleton; transport in `useMemo`; no obvious missing deps in effects.

---

## 3. Issues and risks

### 3.1 Logic / correctness

- **`isLoading` in `startListening`**  
  `startListening` runs in a closure that closes over `isLoading`. That’s correct. If you ever move or reuse `startListening` outside this component, pass `isLoading` (or a “can start” flag) as an argument so it’s not stale.

- **Real-talk: manual stop**  
  If the user taps the mic to stop (without speaking), `onend` still runs. You only send when `transcriptRef.current.trim()` is non-empty, so empty taps don’t send. Correct.

- **TTS 400 on invalid body**  
  `/api/tts` returns `new Response('Text is required', { status: 400 })` (plain text). Other routes return JSON. Consider returning `NextResponse.json({ error: 'Text is required' }, { status: 400 })` for consistency and so the client can show a message.

### 3.2 Robustness and UX

- **Conversation creation failure**  
  If `POST /api/conversations` fails, the UI only logs and never sets `conversationReady`; the user stays on “Starting conversation…” with no message. Consider setting an error state and showing a short “Couldn’t start chat. Retry?” with a retry button.

- **TTS failure in UI**  
  On non-ok TTS response, the client throws and only logs. The user doesn’t see “Voice unavailable” or “Quota exceeded”. Consider reading `res.json()` when `!res.ok`, taking `error` (or similar) and setting a small inline error (e.g. under the input or near the voice toggle) so the user knows why reply didn’t play.

- **Chat stream errors**  
  If the chat API returns an error (e.g. quota) in the stream, the user only sees the request finish without a clear message. Surfacing a generic “Something went wrong. Check your API key or try again.” when the stream errors would help.

- **No conversation history**  
  Conversations and messages are stored but never loaded. Refreshing loses the thread. This is a product gap rather than a bug; worth calling out in the review.

### 3.3 Security and validation

- **Conversations route**  
  No rate limit; anyone with a valid `restaurantId` can create many conversations. For a hackathon it’s acceptable; for production you’d add rate limiting and/or auth.

- **Chat**  
  `conversationId` and `restaurantId` are validated and conversation ownership is checked. Good.

### 3.4 Minor

- **`getMicUnsupportedReason()`**  
  When `typeof window === 'undefined'` you return `'Loading…'`; in `useEffect` you then set `isSpeechSupported(reason === null)`. So during SSR/hydration, `reason` is `'Loading…'`, and supported is false. Once the effect runs in the browser, `reason` becomes `null` or the real message. Correct; no change needed unless you want to avoid the brief “unsupported” flash (e.g. by not showing the mic at all until the effect has run).

- **Duplicate “not supported” message**  
  If the user clicks the mic when unsupported, you set `setMicError(reason)` and also show `micUnsupportedReason` in the footer. So the same text can appear from both. You could clear `micError` when showing the persistent reason, or only set `micError` when the user tries an action (e.g. click) so the footer shows one source of truth.

---

## 4. Uncommitted changes

- **`src/components/chat-interface.tsx`**  
  Real-talk behavior (auto-send on `onend`, `transcriptRef`, copy updates).  
  **Recommendation:** Commit with a message like: `Real talk: auto-send on end of speech, copy updates`.

- **`prisma/dev.db`**  
  Local DB file.  
  **Recommendation:** Do not commit; ensure `prisma/*.db` or similar is in `.gitignore` if you want to avoid accidental commits.

---

## 5. Checklist (optional follow-ups)

- [ ] Return JSON from `/api/tts` for 400 (and optionally 500) for consistent error handling.
- [ ] Show a user-visible error when conversation creation fails and add retry.
- [ ] On TTS failure, show a short message (e.g. “Voice playback failed”) and optionally log `res.status` / body.
- [ ] On chat stream error, show a generic error message in the UI.
- [ ] Add conversation list + load messages by `conversationId` so history survives refresh.
- [ ] Add `.gitignore` entry for `prisma/*.db` (or `prisma/dev.db`) if not already there.
- [ ] Commit current `chat-interface.tsx` changes (real talk + copy).

---

## 6. Verdict

The changes are consistent with the goal of a single conversation per session, configurable OpenAI chat and TTS, and a real-talk flow (speak → auto-send → hear reply). The main follow-ups are: clearer error handling in the UI (conversation create, TTS, chat stream), optional consistency for TTS 400 response, and (later) conversation history and rate limiting.
