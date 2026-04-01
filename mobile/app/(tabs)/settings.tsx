import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Switch,
  Alert,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useAuth } from '../../contexts/AuthContext';
import { VOICES } from '../../constants/voices';
import AsyncStorage from '@react-native-async-storage/async-storage';

export default function SettingsScreen() {
  const router = useRouter();
  const { user, logout } = useAuth();
  const [selectedVoice, setSelectedVoice] = useState<string>('female-shaonv');
  const [isDarkMode, setIsDarkMode] = useState(true);

  const handleLogout = () => {
    Alert.alert(
      'Logout',
      'Are you sure you want to logout?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Logout',
          style: 'destructive',
          onPress: async () => {
            try {
              await logout();
              router.replace('/(auth)/login');
            } catch (error) {
              console.error('Logout failed:', error);
            }
          },
        },
      ]
    );
  };

  const handleVoiceSelect = async (voiceId: string) => {
    setSelectedVoice(voiceId);
    await AsyncStorage.setItem('selected_voice', voiceId);
  };

  const handleThemeToggle = async (value: boolean) => {
    setIsDarkMode(value);
    await AsyncStorage.setItem('dark_mode', JSON.stringify(value));
  };

  const selectedVoiceName =
    VOICES.find((v) => v.id === selectedVoice)?.name || 'Young Female';

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Account</Text>
        <View style={styles.card}>
          <View style={styles.row}>
            <Text style={styles.label}>Email</Text>
            <Text style={styles.value}>{user?.email || 'Not signed in'}</Text>
          </View>
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Voice Settings</Text>
        <View style={styles.card}>
          <Text style={styles.label}>TTS Voice</Text>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            style={styles.voiceList}
          >
            {VOICES.map((voice) => (
              <TouchableOpacity
                key={voice.id}
                style={[
                  styles.voiceChip,
                  selectedVoice === voice.id && styles.voiceChipSelected,
                ]}
                onPress={() => handleVoiceSelect(voice.id)}
              >
                <Text
                  style={[
                    styles.voiceChipText,
                    selectedVoice === voice.id && styles.voiceChipTextSelected,
                  ]}
                >
                  {voice.name}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
          <Text style={styles.selectedVoiceText}>
            Selected: {selectedVoiceName}
          </Text>
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Appearance</Text>
        <View style={styles.card}>
          <View style={styles.row}>
            <Text style={styles.label}>Dark Mode</Text>
            <Switch
              value={isDarkMode}
              onValueChange={handleThemeToggle}
              trackColor={{ false: '#2a3f5f', true: '#e94560' }}
              thumbColor="#ffffff"
            />
          </View>
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>About</Text>
        <View style={styles.card}>
          <View style={styles.row}>
            <Text style={styles.label}>App Version</Text>
            <Text style={styles.value}>1.0.0</Text>
          </View>
          <View style={[styles.row, styles.rowLast]}>
            <Text style={styles.label}>Build</Text>
            <Text style={styles.value}>2024.03.01</Text>
          </View>
        </View>
      </View>

      <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
        <Text style={styles.logoutText}>Logout</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#1a1a2e',
  },
  content: {
    paddingVertical: 16,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: '600',
    color: '#8892a0',
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginHorizontal: 16,
    marginBottom: 8,
  },
  card: {
    backgroundColor: '#16213e',
    marginHorizontal: 16,
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#2a3f5f',
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#2a3f5f',
  },
  rowLast: {
    borderBottomWidth: 0,
  },
  label: {
    fontSize: 16,
    color: '#ffffff',
  },
  value: {
    fontSize: 16,
    color: '#8892a0',
  },
  voiceList: {
    marginTop: 12,
    marginBottom: 8,
  },
  voiceChip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#2a3f5f',
    marginRight: 8,
  },
  voiceChipSelected: {
    backgroundColor: '#e94560',
  },
  voiceChipText: {
    fontSize: 14,
    color: '#8892a0',
  },
  voiceChipTextSelected: {
    color: '#ffffff',
    fontWeight: '600',
  },
  selectedVoiceText: {
    fontSize: 14,
    color: '#8892a0',
    marginTop: 8,
  },
  logoutButton: {
    backgroundColor: 'rgba(233, 69, 96, 0.1)',
    marginHorizontal: 16,
    marginTop: 16,
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#e94560',
  },
  logoutText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#e94560',
  },
});
