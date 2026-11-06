import { BreakType, SoundId, VoiceReminderSettings } from '../types/wellness';
import { duckOtherApplications, restoreOtherApplications } from './tauriBridge';

interface ActiveSoundNode {
  gainNode: GainNode;
  cleanup: () => void;
}

class SoundEngine {
  private ctx: AudioContext | null = null;
  private masterGain: GainNode | null = null;
  private activeSounds: Map<SoundId, ActiveSoundNode> = new Map();
  private soundVolumes: Map<SoundId, number> = new Map();
  private masterVolume: number = 0.75;
  private isMasterMuted: boolean = false;
  private isDuckedInternally: boolean = false;

  // Online stream & custom local file audio
  private radioAudio: HTMLAudioElement | null = null;
  private currentStationUrl: string | null = null;
  private radioVolume: number = 0.65;
  private isRadioPlaying: boolean = false;
  private onRadioStateChange?: (playing: boolean, error?: string) => void;

  // Voice prompt audio
  private voiceAudio: HTMLAudioElement | null = null;
  private radioFadeTimer: number | null = null;
  private voiceFadeTimer: number | null = null;
  private voiceResolve: (() => void) | null = null;
  private voiceCancelled: boolean = false;

  /**
   * Time-Based Volume Matrix (Ma trận Âm lượng Ngày/Đêm):
   * - Giờ hành chính (06:00 - 21:59): Max Volume = 80% (0.80), Fade-in = 3.0s
   * - Giờ Cú đêm (22:00 - 05:59): Max Volume khóa cứng = 28% (0.28), Fade-in = 5.0s
   */
  public getTimeBasedVolumeEnvelope(requestedVolume: number): {
    targetVolume: number;
    fadeSeconds: number;
    isNightMode: boolean;
  } {
    const hour = new Date().getHours();
    const isNightMode = hour >= 22 || hour < 6;
    const maxCap = isNightMode ? 0.28 : 0.8;
    const clampedReq = Math.max(0.02, Math.min(1, requestedVolume));
    return {
      targetVolume: Math.min(clampedReq, maxCap),
      fadeSeconds: isNightMode ? 5.0 : 3.0,
      isNightMode,
    };
  }

  /**
   * Audio Dampening (Giảm chấn âm thanh 100ms/bước) cho thẻ <audio>
   */
  private fadeInHtmlAudio(
    audio: HTMLAudioElement,
    targetVol: number,
    durationSec: number,
    initialRatio: number = 0
  ): number {
    const clampedTarget = Math.max(0.01, Math.min(1, targetVol));
    let currentVol = clampedTarget * initialRatio;
    audio.volume = currentVol;
    const steps = Math.max(4, Math.round((durationSec * 1000) / 100));
    const stepDelta = (clampedTarget - currentVol) / steps;

    return window.setInterval(() => {
      currentVol += stepDelta;
      if (currentVol >= clampedTarget) {
        audio.volume = clampedTarget;
      } else {
        audio.volume = Math.max(0, Math.min(1, currentVol));
      }
    }, 100);
  }

