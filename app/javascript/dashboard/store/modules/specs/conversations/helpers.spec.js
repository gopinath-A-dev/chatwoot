import {
  findPendingMessageIndex,
  applyPageFilters,
  filterByInbox,
  filterByTeam,
  filterByLabel,
  filterByUnattended,
  sortComparator,
} from '../../conversations/helpers';

const conversationList = [
  {
    id: 1,
    inbox_id: 2,
    status: 'open',
    meta: {},
    labels: ['sales', 'dev'],
  },
  {
    id: 2,
    inbox_id: 2,
    status: 'open',
    meta: {},
    labels: ['dev'],
  },
  {
    id: 11,
    inbox_id: 3,
    status: 'resolved',
    meta: { team: { id: 5 } },
    labels: [],
  },
  {
    id: 22,
    inbox_id: 4,
    status: 'pending',
    meta: { team: { id: 5 } },
    labels: ['sales'],
  },
];

describe('#findPendingMessageIndex', () => {
  it('returns the correct index of pending message with id', () => {
    const chat = {
      messages: [{ id: 1, status: 'progress' }],
    };
    const message = { echo_id: 1 };
    expect(findPendingMessageIndex(chat, message)).toEqual(0);
  });

  it('returns -1 if pending message with id is not present', () => {
    const chat = {
      messages: [{ id: 1, status: 'progress' }],
    };
    const message = { echo_id: 2 };
    expect(findPendingMessageIndex(chat, message)).toEqual(-1);
  });
});

describe('#sortComparator', () => {
  it('groups pinned conversations first under latest sort while preserving latest order inside each group', () => {
    const pinnedOlderActivity = {
      id: 1,
      pinned: true,
      last_activity_at: 100,
    };
    const unpinnedNewestActivity = {
      id: 2,
      pinned: false,
      last_activity_at: 400,
    };
    const pinnedNewerActivity = {
      id: 3,
      pinned: true,
      last_activity_at: 300,
    };
    const unpinnedOlderActivity = {
      id: 4,
      pinned: false,
      last_activity_at: 200,
    };

    expect(
      [
        unpinnedNewestActivity,
        pinnedOlderActivity,
        unpinnedOlderActivity,
        pinnedNewerActivity,
      ].sort((a, b) => sortComparator(a, b, 'last_activity_at_desc'))
    ).toEqual([
      pinnedNewerActivity,
      pinnedOlderActivity,
      unpinnedNewestActivity,
      unpinnedOlderActivity,
    ]);
  });

  it('groups pinned conversations first under created-at sort while preserving created-at order inside each group', () => {
    const pinnedOlderCreatedAt = { id: 1, pinned: true, created_at: 100 };
    const unpinnedNewestCreatedAt = { id: 2, pinned: false, created_at: 400 };
    const pinnedNewerCreatedAt = { id: 3, pinned: true, created_at: 300 };
    const unpinnedOlderCreatedAt = { id: 4, pinned: false, created_at: 200 };

    expect(
      [
        unpinnedNewestCreatedAt,
        pinnedOlderCreatedAt,
        unpinnedOlderCreatedAt,
        pinnedNewerCreatedAt,
      ].sort((a, b) => sortComparator(a, b, 'created_at_desc'))
    ).toEqual([
      pinnedNewerCreatedAt,
      pinnedOlderCreatedAt,
      unpinnedNewestCreatedAt,
      unpinnedOlderCreatedAt,
    ]);
  });

  it('groups pinned conversations first under priority sort while preserving priority order inside each group', () => {
    const pinnedLowPriority = { id: 1, pinned: true, priority: 'low' };
    const unpinnedUrgentPriority = {
      id: 2,
      pinned: false,
      priority: 'urgent',
    };
    const pinnedHighPriority = { id: 3, pinned: true, priority: 'high' };
    const unpinnedMediumPriority = {
      id: 4,
      pinned: false,
      priority: 'medium',
    };

    expect(
      [
        unpinnedUrgentPriority,
        pinnedLowPriority,
        unpinnedMediumPriority,
        pinnedHighPriority,
      ].sort((a, b) => sortComparator(a, b, 'priority_desc'))
    ).toEqual([
      pinnedHighPriority,
      pinnedLowPriority,
      unpinnedUrgentPriority,
      unpinnedMediumPriority,
    ]);
  });

  it('groups pinned conversations first under waiting-since sort while preserving waiting order inside each group', () => {
    const pinnedWaitingLonger = { id: 1, pinned: true, waiting_since: 100 };
    const unpinnedWaitingNewest = {
      id: 2,
      pinned: false,
      waiting_since: 400,
    };
    const pinnedWaitingNewer = { id: 3, pinned: true, waiting_since: 300 };
    const unpinnedWaitingOlder = {
      id: 4,
      pinned: false,
      waiting_since: 200,
    };

    expect(
      [
        unpinnedWaitingNewest,
        pinnedWaitingLonger,
        unpinnedWaitingOlder,
        pinnedWaitingNewer,
      ].sort((a, b) => sortComparator(a, b, 'waiting_since_asc'))
    ).toEqual([
      pinnedWaitingLonger,
      pinnedWaitingNewer,
      unpinnedWaitingOlder,
      unpinnedWaitingNewest,
    ]);
  });
});

