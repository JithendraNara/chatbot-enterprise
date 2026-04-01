import React, { useState, useRef, useCallback } from 'react';
import {
  View,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Image,
  Keyboard,
  Platform,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import * as Haptics from 'expo-haptics';

interface Attachment {
  type: 'image';
  url: string;
}

interface Props {
  onSend: (content: string, attachments: Attachment[]) => void;
  isLoading?: boolean;
}

export function ChatInput({ onSend, isLoading = false }: Props) {
  const [text, setText] = useState('');
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const inputRef = useRef<TextInput>(null);

  const handleAttachment = async () => {
    const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();

    if (!permissionResult.granted) {
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      quality: 0.8,
    });

    if (!result.canceled && result.assets[0]) {
      setAttachments((prev) => [
        ...prev,
        { type: 'image', url: result.assets[0].uri },
      ]);
    }
  };

  const handleRemoveAttachment = (index: number) => {
    setAttachments((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSend = useCallback(() => {
    if (isLoading) return;

    const trimmedText = text.trim();
    if (!trimmedText && attachments.length === 0) return;

    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

    onSend(trimmedText, attachments);
    setText('');
    setAttachments([]);

    Keyboard.dismiss();
  }, [text, attachments, isLoading, onSend]);

  const canSend = (text.trim().length > 0 || attachments.length > 0) && !isLoading;

  return (
    <View style={styles.container}>
      {attachments.length > 0 && (
        <View style={styles.attachmentsPreview}>
          {attachments.map((attachment, index) => (
            <View key={index} style={styles.attachmentItem}>
              <Image
                source={{ uri: attachment.url }}
                style={styles.attachmentThumbnail}
              />
              <TouchableOpacity
                style={styles.removeButton}
                onPress={() => handleRemoveAttachment(index)}
              >
                <View style={styles.removeIcon}>
                  <View style={styles.removeLine} />
                </View>
              </TouchableOpacity>
            </View>
          ))}
        </View>
      )}

      <View style={styles.inputRow}>
        <TouchableOpacity
          style={styles.attachButton}
          onPress={handleAttachment}
          disabled={isLoading}
        >
          <View style={styles.attachIcon}>
            <View style={styles.paperclip} />
          </View>
        </TouchableOpacity>

        <TextInput
          ref={inputRef}
          style={styles.input}
          value={text}
          onChangeText={setText}
          placeholder="Type a message..."
          placeholderTextColor="#8892a0"
          multiline
          maxLength={4000}
          editable={!isLoading}
          onSubmitEditing={handleSend}
          blurOnSubmit={false}
        />

        <TouchableOpacity
          style={[styles.sendButton, canSend && styles.sendButtonActive]}
          onPress={handleSend}
          disabled={!canSend}
        >
          <View
            style={[
              styles.sendIcon,
              canSend && styles.sendIconActive,
            ]}
          >
            <View style={styles.arrow} />
          </View>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 12,
  },
  attachmentsPreview: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 8,
  },
  attachmentItem: {
    position: 'relative',
  },
  attachmentThumbnail: {
    width: 60,
    height: 60,
    borderRadius: 8,
  },
  removeButton: {
    position: 'absolute',
    top: -6,
    right: -6,
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: '#e94560',
    justifyContent: 'center',
    alignItems: 'center',
  },
  removeIcon: {
    width: 10,
    height: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  removeLine: {
    width: 10,
    height: 2,
    backgroundColor: '#ffffff',
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    backgroundColor: '#2a3f5f',
    borderRadius: 24,
    paddingHorizontal: 8,
    paddingVertical: 4,
    minHeight: 48,
  },
  attachButton: {
    padding: 8,
  },
  attachIcon: {
    width: 24,
    height: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
  paperclip: {
    width: 12,
    height: 20,
    borderWidth: 2,
    borderColor: '#8892a0',
    borderRadius: 4,
  },
  input: {
    flex: 1,
    fontSize: 16,
    color: '#ffffff',
    paddingHorizontal: 8,
    paddingVertical: 8,
    maxHeight: 120,
  },
  sendButton: {
    padding: 8,
  },
  sendButtonActive: {
    opacity: 1,
  },
  sendIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#3a4f6f',
    justifyContent: 'center',
    alignItems: 'center',
  },
  sendIconActive: {
    backgroundColor: '#e94560',
  },
  arrow: {
    width: 0,
    height: 0,
    borderLeftWidth: 8,
    borderTopWidth: 5,
    borderBottomWidth: 5,
    borderLeftColor: '#8892a0',
    borderTopColor: 'transparent',
    borderBottomColor: 'transparent',
    marginLeft: 2,
  },
});
