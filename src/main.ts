import './style.css'
import homeHeroImage from './assets/home-hero-v2.png'
import catOrange from './assets/cat-orange.png'
import catSilver from './assets/cat-silver.png'
import catMoon from './assets/cat-moon.png'
import mouseCloud from './assets/mouse-cloud.png'
import mouseCream from './assets/mouse-cream.png'
import mouseHazel from './assets/mouse-hazel.png'
import gardenBoard from './assets/garden-maze-board.png'
import mushroomBoard from './assets/mushroom-maze-board.png'
import starlightBoard from './assets/starlight-maze-board.png'

type Point = { x: number; y: number }
type Theme = 'garden' | 'mushroom' | 'starlight'
type Phase = 'playing' | 'collision' | 'complete'
type CatId = 'orange' | 'silver' | 'moon'
type IdleAction = 'none' | 'look' | 'groom' | 'stretch' | 'meow'
type CatMotion = { heading: Point; trotting: boolean; celebrating: boolean; idleAction: IdleAction }

type Segment = { a: Point; b: Point; points: Point[]; mouseAllowed: boolean }
type RoutePosition = { segment: number; t: number }
type Patrol = { path: Point[]; speed: number; offset: number; wander?: boolean }
type Wanderer = { segment: number; t: number; direction: 1 | -1 }

type LevelDefinition = {
  id: 1 | 2 | 3
  title: string
  subtitle: string
  theme: Theme
  segments: Segment[]
  start: RoutePosition
  exit: Point
  fish: Point[]
  patrols: Patrol[]
}

type SaveData = {
  version: 1
  unlockedLevel: 1 | 2 | 3
  bestStars: Record<1 | 2 | 3, number>
  soundEnabled: boolean
  tutorialSeen: boolean
  cat: CatId
}

const LOGICAL_WIDTH = 390
const LOGICAL_HEIGHT = 590
const STORAGE_KEY = 'cat-maze-adventure:v1'
const DEBUG_ROUTES = new URLSearchParams(window.location.search).has('debugRoutes')
const root = document.querySelector<HTMLDivElement>('#app')!
const catOptions: Record<CatId, { name: string; note: string; image: string }> = {
  orange: { name: '橘子', note: '围着青绿小方巾', image: catOrange },
  silver: { name: '云朵', note: '戴着温柔粉蝴蝶结', image: catSilver },
  moon: { name: '月牙', note: '摇着金色小铃铛', image: catMoon },
}
const catSpriteImages: Record<CatId, HTMLImageElement> = {
  orange: new Image(),
  silver: new Image(),
  moon: new Image(),
}
;(Object.keys(catOptions) as CatId[]).forEach((id) => { catSpriteImages[id].src = catOptions[id].image })
const mouseSpriteImages = [new Image(), new Image(), new Image()]
;[mouseCloud, mouseCream, mouseHazel].forEach((image, index) => { mouseSpriteImages[index].src = image })
const boardImages: Record<Theme, HTMLImageElement> = {
  garden: new Image(),
  mushroom: new Image(),
  starlight: new Image(),
}
boardImages.garden.src = gardenBoard
boardImages.mushroom.src = mushroomBoard
boardImages.starlight.src = starlightBoard
const levelArtwork: Record<Theme, string> = { garden: gardenBoard, mushroom: mushroomBoard, starlight: starlightBoard }

const p = (x: number, y: number): Point => ({ x, y })
const segment = (ax: number, ay: number, bx: number, by: number, via: Point[] = [], mouseAllowed = true): Segment => {
  const a = p(ax, ay)
  const b = p(bx, by)
  return { a, b, points: [a, ...via, b], mouseAllowed }
}

const LEVELS: LevelDefinition[] = [
  {
    id: 1,
    title: '花园迷宫',
    subtitle: '跟着金色小路，先认识这座花园吧',
    theme: 'garden',
    segments: [
      segment(195, 575, 195, 408, [], false),
      segment(195, 408, 74, 408, [p(136, 408), p(92, 408)]), segment(195, 408, 316, 408, [p(254, 408), p(298, 408)]),
      segment(74, 408, 74, 277, [p(62, 390), p(62, 304)]), segment(316, 408, 316, 277, [p(328, 390), p(328, 304)]),
      segment(74, 277, 195, 277, [p(92, 277), p(150, 277)]), segment(316, 277, 195, 277, [p(298, 277), p(240, 277)]), segment(195, 408, 195, 277),
      segment(74, 277, 74, 139, [p(62, 258), p(62, 163)]), segment(316, 277, 316, 139, [p(328, 258), p(328, 163)]),
      segment(74, 139, 195, 139, [p(92, 139), p(150, 139)]), segment(316, 139, 195, 139, [p(298, 139), p(240, 139)]), segment(195, 277, 195, 139),
      segment(195, 139, 195, 78, [], false),
    ],
    start: { segment: 0, t: 0 },
    exit: p(195, 78),
    fish: [p(63, 350), p(327, 350), p(62, 210)],
    patrols: [{ path: [p(195, 370), p(195, 305)], speed: 52, offset: 0 }],
  },
  {
    id: 2,
    title: '蘑菇小径',
    subtitle: '蘑菇会指路，慢慢走也没关系',
    theme: 'mushroom',
    segments: [
      segment(195, 578, 195, 492, [], false),
      segment(195, 492, 195, 383, [p(150, 492), p(105, 478), p(75, 452), p(63, 420), p(65, 398), p(82, 385), p(125, 383), p(165, 383)]),
      segment(195, 492, 195, 383, [p(240, 492), p(285, 478), p(315, 452), p(327, 420), p(325, 398), p(308, 385), p(265, 383), p(225, 383)]),
      segment(195, 383, 195, 275, [p(155, 383), p(112, 383), p(78, 365), p(62, 333), p(62, 306), p(78, 283), p(118, 275), p(160, 275)]),
      segment(195, 383, 195, 275, [p(235, 383), p(278, 383), p(312, 365), p(328, 333), p(328, 306), p(312, 283), p(272, 275), p(230, 275)]),
      segment(195, 275, 195, 169, [p(155, 275), p(112, 275), p(80, 258), p(65, 228), p(66, 200), p(84, 178), p(122, 169), p(160, 169)]),
      segment(195, 275, 195, 169, [p(235, 275), p(278, 275), p(310, 258), p(325, 228), p(324, 200), p(306, 178), p(268, 169), p(230, 169)]),
      segment(195, 169, 195, 67, [p(195, 132), p(195, 99)], false),
    ],
    start: { segment: 0, t: 0 },
    exit: p(195, 67),
    fish: [p(61, 392), p(329, 392), p(331, 230)],
    patrols: [
      { path: [p(195, 375), p(195, 320)], speed: 36, offset: 80, wander: true },
      { path: [p(195, 282), p(195, 194)], speed: 39, offset: 15, wander: true },
    ],
  },
  {
    id: 3,
    title: '星光森林',
    subtitle: '星星在树梢等你，深呼吸再出发',
    theme: 'starlight',
    segments: [
      segment(195, 578, 195, 505, [], false),
      segment(195, 505, 195, 350, [p(150, 505), p(105, 490), p(72, 466), p(53, 435), p(49, 401), p(64, 376), p(100, 360), p(150, 350)]),
      segment(195, 505, 195, 350, [p(240, 505), p(285, 490), p(318, 466), p(337, 435), p(341, 401), p(326, 376), p(290, 360), p(240, 350)]),
      segment(195, 505, 195, 350),
      segment(195, 350, 195, 181, [p(150, 350), p(105, 336), p(72, 312), p(53, 281), p(50, 246), p(66, 218), p(102, 201), p(150, 205), p(178, 220)]),
      segment(195, 350, 195, 181, [p(240, 350), p(285, 336), p(318, 312), p(337, 281), p(340, 246), p(324, 218), p(288, 201), p(240, 205), p(212, 220)]),
      segment(195, 350, 195, 181),
      segment(195, 181, 195, 181, [p(153, 181), p(112, 171), p(77, 151), p(64, 130), p(78, 115), p(115, 124), p(150, 157)]),
      segment(195, 181, 195, 181, [p(237, 181), p(278, 171), p(313, 151), p(326, 130), p(312, 115), p(275, 124), p(240, 157)]),
      segment(195, 181, 195, 82, [], false),
    ],
    start: { segment: 0, t: 0 },
    exit: p(195, 82),
    fish: [p(52, 407), p(338, 407), p(56, 217)],
    patrols: [
      { path: [p(195, 375), p(195, 325)], speed: 38, offset: 0, wander: true },
      { path: [p(195, 282), p(195, 190)], speed: 41, offset: 130, wander: true },
      { path: [p(70, 172), p(150, 172)], speed: 34, offset: 60, wander: true },
    ],
  },
]

