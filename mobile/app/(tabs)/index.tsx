import React, { useCallback, useEffect, useState } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  RefreshControl,
  Alert,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useAuth } from '../../contexts/AuthContext';
import { useChatStore, Conversation } from '../../stores/chat-store';
import {
  createConversation as apiCreateConversation,
  deleteConversation as apiDeleteConversation,
  getConversations,
} from '../../lib/api';

export default function ChatListScreen() {
  const router = useRouter();
  const { token } = useAuth();
  const { conversations, deleteConversation } = useChatStore();
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  const loadConversations = useCallback(async () => {
    if (!token) return;

    try {
      const data = await getConversations(token);
      // Update store with fetched conversations
      const store = useChatStore.getState();
      data.forEach((conv: Conversation) => {
        store.addConversation(conv);
      });
    } catch (error) {
      console.error('Failed to load conversations:', error);
    } finally {
      setIsLoading(false);
    }
  }, [token]);

  useEffect(() => {
    loadConversations();
  }, [loadConversations]);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await loadConversations();
    setIsRefreshing(false);
  };

  const handleCreateConversation = () => {
    if (!token) return;

    void (async () => {
      try {
        const newConversation = await apiCreateConversation(token);
        useChatStore.getState().addConversation(newConversation);
        router.push(`/chat/${newConversation.id}`);
      } catch (error) {
        console.error('Failed to create conversation:', error);
      }
    })();
  };

  const handleDeleteConversation = (id: string) => {
    Alert.alert(
      'Delete Conversation',
      'Are you sure you want to delete this conversation?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              if (token) {
                await apiDeleteConversation(token, id);
              }
              deleteConversation(id);
            } catch (error) {
              console.error('Failed to delete conversation:', error);
            }
          },
        },
      ]
    );
  };

  const conversationList = Object.values(conversations).sort(
    (a, b) => b.updatedAt - a.updatedAt
  );

  const renderItem = ({ item }: { item: Conversation }) => {
    const lastMessage = item.messages[item.messages.length - 1];
    const preview = lastMessage?.content?.slice(0, 50) || 'No messages yet';
    const timeAgo = lastMessage
      ? new Date(lastMessage.timestamp).toLocaleDateString()
      : '';

    return (
      <TouchableOpacity
        style={styles.conversationItem}
        onPress={() => router.push(`/chat/${item.id}`)}
        onLongPress={() => handleDeleteConversation(item.id)}
      >
        <View style={styles.conversationContent}>
          <Text style={styles.conversationTitle} numberOfLines={1}>
            {item.title || 'New Chat'}
          </Text>
          <Text style={styles.conversationPreview} numberOfLines={1}>
            {preview}
          </Text>
        </View>
        <Text style={styles.conversationTime}>{timeAgo}</Text>
      </TouchableOpacity>
    );
  };

  const renderEmpty = () => (
    <View style={styles.emptyContainer}>
      <Text style={styles.emptyIcon}>💬</Text>
      <Text style={styles.emptyTitle}>No Conversations Yet</Text>
      <Text style={styles.emptySubtitle}>
        Tap the + button to start chatting with MiniChat
      </Text>
    </View>
  );

  return (
    <View style={styles.container}>
      <FlatList
        data={conversationList}
        renderItem={renderItem}
        keyExtractor={(item) => item.id}
        contentContainerStyle={[
          styles.listContent,
          conversationList.length === 0 && styles.listContentEmpty,
        ]}
        ListEmptyComponent={renderEmpty}
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={handleRefresh}
            tintColor="#e94560"
            colors={['#e94560']}
          />
        }
        showsVerticalScrollIndicator={false}
      />

      <TouchableOpacity
        style={styles.fab}
        onPress={handleCreateConversation}
        activeOpacity={0.8}
      >
        <Text style={styles.fabIcon}>+</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#1a1a2e',
  },
  listContent: {
    paddingVertical: 8,
  },
  listContentEmpty: {
    flex: 1,
  },
  conversationItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#16213e',
    marginHorizontal: 16,
    marginVertical: 4,
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#2a3f5f',
  },
  conversationContent: {
    flex: 1,
    marginRight: 12,
  },
  conversationTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#ffffff',
    marginBottom: 4,
  },
  conversationPreview: {
    fontSize: 14,
    color: '#8892a0',
  },
  conversationTime: {
    fontSize: 12,
    color: '#8892a0',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
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
  fab: {
    position: 'absolute',
    bottom: 24,
    right: 24,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#e94560',
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 4,
    shadowColor: '#e94560',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
  },
  fabIcon: {
    fontSize: 28,
    color: '#ffffff',
    fontWeight: '300',
  },
});
