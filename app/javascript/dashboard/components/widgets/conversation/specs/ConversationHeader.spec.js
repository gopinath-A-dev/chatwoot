import { ref } from 'vue';
import { shallowMount } from '@vue/test-utils';
import ConversationHeader from '../ConversationHeader.vue';

let store;

vi.mock('vue-router', async importOriginal => ({
  ...(await importOriginal()),
  useRoute: () => ({
    params: {},
    name: 'inbox_conversation',
  }),
}));

vi.mock('vuex', async importOriginal => ({
  ...(await importOriginal()),
  useStore: () => store,
}));

vi.mock('@vueuse/core', () => ({
  useElementSize: () => ({ width: ref(320) }),
}));

vi.mock('dashboard/composables/useInbox', () => ({
  useInbox: () => ({ isAWebWidgetInbox: ref(false) }),
}));

vi.mock('dashboard/helper/URLHelper', async importOriginal => ({
  ...(await importOriginal()),
  conversationListPageURL: () => '/app/accounts/1/conversations',
}));

vi.mock('vue-i18n', () => ({
  useI18n: () => ({
    t: key => {
      const translations = {
        'CONVERSATION.HEADER.PINNED_MESSAGES': 'Pinned messages',
      };
      return translations[key] || key;
    },
  }),
}));

const mountComponent = () =>
  shallowMount(ConversationHeader, {
    props: {
      chat: {
        id: 42,
        inbox_id: 1,
        status: 'open',
        meta: {
          sender: { id: 7 },
        },
      },
    },
    global: {
      stubs: {
        Avatar: true,
        BackButton: true,
        ButtonV4: {
          emits: ['click'],
          template:
            '<button data-testid="pinned-messages-button" type="button" @click="$emit(\'click\')" />',
        },
        ConversationCallButton: true,
        'fluent-icon': true,
        InboxName: true,
        MoreActions: true,
        SLACardLabel: true,
      },
    },
  });

describe('ConversationHeader', () => {
  beforeEach(() => {
    store = {
      getters: {
        getSelectedChat: {
          id: 42,
          inbox_id: 1,
          status: 'open',
          meta: { sender: { id: 7 } },
        },
        getCurrentAccountId: 1,
        'contacts/getContact': () => ({
          id: 7,
          name: 'Jane Doe',
          thumbnail: '',
          availability_status: 'offline',
        }),
        'inboxes/getInbox': () => ({ id: 1 }),
        'inboxes/getInboxes': [{ id: 1 }],
      },
    };
  });

  it('emits an event when the pinned messages header button is clicked', async () => {
    const wrapper = mountComponent();

    await wrapper
      .find('[data-testid="pinned-messages-button"]')
      .trigger('click');

    expect(wrapper.emitted('togglePinnedMessages')).toEqual([[]]);
  });
});
