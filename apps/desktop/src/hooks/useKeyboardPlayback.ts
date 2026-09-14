import { useEffect } from "react";

interface UseKeyboardPlaybackArgs {
  enabled: boolean;
  onTogglePause: () => void;
  onScrub: (delta: number) => void;
}

export function useKeyboardPlayback({
  enabled,
  onTogglePause,
  onScrub,
}: UseKeyboardPlaybackArgs): void {
  useEffect(() => {
    if (!enabled) {
      return undefined;
    }

    const onKey = (event: KeyboardEvent): void => {
      const target = event.target;
      if (
        target instanceof HTMLButtonElement ||
        target instanceof HTMLInputElement ||
        target instanceof HTMLSelectElement ||
        target instanceof HTMLTextAreaElement
      ) {
        return;
      }
      if (event.key === " ") {
        event.preventDefault();
        onTogglePause();
      } else if (event.key === "ArrowRight") {
        event.preventDefault();
        onScrub(1);
      } else if (event.key === "ArrowLeft") {
        event.preventDefault();
        onScrub(-1);
      }
    };

    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("keydown", onKey);
    };
  }, [enabled, onTogglePause, onScrub]);
}
