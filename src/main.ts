import './style.css'
import heroImage from './assets/garden-hero.png'
import catSprite from './assets/cat-sprite.png'

type Point = { x: number; y: number }
type Theme = 'garden' | 'mushroom' | 'starlight'
type Phase = 'playing' | 'collision' | 'complete'

type Segment = { a: Point; b: Point }
type RoutePosition = { segment: number; t: number }
type Patrol = { path: Point[]; speed: number; offset: number }

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
}

const LOGICAL_WIDTH = 390
const LOGICAL_HEIGHT = 590
const STORAGE_KEY = 'cat-maze-adventure:v1'
const root = document.querySelector<HTMLDivElement>('#app')!
const catSpriteImage = new Image()
catSpriteImage.src = catSprite

const p = (x: number, y: number): Point => ({ x, y })
const segment = (ax: number, ay: number, bx: number, by: number): Segment => ({ a: p(ax, ay), b: p(bx, by) })

const LEVELS: LevelDefinition[] = [
  {
    id: 1,
    title: '花园迷宫',
    subtitle: '跟着金色小路，先认识这座花园吧',
    theme: 'garden',
    segments: [
      segment(75, 510, 75, 350), segment(75, 350, 75, 220), segment(75, 350, 195, 350),
      segment(195, 350, 315, 350), segment(195, 350, 195, 135), segment(315, 350, 315, 470),
      segment(315, 470, 230, 510), segment(230, 510, 75, 510), segment(75, 220, 195, 135),
    ],
    start: { segment: 7, t: 1 },
    exit: p(195, 135),
    fish: [p(75, 270), p(278, 350), p(267, 497)],
    patrols: [{ path: [p(115, 350), p(280, 350)], speed: 52, offset: 0 }],
  },
  {
    id: 2,
    title: '蘑菇小径',
    subtitle: '蘑菇会指路，慢慢走也没关系',
    theme: 'mushroom',
    segments: [
      segment(75, 510, 75, 390), segment(75, 390, 200, 390), segment(200, 390, 200, 510),
      segment(200, 390, 315, 390), segment(315, 390, 315, 260), segment(315, 260, 170, 260),
      segment(170, 260, 170, 135), segment(170, 135, 315, 135), segment(75, 390, 75, 230),
      segment(75, 230, 170, 260),
    ],
    start: { segment: 0, t: 0 },
    exit: p(315, 135),
    fish: [p(200, 475), p(78, 285), p(260, 135)],
    patrols: [
      { path: [p(75, 335), p(75, 230), p(170, 260)], speed: 48, offset: 80 },
      { path: [p(245, 390), p(315, 390), p(315, 275)], speed: 55, offset: 15 },
    ],
  },
  {
    id: 3,
    title: '星光森林',
    subtitle: '星星在树梢等你，深呼吸再出发',
    theme: 'starlight',
    segments: [
      segment(195, 520, 75, 520), segment(75, 520, 75, 390), segment(75, 390, 195, 390),
      segment(195, 390, 315, 390), segment(315, 390, 315, 520), segment(315, 520, 195, 520),
      segment(195, 390, 195, 255), segment(195, 255, 75, 255), segment(75, 255, 75, 130),
      segment(75, 130, 195, 130), segment(195, 255, 315, 255), segment(315, 255, 315, 130),
      segment(315, 130, 195, 130),
    ],
    start: { segment: 0, t: 0 },
    exit: p(195, 130),
    fish: [p(75, 460), p(315, 460), p(285, 255)],
    patrols: [
      { path: [p(100, 520), p(285, 520)], speed: 58, offset: 0 },
      { path: [p(195, 360), p(195, 275), p(90, 255)], speed: 50, offset: 130 },
      { path: [p(310, 210), p(315, 130), p(215, 130)], speed: 46, offset: 60 },
    ],
  },
]

