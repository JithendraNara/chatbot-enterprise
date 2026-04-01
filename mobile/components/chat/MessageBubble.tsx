import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Image,
  TouchableOpacity,
  Modal,
  Pressable,
  Platform,
} from 'react-native';
import Markdown from 'react-native-markdown-display';
import { Message } from '../../stores/chat-store';
import { ToolCallCard } from './ToolCallCard';

interface Props {
  message: Message;
}

const userMarkdownStyle = {
  body: { color: '#ffffff', fontSize: 16, lineHeight: 22 },
  paragraph: { marginTop: 0, marginBottom: 0 },
};

const assistantMarkdownStyle = {
  body: { color: '#ffffff', fontSize: 16, lineHeight: 22 },
  paragraph: { marginTop: 0, marginBottom: 0 },
  code_inline: {
    backgroundColor: '#2a3f5f',
    color: '#e94560',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
  },
  code_block: {
    backgroundColor: '#2a3f5f',
    padding: 12,
    borderRadius: 8,
    marginTop: 8,
    marginBottom: 8,
  },
  fence: {
    backgroundColor: '#2a3f5f',
    padding: 12,
    borderRadius: 8,
    marginTop: 8,
    marginBottom: 8,
  },
  pre: {
    backgroundColor: '#2a3f5f',
    padding: 12,
    borderRadius: 8,
    marginTop: 8,
    marginBottom: 8,
  },
};

export function MessageBubble({ message }: Props) {
  const [imageModalVisible, setImageModalVisible] = useState(false);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const isUser = message.role === 'user';

  const formatTime = (timestamp: number) => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const handleImagePress = (url: string) => {
    setSelectedImage(url);
    setImageModalVisible(true);
  };

  return (
    <View style={[styles.container, isUser ? styles.userContainer : styles.assistantContainer]}>
      <View style={[styles.bubble, isUser ? styles.userBubble : styles.assistantBubble]}>
        {message.toolCall && (
          <ToolCallCard toolCall={message.toolCall} />
        )}

        {message.content && (
          <Markdown
            style={isUser ? userMarkdownStyle : assistantMarkdownStyle}
          >
            {message.content}
          </Markdown>
        )}

        {message.attachments && message.attachments.length > 0 && (
          <View style={styles.attachmentsContainer}>
            {message.attachments.map((attachment, index) => {
              if (attachment.type === 'image') {
                return (
                  <TouchableOpacity
                    key={index}
                    onPress={() => handleImagePress(attachment.url)}
                    activeOpacity={0.8}
                  >
                    <Image
                      source={{ uri: attachment.url }}
                      style={styles.attachmentImage}
                      resizeMode="cover"
                    />
                  </TouchableOpacity>
                );
              }
              return null;
            })}
          </View>
        )}

        <Text style={[styles.timestamp, isUser ? styles.userTimestamp : styles.assistantTimestamp]}>
          {formatTime(message.timestamp)}
        </Text>
      </View>

      <Modal
        visible={imageModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setImageModalVisible(false)}
      >
        <Pressable
          style={styles.modalOverlay}
          onPress={() => setImageModalVisible(false)}
        >
          <TouchableOpacity
            style={styles.modalClose}
            onPress={() => setImageModalVisible(false)}
          >
            <Text style={styles.modalCloseText}>✕</Text>
          </TouchableOpacity>
          {selectedImage && (
            <Image
              source={{ uri: selectedImage }}
              style={styles.modalImage}
              resizeMode="contain"
            />
          )}
        </Pressable>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginVertical: 8,
    maxWidth: '80%',
  },
  userContainer: {
    alignSelf: 'flex-end',
  },
  assistantContainer: {
    alignSelf: 'flex-start',
  },
  bubble: {
    padding: 12,
    borderRadius: 16,
  },
  userBubble: {
    backgroundColor: '#e94560',
    borderBottomRightRadius: 4,
  },
  assistantBubble: {
    backgroundColor: '#16213e',
    borderBottomLeftRadius: 4,
    borderWidth: 1,
    borderColor: '#2a3f5f',
  },
  timestamp: {
    fontSize: 10,
    marginTop: 6,
  },
  userTimestamp: {
    color: 'rgba(255, 255, 255, 0.7)',
    textAlign: 'right',
  },
  assistantTimestamp: {
    color: '#8892a0',
  },
  attachmentsContainer: {
    marginTop: 8,
    gap: 8,
  },
  attachmentImage: {
    width: 200,
    height: 150,
    borderRadius: 8,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.9)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalClose: {
    position: 'absolute',
    top: 60,
    right: 20,
    padding: 8,
    zIndex: 10,
  },
  modalCloseText: {
    fontSize: 24,
    color: '#ffffff',
  },
  modalImage: {
    width: '90%',
    height: '70%',
  },
});