const themes: Record<Theme, { sky: string; skyEnd: string; grass: string; path: string; edge: string; accent: string; ink: string }> = {
  garden: { sky: '#edf7d7', skyEnd: '#fff3c8', grass: '#77b987', path: '#ffe29a', edge: '#4f8c73', accent: '#f28d79', ink: '#245a5b' },
  mushroom: { sky: '#f9d8db', skyEnd: '#eee0f8', grass: '#8bb979', path: '#ffdcab', edge: '#a66b86', accent: '#ef8a85', ink: '#654d72' },
  starlight: { sky: '#263b72', skyEnd: '#5b5b9b', grass: '#3c7074', path: '#cdd3ff', edge: '#274f64', accent: '#ffd46c', ink: '#f4eaff' },
}

const musicTracks: Record<Theme, { tempo: number; melody: number[]; harmony: number[]; bass: number[] }> = {
  garden: {
    tempo: 420,
    melody: [659, 784, 880, 784, 698, 784, 988, 880, 659, 784, 1047, 988, 880, 784, 698, 587, 659, 740, 880, 988, 880, 784, 698, 784, 659, 784, 1047, 1175, 1047, 988, 880, 784, 698, 784, 880, 784, 740, 659, 698, 784, 880, 1047, 988, 880, 784, 698, 659, 587, 659, 784, 880, 1047, 988, 880, 784, 698, 740, 880, 988, 880, 784, 698, 659, 587],
    harmony: [523, 587, 659, 587, 523, 659, 698, 587],
    bass: [131, 147, 165, 147, 131, 175, 147, 131],
  },
  mushroom: {
    tempo: 455,
    melody: [587, 659, 740, 659, 587, 698, 784, 740, 659, 784, 880, 784, 740, 698, 659, 587, 622, 698, 784, 880, 784, 740, 698, 659, 587, 659, 784, 932, 880, 784, 740, 698, 659, 740, 784, 740, 698, 622, 587, 659, 698, 784, 932, 880, 784, 740, 698, 622, 587, 698, 784, 880, 988, 880, 784, 740, 698, 784, 880, 784, 740, 698, 659, 587],
    harmony: [440, 523, 587, 523, 466, 554, 622, 554],
    bass: [110, 131, 147, 131, 117, 139, 156, 139],
  },
  starlight: {
    tempo: 520,
    melody: [523, 659, 784, 659, 587, 698, 784, 880, 659, 784, 988, 880, 784, 698, 659, 523, 587, 698, 880, 988, 880, 784, 698, 659, 523, 659, 784, 1047, 988, 880, 784, 698, 659, 784, 880, 784, 698, 659, 587, 523, 587, 698, 784, 880, 784, 698, 659, 587, 523, 659, 784, 880, 1047, 988, 880, 784, 698, 587, 698, 784, 698, 659, 587, 523],
    harmony: [392, 494, 587, 494, 440, 523, 659, 523],
    bass: [98, 123, 147, 123, 110, 131, 165, 131],
  },
}

function freshSave(): SaveData {
  return { version: 1, unlockedLevel: 1, bestStars: { 1: 0, 2: 0, 3: 0 }, soundEnabled: true, tutorialSeen: false, cat: 'orange' }
}

function loadSave(): SaveData {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return freshSave()
    const parsed = JSON.parse(raw) as Partial<SaveData>
    if (parsed.version !== 1 || !parsed.bestStars) return freshSave()
    return {
      version: 1,
      unlockedLevel: parsed.unlockedLevel === 2 || parsed.unlockedLevel === 3 ? parsed.unlockedLevel : 1,
      bestStars: {
        1: clampNumber(parsed.bestStars[1], 0, 3),
        2: clampNumber(parsed.bestStars[2], 0, 3),
        3: clampNumber(parsed.bestStars[3], 0, 3),
      },
      soundEnabled: parsed.soundEnabled !== false,
      tutorialSeen: parsed.tutorialSeen === true,
      cat: parsed.cat === 'silver' || parsed.cat === 'moon' ? parsed.cat : 'orange',
    }
  } catch {
    return freshSave()
  }
}

function clampNumber(value: unknown, min: number, max: number): number {
  return typeof value === 'number' && Number.isFinite(value) ? Math.max(min, Math.min(max, Math.round(value))) : min
}

let saveData = loadSave()

function persist(): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(saveData))
  } catch {
    // The game remains playable when browser storage is unavailable.
  }
}

function distance(a: Point, b: Point): number {
  return Math.hypot(a.x - b.x, a.y - b.y)
}

function lerp(a: Point, b: Point, t: number): Point {
  return p(a.x + (b.x - a.x) * t, a.y + (b.y - a.y) * t)
}

function segmentLength(seg: Segment): number {
  return seg.points.slice(0, -1).reduce((total, point, index) => total + distance(point, seg.points[index + 1]), 0)
}

function pointOnSegment(seg: Segment, t: number): Point {
  const total = segmentLength(seg)
  let cursor = Math.max(0, Math.min(1, t)) * total
  for (let index = 0; index < seg.points.length - 1; index += 1) {
    const length = distance(seg.points[index], seg.points[index + 1])
    if (cursor <= length || index === seg.points.length - 2) return lerp(seg.points[index], seg.points[index + 1], length === 0 ? 0 : cursor / length)
    cursor -= length
  }
  return seg.b
}

function projectToSegment(point: Point, seg: Segment): { point: Point; t: number; distance: number } {
  const total = segmentLength(seg)
  let travelled = 0
  let best: { point: Point; t: number; distance: number } | undefined
  for (let index = 0; index < seg.points.length - 1; index += 1) {
    const a = seg.points[index]
    const b = seg.points[index + 1]
    const dx = b.x - a.x
    const dy = b.y - a.y
    const lengthSquared = dx * dx + dy * dy
    const raw = lengthSquared === 0 ? 0 : ((point.x - a.x) * dx + (point.y - a.y) * dy) / lengthSquared
    const localT = Math.max(0, Math.min(1, raw))
    const projected = lerp(a, b, localT)
    const partLength = Math.sqrt(lengthSquared)
    const candidate = { point: projected, t: total === 0 ? 0 : (travelled + partLength * localT) / total, distance: distance(point, projected) }
    if (!best || candidate.distance < best.distance) best = candidate
    travelled += partLength
  }
  return best ?? { point: seg.a, t: 0, distance: distance(point, seg.a) }
}

function samePoint(a: Point, b: Point): boolean {
  return Math.abs(a.x - b.x) < 0.1 && Math.abs(a.y - b.y) < 0.1
}

function starCount(fishCount: number): number {
  return fishCount >= 3 ? 3 : fishCount >= 2 ? 2 : 1
}

class SoundGarden {
  private context?: AudioContext
  private master?: GainNode
  private meowBus?: GainNode
  private timer?: number
  private step = 0
  private theme: Theme = 'garden'

  private ready(): boolean {
    if (!saveData.soundEnabled) return false
    if (!this.context) {
      this.context = new AudioContext()
      this.master = this.context.createGain()
      this.master.gain.value = 0.11
      this.master.connect(this.context.destination)
      this.meowBus = this.context.createGain()
      this.meowBus.gain.value = 0.5
      this.meowBus.connect(this.context.destination)
    }
    void this.context.resume()
    return true
  }

  setEnabled(enabled: boolean): void {
    saveData.soundEnabled = enabled
    persist()
    if (enabled) this.startMusic(this.theme)
    if (this.master) this.master.gain.setTargetAtTime(enabled ? 0.11 : 0, this.context!.currentTime, 0.04)
    if (this.meowBus) this.meowBus.gain.setTargetAtTime(enabled ? 0.5 : 0, this.context!.currentTime, 0.04)
  }

  startMusic(theme: Theme = this.theme): void {
    const themeChanged = this.theme !== theme
    this.theme = theme
    if (!this.ready()) return
    if (this.timer && !themeChanged) return
    if (this.timer) window.clearInterval(this.timer)
    this.step = 0
    this.tickMusic()
    this.timer = window.setInterval(() => this.tickMusic(), musicTracks[this.theme].tempo)
  }

  stopMusic(): void {
    if (this.timer) window.clearInterval(this.timer)
    this.timer = undefined
  }

  play(kind: 'move' | 'fish' | 'bump' | 'win'): void {
    if (!this.ready() || !this.context || !this.master) return
    const tones: Record<typeof kind, [number, number, OscillatorType]> = {
      move: [587, 0.06, 'sine'], fish: [880, 0.16, 'triangle'], bump: [196, 0.14, 'sine'], win: [784, 0.24, 'triangle'],
    }
    const [frequency, length, type] = tones[kind]
    this.note(frequency, length, type, kind === 'bump' ? 0.08 : 0.13)
    if (kind === 'fish') window.setTimeout(() => this.note(1175, 0.12, 'triangle', 0.1), 70)
    if (kind === 'win') window.setTimeout(() => this.note(1047, 0.28, 'triangle', 0.12), 110)
  }

  private tickMusic(): void {
    if (!this.ready()) return
    const track = musicTracks[this.theme]
    const index = this.step % track.melody.length
    const accent = index % 4 === 0
    const octaveLift = Math.floor(this.step / track.melody.length) % 2 === 1 && index > 39 ? 2 : 1
    this.pluck(track.melody[index] * octaveLift, accent ? 0.34 : 0.23, accent ? 0.065 : 0.047)
    if (index % 8 === 2 || index % 8 === 6) this.pluck(track.harmony[Math.floor(index / 8) % track.harmony.length], 0.31, 0.03)
    if (index % 4 === 0) this.purr(track.bass[Math.floor(index / 8) % track.bass.length], 0.34, 0.038)
    this.step += 1
  }

