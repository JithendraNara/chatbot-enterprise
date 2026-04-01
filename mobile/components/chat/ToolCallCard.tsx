import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator } from 'react-native';

interface ToolCall {
  name: string;
  input: Record<string, unknown>;
}

interface Props {
  toolCall: ToolCall;
  isLoading?: boolean;
}

export function ToolCallCard({ toolCall, isLoading = false }: Props) {
  const [isExpanded, setIsExpanded] = useState(false);

  const getToolPlaceholder = (toolName: string): string => {
    switch (toolName) {
      case 'web_search':
        return 'Searching the web...';
      case 'understand_image':
        return 'Analyzing image...';
      case 'generate_image':
        return 'Generating image...';
      default:
        return `Running ${toolName}...`;
    }
  };

  const formatInput = (input: Record<string, unknown>): string => {
    return JSON.stringify(input, null, 2);
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View style={styles.toolBadge}>
          <Text style={styles.toolIcon}>🔧</Text>
          <Text style={styles.toolName}>{toolCall.name}</Text>
        </View>
        {isLoading ? (
          <ActivityIndicator size="small" color="#e94560" />
        ) : (
          <TouchableOpacity onPress={() => setIsExpanded(!isExpanded)}>
            <Text style={styles.expandIcon}>{isExpanded ? '▼' : '▶'}</Text>
          </TouchableOpacity>
        )}
      </View>

      <Text style={styles.placeholder}>{getToolPlaceholder(toolCall.name)}</Text>

      {isExpanded && (
        <View style={styles.inputContainer}>
          <Text style={styles.inputLabel}>Parameters:</Text>
          <View style={styles.codeBlock}>
            <Text style={styles.codeText}>{formatInput(toolCall.input)}</Text>
          </View>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#2a3f5f',
    borderRadius: 8,
    padding: 12,
    marginBottom: 8,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  toolBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#16213e',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  toolIcon: {
    fontSize: 12,
    marginRight: 4,
  },
  toolName: {
    fontSize: 12,
    fontWeight: '600',
    color: '#e94560',
    fontFamily: 'monospace',
  },
  expandIcon: {
    fontSize: 12,
    color: '#8892a0',
  },
  placeholder: {
    fontSize: 14,
    color: '#8892a0',
    fontStyle: 'italic',
  },
  inputContainer: {
    marginTop: 12,
  },
  inputLabel: {
    fontSize: 12,
    color: '#8892a0',
    marginBottom: 4,
  },
  codeBlock: {
    backgroundColor: '#16213e',
    borderRadius: 4,
    padding: 8,
  },
  codeText: {
    fontSize: 12,
    color: '#ffffff',
    fontFamily: 'monospace',
  },
});
