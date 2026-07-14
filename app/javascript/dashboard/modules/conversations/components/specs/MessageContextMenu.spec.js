import { shallowMount } from '@vue/test-utils';
import MessageContextMenu from '../MessageContextMenu.vue';

const dispatch = vi.fn();

const menuItemStub = {
  props: ['option'],
  emits: ['click'],
  template: `
    <button class="menu-item" type="button" @click="$emit('click', $event)">
      {{ option.label }}
    </button>
  `,
};

const mountComponent = ({ message = {}, enabledOptions = {} } = {}) =>
  shallowMount(MessageContextMenu, {
    props: {
      isOpen: true,
      contextMenuPosition: { x: 10, y: 20 },
      enabledOptions: {
        pin: true,
        ...enabledOptions,
      },
      message: {
        id: 7,
        conversation_id: 42,
        content: 'Message content',
        pinned: false,
        ...message,
      },
      hideButton: true,
    },
    global: {
      mocks: {
        $store: {
          dispatch,
          getters: {
            'accounts/getAccount': () => ({ locale: 'en' }),
            getCurrentAccountId: 1,
            getUISettings: {},
          },
        },
      },
      stubs: {
        ContextMenu: {
          template: '<div><slot /></div>',
        },
        MenuItem: menuItemStub,
        AddCannedModal: true,
        NextButton: true,
        ReportCaptainMessageDialog: true,
        WootDeleteModal: true,
      },
    },
  });

describe('MessageContextMenu', () => {
  it('renders Pin message for an unpinned message', () => {
    const wrapper = mountComponent();

    expect(wrapper.text()).toContain('Pin message');
    expect(wrapper.text()).not.toContain('Unpin message');
  });

  it('renders Unpin message for a pinned message', () => {
    const wrapper = mountComponent({ message: { pinned: true } });

    expect(wrapper.text()).toContain('Unpin message');
    expect(wrapper.text()).not.toContain('Pin message');
  });

  it('dispatches togglePinMessage with the next pinned state', async () => {
    const wrapper = mountComponent();

    await wrapper.findAll('.menu-item').at(-1).trigger('click');

    expect(dispatch).toHaveBeenCalledWith('togglePinMessage', {
      conversationId: 42,
      messageId: 7,
      pinned: true,
    });
    expect(wrapper.emitted('close')).toBeTruthy();
  });

  it('does not render the pin action when disabled', () => {
    const wrapper = mountComponent({ enabledOptions: { pin: false } });

    expect(wrapper.text()).not.toContain('Pin message');
    expect(wrapper.text()).not.toContain('Unpin message');
  });
});
