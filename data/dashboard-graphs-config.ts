// Configuration for dashboard graphs and charts

// Define types for graph configuration
export interface GraphConfig {
  id: string;
  title: string;
  type: 'line' | 'bar' | 'pie' | 'doughnut' | 'radar';
  dataKey: string;
  endpoint?: string;
  height?: number;
  options?: any;
}

// Dashboard graphs configuration
export const dashboardGraphsConfig: GraphConfig[] = [
  {
    id: 'tasks-completion',
    title: 'השלמת משימות',
    type: 'line',
    dataKey: 'tasksCompletion',
    endpoint: '/api/analytics/tasks-completion',
    height: 300,
    options: {
      responsive: true,
      maintainAspectRatio: false,
      scales: {
        y: {
          beginAtZero: true,
          title: {
            display: true,
            text: 'מספר משימות'
          }
        },
        x: {
          title: {
            display: true,
            text: 'תאריך'
          }
        }
      }
    }
  },
  {
    id: 'project-distribution',
    title: 'התפלגות משימות לפי פרויקט',
    type: 'pie',
    dataKey: 'projectDistribution',
    endpoint: '/api/analytics/project-distribution',
    height: 250,
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          position: 'bottom'
        }
      }
    }
  },
  {
    id: 'priority-distribution',
    title: 'התפלגות עדיפויות',
    type: 'bar',
    dataKey: 'priorityDistribution',
    endpoint: '/api/analytics/priority-distribution',
    height: 250,
    options: {
      responsive: true,
      maintainAspectRatio: false,
      scales: {
        y: {
          beginAtZero: true,
          title: {
            display: true,
            text: 'מספר משימות'
          }
        }
      },
      plugins: {
        legend: {
          display: false
        }
      }
    }
  }
];

// Default data for graphs when API is not available
export const defaultGraphData = {
  tasksCompletion: {
    labels: ['ינואר', 'פברואר', 'מרץ', 'אפריל', 'מאי', 'יוני'],
    datasets: [
      {
        label: 'משימות שהושלמו',
        data: [12, 19, 3, 5, 2, 3],
        borderColor: 'rgb(75, 192, 192)',
        backgroundColor: 'rgba(75, 192, 192, 0.5)',
      }
    ]
  },
  projectDistribution: {
    labels: ['פרויקט א', 'פרויקט ב', 'פרויקט ג', 'פרויקט ד'],
    datasets: [
      {
        data: [12, 19, 3, 5],
        backgroundColor: [
          'rgba(255, 99, 132, 0.5)',
          'rgba(54, 162, 235, 0.5)',
          'rgba(255, 206, 86, 0.5)',
          'rgba(75, 192, 192, 0.5)',
        ],
        borderColor: [
          'rgba(255, 99, 132, 1)',
          'rgba(54, 162, 235, 1)',
          'rgba(255, 206, 86, 1)',
          'rgba(75, 192, 192, 1)',
        ],
        borderWidth: 1,
      }
    ]
  },
  priorityDistribution: {
    labels: ['גבוהה', 'בינונית', 'נמוכה'],
    datasets: [
      {
        label: 'מספר משימות',
        data: [5, 12, 8],
        backgroundColor: [
          'rgba(255, 99, 132, 0.5)',
          'rgba(255, 206, 86, 0.5)',
          'rgba(75, 192, 192, 0.5)',
        ],
      }
    ]
  }
}; 