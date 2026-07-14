import { shallowMount } from '@vue/test-utils';
import Message from '../Message.vue';
import {
  ATTACHMENT_TYPES,
  MESSAGE_STATUS,
  MESSAGE_TYPES,
} from '../constants.js';

vi.mock('vue-router', () => ({
  useRoute: () => ({ query: {} }),
}));

vi.mock('dashboard/composables', () => ({
  useTrack: vi.fn(),
}));

vi.mock('dashboard/composables/store', () => ({
  useMapGetter: key => {
    if (key === 'inboxes/getInbox') {
      return { value: () => ({}) };
    }
    if (key === 'globalConfig/isOnChatwootCloud') {
      return { value: false };
    }
    return { value: null };
  },
}));

vi.mock('shared/composables/useBranding', () => ({
  useBranding: () => ({
    replaceInstallationName: text => text,
  }),
}));

vi.mock('shared/helpers/mitt', () => ({
  emitter: {
    emit: vi.fn(),
  },
}));

const defaultProps = {
  id: 7,
  messageType: MESSAGE_TYPES.INCOMING,
  status: MESSAGE_STATUS.SENT,
  content: 'Hello from a customer',
  conversationId: 42,
  createdAt: 1784030400,
  currentUserId: 1,
  sender: {
    id: 2,
    name: 'Jane Doe',
    type: 'Contact',
    thumbnail: '',
  },
};

const mountComponent = props =>
  shallowMount(Message, {
    props: {
      ...defaultProps,
      ...props,
    },
    global: {
      stubs: {
        ContextMenu: {
          name: 'ContextMenu',
          props: ['enabledOptions', 'message'],
          template: `
            <div
              data-testid="message-context-menu"
              :data-pin-enabled="String(enabledOptions.pin)"
              :data-message-pinned="String(message.pinned)"
            />
          `,
        },
        Avatar: true,
        MessageError: true,
      },
    },
  });

describe('Message', () => {
  it('renders an inline pinned indicator when the message is pinned', () => {
    const wrapper = mountComponent({ pinned: true });

    expect(wrapper.find('[data-testid="message-pin-indicator"]').exists()).toBe(
      true
    );
  });

  it('does not render the pinned indicator for unpinned messages', () => {
    const wrapper = mountComponent({ pinned: false });

    expect(wrapper.find('[data-testid="message-pin-indicator"]').exists()).toBe(
      false
    );
  });

  it.each([
    ['incoming text message', { messageType: MESSAGE_TYPES.INCOMING }],
    ['outgoing text message', { messageType: MESSAGE_TYPES.OUTGOING }],
    ['private note', { messageType: MESSAGE_TYPES.OUTGOING, private: true }],
    [
      'attachment-only message',
      {
        content: null,
        attachments: [{ id: 1, fileType: ATTACHMENT_TYPES.IMAGE }],
      },
    ],
  ])('enables pinning for %s', (_, props) => {
    const wrapper = mountComponent(props);

    expect(
      wrapper.find('[data-testid="message-context-menu"]').attributes()
    ).toMatchObject({
      'data-pin-enabled': 'true',
    });
  });

  it('does not expose pinning for activity messages', () => {
    const wrapper = mountComponent({
      messageType: MESSAGE_TYPES.ACTIVITY,
      content: 'Conversation was marked resolved',
    });

    expect(wrapper.find('[data-testid="message-context-menu"]').exists()).toBe(
      false
    );
  });

  it('does not expose pinning for deleted messages', () => {
    const wrapper = mountComponent({
      contentAttributes: { deleted: true },
    });

    expect(
      wrapper.find('[data-testid="message-context-menu"]').attributes()
    ).toMatchObject({
      'data-pin-enabled': 'false',
    });
  });
});
