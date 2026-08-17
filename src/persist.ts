import { mkdirSync, readFileSync, renameSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { homedir } from 'node:os'

export const DEFAULT_PET_NAME = '扬科勒'
export const PET_NAME_MAX_LENGTH = 20
export const DISPLAY_SIZE_MIN = 80
export const DISPLAY_SIZE_MAX = 400
export const DISPLAY_INSET_MAX = 800

export interface KollerPersist {
  name: string
  visible: boolean
  size: number
  right: number
  bottom: number
}

export function defaultPersist(): KollerPersist {
  return { name: DEFAULT_PET_NAME, visible: true, size: 160, right: 24, bottom: 20 }
}

export function kollerHomeDir(): string {
  return process.env.DSH_HOME ?? join(homedir(), '.dsh')
}

const PERSIST_FILE = 'koller.json'

export function loadKollerPersist(dir: string = kollerHomeDir()): KollerPersist {
  try {
    const raw = JSON.parse(readFileSync(join(dir, PERSIST_FILE), 'utf8')) as Partial<KollerPersist>
    return {
      ...defaultPersist(),
      ...(typeof raw.name === 'string' ? { name: raw.name } : {}),
      ...(typeof raw.visible === 'boolean' ? { visible: raw.visible } : {}),
      ...(typeof raw.size === 'number' ? { size: raw.size } : {}),
      ...(typeof raw.right === 'number' ? { right: raw.right } : {}),
      ...(typeof raw.bottom === 'number' ? { bottom: raw.bottom } : {}),
    }
  } catch {
    return defaultPersist()
  }
}

export function saveKollerPersist(persist: KollerPersist, dir: string = kollerHomeDir()): void {
  const file = join(dir, PERSIST_FILE)
  mkdirSync(dir, { recursive: true })
  const tmp = `${file}.tmp`
  writeFileSync(tmp, JSON.stringify(persist, null, 2), 'utf8')
  renameSync(tmp, file)
}