  private ensureContext(): AudioContext {
    if (!this.ctx) {
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      this.ctx = new AudioCtx();
      this.masterGain = this.ctx.createGain();
      this.masterGain.gain.value = this.masterVolume;
      this.masterGain.connect(this.ctx.destination);
    }
    if (this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
    return this.ctx;
  }

  public setRadioCallback(cb: (playing: boolean, error?: string) => void) {
    this.onRadioStateChange = cb;
  }

  public getMasterVolume(): number {
    return this.masterVolume;
  }

  public setMasterVolume(val: number) {
    this.masterVolume = Math.max(0, Math.min(1, val));
    if (this.masterGain && this.ctx && !this.isDuckedInternally) {
      this.masterGain.gain.setTargetAtTime(
        this.isMasterMuted ? 0 : this.masterVolume,
        this.ctx.currentTime,
        0.08
      );
    }
    if (this.radioAudio && !this.isDuckedInternally) {
      this.radioAudio.volume = this.isMasterMuted ? 0 : this.radioVolume * this.masterVolume;
    }
  }

  public toggleMasterMute(): boolean {
    this.isMasterMuted = !this.isMasterMuted;
    this.setMasterVolume(this.masterVolume);
    return this.isMasterMuted;
  }

  public isAnySoundPlaying(): boolean {
    return this.activeSounds.size > 0 || this.isRadioPlaying;
  }

  public stopAllSounds() {
    for (const [id] of this.activeSounds) {
      this.stopSound(id);
    }
    this.stopRadio();
  }

  public toggleSound(id: SoundId, initialVol: number = 0.5): boolean {
    if (this.activeSounds.has(id)) {
      this.stopSound(id);
      return false;
    } else {
      const vol = this.soundVolumes.get(id) ?? initialVol;
      this.startSound(id, vol);
      return true;
    }
  }

  public setSoundVolume(id: SoundId, volume: number) {
    const clamped = Math.max(0, Math.min(1, volume));
    this.soundVolumes.set(id, clamped);
    const active = this.activeSounds.get(id);
    if (active && this.ctx) {
      active.gainNode.gain.setTargetAtTime(clamped, this.ctx.currentTime, 0.05);
    }
  }

  public applyPreset(mix: Partial<Record<SoundId, number>>) {
    // Stop current offline sounds
    for (const [id] of this.activeSounds) {
      this.stopSound(id);
    }
    // Start preset sounds
    (Object.keys(mix) as SoundId[]).forEach((id) => {
      const vol = mix[id];
      if (typeof vol === 'number' && vol > 0) {
        this.startSound(id, vol);
      }
    });
  }

  public startSound(id: SoundId, volume: number = 0.5) {
    this.stopSound(id);
    const ctx = this.ensureContext();
    if (!this.masterGain) return;

    const env = this.getTimeBasedVolumeEnvelope(volume);
    const gainNode = ctx.createGain();
    gainNode.gain.setValueAtTime(0.001, ctx.currentTime);
    gainNode.gain.linearRampToValueAtTime(
      Math.max(0.01, env.targetVolume),
      ctx.currentTime + env.fadeSeconds
    );
    gainNode.connect(this.masterGain);

    this.soundVolumes.set(id, volume);
    const cleanup = this.buildProceduralNode(ctx, id, gainNode);
    this.activeSounds.set(id, { gainNode, cleanup });
  }

  public stopSound(id: SoundId) {
    const active = this.activeSounds.get(id);
    if (!active) return;
    try {
      active.cleanup();
      active.gainNode.disconnect();
    } catch {
      // ignore
    }
    this.activeSounds.delete(id);
  }

  private createNoiseBuffer(ctx: AudioContext, type: 'white' | 'pink' | 'brown', seconds: number = 5): AudioBuffer {
    const bufferSize = ctx.sampleRate * seconds;
    const buffer = ctx.createBuffer(2, bufferSize, ctx.sampleRate);

    for (let ch = 0; ch < 2; ch++) {
      const output = buffer.getChannelData(ch);
      if (type === 'white') {
        for (let i = 0; i < bufferSize; i++) {
          output[i] = Math.random() * 2 - 1;
        }
      } else if (type === 'pink') {
        let b0 = 0, b1 = 0, b2 = 0, b3 = 0, b4 = 0, b5 = 0, b6 = 0;
        for (let i = 0; i < bufferSize; i++) {
          const white = Math.random() * 2 - 1;
          b0 = 0.99886 * b0 + white * 0.0555179;
          b1 = 0.99332 * b1 + white * 0.0750759;
          b2 = 0.96900 * b2 + white * 0.1538520;
          b3 = 0.86650 * b3 + white * 0.3104856;
          b4 = 0.55000 * b4 + white * 0.5329522;
          b5 = -0.7616 * b5 - white * 0.0168980;
          output[i] = (b0 + b1 + b2 + b3 + b4 + b5 + b6 + white * 0.5362) * 0.045;
          b6 = white * 0.115926;
        }
      } else {
        // Brown noise
        let lastOut = 0.0;
        for (let i = 0; i < bufferSize; i++) {
          const white = Math.random() * 2 - 1;
          output[i] = (lastOut + 0.02 * white) / 1.02;
          lastOut = output[i];
          output[i] *= 0.18;
        }
      }
    }
    return buffer;
  }

  private buildProceduralNode(ctx: AudioContext, id: SoundId, destination: AudioNode): () => void {
    const cleanups: (() => void)[] = [];

    if (id === 'rain') {
      const src = ctx.createBufferSource();
      src.buffer = this.createNoiseBuffer(ctx, 'pink', 6);
      src.loop = true;

      const filter = ctx.createBiquadFilter();
      filter.type = 'bandpass';
      filter.frequency.value = 1150;
      filter.Q.value = 0.65;

      const lowpass = ctx.createBiquadFilter();
      lowpass.type = 'lowpass';
      lowpass.frequency.value = 2800;

      src.connect(filter);
      filter.connect(lowpass);
      lowpass.connect(destination);
      src.start();
      cleanups.push(() => src.stop());
    } else if (id === 'stream') {
      const src = ctx.createBufferSource();
      src.buffer = this.createNoiseBuffer(ctx, 'pink', 5);
      src.loop = true;

      const filter = ctx.createBiquadFilter();
      filter.type = 'bandpass';
      filter.frequency.value = 650;
      filter.Q.value = 2.2;

      const lfo = ctx.createOscillator();
      lfo.type = 'sine';
      lfo.frequency.value = 0.35;
      const lfoGain = ctx.createGain();
      lfoGain.gain.value = 240;

      lfo.connect(lfoGain);
      lfoGain.connect(filter.frequency);
      src.connect(filter);
      filter.connect(destination);

      src.start();
      lfo.start();
      cleanups.push(() => {
        src.stop();
        lfo.stop();
      });
    } else if (id === 'ocean') {
      const src = ctx.createBufferSource();
      src.buffer = this.createNoiseBuffer(ctx, 'brown', 8);
      src.loop = true;

      const waveFilter = ctx.createBiquadFilter();
      waveFilter.type = 'lowpass';
      waveFilter.frequency.value = 480;

      const waveGain = ctx.createGain();
      waveGain.gain.value = 0.5;

      const lfo = ctx.createOscillator();
      lfo.type = 'sine';
      lfo.frequency.value = 0.12; // ~8s per ocean wave
      const lfoGain = ctx.createGain();
      lfoGain.gain.value = 0.42;

      lfo.connect(lfoGain);
      lfoGain.connect(waveGain.gain);

      src.connect(waveFilter);
      waveFilter.connect(waveGain);
      waveGain.connect(destination);

      src.start();
      lfo.start();
      cleanups.push(() => {
        src.stop();
        lfo.stop();
      });
    } else if (id === 'wind') {
      const src = ctx.createBufferSource();
      src.buffer = this.createNoiseBuffer(ctx, 'pink', 6);
      src.loop = true;

      const bandpass = ctx.createBiquadFilter();
      bandpass.type = 'bandpass';
      bandpass.frequency.value = 380;
      bandpass.Q.value = 4.5;

      const lfo = ctx.createOscillator();
      lfo.type = 'sine';
      lfo.frequency.value = 0.16;
      const lfoGain = ctx.createGain();
      lfoGain.gain.value = 180;

      lfo.connect(lfoGain);
      lfoGain.connect(bandpass.frequency);

      src.connect(bandpass);
      bandpass.connect(destination);
      src.start();
      lfo.start();
      cleanups.push(() => {
        src.stop();
        lfo.stop();
      });
    } else if (id === 'campfire') {
      const src = ctx.createBufferSource();
      src.buffer = this.createNoiseBuffer(ctx, 'brown', 5);
      src.loop = true;

      const rumbleFilter = ctx.createBiquadFilter();
      rumbleFilter.type = 'lowpass';
      rumbleFilter.frequency.value = 320;
      src.connect(rumbleFilter);
      rumbleFilter.connect(destination);
      src.start();

      // Gentle crackle impulses
      const timer = window.setInterval(() => {
        if (!this.ctx) return;
        const now = this.ctx.currentTime;
        const osc = this.ctx.createOscillator();
        const g = this.ctx.createGain();
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(1200 + Math.random() * 1800, now);
        g.gain.setValueAtTime(0.08 * Math.random(), now);
        g.gain.exponentialRampToValueAtTime(0.0001, now + 0.045);
        osc.connect(g);
        g.connect(destination);
        osc.start(now);
        osc.stop(now + 0.05);
      }, 220);

      cleanups.push(() => {
        src.stop();
        window.clearInterval(timer);
      });
    } else if (id === 'singing_bowl') {
      const triggerBowl = () => {
        if (!this.ctx) return;
        const now = this.ctx.currentTime;
        const freqs = [432, 528, 864];
        freqs.forEach((f, idx) => {
          if (!this.ctx) return;
          const osc = this.ctx.createOscillator();
          const g = this.ctx.createGain();
          osc.type = 'sine';
          osc.frequency.setValueAtTime(f, now);
          const peak = idx === 0 ? 0.25 : idx === 1 ? 0.14 : 0.06;
          g.gain.setValueAtTime(0.001, now);
          g.gain.linearRampToValueAtTime(peak, now + 0.35);
          g.gain.exponentialRampToValueAtTime(0.0008, now + 6.5);
          osc.connect(g);
          g.connect(destination);
          osc.start(now);
          osc.stop(now + 6.6);
        });
      };
      triggerBowl();
      const timer = window.setInterval(triggerBowl, 7200);
      cleanups.push(() => window.clearInterval(timer));
    } else if (id === 'alpha_waves' || id === 'theta_waves') {
      const baseFreq = id === 'alpha_waves' ? 200 : 180;
      const beatFreq = id === 'alpha_waves' ? 10 : 6;

      const leftOsc = ctx.createOscillator();
      const rightOsc = ctx.createOscillator();
      const leftPan = ctx.createStereoPanner();
      const rightPan = ctx.createStereoPanner();
      const subGain = ctx.createGain();

      leftOsc.type = 'sine';
      rightOsc.type = 'sine';
      leftOsc.frequency.value = baseFreq;
      rightOsc.frequency.value = baseFreq + beatFreq;

      leftPan.pan.value = -0.8;
      rightPan.pan.value = 0.8;
      subGain.gain.value = 0.22;

      leftOsc.connect(leftPan);
      rightOsc.connect(rightPan);
      leftPan.connect(subGain);
      rightPan.connect(subGain);
      subGain.connect(destination);

      leftOsc.start();
      rightOsc.start();
      cleanups.push(() => {
        leftOsc.stop();
        rightOsc.stop();
      });
    } else if (id === 'brown_noise') {
      const src = ctx.createBufferSource();
      src.buffer = this.createNoiseBuffer(ctx, 'brown', 6);
      src.loop = true;
      const lp = ctx.createBiquadFilter();
      lp.type = 'lowpass';
      lp.frequency.value = 600;
      src.connect(lp);
      lp.connect(destination);
      src.start();
      cleanups.push(() => src.stop());
    } else if (id === 'pink_noise') {
      const src = ctx.createBufferSource();
      src.buffer = this.createNoiseBuffer(ctx, 'pink', 6);
      src.loop = true;
      const lp = ctx.createBiquadFilter();
      lp.type = 'lowpass';
      lp.frequency.value = 1600;
      src.connect(lp);
      lp.connect(destination);
      src.start();
      cleanups.push(() => src.stop());
    }

    return () => {
      cleanups.forEach((fn) => {
        try {
          fn();
        } catch {
          // ignore
        }
      });
    };
  }

  // Online Radio & Custom Audio Stream Methods
  public playRadioStream(url: string, volume?: number) {
    if (typeof volume === 'number') {
      this.radioVolume = Math.max(0, Math.min(1, volume));
    }

    if (this.radioAudio && this.currentStationUrl === url && this.isRadioPlaying) {
      this.stopRadio();
      return;
    }

    this.stopRadio();
    this.currentStationUrl = url;
    const audio = new Audio(url);
    audio.crossOrigin = 'anonymous';
    audio.loop = true;

    const env = this.getTimeBasedVolumeEnvelope(this.radioVolume * this.masterVolume);
    audio.volume = 0;

    audio.onplaying = () => {
      this.isRadioPlaying = true;
      this.onRadioStateChange?.(true);
      if (this.radioFadeTimer) window.clearInterval(this.radioFadeTimer);
      if (!this.isMasterMuted) {
        this.radioFadeTimer = this.fadeInHtmlAudio(
          audio,
          env.targetVolume,
          env.fadeSeconds,
          0
        );
      }
    };

    audio.onerror = () => {
      this.isRadioPlaying = false;
      this.onRadioStateChange?.(false, 'Không thể kết nối luồng nhạc trực tuyến. Vui lòng kiểm tra mạng hoặc chọn kênh khác.');
    };

    this.radioAudio = audio;
    audio.play().catch(() => {
      this.isRadioPlaying = false;
      this.onRadioStateChange?.(false, 'Không thể phát luồng nhạc này.');
    });
  }

  public stopRadio() {
    if (this.radioFadeTimer) {
      window.clearInterval(this.radioFadeTimer);
      this.radioFadeTimer = null;
    }
    if (this.radioAudio) {
      try {
        this.radioAudio.pause();
        this.radioAudio.src = '';
      } catch {
        // ignore
      }
      this.radioAudio = null;
    }
    this.isRadioPlaying = false;
    this.currentStationUrl = null;
    this.onRadioStateChange?.(false);
  }

  public setRadioVolume(vol: number) {
    this.radioVolume = Math.max(0, Math.min(1, vol));
    if (this.radioAudio && !this.isDuckedInternally) {
      const env = this.getTimeBasedVolumeEnvelope(this.radioVolume * this.masterVolume);
      this.radioAudio.volume = this.isMasterMuted ? 0 : env.targetVolume;
    }
  }

  // Play Gentle Healing Chime (528Hz + 660Hz) with Day/Night Volume Matrix
  public playHealingChime(volume: number = 0.6): Promise<void> {
    return new Promise((resolve) => {
      try {
        const ctx = this.ensureContext();
        const now = ctx.currentTime;
        const env = this.getTimeBasedVolumeEnvelope(volume);
        const notes = [528, 660, 792];
        notes.forEach((freq, idx) => {
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          osc.type = 'sine';
          osc.frequency.setValueAtTime(freq, now + idx * 0.16);
          gain.gain.setValueAtTime(0.0008, now + idx * 0.16);
          gain.gain.linearRampToValueAtTime(
            env.targetVolume * 0.25,
            now + idx * 0.16 + (env.isNightMode ? 0.14 : 0.08)
          );
          gain.gain.exponentialRampToValueAtTime(0.0005, now + idx * 0.16 + 1.25);
          osc.connect(gain);
          gain.connect(ctx.destination);
          osc.start(now + idx * 0.16);
          osc.stop(now + idx * 0.16 + 1.3);
        });
        window.setTimeout(resolve, 680);
      } catch {
        resolve();
      }
    });
  }

  public stopVoiceReminder() {
    this.voiceCancelled = true;
    if (this.voiceFadeTimer) {
      window.clearInterval(this.voiceFadeTimer);
      this.voiceFadeTimer = null;
    }
    if (this.voiceAudio) {
      try {
        this.voiceAudio.onended = null;
        this.voiceAudio.onerror = null;
        this.voiceAudio.pause();
        this.voiceAudio.currentTime = 0;
      } catch {
        // ignore
      }
      this.voiceAudio = null;
    }
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      try {
        window.speechSynthesis.cancel();
      } catch {
        // ignore
      }
    }
    if (this.voiceResolve) {
      const resolve = this.voiceResolve;
      this.voiceResolve = null;
      resolve();
    }
  }

