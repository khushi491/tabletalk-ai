'use client';

import { Restaurant, MenuItem, PolicyVersion } from '@prisma/client';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { Clock, MapPin, Phone, Info } from 'lucide-react';

interface RestaurantInfoProps {
  restaurant: Restaurant & {
    menuItems: MenuItem[];
    policyVersions: PolicyVersion[];
  };
}

export function RestaurantInfo({ restaurant }: RestaurantInfoProps) {
  const hours = restaurant.hoursJson ? JSON.parse(restaurant.hoursJson) : {};
  const policies = restaurant.policyVersions[0]?.policyJson 
    ? JSON.parse(restaurant.policyVersions[0].policyJson) 
    : [];

  return (
    <div className="flex flex-col gap-4 h-full">
      <Card>
        <CardHeader>
          <CardTitle>{restaurant.name}</CardTitle>
          <CardDescription className="flex flex-col gap-2">
            <div className="flex items-center gap-2">
              <MapPin className="h-4 w-4" />
              <span>{restaurant.address}</span>
            </div>
            <div className="flex items-center gap-2">
              <Phone className="h-4 w-4" />
              <span>{restaurant.phone}</span>
            </div>
          </CardDescription>
        </CardHeader>
      </Card>

      <Card className="flex-1 overflow-hidden flex flex-col">
        <CardHeader>
          <CardTitle>Restaurant Details</CardTitle>
        </CardHeader>
        <CardContent className="flex-1 overflow-hidden p-0">
          <ScrollArea className="h-full px-6 pb-6">
            <div className="space-y-6">
              <div className="space-y-2">
                <h3 className="font-semibold flex items-center gap-2">
                  <Clock className="h-4 w-4" /> Hours
                </h3>
                <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-sm text-muted-foreground">
                  {Object.entries(hours).map(([day, time]) => (
                    <div key={day} className="contents">
                      <span className="font-medium">{day}</span>
                      <span>{time as string}</span>
                    </div>
                  ))}
                </div>
              </div>

              <Separator />

              <div className="space-y-2">
                <h3 className="font-semibold flex items-center gap-2">
                  <Info className="h-4 w-4" /> Current Policy
                </h3>
                <ul className="list-disc pl-4 text-sm text-muted-foreground space-y-1">
                  {policies.map((policy: string, i: number) => (
                    <li key={i}>{policy}</li>
                  ))}
                </ul>
              </div>

              <Separator />

              <div className="space-y-4">
                <h3 className="font-semibold">Menu</h3>
                {restaurant.menuItems.map((item) => {
                  const allergens = item.allergensJson ? JSON.parse(item.allergensJson) : [];
                  const tags = item.tagsJson ? JSON.parse(item.tagsJson) : [];
                  
                  return (
                    <div key={item.id} className="space-y-1">
                      <div className="flex justify-between items-baseline">
                        <span className="font-medium">{item.name}</span>
                        <span className="text-sm font-medium">${item.price.toFixed(2)}</span>
                      </div>
                      <p className="text-sm text-muted-foreground">{item.description}</p>
                      <div className="flex flex-wrap gap-1 pt-1">
                        {tags.map((tag: string) => (
                          <Badge key={tag} variant="secondary" className="text-xs">{tag}</Badge>
                        ))}
                        {allergens.map((allergen: string) => (
                          <Badge key={allergen} variant="outline" className="text-xs text-red-500 border-red-200 bg-red-50 dark:bg-red-950 dark:border-red-900 dark:text-red-400">
                            Contains {allergen}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </ScrollArea>
        </CardContent>
      </Card>
    </div>
  );
}
