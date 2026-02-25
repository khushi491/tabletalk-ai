# TableTalk AI – Task list

## Immediate

- [x] **Commit real-talk changes** – Commit `src/components/chat-interface.tsx` (auto-send on end of speech, copy updates).
- [x] **Ignore local DB** – Add `prisma/*.db` or `prisma/dev.db` to `.gitignore` if not already there.

## Error handling & API consistency

- [x] **TTS 400 as JSON** – In `/api/tts`, return `NextResponse.json({ error: 'Text is required' }, { status: 400 })` instead of plain text for consistency.
- [x] **Conversation create failure** – When `POST /api/conversations` fails, show an error state (e.g. “Couldn’t start chat”) and a Retry button instead of endless “Starting conversation…”.
- [x] **TTS failure in UI** – When TTS request fails, show a short message (e.g. “Voice playback failed” or “Quota exceeded”) and optionally read `res.json()` for details.
- [x] **Chat stream error in UI** – When the chat stream errors (e.g. quota), show a generic message like “Something went wrong. Check your API key or try again.”

## Features

- [x] **Conversation history** – Add a way to list past conversations and load messages by `conversationId` so the thread survives refresh.
- [x] **Self-improving loop** (README) – Either implement a minimal evaluator + policy patcher or add a “Planned” section in the README.

## Later / optional

- [ ] **Rate limit** – Add rate limiting (or auth) to `POST /api/conversations` for production.
- [ ] **Mic “not supported” copy** – Avoid showing the same message twice when the user clicks the mic while unsupported (e.g. rely on one source: persistent reason or click error).
- [ ] **Tests** – Add tests for API routes (chat validation, TTS, conversations) and/or critical UI flows.
