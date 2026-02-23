import { prisma } from '@/lib/prisma';
import { RestaurantInfo } from '@/components/restaurant-info';
import { ChatInterface } from '@/components/chat-interface';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';

export default async function Home() {
  const restaurant = await prisma.restaurant.findFirst({
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
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Card className="max-w-md mx-auto">
          <CardHeader>
            <CardTitle>No Restaurant Found</CardTitle>
            <CardDescription>
              Please run the seed script to populate the database.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <code className="bg-muted p-2 rounded block">pnpm prisma db seed</code>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <main className="flex flex-col md:flex-row h-screen bg-background overflow-hidden">
      {/* Sidebar / Info Panel */}
      <div className="w-full md:w-1/3 lg:w-1/4 border-r border-border bg-muted/10 p-4 overflow-y-auto">
        <RestaurantInfo restaurant={restaurant} />
      </div>

      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col h-full bg-background p-4 md:p-6">
        <div className="flex-1 h-full max-w-4xl mx-auto w-full">
           <ChatInterface restaurantId={restaurant.id} />
        </div>
      </div>
    </main>
  );
}