  // Duck internal ambient mixer & external Windows apps, speak Vietnamese prompt, then restore
  public async playVietnameseVoiceReminder(
    kind: BreakType | 'water' | 'break_done' | 'test',
    settings: VoiceReminderSettings,
    onDuckStatus?: (duckedAppsCount: number, active: boolean) => void
  ): Promise<void> {
    this.voiceCancelled = false;
    if (!settings.enabled && kind !== 'test') {
      if (settings.playChimeBeforeVoice) {
        await this.playHealingChime(settings.volume);
      }
      return;
    }

    // 1. Duck other Windows applications via Rust WASAPI
    let duckedCount = 0;
    if (settings.duckOtherApps) {
      duckedCount = await duckOtherApplications(settings.duckRatio);
      onDuckStatus?.(duckedCount, true);
    }

    // 2. Fade down our own internal ambient mixer
    this.isDuckedInternally = true;
    if (this.masterGain && this.ctx) {
      this.masterGain.gain.setTargetAtTime(this.masterVolume * 0.18, this.ctx.currentTime, 0.12);
    }
    if (this.radioAudio) {
      this.radioAudio.volume = this.radioVolume * this.masterVolume * 0.18;
    }

    try {
      // 3. Play soft healing chime before voice
      if (settings.playChimeBeforeVoice) {
        await this.playHealingChime(settings.volume);
      }
      if (this.voiceCancelled) {
        return;
      }

      // 4. Play Vietnamese or English neural voice file or custom TTS
      if (settings.voicePack === 'custom_tts') {
        const text =
          kind === 'water'
            ? settings.customWaterText
            : kind === 'break_done'
            ? 'Thời gian nghỉ ngơi đã hoàn tất. Chúc bạn làm việc hiệu quả!'
            : settings.customStandupText;
        await this.speakViaBrowserTTS(text, settings.volume);
      } else if (settings.voicePack === 'english_neural') {
        const enMap: Record<string, string> = {
          standup: '/voices/standup_en.mp3',
          eye: '/voices/eye_en.mp3',
          combo: '/voices/combo_en.mp3',
          water: '/voices/water_en.mp3',
          break_done: '/voices/break_done_en.mp3',
          test: '/voices/test_en.mp3',
        };
        const audioPath = enMap[kind] || '/voices/standup_en.mp3';
        await this.playMp3VoiceFile(audioPath, settings.volume);
      } else {
        const isMale = settings.voicePack === 'male_neural';
        const fileMap: Record<string, string> = {
          standup: isMale ? '/voices/standup_male.mp3' : '/voices/standup_female.mp3',
          eye: '/voices/eye_female.mp3',
          combo: '/voices/combo_female.mp3',
          water: isMale ? '/voices/water_male.mp3' : '/voices/water_female.mp3',
          break_done: '/voices/break_done_female.mp3',
          test: isMale ? '/voices/test_male.mp3' : '/voices/test_female.mp3',
        };
        const audioPath = fileMap[kind] || '/voices/standup_female.mp3';
        await this.playMp3VoiceFile(audioPath, settings.volume);
      }
    } finally {
      // 5. Restore internal ambient music smoothly
      this.isDuckedInternally = false;
      this.setMasterVolume(this.masterVolume);

      // 6. Restore other Windows applications via Rust WASAPI
      if (settings.duckOtherApps) {
        await restoreOtherApplications();
        onDuckStatus?.(0, false);
      }
    }
  }

