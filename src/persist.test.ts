import { mkdtempSync, readFileSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { defaultPersist, loadKollerPersist, saveKollerPersist } from './persist.ts'

describe('persist', () => {
  let dir: string
  beforeEach(() => { dir = mkdtempSync(join(tmpdir(), 'koller-')) })
  afterEach(() => { rmSync(dir, { recursive: true, force: true }) })

  it('无文件时返回默认值', () => {
    expect(loadKollerPersist(dir)).toEqual(defaultPersist())
  })

  it('保存后能读回，损坏文件回落默认值', () => {
    const p = { ...defaultPersist(), name: '科勒', visible: false, size: 200, right: 10, bottom: 30 }
    saveKollerPersist(p, dir)
    expect(loadKollerPersist(dir)).toEqual(p)
    expect(readFileSync(join(dir, 'koller.json'), 'utf8')).toContain('科勒')
  })
})