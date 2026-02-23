import { openai } from '@ai-sdk/openai';
import { streamText } from 'ai';
import { prisma } from '@/lib/prisma';

export const maxDuration = 30;

export async function POST(req: Request) {
  const { messages, restaurantId } = await req.json();

  // Fetch restaurant context (policy, menu, hours)
  const restaurant = await prisma.restaurant.findUnique({
    where: { id: restaurantId },
    include: {
      menuItems: true,
      policyVersions: {
        where: { isActive: true },
        orderBy: { version: 'desc' },
        take: 1,
      },
    },
  });

  if (!restaurant) {
    return new Response('Restaurant not found', { status: 404 });
  }

  const policy = restaurant.policyVersions[0]?.policyJson 
    ? JSON.parse(restaurant.policyVersions[0].policyJson).join('\n')
    : 'Be helpful and polite.';

  const menu = restaurant.menuItems.map(item => 
    `${item.name} ($${item.price}): ${item.description}`
  ).join('\n');

  const hours = restaurant.hoursJson ? JSON.parse(restaurant.hoursJson) : {};
  const hoursText = Object.entries(hours).map(([day, time]) => `${day}: ${time}`).join('\n');

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

  const result = streamText({
    model: openai('gpt-4o-mini'),
    system: systemMessage,
    messages,
    onFinish: async ({ text, usage }) => {
      try {
        // Find or create conversation
        // For simplicity, we'll assume a new conversation if not specified, 
        // but in a real app you'd pass conversationId from the client.
        const conversation = await prisma.conversation.create({
          data: {
            restaurantId: restaurantId,
            title: messages[0]?.content?.substring(0, 50) || 'New Chat',
          }
        });

        // Save User Message
        const lastUserMessage = messages[messages.length - 1];
        await prisma.message.create({
          data: {
            conversationId: conversation.id,
            role: 'user',
            content: lastUserMessage.content,
          }
        });

        // Save AI Message
        await prisma.message.create({
          data: {
            conversationId: conversation.id,
            role: 'assistant',
            content: text,
            // Simple placeholder evaluation
            scoreTotal: 100, 
            evalJson: JSON.stringify({
              feedback: "Response followed policy.",
              score: 100
            })
          }
        });

        console.log(`Saved conversation ${conversation.id} and messages.`);
      } catch (error) {
        console.error('Failed to save messages:', error);
      }
    },
  });

  return result.toTextStreamResponse();
}