  playMew(): void {
    if (!this.ready()) return
    this.catMew(720 + Math.random() * 120)
  }

  private pluck(frequency: number, length: number, volume: number): void {
    if (!this.context || !this.master || !saveData.soundEnabled) return
    const oscillator = this.context.createOscillator()
    const gain = this.context.createGain()
    const now = this.context.currentTime
    oscillator.type = 'triangle'
    oscillator.frequency.setValueAtTime(frequency, now)
    gain.gain.setValueAtTime(0.0001, now)
    gain.gain.exponentialRampToValueAtTime(volume, now + 0.012)
    gain.gain.exponentialRampToValueAtTime(volume * 0.3, now + 0.06)
    gain.gain.exponentialRampToValueAtTime(0.0001, now + length)
    oscillator.connect(gain)
    gain.connect(this.master)
    oscillator.start(now)
    oscillator.stop(now + length + 0.03)
  }

  private purr(frequency: number, length: number, volume: number): void {
    if (!this.context || !this.master || !saveData.soundEnabled) return
    const oscillator = this.context.createOscillator()
    const tremolo = this.context.createOscillator()
    const tremoloGain = this.context.createGain()
    const gain = this.context.createGain()
    const now = this.context.currentTime
    oscillator.type = 'sine'
    oscillator.frequency.setValueAtTime(frequency, now)
    tremolo.type = 'sine'
    tremolo.frequency.value = 23
    tremoloGain.gain.value = volume * 0.18
    gain.gain.setValueAtTime(0.0001, now)
    gain.gain.exponentialRampToValueAtTime(volume, now + 0.03)
    gain.gain.exponentialRampToValueAtTime(0.0001, now + length)
    tremolo.connect(tremoloGain)
    tremoloGain.connect(gain.gain)
    oscillator.connect(gain)
    gain.connect(this.master)
    oscillator.start(now); tremolo.start(now)
    oscillator.stop(now + length + 0.04); tremolo.stop(now + length + 0.04)
  }

  private catMew(frequency: number): void {
    if (!this.context || !this.master || !this.meowBus || !saveData.soundEnabled) return
    const voice = this.context.createOscillator()
    const overtone = this.context.createOscillator()
    const hum = this.context.createOscillator()
    const vibrato = this.context.createOscillator()
    const vibratoDepth = this.context.createGain()
    const formant = this.context.createBiquadFilter()
    const voiceGain = this.context.createGain()
    const overtoneGain = this.context.createGain()
    const humGain = this.context.createGain()
    const now = this.context.currentTime
    // 两段式“咪—呜”：前半轻启声，后半上扬后回落；辅以很浅的共振和颤音，避免铃铛般的电子感。
    voice.type = 'sine'
    voice.frequency.setValueAtTime(frequency * 0.56, now)
    voice.frequency.exponentialRampToValueAtTime(frequency * 0.8, now + 0.09)
    voice.frequency.exponentialRampToValueAtTime(frequency * 1.18, now + 0.22)
    voice.frequency.exponentialRampToValueAtTime(frequency * 0.7, now + 0.62)
    overtone.type = 'triangle'
    overtone.frequency.setValueAtTime(frequency * 1.18, now)
    overtone.frequency.exponentialRampToValueAtTime(frequency * 1.68, now + 0.19)
    overtone.frequency.exponentialRampToValueAtTime(frequency * 0.98, now + 0.58)
    hum.type = 'sine'
    hum.frequency.setValueAtTime(frequency * 0.28, now)
    hum.frequency.exponentialRampToValueAtTime(frequency * 0.38, now + 0.16)
    hum.frequency.exponentialRampToValueAtTime(frequency * 0.25, now + 0.46)
    vibrato.type = 'sine'; vibrato.frequency.value = 6.2; vibratoDepth.gain.value = 7
    formant.type = 'bandpass'; formant.frequency.setValueAtTime(1250, now); formant.Q.value = 0.72
    voiceGain.gain.setValueAtTime(0.0001, now)
    voiceGain.gain.exponentialRampToValueAtTime(0.25, now + 0.075)
    voiceGain.gain.exponentialRampToValueAtTime(0.34, now + 0.22)
    voiceGain.gain.exponentialRampToValueAtTime(0.0001, now + 0.66)
    overtoneGain.gain.setValueAtTime(0.0001, now)
    overtoneGain.gain.exponentialRampToValueAtTime(0.05, now + 0.11)
    overtoneGain.gain.exponentialRampToValueAtTime(0.0001, now + 0.58)
    humGain.gain.setValueAtTime(0.0001, now)
    humGain.gain.exponentialRampToValueAtTime(0.045, now + 0.04)
    humGain.gain.exponentialRampToValueAtTime(0.0001, now + 0.32)
    vibrato.connect(vibratoDepth); vibratoDepth.connect(voice.detune); vibratoDepth.connect(overtone.detune)
    voice.connect(voiceGain); overtone.connect(overtoneGain); hum.connect(humGain)
    voiceGain.connect(formant); overtoneGain.connect(formant); humGain.connect(formant); formant.connect(this.meowBus)
    voice.start(now); overtone.start(now); hum.start(now); vibrato.start(now)
    voice.stop(now + 0.7); overtone.stop(now + 0.65); hum.stop(now + 0.5); vibrato.stop(now + 0.7)
  }

  private note(frequency: number, length: number, type: OscillatorType, volume: number): void {
    if (!this.context || !this.master || !saveData.soundEnabled) return
    const oscillator = this.context.createOscillator()
    const gain = this.context.createGain()
    const now = this.context.currentTime
    oscillator.type = type
    oscillator.frequency.setValueAtTime(frequency, now)
    gain.gain.setValueAtTime(0.0001, now)
    gain.gain.exponentialRampToValueAtTime(volume, now + 0.015)
    gain.gain.exponentialRampToValueAtTime(0.0001, now + length)
    oscillator.connect(gain)
    gain.connect(this.master)
    oscillator.start(now)
    oscillator.stop(now + length + 0.03)
  }
}

const sound = new SoundGarden()
let activeGame: GameSession | undefined

function soundLabel(): string {
  return saveData.soundEnabled ? '声音：开' : '声音：关'
}

function starsMarkup(count: number, muted = false): string {
  return Array.from({ length: 3 }, (_, index) => `<span class="star ${index < count ? '' : 'is-empty'} ${muted ? 'is-small' : ''}">★</span>`).join('')
}

function catChoicesMarkup(): string {
  return (Object.keys(catOptions) as CatId[]).map((id) => {
    const cat = catOptions[id]
    const chosen = saveData.cat === id
    return `<button class="cat-choice ${chosen ? 'is-selected' : ''}" type="button" data-cat="${id}" aria-pressed="${chosen}">
      <span class="cat-choice-art"><img src="${cat.image}" alt="${cat.name}" /></span>
      <span class="cat-choice-copy"><b>${cat.name}</b><small>${cat.note}</small></span>
      <span class="cat-choice-check" aria-hidden="true">${chosen ? '✓' : ''}</span>
    </button>`
  }).join('')
}

function showCatSelect(level: LevelDefinition): void {
  activeGame?.destroy()
  activeGame = undefined
  root.innerHTML = `
    <main class="game-shell cat-select-shell">
      <header class="cat-select-topbar"><button class="round-button" id="catBack" type="button" aria-label="回到冒险地图">‹</button><div><small>出发前的小仪式</small><strong>和谁一起冒险？</strong></div><span></span></header>
      <section class="cat-select-card">
        <p class="eyebrow">选一只小伙伴</p>
        <p class="cat-select-note">每只小猫都会陪你走过 <b>${level.title}</b></p>
        <div class="cat-choice-list">${catChoicesMarkup()}</div>
        <button class="primary-button cat-start-button" id="catStart" type="button">带 ${catOptions[saveData.cat].name} 出发 <span>→</span></button>
      </section>
    </main>
  `
  document.querySelector<HTMLButtonElement>('#catBack')!.addEventListener('click', showHome)
  document.querySelectorAll<HTMLButtonElement>('[data-cat]').forEach((button) => {
    button.addEventListener('click', () => {
      const id = button.dataset.cat as CatId
      saveData.cat = id
      persist()
      document.querySelectorAll<HTMLButtonElement>('[data-cat]').forEach((choice) => {
        const selected = choice.dataset.cat === id
        choice.classList.toggle('is-selected', selected)
        choice.setAttribute('aria-pressed', String(selected))
        choice.querySelector<HTMLElement>('.cat-choice-check')!.textContent = selected ? '✓' : ''
      })
      document.querySelector<HTMLButtonElement>('#catStart')!.innerHTML = `带 ${catOptions[id].name} 出发 <span>→</span>`
    })
  })
  document.querySelector<HTMLButtonElement>('#catStart')!.addEventListener('click', () => {
    sound.startMusic(level.theme)
    showGame(level)
  })
}