describe('#applyPageFilters', () => {
  describe('#filter-team', () => {
    it('returns true if conversation has team and team filter is active', () => {
      const filters = {
        status: 'resolved',
        teamId: 5,
      };
      expect(applyPageFilters(conversationList[2], filters)).toEqual(true);
    });
    it('returns true if conversation has no team and team filter is active', () => {
      const filters = {
        status: 'open',
        teamId: 5,
      };
      expect(applyPageFilters(conversationList[0], filters)).toEqual(false);
    });
  });

  describe('#filter-inbox', () => {
    it('returns true if conversation has inbox and inbox filter is active', () => {
      const filters = {
        status: 'pending',
        inboxId: 4,
      };
      expect(applyPageFilters(conversationList[3], filters)).toEqual(true);
    });
    it('returns true if conversation has no inbox and inbox filter is active', () => {
      const filters = {
        status: 'open',
        inboxId: 5,
      };
      expect(applyPageFilters(conversationList[0], filters)).toEqual(false);
    });
  });

  describe('#filter-labels', () => {
    it('returns true if conversation has labels and labels filter is active', () => {
      const filters = {
        status: 'open',
        labels: ['dev'],
      };
      expect(applyPageFilters(conversationList[0], filters)).toEqual(true);
    });
    it('returns true if conversation has no inbox and inbox filter is active', () => {
      const filters = {
        status: 'open',
        labels: ['dev'],
      };
      expect(applyPageFilters(conversationList[2], filters)).toEqual(false);
    });
  });

  describe('#filter-status', () => {
    it('returns true if conversation has status and status filter is active', () => {
      const filters = {
        status: 'open',
      };
      expect(applyPageFilters(conversationList[1], filters)).toEqual(true);
    });
    it('returns true if conversation has status and status filter is all', () => {
      const filters = {
        status: 'all',
      };
      expect(applyPageFilters(conversationList[1], filters)).toEqual(true);
    });
  });
});

describe('#filterByInbox', () => {
  it('returns true if conversation has inbox filter active', () => {
    const inboxId = '1';
    const chatInboxId = 1;
    expect(filterByInbox(true, inboxId, chatInboxId)).toEqual(true);
  });
  it('returns false if inbox filter is not active', () => {
    const inboxId = '1';
    const chatInboxId = 13;
    expect(filterByInbox(true, inboxId, chatInboxId)).toEqual(false);
  });
});

describe('#filterByTeam', () => {
  it('returns true if conversation has team and team filter is active', () => {
    const [teamId, chatTeamId] = ['1', 1];
    expect(filterByTeam(true, teamId, chatTeamId)).toEqual(true);
  });
  it('returns false if team filter is not active', () => {
    const [teamId, chatTeamId] = ['1', 12];
    expect(filterByTeam(true, teamId, chatTeamId)).toEqual(false);
  });
});

describe('#filterByLabel', () => {
  it('returns true if conversation has labels and labels filter is active', () => {
    const labels = ['dev', 'cs'];
    const chatLabels = ['dev', 'cs', 'sales'];
    expect(filterByLabel(true, labels, chatLabels)).toEqual(true);
  });
  it('returns false if conversation has not all labels', () => {
    const labels = ['dev', 'cs', 'sales'];
    const chatLabels = ['cs', 'sales'];
    expect(filterByLabel(true, labels, chatLabels)).toEqual(false);
  });
});

describe('#filterByUnattended', () => {
  it('returns true if conversation type is unattended and has no first reply', () => {
    expect(filterByUnattended(true, 'unattended', undefined)).toEqual(true);
  });
  it('returns false if conversation type is not unattended and has no first reply', () => {
    expect(filterByUnattended(false, 'mentions', undefined)).toEqual(false);
  });
  it('returns true if conversation type is unattended and has first reply', () => {
    expect(filterByUnattended(true, 'mentions', 123)).toEqual(true);
  });
});
