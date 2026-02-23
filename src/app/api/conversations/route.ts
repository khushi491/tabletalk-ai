import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';

const createConversationSchema = z.object({
  restaurantId: z.string().min(1, 'restaurantId is required'),
});

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const parsed = createConversationSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: parsed.error.flatten() },
        { status: 400 }
      );
    }
    const { restaurantId } = parsed.data;

    const restaurant = await prisma.restaurant.findUnique({
      where: { id: restaurantId },
    });
    if (!restaurant) {
      return NextResponse.json({ error: 'Restaurant not found' }, { status: 404 });
    }

    const conversation = await prisma.conversation.create({
      data: {
        restaurantId,
        title: 'New Chat',
      },
    });

    return NextResponse.json({ conversationId: conversation.id });
  } catch (error) {
    console.error('Create conversation error:', error);
    return NextResponse.json(
      { error: 'Internal Server Error' },
      { status: 500 }
    );
  }
}
