import React, { useEffect, useRef, useCallback } from 'react';
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useChatStore, Message } from '../../stores/chat-store';
import { MessageBubble } from '../../components/chat/MessageBubble';
import { ChatInput } from '../../components/chat/ChatInput';
import { useStreamingChat } from '../../hooks/useStreamingChat';

export default function ChatScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const chatId = id || '';
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const flatListRef = useRef<FlatList>(null);

  const {
    conversations,
    streamingText,
    isTyping,
    updateConversationTitle,
  } = useChatStore();

  const conversation = chatId ? conversations[chatId] : undefined;
  const messages = conversation?.messages || [];

  const { sendMessage, isLoading } = useStreamingChat(chatId);

  useEffect(() => {
    if (conversation && conversation.messages.length === 1 && !conversation.title) {
      const firstMessage = conversation.messages[0].content;
      const title = firstMessage.slice(0, 30) + (firstMessage.length > 30 ? '...' : '');
      updateConversationTitle(chatId, title);
    }
  }, [conversation?.messages.length, chatId]);

  const handleSend = useCallback(
    async (content: string, attachments: { type: 'image'; url: string }[]) => {
      await sendMessage(content, attachments);
      setTimeout(() => {
        flatListRef.current?.scrollToEnd({ animated: true });
      }, 100);
    },
    [sendMessage]
  );

  const renderMessage = ({ item }: { item: Message }) => (
    <MessageBubble message={item} />
  );

  const renderEmpty = () => (
    <View style={styles.emptyContainer}>
      <Text style={styles.emptyIcon}>🤖</Text>
      <Text style={styles.emptyTitle}>Start a Conversation</Text>
      <Text style={styles.emptySubtitle}>
        Send a message to begin chatting with MiniChat
      </Text>
    </View>
  );

  if (!conversation) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <Text style={styles.backIcon}>←</Text>
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Chat</Text>
        </View>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#e94560" />
        </View>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={0}
    >
      <View style={[styles.header, { paddingTop: insets.top }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Text style={styles.backIcon}>←</Text>
        </TouchableOpacity>
        <View style={styles.headerContent}>
          <Text style={styles.headerTitle} numberOfLines={1}>
            {conversation.title || 'New Chat'}
          </Text>
          {isTyping && (
            <View style={styles.typingIndicator}>
              <ActivityIndicator size="small" color="#e94560" />
              <Text style={styles.typingText}> MiniChat is typing...</Text>
            </View>
          )}
        </View>
      </View>

      <FlatList
        ref={flatListRef}
        data={messages}
        renderItem={renderMessage}
        keyExtractor={(item) => item.id}
        contentContainerStyle={[
          styles.messageList,
          messages.length === 0 && styles.messageListEmpty,
        ]}
        ListEmptyComponent={renderEmpty}
        inverted={false}
        showsVerticalScrollIndicator={false}
        onContentSizeChange={() => flatListRef.current?.scrollToEnd({ animated: false })}
      />

      {streamingText && (
        <View style={styles.streamingContainer}>
          <Text style={styles.streamingLabel}>Streaming...</Text>
        </View>
      )}

      <View style={[styles.inputContainer, { paddingBottom: insets.bottom }]}>
        <ChatInput onSend={handleSend} isLoading={isLoading} />
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#1a1a2e',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#16213e',
    paddingHorizontal: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#2a3f5f',
  },
  backButton: {
    padding: 8,
    marginRight: 8,
  },
  backIcon: {
    fontSize: 24,
    color: '#ffffff',
  },
  headerContent: {
    flex: 1,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#ffffff',
  },
  typingIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 2,
  },
  typingText: {
    fontSize: 12,
    color: '#e94560',
    marginLeft: 4,
  },
  messageList: {
    paddingHorizontal: 16,
    paddingVertical: 16,
  },
  messageListEmpty: {
    flex: 1,
    justifyContent: 'center',
  },
  emptyContainer: {
    alignItems: 'center',
    paddingHorizontal: 32,
  },
  emptyIcon: {
    fontSize: 64,
    marginBottom: 16,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#ffffff',
    marginBottom: 8,
  },
  emptySubtitle: {
    fontSize: 14,
    color: '#8892a0',
    textAlign: 'center',
  },
  streamingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 4,
    backgroundColor: 'rgba(233, 69, 96, 0.1)',
  },
  streamingLabel: {
    fontSize: 12,
    color: '#e94560',
  },
  inputContainer: {
    backgroundColor: '#16213e',
    borderTopWidth: 1,
    borderTopColor: '#2a3f5f',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
});
