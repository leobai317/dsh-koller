export type KollerPhase = 'idle' | 'waiting' | 'thinking' | 'tool' | 'done'
export type KollerImage = 'waiting' | 'working' | 'done'

export interface KollerStateSnapshot {
  image: KollerImage
  bubble: string
  phase: KollerPhase
  /** 仅在 done 庆祝阶段出现：距离自动回落到 idle 的剩余毫秒数。 */
  celebrateRemainingMs?: number
}

export interface KollerStateInput {
  phase: KollerPhase
  line?: string
}

const BUBBLES: Record<KollerPhase, string> = {
  idle: '准备中',
  waiting: '等待任务',
  thinking: '思考中…',
  tool: '工具调用中',
  done: '任务完成！',
}

export const CELEBRATE_MS = 2400

export function imageForPhase(phase: KollerPhase, nowMs: number, doneAt?: number): KollerImage {
  if (phase === 'done') {
    return doneAt !== undefined && nowMs - doneAt < CELEBRATE_MS ? 'done' : 'waiting'
  }
  if (phase === 'thinking' || phase === 'tool') return 'working'
  return 'waiting'
}

export class KollerStateMachine {
  private phase: KollerPhase = 'idle'
  private line: string | undefined
  private doneAt: number | undefined

  constructor(private readonly now: () => number = Date.now) {}

  onActivityStatus(input: KollerStateInput): void {
    this.phase = input.phase
    this.line = input.line
    this.doneAt = input.phase === 'done' ? this.now() : undefined
  }

  /** 结束 done 庆祝并回落到 idle；仅在仍处于 done 时生效。 */
  settleCelebration(): void {
    if (this.phase !== 'done') return
    this.phase = 'idle'
    this.line = undefined
    this.doneAt = undefined
  }

  onSessionDisposed(): void {
    this.phase = 'idle'
    this.line = undefined
    this.doneAt = undefined
  }

  render(): KollerStateSnapshot {
    const nowMs = this.now()
    if (this.phase === 'done' && this.doneAt !== undefined && nowMs - this.doneAt >= CELEBRATE_MS) {
      this.settleCelebration()
    }
    const bubble = this.phase === 'tool' && this.line !== undefined ? this.line : BUBBLES[this.phase]
    return {
      image: imageForPhase(this.phase, nowMs, this.doneAt),
      bubble,
      phase: this.phase,
      ...(this.phase === 'done' && this.doneAt !== undefined
        ? { celebrateRemainingMs: Math.max(0, this.doneAt + CELEBRATE_MS - nowMs) }
        : {}),
    }
  }
}