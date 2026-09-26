import * as THREE from 'three';
import type { Vec3 } from '../physics/physics_world';
import { SOUND_IDS, synthesize, type SoundId } from './synth';

export interface PlayOptions {
  /** Posición en el mundo; sin ella el sonido no tiene dirección (propio del jugador, interfaz). */
  position?: Vec3;
  volume?: number;
  /** Variación de tono (1 = original). */
  pitch?: number;
}

const POSITIONAL_VOICES = 24;
const FLAT_VOICES = 8;
/** Un mismo sonido no se repite más a menudo que esto (evita saturar con la remachadora). */
const MIN_REPEAT = 0.03;

interface Voice<T extends THREE.Audio<GainNode | PannerNode>> {
  audio: T;
  startedAt: number;
}

/**
 * Audio del juego con Web Audio: los efectos se sintetizan al crear el sistema y se reproducen
 * con un número fijo de voces (THREE.PositionalAudio en el mundo, THREE.Audio sin posición).
 * El contexto de audio empieza suspendido hasta que el usuario interactúa (`resume`).
 */
export class AudioSystem {
  readonly listener = new THREE.AudioListener();
  readonly group = new THREE.Group();
  private readonly buffers = new Map<SoundId, AudioBuffer>();
  private readonly positional: Voice<THREE.PositionalAudio>[] = [];
  private readonly flat: Voice<THREE.Audio>[] = [];
  private readonly lastPlayed = new Map<SoundId, number>();
  private ambient: THREE.Audio | null = null;

  constructor(camera: THREE.Camera, scene: THREE.Scene) {
    camera.add(this.listener);
    this.group.name = 'audio';
    scene.add(this.group);
    const context = this.listener.context;
    for (const id of SOUND_IDS) {
      const samples = synthesize(id, context.sampleRate);
      const buffer = context.createBuffer(1, samples.length, context.sampleRate);
      buffer.copyToChannel(samples as Float32Array<ArrayBuffer>, 0);
      this.buffers.set(id, buffer);
    }
    for (let i = 0; i < POSITIONAL_VOICES; i++) {
      const audio = new THREE.PositionalAudio(this.listener);
      audio.setRefDistance(3);
      audio.setRolloffFactor(1.3);
      audio.setMaxDistance(70);
      audio.setDistanceModel('inverse');
      this.group.add(audio);
      this.positional.push({ audio, startedAt: -Infinity });
    }
    for (let i = 0; i < FLAT_VOICES; i++) {
      this.flat.push({ audio: new THREE.Audio(this.listener), startedAt: -Infinity });
    }
  }

  private get now(): number {
    return this.listener.context.currentTime;
  }

  /** Debe llamarse desde un gesto del usuario para que el navegador permita el sonido. */
  resume(): void {
    if (this.listener.context.state !== 'running') void this.listener.context.resume();
  }

  setVolume(volume: number): void {
    this.listener.setMasterVolume(volume);
  }

  play(id: SoundId, options: PlayOptions = {}): void {
    const buffer = this.buffers.get(id);
    if (!buffer || this.listener.context.state !== 'running') return;
    const now = this.now;
    if (now - (this.lastPlayed.get(id) ?? -Infinity) < MIN_REPEAT) return;
    this.lastPlayed.set(id, now);

    const pool = options.position ? this.positional : this.flat;
    // Una voz libre o, si todas suenan, la que más tiempo lleva sonando.
    const voice =
      pool.find((v) => !v.audio.isPlaying) ??
      pool.reduce((oldest, v) => (v.startedAt < oldest.startedAt ? v : oldest));
    const audio = voice.audio;
    if (audio.isPlaying) audio.stop();
    if (options.position)
      audio.position.set(options.position.x, options.position.y, options.position.z);
    audio.setBuffer(buffer);
    audio.setVolume(options.volume ?? 1);
    audio.setPlaybackRate(options.pitch ?? 1);
    audio.play();
    voice.startedAt = now;
  }

  /** Zumbido de fondo en bucle. */
  startAmbient(volume = 0.35): void {
    const buffer = this.buffers.get('ambient');
    if (!buffer || this.ambient) return;
    this.ambient = new THREE.Audio(this.listener);
    this.ambient.setBuffer(buffer);
    this.ambient.setLoop(true);
    this.ambient.setVolume(volume);
    if (this.listener.context.state === 'running') this.ambient.play();
  }

  /** Arranca el ambiente si estaba esperando a que el contexto se reanudara. */
  update(): void {
    if (this.ambient && !this.ambient.isPlaying && this.listener.context.state === 'running') {
      this.ambient.play();
    }
  }

  dispose(): void {
    for (const voice of [...this.positional, ...this.flat]) {
      if (voice.audio.isPlaying) voice.audio.stop();
    }
    if (this.ambient?.isPlaying) this.ambient.stop();
    this.group.removeFromParent();
    this.listener.removeFromParent();
    // El AudioContext es único y compartido por Three.js: no se cierra, se reutiliza al reiniciar.
  }
}
