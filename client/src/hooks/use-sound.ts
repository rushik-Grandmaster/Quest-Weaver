import { useCallback } from "react";

export function useSound() {
  const playSound = useCallback((type: "task" | "gold") => {
    const audio = new Audio(
      type === "task" ? "/sounds/task-complete.mp3" : "/sounds/gold-collect.mp3"
    );
    audio.play().catch((err) => console.error("Error playing sound:", err));
  }, []);

  return { playSound };
}
