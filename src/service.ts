import { Context, Service } from '@deepseek-ai/cordis'
import type { Session, SessionEvent } from '@deepseek-ai/dsh-session'
import { CELEBRATE_MS, KollerStateMachine, type KollerStateInput, type KollerStateSnapshot } from './state.ts'
import {
  DISPLAY_INSET_MAX,
  DISPLAY_SIZE_MAX,
  DISPLAY_SIZE_MIN,
  PET_NAME_MAX_LENGTH,
  kollerHomeDir,
  loadKollerPersist,
  saveKollerPersist,
  type KollerPersist,
} from './persist.ts'

export interface KollerDisplayConfig {
  visible: boolean
  size: number
  right: number
  bottom: number
}

export interface KollerStateView extends KollerStateSnapshot {
  display: KollerDisplayConfig
  name: string
}

export interface KollerConfig {
  persistDir?: string
}

declare module '@deepseek-ai/cordis' {
  interface Context {
    koller: KollerService
  }
}

export class KollerService extends Service {
  static inject: string[] = []

  private readonly machine = new KollerStateMachine()
  private readonly persistDir: string
  private persist: KollerPersist
  private celebrateTimer: ReturnType<typeof setTimeout> | undefined

  constructor(ctx: Context, config: KollerConfig = {}) {
    super(ctx, 'koller')
    this.persistDir = config.persistDir ?? kollerHomeDir()
    this.persist = loadKollerPersist(this.persistDir)
    ctx.effect(() => () => this.clearCelebrateTimer(), 'koller: celebration timer')
    ctx.on('session/event', (session: Session, event: SessionEvent) => {
      switch (event.type) {
        case 'turn/start':
          this.acceptActivity({ phase: 'waiting' })
          break
        case 'step/start':
          this.acceptActivity({ phase: 'thinking' })
          break
        case 'tool/call':
          this.acceptActivity({ phase: 'tool', line: `工具：${event.data.name}` })
          break
        case 'turn/end':
          if (event.data.reason.kind === 'completed') {
            this.acceptActivity({ phase: 'done' })
            this.scheduleCelebrationEnd()
          } else {
            this.acceptActivity({ phase: 'idle' })
          }
          break
        default:
          break
      }
    })
    ctx.on('session/disposed', () => {
      this.clearCelebrateTimer()
      this.machine.onSessionDisposed()
    })
  }

  async state(): Promise<KollerStateView> {
    return { ...this.machine.render(), display: this.display(), name: this.persist.name }
  }

  display(): KollerDisplayConfig {
    const { visible, size, right, bottom } = this.persist
    return { visible, size, right, bottom }
  }

  async setVisible(visible: boolean): Promise<{ ok: true }> {
    this.persist = { ...this.persist, visible }
    this.flush()
    return { ok: true }
  }

  async setConfig(patch: Partial<Pick<KollerDisplayConfig, 'size' | 'right' | 'bottom'>>): Promise<{ ok: true }> {
    const next = { ...this.persist }
    if (patch.size !== undefined) next.size = Math.round(Math.min(DISPLAY_SIZE_MAX, Math.max(DISPLAY_SIZE_MIN, patch.size)))
    if (patch.right !== undefined) next.right = Math.round(Math.min(DISPLAY_INSET_MAX, Math.max(0, patch.right)))
    if (patch.bottom !== undefined) next.bottom = Math.round(Math.min(DISPLAY_INSET_MAX, Math.max(0, patch.bottom)))
    this.persist = next
    this.flush()
    return { ok: true }
  }

  async setName(name: string): Promise<{ ok: true; name: string } | { ok: false; error: string }> {
    const trimmed = name.trim()
    if (trimmed === '') return { ok: false, error: 'name-empty' }
    if (trimmed.length > PET_NAME_MAX_LENGTH) return { ok: false, error: 'name-too-long' }
    this.persist = { ...this.persist, name: trimmed }
    this.flush()
    return { ok: true, name: trimmed }
  }

  private acceptActivity(input: KollerStateInput): void {
    this.clearCelebrateTimer()
    this.machine.onActivityStatus(input)
  }

  private scheduleCelebrationEnd(): void {
    this.clearCelebrateTimer()
    this.celebrateTimer = setTimeout(() => {
      this.celebrateTimer = undefined
      this.machine.settleCelebration()
    }, CELEBRATE_MS)
  }

  private clearCelebrateTimer(): void {
    if (this.celebrateTimer === undefined) return
    clearTimeout(this.celebrateTimer)
    this.celebrateTimer = undefined
  }

  private flush(): void {
    try {
      saveKollerPersist(this.persist, this.persistDir)
    } catch {
      // best-effort
    }
  }
}