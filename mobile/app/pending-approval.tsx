import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { useAuth } from '../contexts/AuthContext';

export default function PendingApprovalScreen() {
  const { status, logout } = useAuth();

  return (
    <View style={styles.container}>
      <View style={styles.card}>
        <Text style={styles.title}>
          {status === 'suspended' ? 'Account Suspended' : 'Waiting For Approval'}
        </Text>
        <Text style={styles.body}>
          {status === 'suspended'
            ? 'Your account has been suspended. Contact an administrator if you believe this is a mistake.'
            : 'Your account was created, but an administrator still needs to approve access before you can use MiniChat.'}
        </Text>

        <TouchableOpacity style={styles.button} onPress={() => void logout()}>
          <Text style={styles.buttonText}>Sign Out</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#1a1a2e',
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  card: {
    backgroundColor: '#16213e',
    borderRadius: 18,
    padding: 24,
    borderWidth: 1,
    borderColor: '#2a3f5f',
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: '#ffffff',
    marginBottom: 12,
    textAlign: 'center',
  },
  body: {
    fontSize: 15,
    lineHeight: 24,
    color: '#8892a0',
    textAlign: 'center',
    marginBottom: 24,
  },
  button: {
    backgroundColor: '#e94560',
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
  },
  buttonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
  },
});
