'use client';

import { FeedbackStats } from '@/lib/types/feedback';

interface Props {
  stats: FeedbackStats;
}

const statusLabels = {
  new: 'חדש',
  assigned: 'הוקצה',
  in_progress: 'בעבודה',
  pending_user: 'ממתין למשתמש',
  resolved: 'נפתר',
  closed: 'נסגר',
  cancelled: 'בוטל'
};

const priorityLabels = {
  low: 'נמוך',
  normal: 'רגיל',
  high: 'גבוה',
  urgent: 'דחוף',
  critical: 'קריטי'
};

const FeedbackStatsComponent: React.FC<Props> = ({ stats }) => {
  const activeTickets = stats.byStatus.new + stats.byStatus.assigned + stats.byStatus.in_progress;
  const resolutionRate = stats.total > 0 ? ((stats.byStatus.resolved + stats.byStatus.closed) / stats.total * 100) : 0;

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
      {/* Total Tickets */}
      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-gray-600">סה"כ פניות</p>
            <p className="text-3xl font-bold text-gray-900">{stats.total}</p>
          </div>
          <div className="p-3 bg-blue-100 rounded-full">
            <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/>
            </svg>
          </div>
        </div>
        <div className="mt-4">
          <div className="flex items-center text-sm text-gray-600">
            <span>היום: {stats.newToday} חדשות</span>
          </div>
        </div>
      </div>

      {/* Active Tickets */}
      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-gray-600">פניות פעילות</p>
            <p className="text-3xl font-bold text-orange-600">{activeTickets}</p>
          </div>
          <div className="p-3 bg-orange-100 rounded-full">
            <svg className="w-6 h-6 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"/>
            </svg>
          </div>
        </div>
        <div className="mt-4">
          <div className="flex items-center text-sm text-gray-600">
            <span>דחופות: {stats.overdueTickets}</span>
          </div>
        </div>
      </div>

      {/* Resolution Rate */}
      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-gray-600">אחוז פתרון</p>
            <p className="text-3xl font-bold text-green-600">{resolutionRate.toFixed(1)}%</p>
          </div>
          <div className="p-3 bg-green-100 rounded-full">
            <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/>
            </svg>
          </div>
        </div>
        <div className="mt-4">
          <div className="flex items-center text-sm text-gray-600">
            <span>היום: {stats.resolvedToday} נפתרו</span>
          </div>
        </div>
      </div>

      {/* Avg Resolution Time */}
      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-gray-600">זמן פתרון ממוצע</p>
            <p className="text-3xl font-bold text-purple-600">
              {stats.avgResolutionTime > 0 ? `${stats.avgResolutionTime.toFixed(1)}ש` : 'N/A'}
            </p>
          </div>
          <div className="p-3 bg-purple-100 rounded-full">
            <svg className="w-6 h-6 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z"/>
            </svg>
          </div>
        </div>
        <div className="mt-4">
          <div className="flex items-center text-sm text-gray-600">
            <span>שביעות רצון: {stats.customerSatisfactionAvg > 0 ? stats.customerSatisfactionAvg.toFixed(1) : 'N/A'}/5</span>
          </div>
        </div>
      </div>

      {/* Status Breakdown */}
      <div className="bg-white rounded-lg shadow p-6 md:col-span-2">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">פילוח לפי סטטוס</h3>
        <div className="space-y-3">
          {Object.entries(stats.byStatus).map(([status, count]) => {
            if (count === 0) return null;
            const percentage = stats.total > 0 ? (count / stats.total * 100) : 0;
            
            return (
              <div key={status} className="flex items-center justify-between">
                <div className="flex items-center">
                  <div className={`w-3 h-3 rounded-full mr-3 ${getStatusColor(status)}`}></div>
                  <span className="text-sm text-gray-700">{statusLabels[status as keyof typeof statusLabels]}</span>
                </div>
                <div className="flex items-center">
                  <div className="w-20 bg-gray-200 rounded-full h-2 mr-3">
                    <div 
                      className={`h-2 rounded-full ${getStatusColor(status)}`}
                      style={{ width: `${percentage}%` }}
                    ></div>
                  </div>
                  <span className="text-sm font-medium text-gray-900 w-8 text-right">{count}</span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Priority Breakdown */}
      <div className="bg-white rounded-lg shadow p-6 md:col-span-2">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">פילוח לפי עדיפות</h3>
        <div className="space-y-3">
          {Object.entries(stats.byPriority).map(([priority, count]) => {
            if (count === 0) return null;
            const percentage = stats.total > 0 ? (count / stats.total * 100) : 0;
            
            return (
              <div key={priority} className="flex items-center justify-between">
                <div className="flex items-center">
                  <div className={`w-3 h-3 rounded-full mr-3 ${getPriorityColor(priority)}`}></div>
                  <span className="text-sm text-gray-700">{priorityLabels[priority as keyof typeof priorityLabels]}</span>
                </div>
                <div className="flex items-center">
                  <div className="w-20 bg-gray-200 rounded-full h-2 mr-3">
                    <div 
                      className={`h-2 rounded-full ${getPriorityColor(priority)}`}
                      style={{ width: `${percentage}%` }}
                    ></div>
                  </div>
                  <span className="text-sm font-medium text-gray-900 w-8 text-right">{count}</span>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

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