  private playMp3VoiceFile(path: string, volume: number): Promise<void> {
    return new Promise((resolve) => {
      try {
        if (this.voiceFadeTimer) {
          window.clearInterval(this.voiceFadeTimer);
          this.voiceFadeTimer = null;
        }
        if (this.voiceAudio) {
          this.voiceAudio.pause();
          this.voiceAudio = null;
        }
        this.voiceResolve = resolve;
        const env = this.getTimeBasedVolumeEnvelope(volume);
        const audio = new Audio(path);
        audio.volume = env.targetVolume * 0.15;
        this.voiceAudio = audio;
        this.voiceFadeTimer = this.fadeInHtmlAudio(
          audio,
          env.targetVolume,
          env.isNightMode ? 1.0 : 0.7,
          0.15
        );
        const cleanupAndResolve = () => {
          if (this.voiceFadeTimer) {
            window.clearInterval(this.voiceFadeTimer);
            this.voiceFadeTimer = null;
          }
          if (this.voiceResolve === resolve) {
            this.voiceResolve = null;
          }
          resolve();
        };
        audio.onended = cleanupAndResolve;
        audio.onerror = cleanupAndResolve;
        audio.play().catch(cleanupAndResolve);
      } catch {
        this.voiceResolve = null;
        resolve();
      }
    });
  }

  private speakViaBrowserTTS(text: string, volume: number): Promise<void> {
    return new Promise((resolve) => {
      if (typeof window === 'undefined' || !('speechSynthesis' in window)) {
        resolve();
        return;
      }
      try {
        window.speechSynthesis.cancel();
        this.voiceResolve = resolve;
        const env = this.getTimeBasedVolumeEnvelope(volume);
        const utter = new SpeechSynthesisUtterance(text);
        utter.lang = 'vi-VN';
        utter.volume = Math.max(0.08, Math.min(1, env.targetVolume));
        utter.rate = 0.96;
        const voices = window.speechSynthesis.getVoices();
        const viVoice = voices.find((v) => v.lang.toLowerCase().includes('vi'));
        if (viVoice) {
          utter.voice = viVoice;
        }
        const done = () => {
          if (this.voiceResolve === resolve) {
            this.voiceResolve = null;
          }
          resolve();
        };
        utter.onend = done;
        utter.onerror = done;
        window.speechSynthesis.speak(utter);
      } catch {
        this.voiceResolve = null;
        resolve();
      }
    });
  }
}

export const soundEngine = new SoundEngine();

