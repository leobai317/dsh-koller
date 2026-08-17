export type KollerPhase = 'idle' | 'waiting' | 'thinking' | 'tool' | 'done'
export type KollerImage = 'waiting' | 'working' | 'done'

export interface KollerStateSnapshot {
  image: KollerImage
  bubble: string
  phase: KollerPhase
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
    if (input.phase === 'done') this.doneAt = this.now()
  }

  onSessionDisposed(): void {
    this.phase = 'idle'
    this.line = undefined
    this.doneAt = undefined
  }

  render(): KollerStateSnapshot {
    const nowMs = this.now()
    const phase = this.phase === 'done' && this.doneAt !== undefined && nowMs - this.doneAt >= CELEBRATE_MS
      ? 'idle'
      : this.phase
    let bubble = BUBBLES[phase]
    if (phase === 'tool' && this.line !== undefined) bubble = this.line
    return {
      image: imageForPhase(this.phase, nowMs, this.doneAt),
      bubble,
      phase,
    }
  }
}