'use client';

import { Users, Activity, Clock } from 'lucide-react';
import React from 'react';
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
      label: 'VISITORS TODAY'
    },
    {
      title: 'מבקרים השבוע',
      value: metrics.weekVisitors,
      icon: Clock,
      label: 'WEEKLY VISITORS'
    },
    {
      title: 'סך הפעולות',
      value: metrics.totalActions,
      icon: Activity,
      label: 'TOTAL ACTIONS'
    }
  ];

  return (
    <div className={cn("grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6", className)}>
      {cards.map((card) => {
        const Icon = card.icon;
        
        return (
          <div 
            key={card.title}
            className="bg-white/90 backdrop-blur-sm rounded-xl border border-slate-200 shadow-sm p-6 transition-all duration-200 hover:shadow-md"
          >
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-medium text-slate-500 uppercase tracking-wide">
                {card.label}
              </span>
              <div className="p-2 bg-slate-100 rounded-lg">
                <Icon className="h-4 w-4 text-slate-600" />
              </div>
            </div>
            
            <div className="space-y-1">
              <p className="text-2xl font-semibold text-slate-900">
                {card.value.toLocaleString()}
              </p>
              <p className="text-sm text-slate-600">
                {card.title}
              </p>
            </div>
          </div>
        );
      })}
    </div>
  );
}); 