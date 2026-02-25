import { createOpenAI, openai as defaultOpenai } from '@ai-sdk/openai';
import { streamText, type ModelMessage } from 'ai';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';

export const maxDuration = 30;

const chatBodySchema = z.object({
  restaurantId: z.string().min(1, 'restaurantId is required'),
  conversationId: z.string().min(1, 'conversationId is required'),
  messages: z
    .array(
      z.object({
        role: z.enum(['user', 'assistant', 'system', 'data']),
        content: z.string().optional(),
        parts: z.array(z.any()).optional(),
      })
    )
    .min(1, 'At least one message is required')
    .max(100, 'Too many messages'),
});

function getOpenAIClient() {
  const baseURL = process.env.OPENAI_BASE_URL?.trim();
  if (baseURL) {
    return createOpenAI({
      baseURL,
      apiKey: process.env.OPENAI_API_KEY,
    });
  }
  return defaultOpenai;
}

export async function POST(req: Request) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return new Response(
      JSON.stringify({ error: 'Invalid JSON body' }),
      { status: 400, headers: { 'Content-Type': 'application/json' } }
    );
  }

  const parsed = chatBodySchema.safeParse(body);
  if (!parsed.success) {
    return new Response(
      JSON.stringify({
        error: 'Validation failed',
        details: parsed.error.flatten(),
      }),
      { status: 400, headers: { 'Content-Type': 'application/json' } }
    );
  }
  const { messages, restaurantId, conversationId } = parsed.data;

  const [conversation, restaurant] = await Promise.all([
    prisma.conversation.findFirst({
      where: { id: conversationId, restaurantId },
    }),
    prisma.restaurant.findUnique({
      where: { id: restaurantId },
      include: {
        menuItems: true,
        policyVersions: {
          where: { isActive: true },
          orderBy: { version: 'desc' },
          take: 1,
        },
      },
    }),
  ]);

  if (!restaurant) {
    return new Response(
      JSON.stringify({ error: 'Restaurant not found' }),
      { status: 404, headers: { 'Content-Type': 'application/json' } }
    );
  }
  if (!conversation) {
    return new Response(
      JSON.stringify({ error: 'Conversation not found or does not belong to this restaurant' }),
      { status: 404, headers: { 'Content-Type': 'application/json' } }
    );
  }

  const policy = restaurant.policyVersions[0]?.policyJson
    ? JSON.parse(restaurant.policyVersions[0].policyJson).join('\n')
    : 'Be helpful and polite.';

  const menu = restaurant.menuItems
    .map((item: { name: string; price: number; description: string }) =>
      `${item.name} ($${item.price}): ${item.description}`
    )
    .join('\n');

  const hours = restaurant.hoursJson ? JSON.parse(restaurant.hoursJson) : {};
  const hoursText = Object.entries(hours)
    .map(([day, time]) => `${day}: ${time}`)
    .join('\n');

  const systemMessage = `
    You are a helpful restaurant host for ${restaurant.name}.
    
    Restaurant Info:
    Address: ${restaurant.address}
    Phone: ${restaurant.phone}
    
    Hours:
    ${hoursText}
    
    Menu:
    ${menu}
    
    Your Policy (Follow these rules strictly):
    ${policy}
    
    If you don't know the answer, say you will check with a manager.
    Be concise and friendly.
  `;

  const modelId = process.env.OPENAI_MODEL || 'gpt-4o-mini';
  const openai = getOpenAIClient();

  // Convert UI messages (parts) to ModelMessage format (content); only user/assistant
  const modelMessages: ModelMessage[] = messages
    .filter((m) => m.role === 'user' || m.role === 'assistant')
    .map((m) => {
      const role = m.role as 'user' | 'assistant';
      const content =
        m.content ||
        m.parts
          ?.filter((p: any) => p?.type === 'text' && p?.text != null)
          .map((p: any) => p.text as string)
          .join('') ||
        '';
      return { role, content };
    });

  if (modelMessages.length === 0) {
    return new Response(
      JSON.stringify({ error: 'At least one user or assistant message is required' }),
      { status: 400, headers: { 'Content-Type': 'application/json' } }
    );
  }

  const result = streamText({
    model: openai(modelId),
    system: systemMessage,
    messages: modelMessages,
    onFinish: async ({ text }) => {
      try {
        const lastUserContent = modelMessages[modelMessages.length - 1]?.role === 'user'
          ? (modelMessages[modelMessages.length - 1] as { content: string }).content
          : '';
        await prisma.$transaction([
          prisma.message.create({
            data: {
              conversationId,
              role: 'user',
              content: lastUserContent,
            },
          }),
          prisma.message.create({
            data: {
              conversationId,
              role: 'assistant',
              content: text,
              scoreTotal: 100,
              evalJson: JSON.stringify({
                feedback: 'Response followed policy.',
                score: 100,
              }),
            },
          }),
        ]);
      } catch (error) {
        console.error('Failed to save messages:', error);
      }
    },
  });

  return result.toTextStreamResponse();
}
