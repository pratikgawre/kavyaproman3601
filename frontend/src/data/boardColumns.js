export const BOARD_COLUMNS = [
  {
    key: 'todo',
    title: 'To Do',
    tone: 'todo',
    issues: [
      {
        id: 'KPM-4',
        type: 'bug',
        typeLabel: 'BUG',
        title: 'Bug: Filter not working on board view',
        labels: ['bug', 'frontend'],
        assignee: 'Sarah Johnson',
        points: 2,
        priority: 'high'
      },
      {
        id: 'KPM-9',
        type: 'task',
        typeLabel: 'TASK',
        title: 'Optimize database queries',
        labels: ['backend', 'performance'],
        assignee: 'Michael Chen',
        points: 5,
        priority: 'medium'
      },
      {
        id: 'KPM-10',
        type: 'story',
        typeLabel: 'STORY',
        title: 'Design onboarding checklist',
        labels: ['ux', 'story'],
        assignee: 'Emily Rodriguez',
        points: 3,
        priority: 'medium'
      }
    ]
  },
  {
    key: 'progress',
    title: 'In Progress',
    tone: 'progress',
    issues: [
      {
        id: 'KPM-2',
        type: 'story',
        typeLabel: 'STORY',
        title: 'Implement Kanban board with drag and drop',
        labels: ['frontend', 'core'],
        assignee: 'Michael Chen',
        points: 13,
        priority: 'critical'
      },
      {
        id: 'KPM-3',
        type: 'story',
        typeLabel: 'STORY',
        title: 'Add sprint planning interface',
        labels: ['frontend', 'sprints'],
        assignee: 'Emily Rodriguez',
        points: 8,
        priority: 'high'
      }
    ]
  },
  {
    key: 'review',
    title: 'In Review',
    tone: 'review',
    issues: [
      {
        id: 'KPM-5',
        type: 'task',
        typeLabel: 'TASK',
        title: 'Setup authentication system',
        labels: ['backend', 'security'],
        assignee: 'David Kim',
        points: 8,
        priority: 'critical'
      }
    ]
  },
  {
    key: 'done',
    title: 'Done',
    tone: 'done',
    issues: [
      {
        id: 'KPM-1',
        type: 'task',
        typeLabel: 'TASK',
        title: 'Project repository initialization',
        labels: ['devops', 'setup'],
        assignee: 'Sarah Johnson',
        points: 3,
        priority: 'low'
      }
    ]
  }
]
