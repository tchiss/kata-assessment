export const mockEvents = [
  {
    id: '1',
    title: 'Team Meeting',
    type: 'team',
    startTime: '2025-01-10T10:00:00Z',
    endTime: '2025-01-10T12:00:00Z',
    participants: [],
  },
  {
    id: '2',
    title: 'Project Kickoff',
    type: 'project',
    startTime: '2025-01-12T14:00:00Z',
    endTime: '2025-01-12T16:00:00Z',
    participants: [],
  },
];

export const mockEventsWithParticipant = [
  {
    id: '1',
    title: 'Team Meeting',
    type: 'team',
    startTime: '2025-01-10T10:00:00Z',
    endTime: '2025-01-10T12:00:00Z',
    participants: [
      { id: 'p1', name: 'John Doe', email: 'john.doe@example.com' },
    ],
  },
];
