'use client';

import { FeedbackStats } from '@/lib/types/feedback';

interface Props {
  stats: FeedbackStats;
}

const FeedbackStatsComponent: React.FC<Props> = ({ stats }) => {
  const activeTickets = stats.byStatus.new + stats.byStatus.assigned + stats.byStatus.in_progress;
  const resolutionRate = stats.total > 0 ? ((stats.byStatus.resolved + stats.byStatus.closed) / stats.total * 100) : 0;

  return (
    <div className="mb-4 space-y-3">
      {/* Main Stats - Compact Row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {/* Total Tickets */}
        <div className="bg-white rounded-lg border border-gray-200 p-3">
          <div className="text-xs text-gray-500 mb-1">סה"כ פניות</div>
          <div className="text-lg font-bold text-gray-900">{stats.total}</div>
          <div className="text-xs text-blue-600">+{stats.newToday} היום</div>
        </div>

        {/* Active Tickets */}
        <div className="bg-white rounded-lg border border-gray-200 p-3">
          <div className="text-xs text-gray-500 mb-1">פעילות</div>
          <div className="text-lg font-bold text-orange-600">{activeTickets}</div>
          <div className="text-xs text-red-600">{stats.overdueTickets} דחופות</div>
        </div>

        {/* Resolution Rate */}
        <div className="bg-white rounded-lg border border-gray-200 p-3">
          <div className="text-xs text-gray-500 mb-1">אחוז פתרון</div>
          <div className="text-lg font-bold text-green-600">{resolutionRate.toFixed(0)}%</div>
          <div className="text-xs text-green-600">{stats.resolvedToday} נפתרו</div>
        </div>

        {/* Avg Resolution Time */}
        <div className="bg-white rounded-lg border border-gray-200 p-3">
          <div className="text-xs text-gray-500 mb-1">זמן ממוצע</div>
          <div className="text-lg font-bold text-purple-600">
            {stats.avgResolutionTime > 0 ? `${stats.avgResolutionTime.toFixed(0)}ש` : 'N/A'}
          </div>
          <div className="text-xs text-purple-600">
            {stats.customerSatisfactionAvg > 0 ? `${stats.customerSatisfactionAvg.toFixed(1)}/5` : 'N/A'}
          </div>
        </div>
      </div>

      {/* Quick Status Overview - Collapsed by default on mobile */}
      <details className="md:hidden">
        <summary className="bg-white rounded-lg border border-gray-200 p-3 cursor-pointer text-sm font-medium text-gray-700">
          פירוט סטטוסים ועדיפויות ▼
        </summary>
        <div className="mt-2 bg-white rounded-lg border border-gray-200 p-3">
          <div className="grid grid-cols-2 gap-4 text-xs">
            <div>
              <div className="font-medium text-gray-900 mb-2">סטטוס:</div>
              {Object.entries(stats.byStatus).map(([status, count]) => {
                if (count === 0) return null;
                return (
                  <div key={status} className="flex justify-between items-center mb-1">
                    <span className="text-gray-600">{getStatusLabel(status)}</span>
                    <span className="font-medium">{count}</span>
                  </div>
                );
              })}
            </div>
            <div>
              <div className="font-medium text-gray-900 mb-2">עדיפות:</div>
              {Object.entries(stats.byPriority).map(([priority, count]) => {
                if (count === 0) return null;
                return (
                  <div key={priority} className="flex justify-between items-center mb-1">
                    <span className="text-gray-600">{getPriorityLabel(priority)}</span>
                    <span className="font-medium">{count}</span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </details>

      {/* Desktop detailed view */}
      <div className="hidden md:grid grid-cols-2 gap-3">
        {/* Status Breakdown */}
        <div className="bg-white rounded-lg border border-gray-200 p-3">
          <h4 className="text-sm font-medium text-gray-900 mb-2">פילוח סטטוס</h4>
          <div className="space-y-1">
            {Object.entries(stats.byStatus).map(([status, count]) => {
              if (count === 0) return null;
              const percentage = stats.total > 0 ? (count / stats.total * 100) : 0;
              
              return (
                <div key={status} className="flex items-center justify-between text-sm">
                  <div className="flex items-center">
                    <div className={`w-2 h-2 rounded-full mr-2 ${getStatusColor(status)}`}></div>
                    <span className="text-gray-700">{getStatusLabel(status)}</span>
                  </div>
                  <div className="flex items-center">
                    <div className="w-12 bg-gray-200 rounded-full h-1 mr-2">
                      <div 
                        className={`h-1 rounded-full ${getStatusColor(status)}`}
                        style={{ width: `${percentage}%` }}
                      ></div>
                    </div>
                    <span className="font-medium w-6 text-right">{count}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Priority Breakdown */}
        <div className="bg-white rounded-lg border border-gray-200 p-3">
          <h4 className="text-sm font-medium text-gray-900 mb-2">פילוח עדיפות</h4>
          <div className="space-y-1">
            {Object.entries(stats.byPriority).map(([priority, count]) => {
              if (count === 0) return null;
              const percentage = stats.total > 0 ? (count / stats.total * 100) : 0;
              
              return (
                <div key={priority} className="flex items-center justify-between text-sm">
                  <div className="flex items-center">
                    <div className={`w-2 h-2 rounded-full mr-2 ${getPriorityColor(priority)}`}></div>
                    <span className="text-gray-700">{getPriorityLabel(priority)}</span>
                  </div>
                  <div className="flex items-center">
                    <div className="w-12 bg-gray-200 rounded-full h-1 mr-2">
                      <div 
                        className={`h-1 rounded-full ${getPriorityColor(priority)}`}
                        style={{ width: `${percentage}%` }}
                      ></div>
                    </div>
                    <span className="font-medium w-6 text-right">{count}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};

function getStatusLabel(status: string): string {
  const labels = {
    new: 'חדש',
    assigned: 'הוקצה',
    in_progress: 'בעבודה',
    pending_user: 'ממתין למשתמש',
    resolved: 'נפתר',
    closed: 'נסגר',
    cancelled: 'בוטל'
  };
  return labels[status as keyof typeof labels] || status;
}

function getPriorityLabel(priority: string): string {
  const labels = {
    low: 'נמוך',
    normal: 'רגיל',
    high: 'גבוה',
    urgent: 'דחוף',
    critical: 'קריטי'
  };
  return labels[priority as keyof typeof labels] || priority;
}

function getStatusColor(status: string): string {
  const colors = {
    new: 'bg-blue-500',
    assigned: 'bg-yellow-500',
    in_progress: 'bg-orange-500',
    pending_user: 'bg-purple-500',
    resolved: 'bg-green-500',
    closed: 'bg-gray-500',
    cancelled: 'bg-red-500'
  };
  return colors[status as keyof typeof colors] || 'bg-gray-400';
}

function getPriorityColor(priority: string): string {
  const colors = {
    low: 'bg-green-500',
    normal: 'bg-blue-500',
    high: 'bg-orange-500',
    urgent: 'bg-red-500',
    critical: 'bg-red-700'
  };
  return colors[priority as keyof typeof colors] || 'bg-gray-400';
}

export default FeedbackStatsComponent; 