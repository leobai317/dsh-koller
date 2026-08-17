import { describe, expect, it } from 'vitest'
import { KollerStateMachine } from './state.ts'

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
    now = 3000
    expect(m.render().image).toBe('waiting')
    expect(m.render().phase).toBe('idle')
    expect(m.render().bubble).toBe('准备中')
  })

  it('会话销毁回到 idle', () => {
    const m = new KollerStateMachine(() => 0)
    m.onActivityStatus({ phase: 'tool' })
    m.onSessionDisposed()
    expect(m.render().phase).toBe('idle')
    expect(m.render().image).toBe('waiting')
  })
})
