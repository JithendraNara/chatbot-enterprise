import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Animated } from 'react-native';
import Markdown from 'react-native-markdown-display';

interface Props {
  text: string;
}

export function StreamingText({ text }: Props) {
  const cursorOpacity = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    const animation = Animated.loop(
      Animated.sequence([
        Animated.timing(cursorOpacity, {
          toValue: 0,
          duration: 500,
          useNativeDriver: true,
        }),
        Animated.timing(cursorOpacity, {
          toValue: 1,
          duration: 500,
          useNativeDriver: true,
        }),
      ])
    );

    animation.start();

    return () => animation.stop();
  }, [cursorOpacity]);

  return (
    <View style={styles.container}>
      <Markdown style={markdownStyles}>{text}</Markdown>
      <Animated.View style={[styles.cursor, { opacity: cursorOpacity }]}>
        <Text style={styles.cursorText}>▋</Text>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    flexWrap: 'wrap',
  },
  cursor: {
    marginLeft: 2,
  },
  cursorText: {
    color: '#e94560',
    fontSize: 16,
    lineHeight: 22,
  },
});

const markdownStyles = StyleSheet.create({
  body: {
    color: '#ffffff',
    fontSize: 16,
    lineHeight: 22,
  },
  paragraph: {
    marginTop: 0,
    marginBottom: 0,
  },
  code_inline: {
    backgroundColor: '#2a3f5f',
    color: '#e94560',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    fontFamily: 'monospace',
  },
  code_block: {
    backgroundColor: '#2a3f5f',
    padding: 12,
    borderRadius: 8,
  },
  fence: {
    backgroundColor: '#2a3f5f',
    padding: 12,
    borderRadius: 8,
  },
  pre: {
    backgroundColor: '#2a3f5f',
    padding: 12,
    borderRadius: 8,
  },
});
