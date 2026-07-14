import { reactive } from 'vue';
import { flushPromises, shallowMount } from '@vue/test-utils';
import PinnedMessagesPanel from '../PinnedMessagesPanel.vue';
import MessageApi from 'dashboard/api/inbox/message';
import { emitter } from 'shared/helpers/mitt';
import { BUS_EVENTS } from 'shared/constants/busEvents';

const routerReplace = vi.fn();
let selectedChat;
let store;

vi.mock('dashboard/api/inbox/message', () => ({
  default: {
    getPinned: vi.fn(),
  },
}));

vi.mock('shared/helpers/mitt', () => ({
  emitter: {
    emit: vi.fn(),
  },
}));

vi.mock('vue-router', () => ({
  useRoute: () => ({ query: {} }),
  useRouter: () => ({ replace: routerReplace }),
}));

vi.mock('vuex', () => ({
  useStore: () => store,
}));

vi.mock('vue-i18n', () => ({
  useI18n: () => ({
    t: (key, params = {}) => {
      const translations = {
        'CONVERSATION.PINNED_MESSAGES.TITLE': 'Pinned messages',
        'CONVERSATION.PINNED_MESSAGES.EMPTY_TITLE': 'No pinned messages',
        'CONVERSATION.PINNED_MESSAGES.EMPTY_DESCRIPTION':
          'Pinned messages in this conversation will appear here.',
        'CONVERSATION.PINNED_MESSAGES.UNPIN': 'Unpin',
        'CONVERSATION.PINNED_MESSAGES.JUMP_TO_MESSAGE': 'Jump to message',
        'CONVERSATION.PINNED_MESSAGES.ATTRIBUTION':
          'Pinned by {name} on {time}',
        'CONVERSATION.PINNED_MESSAGES.UNKNOWN_SENDER': 'Unknown sender',
        'CONVERSATION.PINNED_MESSAGES.UNKNOWN_PINNER': 'Unknown agent',
        'CONVERSATION.PINNED_MESSAGES.ATTACHMENT': 'Attachment',
        'CONVERSATION.PINNED_MESSAGES.IMAGE_ATTACHMENT': 'Image attachment',
      };
      return (translations[key] || key)
        .replace('{name}', params.name)
        .replace('{time}', params.time);
    },
  }),
}));

const makeMessage = ({
  id,
  content = 'Pinned content',
  pinnedAt = 1784030400,
  senderName = 'Customer',
  pinnedByName = 'Agent A',
  attachments = [],
  pinned = true,
} = {}) => ({
  id,
  content,
  conversation_id: 42,
  pinned,
  pinned_at: pinnedAt,
  sender: { name: senderName },
  pinned_by: { name: pinnedByName },
  attachments,
});

const mountComponent = async ({ pinnedMessages = [] } = {}) => {
  MessageApi.getPinned.mockResolvedValue({ data: pinnedMessages });

  const wrapper = shallowMount(PinnedMessagesPanel, {
    props: {
      conversationId: 42,
    },
    global: {
      stubs: {
        ButtonV4: {
          props: ['label'],
          emits: ['click'],
          template:
            '<button type="button" @click="$emit(\'click\')">{{ label }}</button>',
        },
      },
    },
  });

  await flushPromises();
  return wrapper;
};

describe('PinnedMessagesPanel', () => {
  beforeEach(() => {
    selectedChat = reactive({ id: 42, messages: [] });
    store = {
      getters: { getSelectedChat: selectedChat },
      dispatch: vi.fn().mockResolvedValue(),
    };
    vi.clearAllMocks();
  });

  it('renders pinned message rows with sender, snippet, and attribution', async () => {
    const wrapper = await mountComponent({
      pinnedMessages: [
        makeMessage({
          id: 1,
          content: 'Older pinned message',
          senderName: 'Alice',
          pinnedByName: 'Agent A',
          pinnedAt: 1784030300,
        }),
        makeMessage({
          id: 2,
          content: '',
          senderName: 'Bob',
          pinnedByName: 'Agent B',
          pinnedAt: '2026-07-14T16:46:00.000Z',
          attachments: [{ file_type: 'image' }],
        }),
      ],
    });

    const rows = wrapper.findAll('[data-testid="pinned-message-row"]');
    expect(rows).toHaveLength(2);
    expect(rows[0].text()).toContain('Bob');
    expect(rows[0].text()).toContain('Image attachment');
    expect(rows[0].text()).toContain('Agent B');
    expect(rows[1].text()).toContain('Alice');
    expect(rows[1].text()).toContain('Older pinned message');
    expect(rows[1].text()).toContain('Agent A');
  });

  it('renders an empty state when there are no pinned messages', async () => {
    const wrapper = await mountComponent({ pinnedMessages: [] });

    expect(wrapper.text()).toContain('No pinned messages');
    expect(wrapper.text()).toContain(
      'Pinned messages in this conversation will appear here.'
    );
  });

  it('unpins a row and removes it from the panel', async () => {
    const wrapper = await mountComponent({
      pinnedMessages: [makeMessage({ id: 1 })],
    });

    await wrapper.find('[data-testid="unpin-pinned-message"]').trigger('click');
    await flushPromises();

    expect(store.dispatch).toHaveBeenCalledWith('togglePinMessage', {
      conversationId: 42,
      messageId: 1,
      pinned: false,
    });
    expect(wrapper.findAll('[data-testid="pinned-message-row"]')).toHaveLength(
      0
    );
    expect(wrapper.text()).toContain('No pinned messages');
  });

  it('fetches the target if needed and invokes jump-to-message highlighting', async () => {
    const wrapper = await mountComponent({
      pinnedMessages: [makeMessage({ id: 7 })],
    });

    await wrapper
      .find('[data-testid="jump-to-pinned-message"]')
      .trigger('click');
    await flushPromises();

    expect(store.dispatch).toHaveBeenCalledWith('fetchPreviousMessages', {
      conversationId: 42,
      before: 107,
      after: 0,
    });
    expect(routerReplace).toHaveBeenCalledWith({
      query: { messageId: 7 },
    });
    expect(emitter.emit).toHaveBeenCalledWith(BUS_EVENTS.SCROLL_TO_MESSAGE, {
      messageId: 7,
    });
  });

  it('live adds and removes rows when selected conversation messages change', async () => {
    const wrapper = await mountComponent({ pinnedMessages: [] });

    selectedChat.messages.push(makeMessage({ id: 5, content: 'Live pin' }));
    await flushPromises();

    expect(wrapper.text()).toContain('Live pin');

    selectedChat.messages[0] = makeMessage({
      id: 5,
      content: 'Live pin',
      pinned: false,
    });
    await flushPromises();

    expect(wrapper.text()).not.toContain('Live pin');
    expect(wrapper.text()).toContain('No pinned messages');
  });
});