const themes: Record<Theme, { sky: string; skyEnd: string; grass: string; path: string; edge: string; accent: string; ink: string }> = {
  garden: { sky: '#edf7d7', skyEnd: '#fff3c8', grass: '#77b987', path: '#ffe29a', edge: '#4f8c73', accent: '#f28d79', ink: '#245a5b' },
  mushroom: { sky: '#f9d8db', skyEnd: '#eee0f8', grass: '#8bb979', path: '#ffdcab', edge: '#a66b86', accent: '#ef8a85', ink: '#654d72' },
  starlight: { sky: '#263b72', skyEnd: '#5b5b9b', grass: '#3c7074', path: '#cdd3ff', edge: '#274f64', accent: '#ffd46c', ink: '#f4eaff' },
}

function freshSave(): SaveData {
  return { version: 1, unlockedLevel: 1, bestStars: { 1: 0, 2: 0, 3: 0 }, soundEnabled: true, tutorialSeen: false }
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

function pointOnSegment(seg: Segment, t: number): Point {
  return lerp(seg.a, seg.b, t)
}

function projectToSegment(point: Point, seg: Segment): { point: Point; t: number; distance: number } {
  const dx = seg.b.x - seg.a.x
  const dy = seg.b.y - seg.a.y
  const lengthSquared = dx * dx + dy * dy
  const raw = lengthSquared === 0 ? 0 : ((point.x - seg.a.x) * dx + (point.y - seg.a.y) * dy) / lengthSquared
  const t = Math.max(0, Math.min(1, raw))
  const projected = pointOnSegment(seg, t)
  return { point: projected, t, distance: distance(point, projected) }
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
  private timer?: number
  private step = 0

  private ready(): boolean {
    if (!saveData.soundEnabled) return false
    if (!this.context) {
      this.context = new AudioContext()
      this.master = this.context.createGain()
      this.master.gain.value = 0.11
      this.master.connect(this.context.destination)
    }
    void this.context.resume()
    return true
  }

  setEnabled(enabled: boolean): void {
    saveData.soundEnabled = enabled
    persist()
    if (enabled) this.startMusic()
    if (this.master) this.master.gain.setTargetAtTime(enabled ? 0.11 : 0, this.context!.currentTime, 0.04)
  }

  startMusic(): void {
    if (!this.ready() || this.timer) return
    this.tickMusic()
    this.timer = window.setInterval(() => this.tickMusic(), 430)
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
    const tune = [523, 659, 784, 659, 587, 659, 880, 784, 523, 659, 784, 1047, 880, 784, 659, 587]
    const index = this.step % tune.length
    this.note(tune[index], index % 4 === 0 ? 0.28 : 0.18, 'sine', index % 4 === 0 ? 0.06 : 0.042)
    this.step += 1
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

function showHome(): void {
  activeGame?.destroy()
  activeGame = undefined
  root.innerHTML = `
    <main class="game-shell home-shell">
      <section class="home-hero" aria-label="童话花园" style="--hero-image: url('${heroImage}')">
        <div class="hero-wash"></div>
        <button class="sound-button" id="soundToggle" type="button" aria-pressed="${saveData.soundEnabled}">${soundLabel()}</button>
        <div class="hero-copy">
          <p class="eyebrow">小猫的温柔探险</p>
          <h1>小猫迷宫<br><em>大冒险</em></h1>
          <p class="hero-note">收集小鱼干，避开巡逻的小老鼠</p>
          <button class="primary-button" id="startAdventure" type="button">开始冒险 <span>→</span></button>
        </div>
      </section>
      <section class="level-panel" aria-label="关卡入口">
        <div class="panel-heading"><div><p class="eyebrow">选择一条小路</p><h2>冒险地图</h2></div><span class="fish-total">🐟 ${saveData.bestStars[1] + saveData.bestStars[2] + saveData.bestStars[3]} / 9</span></div>
        <div class="level-list">
          ${LEVELS.map((level) => levelCard(level)).join('')}
        </div>
      </section>
    </main>
  `
  document.querySelector<HTMLButtonElement>('#startAdventure')!.addEventListener('click', () => {
    sound.startMusic()
    const level = LEVELS[Math.min(saveData.unlockedLevel - 1, LEVELS.length - 1)]
    showGame(level)
  })
  document.querySelector<HTMLButtonElement>('#soundToggle')!.addEventListener('click', () => {
    sound.setEnabled(!saveData.soundEnabled)
    showHome()
  })
  document.querySelectorAll<HTMLButtonElement>('[data-level]').forEach((button) => {
    button.addEventListener('click', () => {
      const id = Number(button.dataset.level) as 1 | 2 | 3
      if (id <= saveData.unlockedLevel) {
        sound.startMusic()
        showGame(LEVELS[id - 1])
      }
    })
  })
}

function levelCard(level: LevelDefinition): string {
  const locked = level.id > saveData.unlockedLevel
  return `
    <button class="level-card theme-${level.theme} ${locked ? 'is-locked' : ''}" type="button" data-level="${level.id}" ${locked ? 'aria-disabled="true"' : ''}>
      <span class="level-number">0${level.id}</span>
      <span class="level-card-copy"><strong>${level.title}</strong><small>${locked ? '完成上一关后解锁' : level.subtitle}</small></span>
      <span class="card-score">${locked ? '🔒' : starsMarkup(saveData.bestStars[level.id], true)}</span>
    </button>
  `
}

function showGame(level: LevelDefinition): void {
  activeGame?.destroy()
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
  private lastPointer?: Point
  private elapsed = 0
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
    this.phase = 'playing'
    this.dragging = false
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
    this.pointerId = event.pointerId
    this.lastPointer = pointer
    this.canvas.setPointerCapture(event.pointerId)
    event.preventDefault()
  }

  private readonly onPointerMove = (event: PointerEvent): void => {
    if (!this.dragging || event.pointerId !== this.pointerId || !this.lastPointer || this.phase !== 'playing') return
    const next = this.toWorld(event)
    const delta = p(next.x - this.lastPointer.x, next.y - this.lastPointer.y)
    this.lastPointer = next
    const moved = this.moveCat(delta)
    if (moved && this.tutorialActive) {
      this.tutorialActive = false
      saveData.tutorialSeen = true
      persist()
      this.hintLabel.textContent = '走得真稳，继续找小鱼干吧！'
    }
    event.preventDefault()
  }

  private readonly onPointerUp = (event: PointerEvent): void => {
    if (event.pointerId !== this.pointerId) return
    this.dragging = false
    this.pointerId = undefined
    this.lastPointer = undefined
    if (this.canvas.hasPointerCapture(event.pointerId)) this.canvas.releasePointerCapture(event.pointerId)
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
    const nearStart = distance(cat, current.a) < 19
    const nearEnd = distance(cat, current.b) < 19
    const ids = new Set<number>([this.position.segment])
    if (nearStart || nearEnd) {
      const joint = nearStart ? current.a : current.b
      this.level.segments.forEach((candidate, index) => {
        if (samePoint(candidate.a, joint) || samePoint(candidate.b, joint)) ids.add(index)
      })
    }
    return [...ids]
  }

  private moveCat(delta: Point): boolean {
    const magnitude = Math.hypot(delta.x, delta.y)
    if (magnitude < 0.4) return false
    const maxStep = 27
    const factor = Math.min(1, maxStep / magnitude)
    const desired = p(this.catPoint().x + delta.x * factor, this.catPoint().y + delta.y * factor)
    let best: { id: number; t: number; point: Point; distance: number } | undefined
    this.accessibleSegments().forEach((id) => {
      const projected = projectToSegment(desired, this.level.segments[id])
      if (!best || projected.distance < best.distance) best = { id, ...projected }
    })
    if (!best || best.distance > 25) return false
    const before = this.catPoint()
    this.position = { segment: best.id, t: best.t }
    if (distance(before, best.point) > 2.5) sound.play('move')
    return distance(before, best.point) > 0.3
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
    if (this.phase === 'collision') {
      if (now >= this.collisionUntil) {
        this.phase = 'playing'
        this.showBubble('', '')
      }
      return
    }
    if (this.phase !== 'playing') return
    this.elapsed += delta
    const cat = this.catPoint()
    this.level.fish.forEach((fish, index) => {
      if (!this.collected.has(index) && distance(cat, fish) < 24) {
        this.collected.add(index)
        sound.play('fish')
        this.updateHud()
        this.showBubble('找到了小鱼干！', 'show happy')
        window.setTimeout(() => this.showBubble('', ''), 680)
      }
    })
    const mouseHit = this.level.patrols.some((patrol) => distance(cat, pointOnPatrol(patrol, this.elapsed)) < 28)
    if (mouseHit) {
      this.phase = 'collision'
      this.position = { ...this.level.start }
      this.elapsed = 0
      this.dragging = false
      this.collisionUntil = now + 900
      sound.play('bump')
      this.showBubble('哎呀，小老鼠先过去啦！', 'show')
      return
    }
    if (distance(cat, this.level.exit) < 27) this.complete()
  }

  private complete(): void {
    if (this.phase !== 'playing') return
    this.phase = 'complete'
    this.dragging = false
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
    drawWorld(ctx, this.level, this.elapsed, this.collected, this.catPoint(), this.dragging, this.phase)
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

function drawWorld(ctx: CanvasRenderingContext2D, level: LevelDefinition, elapsed: number, collected: Set<number>, cat: Point, dragging: boolean, phase: Phase): void {
  const palette = themes[level.theme]
  const gradient = ctx.createLinearGradient(0, 0, 0, LOGICAL_HEIGHT)
  gradient.addColorStop(0, palette.sky)
  gradient.addColorStop(1, palette.skyEnd)
  ctx.fillStyle = gradient
  ctx.fillRect(0, 0, LOGICAL_WIDTH, LOGICAL_HEIGHT)
  drawAtmosphere(ctx, level.theme, elapsed)
  drawDecorations(ctx, level, palette)
  drawPaths(ctx, level, palette)
  level.fish.forEach((fish, index) => {
    if (!collected.has(index)) drawFish(ctx, fish, elapsed + index)
  })
  drawExit(ctx, level.exit, level.theme, elapsed)
  level.patrols.forEach((patrol, index) => drawMouse(ctx, pointOnPatrol(patrol, elapsed), palette.ink, elapsed + index * 0.8))
  drawCat(ctx, cat, palette.ink, elapsed, dragging, phase)
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
    ctx.beginPath(); ctx.moveTo(seg.a.x, seg.a.y); ctx.lineTo(seg.b.x, seg.b.y)
    ctx.strokeStyle = 'rgba(39, 91, 77, .16)'; ctx.lineWidth = 68; ctx.stroke()
    ctx.beginPath(); ctx.moveTo(seg.a.x, seg.a.y); ctx.lineTo(seg.b.x, seg.b.y)
    ctx.strokeStyle = palette.edge; ctx.lineWidth = 60; ctx.stroke()
    ctx.beginPath(); ctx.moveTo(seg.a.x, seg.a.y); ctx.lineTo(seg.b.x, seg.b.y)
    ctx.strokeStyle = palette.path; ctx.lineWidth = 50; ctx.stroke()
    ctx.beginPath(); ctx.moveTo(seg.a.x, seg.a.y); ctx.lineTo(seg.b.x, seg.b.y)
    ctx.strokeStyle = level.theme === 'starlight' ? 'rgba(255,255,255,.24)' : 'rgba(255,255,245,.4)'
    ctx.lineWidth = 2; ctx.setLineDash([1, 13]); ctx.stroke()
  })
  ctx.setLineDash([])
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
  ctx.shadowColor = 'rgba(255,182,65,.55)'; ctx.shadowBlur = 13
  ctx.fillStyle = '#ffd36b'; ctx.beginPath(); ctx.ellipse(0, 0, 12, 8, 0, 0, Math.PI * 2); ctx.fill()
  ctx.beginPath(); ctx.moveTo(10, 0); ctx.lineTo(19, -9); ctx.lineTo(19, 9); ctx.closePath(); ctx.fill()
  ctx.fillStyle = '#fff6c9'; ctx.beginPath(); ctx.arc(-4, -2, 1.6, 0, Math.PI * 2); ctx.fill()
  ctx.restore()
}

function drawExit(ctx: CanvasRenderingContext2D, at: Point, theme: Theme, elapsed: number): void {
  ctx.save(); ctx.translate(at.x, at.y)
  const accent = themes[theme].accent
  ctx.fillStyle = theme === 'starlight' ? '#f4dc8a' : '#fff8db'
  ctx.strokeStyle = accent; ctx.lineWidth = 4
  ctx.beginPath(); ctx.roundRect(-21, -27, 42, 54, 19); ctx.fill(); ctx.stroke()
  ctx.fillStyle = accent; ctx.beginPath(); ctx.arc(0, -3, 9 + Math.sin(elapsed * 3) * 1.5, 0, Math.PI * 2); ctx.fill()
  ctx.fillStyle = '#fff5c3'; ctx.beginPath(); ctx.arc(3, -7, 2, 0, Math.PI * 2); ctx.fill()
  ctx.font = '700 12px system-ui'; ctx.fillStyle = themes[theme].ink; ctx.textAlign = 'center'; ctx.fillText('终点', 0, 43); ctx.restore()
}

function drawMouse(ctx: CanvasRenderingContext2D, at: Point, ink: string, elapsed: number): void {
  ctx.save(); ctx.translate(at.x, at.y + Math.sin(elapsed * 8) * 1.5); ctx.scale(0.85, 0.85)
  ctx.strokeStyle = '#b88c9b'; ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(16, 4, 15, -0.5, 1.5); ctx.stroke()
  ctx.fillStyle = '#b7a8bb'; ctx.strokeStyle = ink; ctx.lineWidth = 2
  ctx.beginPath(); ctx.ellipse(0, 4, 14, 10, 0, 0, Math.PI * 2); ctx.fill(); ctx.stroke()
  ctx.fillStyle = '#d9bfd0'; [-7, 6].forEach((x) => { ctx.beginPath(); ctx.arc(x, -7, 6, 0, Math.PI * 2); ctx.fill(); ctx.stroke() })
  ctx.fillStyle = ink; ctx.beginPath(); ctx.arc(-5, 2, 1.7, 0, Math.PI * 2); ctx.arc(5, 2, 1.7, 0, Math.PI * 2); ctx.fill()
  ctx.fillStyle = '#e98391'; ctx.beginPath(); ctx.arc(0, 8, 2.2, 0, Math.PI * 2); ctx.fill(); ctx.restore()
}

function drawCat(ctx: CanvasRenderingContext2D, at: Point, ink: string, elapsed: number, dragging: boolean, phase: Phase): void {
  const bob = phase === 'collision' ? Math.sin(elapsed * 20) * 3 : Math.sin(elapsed * 6) * (dragging ? 1.1 : 1.8)
  ctx.save(); ctx.translate(at.x, at.y + bob); ctx.scale(dragging ? 1.06 : 1, dragging ? 0.98 : 1)
  ctx.shadowColor = 'rgba(63, 82, 56, .22)'; ctx.shadowBlur = 8; ctx.shadowOffsetY = 4
  if (catSpriteImage.complete && catSpriteImage.naturalWidth > 0) {
    const height = 90
    const width = height * (catSpriteImage.naturalWidth / catSpriteImage.naturalHeight)
    ctx.drawImage(catSpriteImage, -width / 2, -height * .63, width, height)
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
