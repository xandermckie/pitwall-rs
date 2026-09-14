import { getCurrentWindow } from "@tauri-apps/api/window";
import { useCallback, useEffect, useRef, useState } from "react";

const FULLSCREEN_ERROR = "Fullscreen controls are unavailable. Please try again.";

export interface UseFullscreenResult {
  isFullscreen: boolean;
  isFullscreenPending: boolean;
  fullscreenError: string | null;
  toggleFullscreen: () => Promise<void>;
}

export function useFullscreen(): UseFullscreenResult {
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isFullscreenPending, setIsFullscreenPending] = useState(false);
  const [fullscreenError, setFullscreenError] = useState<string | null>(null);
  const isMountedRef = useRef(true);
  const isPendingRef = useRef(false);

  const updateState = useCallback((
    nextIsFullscreen: boolean,
    shouldClearError = true,
  ): void => {
    if (!isMountedRef.current) {
      return;
    }
    setIsFullscreen(nextIsFullscreen);
    if (shouldClearError) {
      setFullscreenError(null);
    }
  }, []);

  const reportFailure = useCallback((): void => {
    if (!isMountedRef.current) {
      return;
    }
    setFullscreenError(FULLSCREEN_ERROR);
  }, []);

  const syncFullscreen = useCallback(async (): Promise<void> => {
    try {
      updateState(await getCurrentWindow().isFullscreen());
    } catch {
      reportFailure();
    }
  }, [reportFailure, updateState]);

  const toggleFullscreen = useCallback(async (): Promise<void> => {
    if (isPendingRef.current) {
      return;
    }

    isPendingRef.current = true;
    if (isMountedRef.current) {
      setIsFullscreenPending(true);
    }

    try {
      const appWindow = getCurrentWindow();
      const currentIsFullscreen = await appWindow.isFullscreen();
      try {
        await appWindow.setFullscreen(!currentIsFullscreen);
      } catch {
        reportFailure();
        try {
          updateState(await appWindow.isFullscreen(), false);
        } catch {
          reportFailure();
        }
        return;
      }
      updateState(await appWindow.isFullscreen());
    } catch {
      reportFailure();
    } finally {
      isPendingRef.current = false;
      if (isMountedRef.current) {
        setIsFullscreenPending(false);
      }
    }
  }, [reportFailure, updateState]);

  useEffect(() => {
    isMountedRef.current = true;
    void syncFullscreen();

    const onWindowChange = (): void => {
      void syncFullscreen();
    };
    const onKeyDown = (event: KeyboardEvent): void => {
      if (event.key !== "F11") {
        return;
      }
      event.preventDefault();
      if (!event.repeat) {
        void toggleFullscreen();
      }
    };

    window.addEventListener("resize", onWindowChange);
    window.addEventListener("focus", onWindowChange);
    window.addEventListener("keydown", onKeyDown);

    return () => {
      isMountedRef.current = false;
      window.removeEventListener("resize", onWindowChange);
      window.removeEventListener("focus", onWindowChange);
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [syncFullscreen, toggleFullscreen]);

  return {
    isFullscreen,
    isFullscreenPending,
    fullscreenError,
    toggleFullscreen,
  };
}
