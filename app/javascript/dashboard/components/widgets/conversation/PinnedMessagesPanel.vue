<script setup>
import { computed, nextTick, onMounted, ref, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { useStore } from 'vuex';
import { useI18n } from 'vue-i18n';
import format from 'date-fns/format';
import MessageApi from 'dashboard/api/inbox/message';
import ButtonV4 from 'dashboard/components-next/button/Button.vue';
import { emitter } from 'shared/helpers/mitt';
import { BUS_EVENTS } from 'shared/constants/busEvents';
import { messageTimestamp } from 'shared/helpers/timeHelper';

const props = defineProps({
  conversationId: {
    type: [Number, String],
    required: true,
  },
});

const emit = defineEmits(['close']);

const { t } = useI18n();
const route = useRoute();
const router = useRouter();
const store = useStore();

const isLoading = ref(false);
const pinnedMessages = ref([]);

const currentChat = computed(() => store.getters.getSelectedChat || {});

const pinnedAtSortValue = message => {
  const pinnedAt = message.pinned_at || message.pinnedAt;
  const numericPinnedAt = Number(pinnedAt);
  if (Number.isFinite(numericPinnedAt)) return numericPinnedAt;

  const parsedPinnedAt = new Date(pinnedAt).getTime();
  return Number.isNaN(parsedPinnedAt) ? 0 : parsedPinnedAt / 1000;
};

const sortedPinnedMessages = computed(() => {
  return [...pinnedMessages.value].sort((messageA, messageB) => {
    return pinnedAtSortValue(messageB) - pinnedAtSortValue(messageA);
  });
});

const stripHtml = content => {
  const value = content || '';
  return value
    .replace(/<[^>]*>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
};

const truncate = content => {
  const limit = 120;
  if (content.length <= limit) return content;
  return `${content.slice(0, limit).trim()}…`;
};

const attachmentType = attachment => {
  return (
    attachment?.file_type || attachment?.fileType || attachment?.type || ''
  );
};

const attachmentName = attachment => {
  return attachment?.file_name || attachment?.fileName || attachment?.filename;
};

const attachmentLabelForType = type => {
  if (type === 'image') {
    return t('CONVERSATION.PINNED_MESSAGES.IMAGE_ATTACHMENT');
  }
  if (type === 'audio') {
    return t('CONVERSATION.PINNED_MESSAGES.AUDIO_ATTACHMENT');
  }
  if (type === 'video') {
    return t('CONVERSATION.PINNED_MESSAGES.VIDEO_ATTACHMENT');
  }
  if (type === 'file') {
    return t('CONVERSATION.PINNED_MESSAGES.FILE_ATTACHMENT');
  }
  if (type === 'location') {
    return t('CONVERSATION.PINNED_MESSAGES.LOCATION_ATTACHMENT');
  }
  if (type === 'contact') {
    return t('CONVERSATION.PINNED_MESSAGES.CONTACT_ATTACHMENT');
  }
  return t('CONVERSATION.PINNED_MESSAGES.ATTACHMENT');
};

const snippetForMessage = message => {
  const content = stripHtml(message.content);
  if (content) return truncate(content);

  const [attachment] = message.attachments || [];
  if (!attachment) return t('CONVERSATION.PINNED_MESSAGES.ATTACHMENT');

  const fileName = attachmentName(attachment);
  if (fileName) return fileName;

  return attachmentLabelForType(attachmentType(attachment));
};

const senderNameForMessage = message => {
  return (
    message.sender?.name ||
    message.sender_name ||
    message.additional_attributes?.sender_name ||
    t('CONVERSATION.PINNED_MESSAGES.UNKNOWN_SENDER')
  );
};

const pinnedByNameForMessage = message => {
  return (
    message.pinned_by?.name ||
    message.pinnedBy?.name ||
    t('CONVERSATION.PINNED_MESSAGES.UNKNOWN_PINNER')
  );
};

const pinnedAtForMessage = message => {
  const pinnedAt = message.pinned_at || message.pinnedAt;
  if (!pinnedAt) return '';

  const numericPinnedAt = Number(pinnedAt);
  if (Number.isFinite(numericPinnedAt)) {
    return messageTimestamp(numericPinnedAt, 'LLL d, yyyy, h:mm a');
  }

  const pinnedAtDate = new Date(pinnedAt);
  if (Number.isNaN(pinnedAtDate.getTime())) return '';

  return format(pinnedAtDate, 'LLL d, yyyy, h:mm a');
};

const attributionForMessage = message => {
  return t('CONVERSATION.PINNED_MESSAGES.ATTRIBUTION', {
    name: pinnedByNameForMessage(message),
    time: pinnedAtForMessage(message),
  });
};

const removePinnedMessage = messageId => {
  pinnedMessages.value = pinnedMessages.value.filter(
    message => Number(message.id) !== Number(messageId)
  );
};

const upsertPinnedMessage = message => {
  const messageConversationId =
    message.conversation_id || message.conversationId;
  if (Number(messageConversationId) !== Number(props.conversationId)) return;

  if (!message.pinned) {
    removePinnedMessage(message.id);
    return;
  }

  const existingIndex = pinnedMessages.value.findIndex(
    pinnedMessage => Number(pinnedMessage.id) === Number(message.id)
  );

  if (existingIndex === -1) {
    pinnedMessages.value = [...pinnedMessages.value, message];
    return;
  }

  pinnedMessages.value.splice(existingIndex, 1, message);
};

const syncPinnedMessagesFromConversation = messages => {
  (messages || []).forEach(upsertPinnedMessage);
};

const normalizePinnedMessages = data => {
  if (Array.isArray(data)) return data;
  return data?.payload || [];
};

const fetchPinnedMessages = async () => {
  isLoading.value = true;
  try {
    const { data } = await MessageApi.getPinned(props.conversationId);
    pinnedMessages.value = normalizePinnedMessages(data);
    syncPinnedMessagesFromConversation(currentChat.value.messages);
  } finally {
    isLoading.value = false;
  }
};

const isMessageLoaded = messageId => {
  return (currentChat.value.messages || []).some(
    message => Number(message.id) === Number(messageId)
  );
};

const ensureMessageLoaded = async messageId => {
  if (isMessageLoaded(messageId)) return;

  const numericMessageId = Number(messageId);
  await store.dispatch('fetchPreviousMessages', {
    conversationId: props.conversationId,
    before: numericMessageId + 100,
    after: Math.max(numericMessageId - 100, 0),
  });
};

const jumpToMessage = async message => {
  await ensureMessageLoaded(message.id);
  await router.replace({
    query: {
      ...route.query,
      messageId: message.id,
    },
  });
  await nextTick();
  emitter.emit(BUS_EVENTS.SCROLL_TO_MESSAGE, { messageId: message.id });
};

const unpinMessage = async message => {
  await store.dispatch('togglePinMessage', {
    conversationId: props.conversationId,
    messageId: message.id,
    pinned: false,
  });
  removePinnedMessage(message.id);
};

watch(
  () => props.conversationId,
  () => {
    pinnedMessages.value = [];
    fetchPinnedMessages();
  }
);

watch(
  () => currentChat.value.messages,
  messages => syncPinnedMessagesFromConversation(messages),
  { deep: true }
);

onMounted(fetchPinnedMessages);
</script>

<template>
  <aside
    class="flex flex-col w-full max-w-full h-full border-l rtl:border-l-0 rtl:border-r border-n-weak bg-n-surface-1 sm:w-80"
    data-testid="pinned-messages-panel"
  >
    <header
      class="flex items-center justify-between gap-3 p-3 border-b border-n-weak"
    >
      <div class="min-w-0">
        <h2 class="text-sm font-medium truncate text-n-slate-12">
          {{ t('CONVERSATION.PINNED_MESSAGES.TITLE') }}
        </h2>
      </div>
      <ButtonV4
        v-tooltip="t('CONVERSATION.PINNED_MESSAGES.CLOSE')"
        :aria-label="t('CONVERSATION.PINNED_MESSAGES.CLOSE')"
        size="sm"
        variant="ghost"
        color="slate"
        icon="i-lucide-x"
        class="flex-shrink-0 rounded-md"
        @click="emit('close')"
      />
    </header>

    <div v-if="isLoading" class="p-4 text-sm text-n-slate-11">
      {{ t('CONVERSATION.PINNED_MESSAGES.LOADING') }}
    </div>

    <div
      v-else-if="!sortedPinnedMessages.length"
      class="flex flex-col items-center justify-center flex-1 gap-2 p-6 text-center"
      data-testid="pinned-messages-empty"
    >
      <span
        class="i-lucide-pin-off size-8 text-n-slate-10"
        aria-hidden="true"
      />
      <p class="text-sm font-medium text-n-slate-12">
        {{ t('CONVERSATION.PINNED_MESSAGES.EMPTY_TITLE') }}
      </p>
      <p class="text-sm text-n-slate-11">
        {{ t('CONVERSATION.PINNED_MESSAGES.EMPTY_DESCRIPTION') }}
      </p>
    </div>

    <ul v-else class="flex-1 min-h-0 overflow-y-auto divide-y divide-n-weak">
      <li
        v-for="message in sortedPinnedMessages"
        :key="message.id"
        class="flex flex-col gap-3 p-3"
        data-testid="pinned-message-row"
      >
        <div class="min-w-0">
          <p class="text-sm font-medium truncate text-n-slate-12">
            {{ senderNameForMessage(message) }}
          </p>
          <p class="mt-1 text-sm break-words text-n-slate-11">
            {{ snippetForMessage(message) }}
          </p>
          <p
            class="mt-2 text-xs text-n-slate-10"
            data-testid="pinned-message-attribution"
          >
            {{ attributionForMessage(message) }}
          </p>
        </div>

        <div class="flex items-center gap-2">
          <ButtonV4
            :label="t('CONVERSATION.PINNED_MESSAGES.JUMP_TO_MESSAGE')"
            size="xs"
            variant="outline"
            color="slate"
            data-testid="jump-to-pinned-message"
            @click="jumpToMessage(message)"
          />
          <ButtonV4
            :label="t('CONVERSATION.PINNED_MESSAGES.UNPIN')"
            size="xs"
            variant="ghost"
            color="ruby"
            data-testid="unpin-pinned-message"
            @click="unpinMessage(message)"
          />
        </div>
      </li>
    </ul>
  </aside>
</template>
