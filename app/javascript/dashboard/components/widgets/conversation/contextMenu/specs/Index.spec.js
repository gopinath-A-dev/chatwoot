import { shallowMount } from '@vue/test-utils';
import ContextMenu from '../Index.vue';

vi.mock('dashboard/composables/useAdmin', () => ({
  useAdmin: () => ({ isAdmin: false }),
}));

const mountComponent = ({ pinned = false } = {}) =>
  shallowMount(ContextMenu, {
    props: {
      chatId: 42,
      status: 'open',
      inboxId: 1,
      pinned,
    },
    global: {
      mocks: {
        $t: key => {
          const translations = {
            'CONVERSATION.CARD_CONTEXT_MENU.PIN': 'Pin conversation',
            'CONVERSATION.CARD_CONTEXT_MENU.UNPIN': 'Unpin conversation',
          };
          return translations[key] || key;
        },
        $store: {
          dispatch: vi.fn(),
          getters: {
            'labels/getLabels': [],
            'teams/getTeams': [],
            'inboxAssignableAgents/getUIFlags': { isFetching: false },
            'inboxAssignableAgents/getAssignableAgents': () => [],
            getCurrentUser: { id: 1 },
            getCurrentAccountId: 1,
          },
        },
      },
      stubs: {
        MenuItem: {
          props: ['option'],
          template:
            '<button type="button" class="menu-item">{{ option.label }}</button>',
        },
        MenuItemWithSubmenu: true,
        AgentLoadingPlaceholder: true,
      },
    },
  });

describe('Conversation context menu', () => {
  it('shows pin label for an unpinned conversation', () => {
    const wrapper = mountComponent({ pinned: false });

    expect(wrapper.text()).toContain('Pin conversation');
    expect(wrapper.text()).not.toContain('Unpin conversation');
  });

  it('shows unpin label for a pinned conversation', () => {
    const wrapper = mountComponent({ pinned: true });

    expect(wrapper.text()).toContain('Unpin conversation');
    expect(wrapper.text()).not.toContain('Pin conversation');
  });

  it('emits pinConversation when the pin item is clicked', async () => {
    const wrapper = mountComponent({ pinned: false });
    const pinItem = wrapper
      .findAll('.menu-item')
      .find(item => item.text() === 'Pin conversation');

    await pinItem.trigger('click');

    expect(wrapper.emitted('pinConversation')).toEqual([[true]]);
  });
});
