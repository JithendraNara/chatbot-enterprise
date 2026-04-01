import { useCallback } from 'react';
import * as ImagePicker from 'expo-image-picker';
import * as Speech from 'expo-speech';
import * as LocalAuthentication from 'expo-local-authentication';
import * as Haptics from 'expo-haptics';

export function useNativeCapabilities() {
  const pickImage = useCallback(async (): Promise<string | null> => {
    const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();

    if (!permissionResult.granted) {
      return null;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      quality: 0.8,
    });

    if (result.canceled || !result.assets[0]) {
      return null;
    }

    return result.assets[0].uri;
  }, []);

  const speakText = useCallback(
    async (text: string, voiceId?: string) => {
      const options: Speech.SpeechOptions = {
        voice: voiceId || 'female-shaonv',
        rate: 0.9,
        pitch: 1.0,
      };

      await Speech.speak(text, options);
    },
    []
  );

  const stopSpeaking = useCallback(async () => {
    await Speech.stop();
  }, []);

  const isSpeaking = useCallback(async (): Promise<boolean> => {
    return await Speech.isSpeakingAsync();
  }, []);

  const authenticate = useCallback(
    async (promptMessage?: string): Promise<boolean> => {
      const hasHardware = await LocalAuthentication.hasHardwareAsync();
      if (!hasHardware) {
        return false;
      }

      const isEnrolled = await LocalAuthentication.isEnrolledAsync();
      if (!isEnrolled) {
        return false;
      }

      const result = await LocalAuthentication.authenticateAsync({
        promptMessage: promptMessage || 'Authenticate to access MiniChat',
        fallbackLabel: 'Use passcode',
      });

      return result.success;
    },
    []
  );

  const triggerHaptic = useCallback(
    async (type: 'light' | 'medium' | 'heavy' | 'success' | 'warning' | 'error' = 'light') => {
      switch (type) {
        case 'light':
          await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
          break;
        case 'medium':
          await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
          break;
        case 'heavy':
          await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
          break;
        case 'success':
          await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
          break;
        case 'warning':
          await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
          break;
        case 'error':
          await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
          break;
      }
    },
    []
  );

  return {
    pickImage,
    speakText,
    stopSpeaking,
    isSpeaking,
    authenticate,
    triggerHaptic,
  };
}
