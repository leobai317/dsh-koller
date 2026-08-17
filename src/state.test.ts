import { describe, expect, it } from 'vitest'
import { CELEBRATE_MS, KollerStateMachine } from './state.ts'

describe('KollerStateMachine', () => {
  it('idle 映射等待图', () => {
    const m = new KollerStateMachine(() => 1000)
    expect(m.render().image).toBe('waiting')
    expect(m.render().bubble).toBe('准备中')
  })

  it('thinking/tool 映射工作图', () => {
    const m = new KollerStateMachine(() => 1000)
    m.onActivityStatus({ phase: 'thinking' })
    expect(m.render().image).toBe('working')
    m.onActivityStatus({ phase: 'tool', line: '工具：bash' })
    expect(m.render().image).toBe('working')
    expect(m.render().bubble).toBe('工具：bash')
  })

  it('done 在庆祝窗内显示完成图，超时文字同步回落准备中', () => {
    let now = 0
    const m = new KollerStateMachine(() => now)
    m.onActivityStatus({ phase: 'done' })
    now = 1000
    expect(m.render().image).toBe('done')
    expect(m.render().bubble).toBe('任务完成！')
    expect(m.render().celebrateRemainingMs).toBe(CELEBRATE_MS - 1000)
    now = 3000
    expect(m.render().image).toBe('waiting')
    expect(m.render().phase).toBe('idle')
    expect(m.render().bubble).toBe('准备中')
  })

  it('settleCelebration 到点后主动回落，即使 render 未被调用', () => {
    let now = 0
    const m = new KollerStateMachine(() => now)
    m.onActivityStatus({ phase: 'done' })
    now = CELEBRATE_MS
    m.settleCelebration()
    expect(m.render().image).toBe('waiting')
    expect(m.render().phase).toBe('idle')
    expect(m.render().bubble).toBe('准备中')
  })

  it('迟到的庆祝定时器不打断新的活动状态', () => {
    let now = 0
    const m = new KollerStateMachine(() => now)
    m.onActivityStatus({ phase: 'done' })
    now = 1000
    m.onActivityStatus({ phase: 'thinking' })
    m.settleCelebration()
    expect(m.render().phase).toBe('thinking')
    expect(m.render().image).toBe('working')
    expect(m.render().bubble).toBe('思考中…')
  })

  it('会话销毁回到 idle', () => {
    const m = new KollerStateMachine(() => 0)
    m.onActivityStatus({ phase: 'tool' })
    m.onSessionDisposed()
    expect(m.render().phase).toBe('idle')
    expect(m.render().image).toBe('waiting')
  })
})
