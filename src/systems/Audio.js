import { Config } from '../config.js';

export const AudioSystem = {
  bgmTrack: null,
  currentTrackIndex: 0,
  active: false,
  muted: false,

  init: () => {
    if (AudioSystem.active) return;
    AudioSystem.active = true;
    AudioSystem.playNextBGM();
  },

  playNextBGM: () => {
    if (!Config.audio.bgm || Config.audio.bgm.length === 0) return;

    if (AudioSystem.bgmTrack) {
      AudioSystem.bgmTrack.pause();
      AudioSystem.bgmTrack = null;
    }

    const src = Config.audio.bgm[AudioSystem.currentTrackIndex];
    if (!src) return;

    AudioSystem.bgmTrack = new Audio(src);
    AudioSystem.bgmTrack.volume = 0.3;

    if (AudioSystem.muted) AudioSystem.bgmTrack.muted = true;

    AudioSystem.bgmTrack
      .play()
      .catch((e) => console.log("Waiting for interaction..."));

    AudioSystem.bgmTrack.addEventListener("ended", () => {
      AudioSystem.currentTrackIndex =
        (AudioSystem.currentTrackIndex + 1) % Config.audio.bgm.length;
      AudioSystem.playNextBGM();
    });
  },

  toggleBGM: () => {
    AudioSystem.muted = !AudioSystem.muted;
    if (AudioSystem.bgmTrack) {
      AudioSystem.bgmTrack.muted = AudioSystem.muted;
    }

    const btn = document.getElementById("btn-bgm-toggle");
    if (btn)
      btn.innerText = AudioSystem.muted ? "UNMUTE BGM" : "MUTE BGM";
  },

  playSFX: (key) => {
    if (!Config.audio.sfx[key]) return;
    const sfx = new Audio(Config.audio.sfx[key]);
    sfx.volume = 0.5;
    sfx.play().catch((e) => {});
  },
};