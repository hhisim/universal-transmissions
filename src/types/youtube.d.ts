/* eslint-disable no-var */
declare var YT: {
  Player: new (
    element: HTMLDivElement | string,
    opts: {
      playerVars?: Record<string, unknown>;
      events?: {
        onReady?: (event: { target: YT.PlayerInstance }) => void;
        onStateChange?: (event: { data: number }) => void;
      };
    }
  ) => YT.PlayerInstance;
  PlayerState: {
    BUFFERING: number;
    CUED: number;
    ENDED: number;
    PAUSED: number;
    PLAYING: number;
    UNSTARTED: number;
  };
};

declare namespace YT {
  interface PlayerInstance {
    playVideo(): void;
    nextVideo(): void;
    destroy(): void;
    getVideoData(): { title?: string; video_id?: string } | null;
  }
}
