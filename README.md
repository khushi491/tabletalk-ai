# TableTalk AI

A hackathon-ready restaurant host/concierge that improves over time using evals + policy patching, and supports voice playback via ElevenLabs TTS.

## Features

- **Host Assistant**: Handles wait times, hours, location, reservations, menu questions, allergies, pickup status, and basic complaints.
- **Self-Improving Loop** (planned): Evaluator scores output and violations, Patcher updates "Host Policy", and next replies use the latest policy.
- **Voice Output**: Uses ElevenLabs TTS for assistant replies.
- **Restaurant Management**: Manage restaurant profiles, menus, and view policy history.
- **PWA Support**: Web app manifest for installability on supported browsers (e.g. Add to Home Screen).

## Tech Stack

- **Framework**: Next.js 14+ App Router + TypeScript
- **Styling**: TailwindCSS + shadcn/ui
- **Database**: Prisma + SQLite
- **LLM**: OpenAI-compatible endpoint (GPT-4o-mini default)
- **Voice**: ElevenLabs TTS
- **Observability**: Pino logs

## Setup

1.  Clone the repository.
2.  Install dependencies: `pnpm install`.
3.  Copy `.env.example` to `.env` and fill in the required variables.
4.  Run database migrations: `pnpm prisma migrate dev`.
5.  Start the development server: `pnpm dev`.

## Environment Variables

See `.env.example` for the list of required environment variables.