function showHome(): void {
  activeGame?.destroy()
  activeGame = undefined
  const totalStars = saveData.bestStars[1] + saveData.bestStars[2] + saveData.bestStars[3]
  root.innerHTML = `
    <main class="game-shell home-shell">
      <section class="home-hero" aria-label="小猫们在童话花园入口" style="--hero-image: url('${homeHeroImage}')">
        <div class="hero-wash"></div>
        <div class="home-topline">
          <span class="home-brand"><i>🐾</i> 猫咪花园探险社</span>
          <button class="sound-button" id="soundToggle" type="button" aria-label="${soundLabel()}" aria-pressed="${saveData.soundEnabled}"><span>${saveData.soundEnabled ? '♪' : '×'}</span>${saveData.soundEnabled ? '音乐开' : '已静音'}</button>
        </div>
        <div class="hero-copy">
          <p class="hero-kicker"><span></span> 一场会发光的温柔冒险 <span></span></p>
          <h1><span>小猫迷宫</span><em>大冒险</em></h1>
          <p class="hero-note">沿着花香小路，陪三只小猫<br>找回藏在迷宫里的小鱼干</p>
          <button class="primary-button hero-start-button" id="startAdventure" type="button"><b>和小猫一起出发</b><span>›</span></button>
          <small class="hero-promise">无需下载 · 不用登录 · 随时回来继续</small>
        </div>
        <div class="hero-scroll-cue"><span>向下发现三座迷宫</span><b>⌄</b></div>
      </section>
      <section class="level-panel" aria-label="关卡入口">
        <div class="home-progress-card">
          <div><span class="progress-icon">✦</span><p><small>我的冒险手册</small><strong>${totalStars === 0 ? '从花园迷宫开始吧' : `已经点亮 ${totalStars} 颗星星`}</strong></p></div>
          <span class="progress-count"><b>${totalStars}</b><small>/ 9 ⭐</small></span>
        </div>
        <div class="panel-heading"><div><p class="eyebrow">今天想去哪里？</p><h2>选择一段旅程</h2></div><span class="unlocked-total">${saveData.unlockedLevel} / 3 已开启</span></div>
        <div class="level-list">
          ${LEVELS.map((level) => levelCard(level)).join('')}
        </div>
        <p class="home-footer-note">慢慢走也没关系，每条小路都有惊喜。</p>
      </section>
    </main>
  `
  document.querySelector<HTMLButtonElement>('#startAdventure')!.addEventListener('click', () => {
    const level = LEVELS[Math.min(saveData.unlockedLevel - 1, LEVELS.length - 1)]
    showCatSelect(level)
  })
  document.querySelector<HTMLButtonElement>('#soundToggle')!.addEventListener('click', () => {
    sound.setEnabled(!saveData.soundEnabled)
    showHome()
  })
  document.querySelectorAll<HTMLButtonElement>('[data-level]').forEach((button) => {
    button.addEventListener('click', () => {
      const id = Number(button.dataset.level) as 1 | 2 | 3
      if (DEBUG_ROUTES || id <= saveData.unlockedLevel) {
        showCatSelect(LEVELS[id - 1])
      }
    })
  })
}

function levelCard(level: LevelDefinition): string {
  const locked = !DEBUG_ROUTES && level.id > saveData.unlockedLevel
  const labels = { 1: '花香初遇', 2: '蘑菇秘境', 3: '月光终章' }
  return `
    <button class="level-card theme-${level.theme} ${locked ? 'is-locked' : ''}" type="button" data-level="${level.id}" style="--level-art: url('${levelArtwork[level.theme]}')" ${locked ? 'aria-disabled="true"' : ''}>
      <span class="level-art"><b>0${level.id}</b></span>
      <span class="level-card-copy"><small>${labels[level.id]}</small><strong>${level.title}</strong><em>${locked ? '完成上一段旅程后开启' : level.subtitle}</em></span>
      <span class="card-status">${locked ? '<i>🔒</i>' : `<span class="card-score">${starsMarkup(saveData.bestStars[level.id], true)}</span><i>›</i>`}</span>
    </button>
  `
}

function showGame(level: LevelDefinition): void {
  activeGame?.destroy()
  sound.startMusic(level.theme)
  root.innerHTML = `
    <main class="game-shell play-shell">
      <header class="play-topbar">
        <button class="round-button" id="homeButton" type="button" aria-label="回到冒险地图">‹</button>
        <div class="level-title"><small>第 ${level.id} 关</small><strong>${level.title}</strong></div>
        <button class="sound-button compact" id="soundToggle" type="button" aria-pressed="${saveData.soundEnabled}">${saveData.soundEnabled ? '🔊' : '🔇'}</button>
      </header>
      <section class="play-card">
        <div class="hud-row"><span class="fish-meter">鱼干 <b id="fishCount">0</b>/3</span><span id="hintLabel">按住小猫，沿小路走</span></div>
        <div class="canvas-frame"><canvas id="mazeCanvas" aria-label="${level.title}迷宫，按住小猫沿小路移动"></canvas><div class="message-bubble" id="messageBubble" aria-live="polite"></div></div>
        <div class="play-actions"><button id="restartButton" class="secondary-button" type="button">↻ 重新开始</button><span>小老鼠也在散步，等一等就好</span></div>
      </section>
    </main>
    <div class="rotate-overlay" aria-hidden="true"><span>↻</span>请竖屏继续冒险</div>
  `
  document.querySelector<HTMLButtonElement>('#homeButton')!.addEventListener('click', showHome)
  document.querySelector<HTMLButtonElement>('#soundToggle')!.addEventListener('click', () => {
    sound.setEnabled(!saveData.soundEnabled)
    const button = document.querySelector<HTMLButtonElement>('#soundToggle')!
    button.textContent = saveData.soundEnabled ? '🔊' : '🔇'
    button.setAttribute('aria-pressed', String(saveData.soundEnabled))
  })
  const session = new GameSession(level, document.querySelector<HTMLCanvasElement>('#mazeCanvas')!)
  activeGame = session
  document.querySelector<HTMLButtonElement>('#restartButton')!.addEventListener('click', () => session.restart())
  session.start()
}

function showResult(level: LevelDefinition, stars: number): void {
  activeGame?.destroy()
  activeGame = undefined
  const isLast = level.id === 3
  root.innerHTML = `
    <main class="game-shell result-shell theme-${level.theme}">
      <div class="result-sparkles">✦　·　✦　·　✦</div>
      <section class="result-card">
        <span class="result-badge">${stars === 3 ? '闪闪发光！' : '做得真好！'}</span>
        <h1>${level.title}<br><em>通关啦</em></h1>
        <div class="big-stars" aria-label="获得 ${stars} 颗星">${starsMarkup(stars)}</div>
        <p>${stars === 3 ? '三条小鱼干都被找到啦，小猫开心地转了个圈！' : '再走一次，找齐三条小鱼干就能得到三星哦。'}</p>
        <div class="result-actions">
          <button class="primary-button" id="nextButton" type="button">${isLast ? '看看星光成绩' : '下一关 →'}</button>
          <button class="text-button" id="replayButton" type="button">再玩一次</button>
        </div>
      </section>
    </main>
  `
  document.querySelector<HTMLButtonElement>('#nextButton')!.addEventListener('click', () => isLast ? showFinal() : showGame(LEVELS[level.id]))
  document.querySelector<HTMLButtonElement>('#replayButton')!.addEventListener('click', () => showGame(level))
}

function showFinal(): void {
  const total = saveData.bestStars[1] + saveData.bestStars[2] + saveData.bestStars[3]
  root.innerHTML = `
    <main class="game-shell finale-shell">
      <div class="constellation">✦　·　✦<br>　　✦　　<br>✦　·　✦</div>
      <section class="finale-card">
        <p class="eyebrow">三座迷宫都点亮了</p>
        <h1>星光森林<br><em>为你鼓掌</em></h1>
        <div class="total-score"><strong>${total}</strong><span>/ 9 颗星</span></div>
        <div class="big-stars">${starsMarkup(Math.max(1, Math.ceil(total / 3)))}</div>
        <p>小猫把鱼干分给了花园里的朋友。下一次，还能把每一关都点亮成三星！</p>
        <button class="primary-button" id="mapButton" type="button">回到冒险地图</button>
      </section>
    </main>
  `
  document.querySelector<HTMLButtonElement>('#mapButton')!.addEventListener('click', showHome)
}

class GameSession {
  private readonly level: LevelDefinition
  private readonly canvas: HTMLCanvasElement
  private readonly context: CanvasRenderingContext2D
  private readonly fishCount: HTMLElement
  private readonly hintLabel: HTMLElement
  private readonly bubble: HTMLElement
  private position: RoutePosition
  private collected = new Set<number>()
  private phase: Phase = 'playing'
  private dragging = false
  private pointerId?: number
  private pointerTarget?: Point
  private followUntil = 0
  private elapsed = 0
  private animationTime = 0
  private lastMoveAt = -1
  private celebrateUntil = 0
  private idleAction: IdleAction = 'none'
  private idleActionUntil = 0
  private nextIdleActionAt = 2.6
  private mousePositions: Point[] = []
  private wanderers: Array<Wanderer | undefined> = []
  private heading = p(0, -1)
  private lastFrame = performance.now()
  private frameId?: number
  private collisionUntil = 0
  private tutorialActive: boolean
  private destroyed = false
  private scaleX = 1
  private scaleY = 1

