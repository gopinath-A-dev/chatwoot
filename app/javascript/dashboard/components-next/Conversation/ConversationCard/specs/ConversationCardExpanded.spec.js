import { shallowMount } from '@vue/test-utils';
import ConversationCardExpanded from '../ConversationCardExpanded.vue';

const defaultChat = {
  id: 1,
  labels: [],
  messages: [],
  priority: null,
  unread_count: 0,
  timestamp: 1700000000,
  created_at: 1700000000,
  status: 'open',
};

const mountComponent = chat =>
  shallowMount(ConversationCardExpanded, {
    props: {
      chat: { ...defaultChat, ...chat },
      currentContact: {
        name: 'Jane Doe',
        thumbnail: '',
        availability_status: 'offline',
      },
      inbox: { id: 1 },
    },
  });

describe('ConversationCardExpanded', () => {
  it('renders a pin indicator when the conversation is pinned', () => {
    const wrapper = mountComponent({ pinned: true });

    expect(
      wrapper.find('[data-testid="conversation-pin-indicator"]').exists()
    ).toBe(true);
  });

  it('does not render a pin indicator when the conversation is not pinned', () => {
    const wrapper = mountComponent({ pinned: false });

    expect(
      wrapper.find('[data-testid="conversation-pin-indicator"]').exists()
    ).toBe(false);
  });
});
