'use client';

import { TrendingUp, TrendingDown, Users, Activity, Clock } from 'lucide-react';
import React from 'react';
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
      title: 'מבקרים היום',
      value: metrics.todayVisitors,
      icon: Users,
      gradient: 'from-blue-500 to-purple-600',
      iconBg: 'bg-blue-100',
      iconColor: 'text-blue-600',
      trend: '+12%',
      trendUp: true
    },
    {
      title: 'מבקרים השבוע',
      value: metrics.weekVisitors,
      icon: Clock,
      gradient: 'from-green-500 to-teal-600',
      iconBg: 'bg-green-100',
      iconColor: 'text-green-600',
      trend: '+8%',
      trendUp: true
    },
    {
      title: 'סך הפעולות',
      value: metrics.totalActions,
      icon: Activity,
      gradient: 'from-orange-500 to-pink-600',
      iconBg: 'bg-orange-100',
      iconColor: 'text-orange-600',
      trend: '-3%',
      trendUp: false
    }
  ];

  return (
    <div className={cn("grid grid-cols-1 md:grid-cols-3 gap-4 mb-6", className)}>
      {cards.map((card, index) => {
        const Icon = card.icon;
        const TrendIcon = card.trendUp ? TrendingUp : TrendingDown;
        
        return (
          <Card 
            key={card.title} 
            className="relative overflow-hidden border-0 shadow-lg hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1"
            style={{
              animationDelay: `${index * 100}ms`
            }}
          >
            {/* Gradient Background */}
            <div className={cn(
              "absolute inset-0 opacity-10 bg-gradient-to-br",
              card.gradient
            )} />
            
            {/* Animated Background Pattern */}
            <div className="absolute inset-0 opacity-5">
              <div 
                className={cn(
                  "absolute h-40 w-40 rounded-full bg-gradient-to-br blur-3xl animate-pulse",
                  card.gradient
                )}
                style={{
                  top: '-20%',
                  right: '-10%',
                  animationDelay: `${index * 200}ms`
                }}
              />
            </div>
            
            <CardContent className="relative p-4">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <p className="text-xs text-muted-foreground font-medium mb-1">
                    {card.title}
                  </p>
                  <p className="text-2xl font-bold bg-gradient-to-r from-gray-900 to-gray-600 bg-clip-text text-transparent">
                    {card.value.toLocaleString()}
                  </p>
                  <div className="flex items-center gap-1 mt-1">
                    <TrendIcon className={cn(
                      "h-3 w-3",
                      card.trendUp ? "text-green-500" : "text-red-500"
                    )} />
                    <span className={cn(
                      "text-xs font-medium",
                      card.trendUp ? "text-green-500" : "text-red-500"
                    )}>
                      {card.trend}
                    </span>
                    <span className="text-xs text-muted-foreground">מהשבוע שעבר</span>
                  </div>
                </div>
                <div className={cn(
                  "p-2 rounded-full",
                  card.iconBg,
                  "transform transition-transform duration-300 hover:scale-110"
                )}>
                  <Icon className={cn("h-5 w-5", card.iconColor)} />
                </div>
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}); 