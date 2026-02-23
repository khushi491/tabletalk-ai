import { NextResponse } from 'next/server';

const OPENAI_TTS_VOICES = ['alloy', 'echo', 'fable', 'onyx', 'nova', 'shimmer'] as const;

export async function POST(req: Request) {
  try {
    const { text } = await req.json();

    if (!text || typeof text !== 'string') {
      return new Response('Text is required', { status: 400 });
    }

    const apiKey = process.env.OPENAI_API_KEY;
    const baseURL = (process.env.OPENAI_BASE_URL || 'https://api.openai.com/v1').replace(/\/$/, '');
    const voice = process.env.OPENAI_TTS_VOICE || 'alloy';
    const model = process.env.OPENAI_TTS_MODEL || 'tts-1';

    if (!apiKey) {
      return new Response('OpenAI API Key is missing', { status: 500 });
    }

    const validVoice = OPENAI_TTS_VOICES.includes(voice as (typeof OPENAI_TTS_VOICES)[number])
      ? voice
      : 'alloy';

    const response = await fetch(`${baseURL}/audio/speech`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model,
        input: text.slice(0, 4096),
        voice: validVoice,
        response_format: 'mp3',
      }),
    });

    if (!response.ok) {
      const err = await response.text();
      let message = err;
      try {
        const j = JSON.parse(err);
        message = j.error?.message || err;
      } catch {
        // use raw text
      }
      return NextResponse.json(
        { error: message },
        { status: response.status }
      );
    }

    const audioBuffer = await response.arrayBuffer();

    return new Response(audioBuffer, {
      headers: {
        'Content-Type': 'audio/mpeg',
      },
    });
  } catch (error) {
    console.error('TTS Error:', error);
    return new Response('Internal Server Error', { status: 500 });
  }
}