  constructor(level: LevelDefinition, canvas: HTMLCanvasElement) {
    this.level = level
    this.canvas = canvas
    const context = canvas.getContext('2d')
    if (!context) throw new Error('Canvas is unavailable')
    this.context = context
    this.position = { ...level.start }
    this.fishCount = document.querySelector<HTMLElement>('#fishCount')!
    this.hintLabel = document.querySelector<HTMLElement>('#hintLabel')!
    this.bubble = document.querySelector<HTMLElement>('#messageBubble')!
    this.tutorialActive = !saveData.tutorialSeen && level.id === 1
    this.resetMice()
  }

  start(): void {
    this.resize()
    this.canvas.addEventListener('pointerdown', this.onPointerDown)
    this.canvas.addEventListener('pointermove', this.onPointerMove)
    this.canvas.addEventListener('pointerup', this.onPointerUp)
    this.canvas.addEventListener('pointercancel', this.onPointerUp)
    window.addEventListener('resize', this.resize)
    document.addEventListener('visibilitychange', this.onVisibilityChange)
    this.frameId = requestAnimationFrame(this.loop)
  }

  destroy(): void {
    this.destroyed = true
    if (this.frameId) cancelAnimationFrame(this.frameId)
    this.canvas.removeEventListener('pointerdown', this.onPointerDown)
    this.canvas.removeEventListener('pointermove', this.onPointerMove)
    this.canvas.removeEventListener('pointerup', this.onPointerUp)
    this.canvas.removeEventListener('pointercancel', this.onPointerUp)
    window.removeEventListener('resize', this.resize)
    document.removeEventListener('visibilitychange', this.onVisibilityChange)
  }

  restart(): void {
    this.position = { ...this.level.start }
    this.collected.clear()
    this.elapsed = 0
    this.animationTime = 0
    this.lastMoveAt = -1
    this.celebrateUntil = 0
    this.idleAction = 'none'
    this.idleActionUntil = 0
    this.nextIdleActionAt = 2.6
    this.resetMice()
    this.phase = 'playing'
    this.dragging = false
    this.pointerTarget = undefined
    this.followUntil = 0
    this.updateHud()
    this.showBubble('重新出发！小猫已经准备好啦。', 'show')
    window.setTimeout(() => this.showBubble('', ''), 900)
  }

  private readonly resize = (): void => {
    const rect = this.canvas.getBoundingClientRect()
    const ratio = Math.min(window.devicePixelRatio || 1, 2)
    this.canvas.width = Math.max(1, Math.round(rect.width * ratio))
    this.canvas.height = Math.max(1, Math.round(rect.height * ratio))
    this.scaleX = rect.width / LOGICAL_WIDTH
    this.scaleY = rect.height / LOGICAL_HEIGHT
  }

  private readonly onVisibilityChange = (): void => {
    this.lastFrame = performance.now()
  }

  private readonly onPointerDown = (event: PointerEvent): void => {
    if (this.phase !== 'playing') return
    const pointer = this.toWorld(event)
    if (distance(pointer, this.catPoint()) > 34) return
    this.dragging = true
    this.idleAction = 'none'
    this.nextIdleActionAt = this.animationTime + 1.15
    this.pointerId = event.pointerId
    this.pointerTarget = pointer
    this.followUntil = Number.POSITIVE_INFINITY
    this.canvas.setPointerCapture(event.pointerId)
    event.preventDefault()
  }

  private readonly onPointerMove = (event: PointerEvent): void => {
    if (!this.dragging || event.pointerId !== this.pointerId || this.phase !== 'playing') return
    this.pointerTarget = this.toWorld(event)
    event.preventDefault()
  }

  private readonly onPointerUp = (event: PointerEvent): void => {
    if (event.pointerId !== this.pointerId) return
    this.dragging = false
    this.pointerId = undefined
    this.followUntil = this.animationTime + 0.55
    if (this.canvas.hasPointerCapture(event.pointerId)) this.canvas.releasePointerCapture(event.pointerId)
    this.nextIdleActionAt = this.animationTime + 1.25 + Math.random() * 0.8
  }

  private toWorld(event: PointerEvent): Point {
    const rect = this.canvas.getBoundingClientRect()
    return p((event.clientX - rect.left) / this.scaleX, (event.clientY - rect.top) / this.scaleY)
  }

  private catPoint(): Point {
    return pointOnSegment(this.level.segments[this.position.segment], this.position.t)
  }

  private accessibleSegments(): number[] {
    const current = this.level.segments[this.position.segment]
    const cat = this.catPoint()
    const ids = new Set<number>([this.position.segment])
    ;[current.a, current.b].forEach((joint) => {
      if (distance(cat, joint) > 68) return
      this.level.segments.forEach((candidate, index) => {
        if (samePoint(candidate.a, joint) || samePoint(candidate.b, joint)) ids.add(index)
      })
    })
    return [...ids]
  }

  private moveCatTowardPointer(delta: number): boolean {
    if ((!this.dragging && this.animationTime >= this.followUntil) || !this.pointerTarget) {
      if (!this.dragging) this.pointerTarget = undefined
      return false
    }
    const before = this.catPoint()
    const fingerDistance = distance(before, this.pointerTarget)
    if (fingerDistance < 4) {
      if (!this.dragging) this.pointerTarget = undefined
      return false
    }
    let best: { id: number; t: number; point: Point; distance: number } | undefined
    this.accessibleSegments().forEach((id) => {
      const projected = projectToSegment(this.pointerTarget!, this.level.segments[id])
      const switchPenalty = id === this.position.segment ? 5 : 0
      const score = projected.distance + switchPenalty
      if (!best || score < best.distance) best = { id, t: projected.t, point: projected.point, distance: score }
    })
    if (!best) return false

    const speed = Math.min(480, 130 + fingerDistance * 1.55)
    let remaining = speed * delta
    if (best.id !== this.position.segment) {
      const current = this.level.segments[this.position.segment]
      const connectsAtStart = samePoint(this.level.segments[best.id].a, current.a) || samePoint(this.level.segments[best.id].b, current.a)
      const jointT = connectsAtStart ? 0 : 1
      const distanceToJoint = Math.abs(jointT - this.position.t) * segmentLength(current)
      if (remaining < distanceToJoint) {
        this.position.t += Math.sign(jointT - this.position.t) * remaining / segmentLength(current)
        remaining = 0
      } else {
        remaining -= distanceToJoint
        const joint = pointOnSegment(current, jointT)
        const next = this.level.segments[best.id]
        const nextStartT = samePoint(next.a, joint) ? 0 : 1
        this.position = { segment: best.id, t: nextStartT }
      }
    }
    if (remaining > 0) {
      const current = this.level.segments[this.position.segment]
      const targetT = best.id === this.position.segment ? best.t : projectToSegment(this.pointerTarget, current).t
      const maxT = remaining / segmentLength(current)
      this.position.t += Math.sign(targetT - this.position.t) * Math.min(Math.abs(targetT - this.position.t), maxT)
    }
    const after = this.catPoint()
    const movedDistance = distance(before, after)
    if (movedDistance > 0.3) {
      this.heading = p((after.x - before.x) / movedDistance, (after.y - before.y) / movedDistance)
      this.lastMoveAt = this.animationTime
      this.idleAction = 'none'
      this.nextIdleActionAt = this.animationTime + 1.35 + Math.random() * 0.8
    }
    if (movedDistance > 3.5 && Math.floor(this.animationTime * 5) !== Math.floor((this.animationTime - delta) * 5)) sound.play('move')
    return movedDistance > 0.3
  }

  private readonly loop = (now: number): void => {
    if (this.destroyed) return
    const delta = Math.min(0.035, Math.max(0, (now - this.lastFrame) / 1000))
    this.lastFrame = now
    if (!document.hidden) this.update(now, delta)
    this.render()
    this.frameId = requestAnimationFrame(this.loop)
  }

  private update(now: number, delta: number): void {
    this.animationTime += delta
    if (this.phase === 'collision') {
      if (now >= this.collisionUntil) {
        this.phase = 'playing'
        this.showBubble('', '')
      }
      return
    }
    if (this.phase !== 'playing') return
    const catMoved = this.moveCatTowardPointer(delta)
    if (catMoved && this.tutorialActive) {
      this.tutorialActive = false
      saveData.tutorialSeen = true
      persist()
      this.hintLabel.textContent = '走得真稳，继续找小鱼干吧！'
    }
    this.updateIdleAction()
    this.updateMice(delta)
    this.elapsed += delta
    const cat = this.catPoint()
    this.level.fish.forEach((fish, index) => {
      if (!this.collected.has(index) && distance(cat, fish) < 24) {
        this.collected.add(index)
        this.celebrateUntil = this.animationTime + 0.62
        sound.play('fish')
        this.updateHud()
        this.showBubble('找到了小鱼干！', 'show happy')
        window.setTimeout(() => this.showBubble('', ''), 680)
      }
    })
    const mouseHit = this.level.patrols.some((patrol, index) => distance(cat, this.mousePositions[index] ?? pointOnPatrol(patrol, this.elapsed)) < 28)
    if (mouseHit) {
      this.phase = 'collision'
      this.position = { ...this.level.start }
      this.elapsed = 0
      this.dragging = false
      this.pointerTarget = undefined
      this.followUntil = 0
      this.collisionUntil = now + 900
      sound.play('bump')
      this.showBubble('哎呀，小老鼠先过去啦！', 'show')
      return
    }
    if (distance(cat, this.level.exit) < 27) this.complete()
  }

