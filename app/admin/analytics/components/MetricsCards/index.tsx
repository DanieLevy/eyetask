'use client';

import React from 'react';
import { Users, MousePointerClick } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import { Metrics } from '../../types/analytics';

interface MetricsCardsProps {
  metrics: Metrics;
  className?: string;
}

export const MetricsCards = React.memo(function MetricsCards({ metrics, className }: MetricsCardsProps) {
  const cards = [
    {
      title: 'ביקורים היום',
      value: metrics.todayVisitors,
      subValue: metrics.weekVisitors,
      subLabel: 'השבוע',
      icon: Users,
      iconColor: 'text-blue-600',
      bgColor: 'bg-blue-50/30 dark:bg-blue-950/10'
    },
    {
      title: 'פעולות',
      value: metrics.totalActions,
      icon: MousePointerClick,
      iconColor: 'text-purple-600',
      bgColor: 'bg-purple-50/30 dark:bg-purple-950/10'
    }
  ];

  return (
    <div className={cn("flex gap-4 mb-6", className)}>
      {cards.map((card, index) => {
        const Icon = card.icon;
        
        return (
          <Card 
            key={index} 
            className={cn(
              "flex-1 border border-gray-200 dark:border-gray-800 shadow-none hover:shadow-sm transition-all duration-200",
              card.bgColor
            )}
          >
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className={cn("p-2 rounded-lg bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700")}>
                  <Icon className={cn("h-4 w-4", card.iconColor)} />
                </div>
                
                <div className="flex-1">
                  <div className="flex items-baseline gap-2">
                    <p className="text-2xl font-semibold text-foreground">
                      {formatNumber(card.value)}
                    </p>
                    {card.subValue !== undefined && (
                      <span className="text-sm text-muted-foreground">
                        ({formatNumber(card.subValue)} {card.subLabel})
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {card.title}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
});

function formatNumber(num: number): string {
  return new Intl.NumberFormat('he-IL').format(num);
} 