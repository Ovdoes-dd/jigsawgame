// 与之前全局 Phaser 版一致（如你已经有可用版本，可不覆盖）
export class SoundManager {
  static _scene = null;
  static _settingsKey = 'puzzle_audio_settings_v1';
  static _settings = { bgm: 0.6, sfx: 0.8, muted: false };
  static _currentBGM = null;
  static _currentBGMKey = null;
  static _sfxChannel = null;
  static _sfxTimer = null;
  static _exclusiveSFX = false;
  static _exclusiveSFXCallback = null;
  static _unlocked = false;

  static init(scene) {
    SoundManager._scene = scene;
    SoundManager._loadSettings();
    SoundManager._unlockIfNeeded(scene);
    if (SoundManager._currentBGM && SoundManager._currentBGM.isPlaying) {
      SoundManager._currentBGM.setVolume(SoundManager._effectiveBGMVolume());
    }
  }
  static _unlockIfNeeded(scene) {
    if (SoundManager._unlocked) return;
    const ctx = scene.sound?.context;
    if (!ctx) return;
    if (ctx.state === 'running') { SoundManager._unlocked = true; return; }
    const resume = () => {
      if (ctx.state === 'suspended') ctx.resume().catch(()=>{});
      if (ctx.state === 'running') {
        SoundManager._unlocked = true;
        window.removeEventListener('pointerdown', resume);
        window.removeEventListener('touchend', resume);
        window.removeEventListener('keydown', resume);
      }
    };
    window.addEventListener('pointerdown', resume);
    window.addEventListener('touchend', resume);
    window.addEventListener('keydown', resume);
  }
  static _loadSettings() {
    try {
      const raw = localStorage.getItem(SoundManager._settingsKey);
      if (!raw) return;
      const o = JSON.parse(raw);
      if (typeof o.bgm === 'number') SoundManager._settings.bgm = Phaser.Math.Clamp(o.bgm, 0, 1);
      if (typeof o.sfx === 'number') SoundManager._settings.sfx = Phaser.Math.Clamp(o.sfx, 0, 1);
      if (typeof o.muted === 'boolean') SoundManager._settings.muted = o.muted;
    } catch {}
  }
  static _saveSettings() {
    try { localStorage.setItem(SoundManager._settingsKey, JSON.stringify(SoundManager._settings)); } catch {}
  }
  static _effectiveBGMVolume() { return SoundManager._settings.muted ? 0 : SoundManager._settings.bgm; }
  static _effectiveSFXVolume() { return SoundManager._settings.muted ? 0 : SoundManager._settings.sfx; }

  static playBGM(key, cfg = {}) {
    if (!SoundManager._scene) return;
    if (SoundManager._exclusiveSFX) return;
    const s = SoundManager._scene;
    if (SoundManager._currentBGM && SoundManager._currentBGMKey === key && SoundManager._currentBGM.isPlaying) {
      SoundManager._currentBGM.setVolume(SoundManager._effectiveBGMVolume());
      return;
    }
    SoundManager.stopBGM();
    if (!s.sound.get(key)) {
      try { const tmp = s.sound.add(key); tmp.destroy(); } catch { console.warn('[SoundManager] BGM not loaded:', key); return; }
    }
    const bgm = s.sound.add(key, {
      loop: true,
      volume: SoundManager._effectiveBGMVolume(),
      rate: cfg.rate ?? 1
    });
    bgm.play();
    SoundManager._currentBGM = bgm;
    SoundManager._currentBGMKey = key;
  }
  static stopBGM() {
    if (SoundManager._currentBGM) {
      try { SoundManager._currentBGM.stop(); SoundManager._currentBGM.destroy(); } catch {}
      SoundManager._currentBGM = null;
      SoundManager._currentBGMKey = null;
    }
  }
  static _stopSFX() {
    if (SoundManager._sfxChannel) {
      try { SoundManager._sfxChannel.stop(); SoundManager._sfxChannel.destroy(); } catch {}
      SoundManager._sfxChannel = null;
    }
    if (SoundManager._sfxTimer) {
      SoundManager._sfxTimer.remove(false);
      SoundManager._sfxTimer = null;
    }
    SoundManager._exclusiveSFX = false;
    SoundManager._exclusiveSFXCallback = null;
  }
  static playSFX(key, cfg = {}) {
    if (!SoundManager._scene) return;
    const s = SoundManager._scene;
    if (SoundManager._exclusiveSFX && !cfg.exclusive) return;
    if (cfg.exclusive) {
      SoundManager.stopBGM();
      SoundManager._stopSFX();
      SoundManager._exclusiveSFX = true;
      SoundManager._exclusiveSFXCallback = cfg.onComplete || null;
    } else {
      SoundManager._stopSFX();
    }
    if (!s.sound.get(key)) {
      try { const tmp = s.sound.add(key); tmp.destroy(); }
      catch {
        console.warn('[SoundManager] SFX not loaded:', key);
        if (cfg.exclusive && cfg.onComplete) cfg.onComplete();
        return;
      }
    }
    const snd = s.sound.add(key, {
      loop: false,
      volume: (cfg.volume != null ? cfg.volume : 1) * SoundManager._effectiveSFXVolume(),
      rate: cfg.rate ?? 1
    });
    snd.play();
    SoundManager._sfxChannel = snd;
    let durationMs = 500;
    if (cfg.exclusive && key === 'win') {
      durationMs = Math.ceil(snd.duration * 1000);
      if (!durationMs || durationMs < 500) durationMs = 2000;
    } else if (cfg.maxDurationMs != null) {
      durationMs = cfg.maxDurationMs;
    }
    SoundManager._sfxTimer = s.time.delayedCall(durationMs, () => {
      SoundManager._stopSFX();
      if (cfg.exclusive && SoundManager._exclusiveSFXCallback) {
        const cb = SoundManager._exclusiveSFXCallback;
        SoundManager._exclusiveSFXCallback = null;
        SoundManager._exclusiveSFX = false;
        cb();
      }
    });
  }
  static playClick() { SoundManager.playSFX('click'); }
  static stopAll() { SoundManager.stopBGM(); SoundManager._stopSFX(); }
  static resetForSceneChange({ stopBGM = false } = {}) {
    if (stopBGM) SoundManager.stopBGM();
    SoundManager._stopSFX();
    SoundManager._exclusiveSFX = false;
    SoundManager._exclusiveSFXCallback = null;
  }
  static setBGMVolume(v) {
    SoundManager._settings.bgm = Phaser.Math.Clamp(v, 0, 1);
    SoundManager._saveSettings();
    if (SoundManager._currentBGM) SoundManager._currentBGM.setVolume(SoundManager._effectiveBGMVolume());
  }
  static setSFXVolume(v) {
    SoundManager._settings.sfx = Phaser.Math.Clamp(v, 0, 1);
    SoundManager._saveSettings();
    if (SoundManager._sfxChannel) {
      try { SoundManager._sfxChannel.setVolume(SoundManager._effectiveSFXVolume()); } catch {}
    }
  }
  static toggleMute() {
    SoundManager._settings.muted = !SoundManager._settings.muted;
    SoundManager._saveSettings();
    if (SoundManager._currentBGM) SoundManager._currentBGM.setVolume(SoundManager._effectiveBGMVolume());
    if (SoundManager._sfxChannel) {
      try { SoundManager._sfxChannel.setVolume(SoundManager._effectiveSFXVolume()); } catch {}
    }
  }
  static isMuted() { return SoundManager._settings.muted; }
  static getBGMVolume() { return SoundManager._settings.bgm; }
  static getSFXVolume() { return SoundManager._settings.sfx; }
}