  private updateIdleAction(): void {
    if (this.idleAction !== 'none' && this.animationTime >= this.idleActionUntil) this.idleAction = 'none'
    const resting = !this.dragging && this.animationTime - this.lastMoveAt > 0.8
    if (!resting || this.idleAction !== 'none' || this.animationTime < this.nextIdleActionAt) return
    const actions: IdleAction[] = ['look', 'groom', 'stretch', 'meow']
    this.idleAction = actions[Math.floor(Math.random() * actions.length)]
    const duration = this.idleAction === 'stretch' ? 1.15 : this.idleAction === 'groom' ? 1.35 : 0.9
    this.idleActionUntil = this.animationTime + duration
    this.nextIdleActionAt = this.idleActionUntil + 3.6 + Math.random() * 3.4
    if (this.idleAction === 'meow') sound.playMew()
  }

  private resetMice(): void {
    this.wanderers = this.level.patrols.map((patrol) => {
      if (!patrol.wander) return undefined
      const origin = patrol.path[0]
      let closest = { segment: 0, ...projectToSegment(origin, this.level.segments[0]) }
      this.level.segments.forEach((segment, index) => {
        const projected = projectToSegment(origin, segment)
        if (projected.distance < closest.distance) closest = { segment: index, ...projected }
      })
      return { segment: closest.segment, t: closest.t, direction: Math.random() < 0.5 ? 1 : -1 }
    })
    this.mousePositions = this.level.patrols.map((patrol, index) => {
      const wanderer = this.wanderers[index]
      return wanderer ? pointOnSegment(this.level.segments[wanderer.segment], wanderer.t) : pointOnPatrol(patrol, this.elapsed)
    })
  }

  private updateMice(delta: number): void {
    this.level.patrols.forEach((patrol, index) => {
      const wanderer = this.wanderers[index]
      if (!wanderer) {
        this.mousePositions[index] = pointOnPatrol(patrol, this.elapsed + delta)
        return
      }
      let remaining = patrol.speed * delta
      while (remaining > 0.01) {
        const segment = this.level.segments[wanderer.segment]
        const length = segmentLength(segment)
        const distanceToJoint = (wanderer.direction > 0 ? 1 - wanderer.t : wanderer.t) * length
        if (remaining < distanceToJoint) {
          wanderer.t += wanderer.direction * (remaining / length)
          remaining = 0
          break
        }
        wanderer.t = wanderer.direction > 0 ? 1 : 0
        remaining -= distanceToJoint
        const joint = wanderer.direction > 0 ? segment.b : segment.a
        const choices = this.level.segments.map((candidate, candidateIndex) => ({ candidate, candidateIndex }))
          .filter(({ candidate }) => candidate.mouseAllowed && (samePoint(candidate.a, joint) || samePoint(candidate.b, joint)))
        const next = choices.length > 1
          ? choices.filter(({ candidateIndex }) => candidateIndex !== wanderer.segment)[Math.floor(Math.random() * (choices.length - 1))]
          : choices[0]
        if (!next) { remaining = 0; break }
        wanderer.segment = next.candidateIndex
        wanderer.direction = samePoint(next.candidate.a, joint) ? 1 : -1
        wanderer.t = wanderer.direction > 0 ? 0 : 1
      }
      // 每一帧都从当前路段的参数位置取点，随机选择只发生在相连的路口，绝不走到路面之外。
      this.mousePositions[index] = pointOnSegment(this.level.segments[wanderer.segment], wanderer.t)
    })
  }

  private complete(): void {
    if (this.phase !== 'playing') return
    this.phase = 'complete'
    this.dragging = false
    this.pointerTarget = undefined
    this.followUntil = 0
    const stars = starCount(this.collected.size)
    saveData.bestStars[this.level.id] = Math.max(saveData.bestStars[this.level.id], stars)
    if (this.level.id < 3) saveData.unlockedLevel = Math.max(saveData.unlockedLevel, (this.level.id + 1) as 1 | 2 | 3) as 1 | 2 | 3
    persist()
    sound.play('win')
    this.showBubble('到终点啦，星星正在落下！', 'show happy')
    window.setTimeout(() => {
      if (!this.destroyed) showResult(this.level, stars)
    }, 760)
  }

  private updateHud(): void {
    this.fishCount.textContent = String(this.collected.size)
    if (!this.tutorialActive && this.collected.size === 3) this.hintLabel.textContent = '三条鱼干都找到了，去终点吧！'
  }

  private showBubble(message: string, className: string): void {
    this.bubble.textContent = message
    this.bubble.className = `message-bubble ${className}`
  }

  private render(): void {
    const ratio = Math.min(window.devicePixelRatio || 1, 2)
    const ctx = this.context
    ctx.setTransform(ratio * this.scaleX, 0, 0, ratio * this.scaleY, 0, 0)
    ctx.clearRect(0, 0, LOGICAL_WIDTH, LOGICAL_HEIGHT)
    const motion: CatMotion = {
      heading: this.heading,
      trotting: this.animationTime - this.lastMoveAt < 0.18,
      celebrating: this.animationTime < this.celebrateUntil || this.phase === 'complete',
      idleAction: this.idleAction,
    }
    drawWorld(ctx, this.level, this.elapsed, this.collected, this.catPoint(), this.animationTime, motion, this.phase, this.mousePositions)
  }
}

function pointOnPatrol(patrol: Patrol, elapsed: number): Point {
  const lengths = patrol.path.slice(0, -1).map((point, index) => distance(point, patrol.path[index + 1]))
  const total = lengths.reduce((sum, value) => sum + value, 0)
  if (total === 0) return patrol.path[0]
  let cursor = (elapsed * patrol.speed + patrol.offset) % (total * 2)
  if (cursor > total) cursor = total * 2 - cursor
  for (let index = 0; index < lengths.length; index += 1) {
    if (cursor <= lengths[index]) return lerp(patrol.path[index], patrol.path[index + 1], cursor / lengths[index])
    cursor -= lengths[index]
  }
  return patrol.path[patrol.path.length - 1]
}

function drawWorld(ctx: CanvasRenderingContext2D, level: LevelDefinition, elapsed: number, collected: Set<number>, cat: Point, animationTime: number, motion: CatMotion, phase: Phase, mousePositions: Point[]): void {
  const palette = themes[level.theme]
  const boardImage = boardImages[level.theme]
  if (boardImage.complete && boardImage.naturalWidth > 0) {
    ctx.drawImage(boardImage, 0, 0, LOGICAL_WIDTH, LOGICAL_HEIGHT)
    ctx.fillStyle = level.theme === 'starlight' ? 'rgba(18, 32, 70, .04)' : 'rgba(255, 253, 238, .035)'
    ctx.fillRect(0, 0, LOGICAL_WIDTH, LOGICAL_HEIGHT)
  } else {
    const gradient = ctx.createLinearGradient(0, 0, 0, LOGICAL_HEIGHT)
    gradient.addColorStop(0, palette.sky)
    gradient.addColorStop(1, palette.skyEnd)
    ctx.fillStyle = gradient
    ctx.fillRect(0, 0, LOGICAL_WIDTH, LOGICAL_HEIGHT)
    drawAtmosphere(ctx, level.theme, elapsed)
    drawDecorations(ctx, level, palette)
    drawPaths(ctx, level, palette)
  }
  if (DEBUG_ROUTES) drawRouteDebug(ctx, level)
  level.fish.forEach((fish, index) => {
    if (!collected.has(index)) drawFish(ctx, fish, elapsed + index)
  })
  drawExit(ctx, level.exit, level.theme, elapsed)
  level.patrols.forEach((patrol, index) => drawMouse(ctx, mousePositions[index] ?? pointOnPatrol(patrol, elapsed), palette.ink, index))
  drawCat(ctx, cat, palette.ink, animationTime, motion, phase)
}

function drawAtmosphere(ctx: CanvasRenderingContext2D, theme: Theme, elapsed: number): void {
  ctx.save()
  if (theme === 'starlight') {
    for (let index = 0; index < 28; index += 1) {
      const x = (index * 71 + 23) % LOGICAL_WIDTH
      const y = (index * 47 + 29) % 350
      const glow = 0.45 + 0.35 * Math.sin(elapsed * 2 + index)
      ctx.fillStyle = `rgba(255, 239, 164, ${glow})`
      ctx.beginPath(); ctx.arc(x, y, index % 3 === 0 ? 2.3 : 1.2, 0, Math.PI * 2); ctx.fill()
    }
  } else {
    for (let index = 0; index < 18; index += 1) {
      const x = (index * 83 + 17) % LOGICAL_WIDTH
      const y = 34 + ((index * 59) % 470)
      ctx.fillStyle = theme === 'garden' ? 'rgba(255,255,230,.32)' : 'rgba(255,242,250,.32)'
      ctx.beginPath(); ctx.arc(x, y, 10 + (index % 4) * 5, 0, Math.PI * 2); ctx.fill()
    }
  }
  ctx.restore()
}

