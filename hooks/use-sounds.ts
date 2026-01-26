import { useEffect, useRef, useCallback } from "react";
import { useAudioPlayer, setAudioModeAsync } from "expo-audio";
import { Platform } from "react-native";

// Sound file paths
const SOUNDS = {
  correct: require("@/assets/sounds/correct.mp3"),
  incorrect: require("@/assets/sounds/incorrect.mp3"),
  celebration: require("@/assets/sounds/celebration.mp3"),
};

type SoundType = keyof typeof SOUNDS;

interface UseSoundsOptions {
  enabled?: boolean;
}

export function useSounds(options: UseSoundsOptions = {}) {
  const { enabled = true } = options;
  const isInitialized = useRef(false);

  // Create audio players for each sound
  const correctPlayer = useAudioPlayer(SOUNDS.correct);
  const incorrectPlayer = useAudioPlayer(SOUNDS.incorrect);
  const celebrationPlayer = useAudioPlayer(SOUNDS.celebration);

  // Initialize audio mode for iOS
  useEffect(() => {
    if (!isInitialized.current && Platform.OS !== "web") {
      setAudioModeAsync({ playsInSilentMode: true })
        .then(() => {
          isInitialized.current = true;
        })
        .catch(console.error);
    }
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      correctPlayer.release();
      incorrectPlayer.release();
      celebrationPlayer.release();
    };
  }, []);

  const playSound = useCallback(
    async (sound: SoundType) => {
      if (!enabled) return;
      
      try {
        const player = 
          sound === "correct" ? correctPlayer :
          sound === "incorrect" ? incorrectPlayer :
          celebrationPlayer;

        // Seek to beginning and play
        await player.seekTo(0);
        player.play();
      } catch (error) {
        console.error(`Failed to play ${sound} sound:`, error);
      }
    },
    [enabled, correctPlayer, incorrectPlayer, celebrationPlayer]
  );

  const playCorrect = useCallback(() => playSound("correct"), [playSound]);
  const playIncorrect = useCallback(() => playSound("incorrect"), [playSound]);
  const playCelebration = useCallback(() => playSound("celebration"), [playSound]);

  return {
    playSound,
    playCorrect,
    playIncorrect,
    playCelebration,
  };
}