function drawDecorations(ctx: CanvasRenderingContext2D, level: LevelDefinition, palette: (typeof themes)[Theme]): void {
  const dots = level.theme === 'starlight' ? 18 : 25
  for (let index = 0; index < dots; index += 1) {
    const x = 18 + ((index * 83) % 350)
    const y = 74 + ((index * 67) % 470)
    if (level.segments.some((seg) => projectToSegment(p(x, y), seg).distance < 42)) continue
    if (level.theme === 'mushroom' && index % 3 !== 0) drawMushroom(ctx, p(x, y), 0.55 + (index % 3) * 0.13)
    else if (level.theme === 'starlight') drawStarPlant(ctx, p(x, y), 0.6 + (index % 3) * 0.1)
    else drawFlower(ctx, p(x, y), palette.accent, 0.55 + (index % 4) * 0.1)
  }
}

function drawPaths(ctx: CanvasRenderingContext2D, level: LevelDefinition, palette: (typeof themes)[Theme]): void {
  ctx.save()
  ctx.lineCap = 'round'
  ctx.lineJoin = 'round'
  level.segments.forEach((seg) => {
    ctx.beginPath(); ctx.moveTo(seg.points[0].x, seg.points[0].y); seg.points.slice(1).forEach((point) => ctx.lineTo(point.x, point.y))
    ctx.strokeStyle = 'rgba(39, 91, 77, .16)'; ctx.lineWidth = 68; ctx.stroke()
    ctx.beginPath(); ctx.moveTo(seg.points[0].x, seg.points[0].y); seg.points.slice(1).forEach((point) => ctx.lineTo(point.x, point.y))
    ctx.strokeStyle = palette.edge; ctx.lineWidth = 60; ctx.stroke()
    ctx.beginPath(); ctx.moveTo(seg.points[0].x, seg.points[0].y); seg.points.slice(1).forEach((point) => ctx.lineTo(point.x, point.y))
    ctx.strokeStyle = palette.path; ctx.lineWidth = 50; ctx.stroke()
    ctx.beginPath(); ctx.moveTo(seg.points[0].x, seg.points[0].y); seg.points.slice(1).forEach((point) => ctx.lineTo(point.x, point.y))
    ctx.strokeStyle = level.theme === 'starlight' ? 'rgba(255,255,255,.24)' : 'rgba(255,255,245,.4)'
    ctx.lineWidth = 2; ctx.setLineDash([1, 13]); ctx.stroke()
  })
  ctx.setLineDash([])
  ctx.restore()
}

function drawRouteDebug(ctx: CanvasRenderingContext2D, level: LevelDefinition): void {
  ctx.save()
  ctx.lineCap = 'round'
  ctx.lineJoin = 'round'
  level.segments.forEach((seg, index) => {
    ctx.beginPath(); ctx.moveTo(seg.points[0].x, seg.points[0].y); seg.points.slice(1).forEach((point) => ctx.lineTo(point.x, point.y))
    ctx.strokeStyle = seg.mouseAllowed ? 'rgba(0, 210, 255, .8)' : 'rgba(255, 90, 140, .85)'
    ctx.lineWidth = 3
    ctx.stroke()
    const middle = pointOnSegment(seg, .5)
    ctx.fillStyle = '#10264f'; ctx.font = '700 10px sans-serif'; ctx.textAlign = 'center'; ctx.fillText(String(index), middle.x, middle.y - 5)
    ;[seg.a, seg.b].forEach((point) => { ctx.beginPath(); ctx.arc(point.x, point.y, 4, 0, Math.PI * 2); ctx.fillStyle = '#fff'; ctx.fill(); ctx.stroke() })
  })
  ctx.restore()
}

function drawFlower(ctx: CanvasRenderingContext2D, at: Point, color: string, scale: number): void {
  ctx.save(); ctx.translate(at.x, at.y); ctx.scale(scale, scale)
  ctx.strokeStyle = '#447a56'; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(0, 12); ctx.lineTo(0, 0); ctx.stroke()
  ctx.fillStyle = color
  for (let index = 0; index < 5; index += 1) { ctx.rotate((Math.PI * 2) / 5); ctx.beginPath(); ctx.ellipse(0, -5, 4, 7, 0, 0, Math.PI * 2); ctx.fill() }
  ctx.fillStyle = '#ffd86f'; ctx.beginPath(); ctx.arc(0, 0, 3.2, 0, Math.PI * 2); ctx.fill(); ctx.restore()
}

function drawMushroom(ctx: CanvasRenderingContext2D, at: Point, scale: number): void {
  ctx.save(); ctx.translate(at.x, at.y); ctx.scale(scale, scale)
  ctx.fillStyle = '#f8e9cd'; ctx.beginPath(); ctx.roundRect(-5, -1, 10, 15, 5); ctx.fill()
  ctx.fillStyle = '#e97872'; ctx.beginPath(); ctx.arc(0, -2, 12, Math.PI, 0); ctx.lineTo(12, 0); ctx.lineTo(-12, 0); ctx.closePath(); ctx.fill()
  ctx.fillStyle = '#fff1cf'; [-5, 2, 6].forEach((x, index) => { ctx.beginPath(); ctx.arc(x, -5 - index, 1.8, 0, Math.PI * 2); ctx.fill() }); ctx.restore()
}

function drawStarPlant(ctx: CanvasRenderingContext2D, at: Point, scale: number): void {
  ctx.save(); ctx.translate(at.x, at.y); ctx.scale(scale, scale)
  ctx.strokeStyle = '#5aa19a'; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(0, 13); ctx.lineTo(0, 0); ctx.stroke()
  ctx.fillStyle = '#ffe783'; drawStar(ctx, 0, -3, 10, 4); ctx.fill(); ctx.restore()
}

function drawFish(ctx: CanvasRenderingContext2D, at: Point, elapsed: number): void {
  const bob = Math.sin(elapsed * 4) * 2
  ctx.save(); ctx.translate(at.x, at.y + bob); ctx.rotate(Math.sin(elapsed * 3) * 0.08)
  ctx.shadowColor = 'rgba(167, 105, 27, .32)'; ctx.shadowBlur = 11; ctx.shadowOffsetY = 3
  ctx.fillStyle = '#fff7d9'; ctx.beginPath(); ctx.ellipse(0, 0, 15, 11, 0, 0, Math.PI * 2); ctx.fill()
  ctx.fillStyle = '#f7b946'; ctx.strokeStyle = '#a96b38'; ctx.lineWidth = 1.4
  ctx.beginPath(); ctx.ellipse(0, 0, 11, 7.2, 0, 0, Math.PI * 2); ctx.fill(); ctx.stroke()
  ctx.beginPath(); ctx.moveTo(9, 0); ctx.lineTo(18, -8); ctx.lineTo(18, 8); ctx.closePath(); ctx.fill(); ctx.stroke()
  ctx.strokeStyle = 'rgba(255, 245, 190, .85)'; ctx.lineWidth = 1.2
  ctx.beginPath(); ctx.arc(-1, 0, 5, -1.2, 1.2); ctx.stroke()
  ctx.fillStyle = '#fff6c9'; ctx.beginPath(); ctx.arc(-4, -2, 1.7, 0, Math.PI * 2); ctx.fill()
  ctx.restore()
}

function drawExit(ctx: CanvasRenderingContext2D, at: Point, theme: Theme, elapsed: number): void {
  ctx.save(); ctx.translate(at.x, at.y)
  const accent = themes[theme].accent
  const glow = 13 + Math.sin(elapsed * 3) * 2
  ctx.shadowColor = theme === 'starlight' ? '#fff2a6' : accent; ctx.shadowBlur = glow
  ctx.fillStyle = 'rgba(255, 250, 221, .9)'; ctx.beginPath(); ctx.arc(0, 0, 21, 0, Math.PI * 2); ctx.fill()
  ctx.shadowBlur = 0; ctx.strokeStyle = accent; ctx.lineWidth = 2.5
  ctx.beginPath(); ctx.arc(0, 0, 17, 0, Math.PI * 2); ctx.stroke()
  ctx.fillStyle = accent
  for (let index = 0; index < 5; index += 1) {
    ctx.save(); ctx.rotate((Math.PI * 2 * index) / 5); ctx.beginPath(); ctx.ellipse(0, -11, 4, 7, 0, 0, Math.PI * 2); ctx.fill(); ctx.restore()
  }
  ctx.fillStyle = '#ffd66f'; ctx.beginPath(); ctx.arc(0, 0, 5.5, 0, Math.PI * 2); ctx.fill()
  ctx.restore()
}

function drawMouse(ctx: CanvasRenderingContext2D, at: Point, ink: string, variant: number): void {
  ctx.save(); ctx.translate(at.x, at.y)
  ctx.shadowColor = 'rgba(67, 50, 82, .24)'; ctx.shadowBlur = 5; ctx.shadowOffsetY = 2
  const sprite = mouseSpriteImages[variant % mouseSpriteImages.length]
  if (sprite.complete && sprite.naturalWidth > 0) {
    const size = 42
    ctx.drawImage(sprite, -size / 2, -size * .86, size, size)
    ctx.restore()
    return
  }
  ctx.scale(0.82, 0.82)
  ctx.strokeStyle = '#b77d96'; ctx.lineWidth = 2.6; ctx.lineCap = 'round'; ctx.beginPath(); ctx.arc(16, 4, 15, -0.5, 1.5); ctx.stroke()
  ctx.fillStyle = '#a89ab7'; ctx.strokeStyle = ink; ctx.lineWidth = 1.6
  ctx.beginPath(); ctx.ellipse(0, 4, 13, 9.5, 0, 0, Math.PI * 2); ctx.fill(); ctx.stroke()
  ctx.fillStyle = '#d9bfd0'; [-7, 6].forEach((x) => { ctx.beginPath(); ctx.arc(x, -7, 5.7, 0, Math.PI * 2); ctx.fill(); ctx.stroke() })
  ctx.fillStyle = '#fff5f4'; ctx.beginPath(); ctx.ellipse(0, 0, 10, 7, 0, 0, Math.PI * 2); ctx.fill()
  ctx.fillStyle = ink; ctx.beginPath(); ctx.arc(-4.7, 1, 1.4, 0, Math.PI * 2); ctx.arc(4.7, 1, 1.4, 0, Math.PI * 2); ctx.fill()
  ctx.fillStyle = '#e98391'; ctx.beginPath(); ctx.arc(0, 6, 2.2, 0, Math.PI * 2); ctx.fill(); ctx.restore()
}

function drawCat(ctx: CanvasRenderingContext2D, at: Point, ink: string, elapsed: number, motion: CatMotion, phase: Phase): void {
  const trotting = motion.trotting && phase === 'playing'
  const blink = !trotting && phase === 'playing' && (elapsed % 5.8) < 0.14
  const happyHop = motion.celebrating ? Math.abs(Math.sin(elapsed * 17)) * 7 : 0
  const collisionWobble = phase === 'collision' ? Math.sin(elapsed * 28) * 0.13 : 0
  const actionProgress = motion.idleAction === 'none' ? 0 : Math.sin(elapsed * 8)
  const stretching = motion.idleAction === 'stretch'
  const looking = motion.idleAction === 'look'
  const bob = phase === 'collision' ? Math.sin(elapsed * 18) * 2 : trotting ? Math.sin(elapsed * 12) * 0.42 : stretching ? Math.abs(actionProgress) * 1.4 : Math.sin(elapsed * 2.2) * 0.7
  const lean = phase === 'collision' ? collisionWobble : trotting ? motion.heading.x * 0.035 : looking ? actionProgress * 0.065 : Math.sin(elapsed * 1.15) * 0.01
  const stretchX = phase === 'collision' ? 1.12 : stretching ? 1.08 + Math.abs(actionProgress) * 0.08 : 1
  const stretchY = phase === 'collision' ? 0.88 : stretching ? 0.94 - Math.abs(actionProgress) * 0.05 : 1
  ctx.save(); ctx.translate(at.x, at.y + bob - happyHop); ctx.rotate(lean); ctx.scale(stretchX, stretchY)
  ctx.shadowColor = 'rgba(63, 82, 56, .22)'; ctx.shadowBlur = 8; ctx.shadowOffsetY = 4
  const catSpriteImage = catSpriteImages[saveData.cat]
  if (catSpriteImage.complete && catSpriteImage.naturalWidth > 0) {
    const height = 68
    const width = height * (catSpriteImage.naturalWidth / catSpriteImage.naturalHeight)
    ctx.drawImage(catSpriteImage, -width / 2, -height * .63, width, height)
    if (blink) {
      ctx.save(); ctx.strokeStyle = 'rgba(69, 74, 63, .68)'; ctx.lineWidth = 1.8; ctx.lineCap = 'round'
      ;[-12, 12].forEach((x) => { ctx.beginPath(); ctx.arc(x, -26, 4.6, 0.1, Math.PI - 0.1); ctx.stroke() })
      ctx.restore()
    }
    if (motion.idleAction === 'groom') {
      ctx.save(); ctx.fillStyle = 'rgba(255, 238, 225, .96)'; ctx.strokeStyle = 'rgba(103, 91, 85, .65)'; ctx.lineWidth = 1.2
      ctx.beginPath(); ctx.ellipse(15, -13 + actionProgress * 3, 5.8, 4.2, -0.45, 0, Math.PI * 2); ctx.fill(); ctx.stroke()
      ctx.fillStyle = 'rgba(234, 141, 151, .78)'; ctx.beginPath(); ctx.arc(15, -13 + actionProgress * 3, 1.7, 0, Math.PI * 2); ctx.fill(); ctx.restore()
    }
    if (motion.idleAction === 'look') {
      ctx.save(); ctx.strokeStyle = 'rgba(255, 255, 242, .9)'; ctx.lineWidth = 1.6; ctx.lineCap = 'round'
      ctx.beginPath(); ctx.moveTo(20, -25); ctx.lineTo(28, -30); ctx.moveTo(21, -19); ctx.lineTo(31, -20); ctx.stroke(); ctx.restore()
    }
    if (motion.idleAction === 'meow') {
      ctx.save(); ctx.translate(0, -51 + Math.sin(elapsed * 8) * 2); ctx.fillStyle = 'rgba(255, 253, 245, .96)'
      ctx.beginPath(); ctx.roundRect(-21, -12, 42, 23, 11); ctx.fill()
      ctx.fillStyle = '#d47770'; ctx.font = '700 13px "PingFang SC", sans-serif'; ctx.textAlign = 'center'; ctx.fillText('喵～', 0, 4); ctx.restore()
    }
    ctx.restore()
    return
  }
  ctx.strokeStyle = ink; ctx.lineWidth = 2.4; ctx.lineJoin = 'round'
  ctx.strokeStyle = '#d7865a'; ctx.lineWidth = 7; ctx.lineCap = 'round'; ctx.beginPath(); ctx.moveTo(15, 15); ctx.quadraticCurveTo(35, 25, 30, 3); ctx.stroke()
  ctx.strokeStyle = ink; ctx.lineWidth = 2.4
  ctx.fillStyle = '#f4bb76'; ctx.beginPath(); ctx.ellipse(0, 8, 19, 17, 0, 0, Math.PI * 2); ctx.fill(); ctx.stroke()
  ctx.beginPath(); ctx.moveTo(-14, -5); ctx.lineTo(-12, -25); ctx.lineTo(-1, -12); ctx.closePath(); ctx.fill(); ctx.stroke()
  ctx.beginPath(); ctx.moveTo(14, -5); ctx.lineTo(12, -25); ctx.lineTo(1, -12); ctx.closePath(); ctx.fill(); ctx.stroke()
  ctx.fillStyle = '#ffe0b5'; ctx.beginPath(); ctx.ellipse(0, -4, 20, 17, 0, 0, Math.PI * 2); ctx.fill(); ctx.stroke()
  ctx.fillStyle = ink; ctx.beginPath(); ctx.arc(-7, -5, 2.3, 0, Math.PI * 2); ctx.arc(7, -5, 2.3, 0, Math.PI * 2); ctx.fill()
  ctx.fillStyle = '#e48188'; ctx.beginPath(); ctx.arc(0, 2, 2.4, 0, Math.PI * 2); ctx.fill()
  ctx.strokeStyle = ink; ctx.lineWidth = 1.6; ctx.beginPath(); ctx.moveTo(-1, 5); ctx.quadraticCurveTo(0, 8, 3, 5); ctx.moveTo(-12, 3); ctx.lineTo(-22, 1); ctx.moveTo(-12, 7); ctx.lineTo(-22, 9); ctx.moveTo(12, 3); ctx.lineTo(22, 1); ctx.moveTo(12, 7); ctx.lineTo(22, 9); ctx.stroke()
  ctx.fillStyle = '#3d9b99'; ctx.beginPath(); ctx.moveTo(-18, 9); ctx.quadraticCurveTo(0, 20, 18, 9); ctx.lineTo(13, 20); ctx.quadraticCurveTo(0, 27, -13, 20); ctx.closePath(); ctx.fill(); ctx.stroke()
  ctx.restore()
}

function drawStar(ctx: CanvasRenderingContext2D, x: number, y: number, outer: number, inner: number): void {
  ctx.beginPath()
  for (let index = 0; index < 10; index += 1) {
    const radius = index % 2 === 0 ? outer : inner
    const angle = -Math.PI / 2 + (index * Math.PI) / 5
    const px = x + Math.cos(angle) * radius
    const py = y + Math.sin(angle) * radius
    if (index === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py)
  }
  ctx.closePath()
}

showHome()
