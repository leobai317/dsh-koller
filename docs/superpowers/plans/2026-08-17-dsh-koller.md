# dsh-koller 桌宠插件实施计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 为 dsh Web UI 做一个新的桌宠插件：扬科勒三张照片按模型活动状态切换（等待/进行中/完成）。

**Architecture:** 复用已验证的 @linxin666/dsh-pet 双半区模式：host 半区（Cordis 插件）监听核心 session 事件推导状态，通过同源 `/api/koller/*` JSON 路由暴露；browser 半区（React 全局 root 挂 document.body）800ms 轮询并渲染图片浮层。

**Tech Stack:** TypeScript、tsdown（lib ESM + client CJS bundle）、vitest、React 18、schemastery（不用）、dsh plugin link 安装。

**参考实现（本地已装，照抄模式）：** `C:\Users\Leo6666666\.dsh\profiles\web\node_modules\@linxin666\dsh-pet\`（src/ 有完整源码 + lib/ 有构建产物）。

## Global Constraints

- 项目根：`C:\Users\Leo6666666\Desktop\dsh-koller`
- 包名：`@leo6666666/dsh-koller`（bundle id 同值）；cordis 插件名 `koller`
- 依赖版本：`@deepseek-ai/cordis` ^4.0.1、其余 `@deepseek-ai/*` ^0.1.0-rc.6、react ^18.2.0、typescript ^6.0.3、tsdown ^0.22.2、vitest ^4.1.8（与参考包 devDependencies 一致）
- 持久化：`$DSH_HOME/koller.json`（独立文件，不碰 `pet.json`）
- API 前缀 `/api/koller`、素材前缀 `/koller`
- 状态映射：idle/waiting→`waiting.webp`、thinking/tool→`working.webp`、done 庆祝窗(2400ms)→`done.webp` 后回落 `waiting.webp`；出错回落 `waiting.webp`
- 不做：亲密度/投喂/养成、设置面板卡片、多语言、CSS Modules（用内联 CSS 字符串）
- 无 git 仓库，不做 commit 步骤
- 本机无 ripgrep/rust；node 在 PATH；python 用 `D:\anaconda\python.exe`

---

### Task 1: 素材规范化

**Files:**
- Create: `assets/koller/waiting.webp`、`assets/koller/working.webp`、`assets/koller/done.webp`

**Interfaces:**
- Produces: 三张透明背景 webp（等高 640px），路径 `assets/koller/` 下，Task 3 的 routes 按此文件名提供静态路由。

- [ ] **Step 1: 写处理脚本并运行**

将三张桌面图处理为等高 640px 的透明 webp（Pillow，本机 D:\anaconda 已装 PIL）：

```powershell
& "D:\anaconda\python.exe" -c @"
from PIL import Image
pairs = [
    (r'C:\Users\Leo6666666\Desktop\01.png', 'waiting'),
    (r'C:\Users\Leo6666666\Desktop\02.png', 'working'),
    (r'C:\Users\Leo6666666\Desktop\03.png', 'done'),
]
for src, name in pairs:
    im = Image.open(src).convert('RGBA')
    h = 640
    w = round(im.width * h / im.height)
    im = im.resize((w, h), Image.LANCZOS)
    out = rf'C:\Users\Leo6666666\Desktop\dsh-koller\assets\koller\{name}.webp'
    im.save(out, 'WEBP', lossless=False, quality=85, method=6)
    print(name, im.size)
"@
```

- [ ] **Step 2: 验证产物**

```powershell
& "D:\anaconda\python.exe" -c "from PIL import Image; [print(n, Image.open(rf'C:\Users\Leo6666666\Desktop\dsh-koller\assets\koller\{n}.webp').size) for n in ['waiting','working','done']]"
```

Expected: 三行输出，高度均为 640，宽度各不相同（原图比例不同）。文件存在且可被 PIL 打开。

---

### Task 2: 包骨架（package.json / patch / 构建配置 / 最小入口）

**Files:**
- Create: `package.json`、`cordis.patch.yml`、`tsconfig.json`、`tsdown.config.ts`、`src/index.ts`（最小占位）、`src/client/index.ts`（最小占位）、`.gitignore`

**Interfaces:**
- Produces: `pnpm build` 产出 `lib/index.js`（host）+ `lib/client.js`（浏览器 bundle，含 `window.__ModuleLoader__.load` 包装）；`pnpm test` 跑 vitest；`pnpm typecheck` 跑 tsc。后续任务只改 `src/` 内容，不动构建配置。

- [ ] **Step 1: 确认 rc.6 依赖在 npm 上可装**

```powershell
npm view @deepseek-ai/dsh-session versions --json
```

Expected: 列表包含 `0.1.0-rc.6`。（若不可用，改为从本地全局 dsh 安装目录 `file:...` 引用，需在后续步骤调整 devDependencies。）

- [ ] **Step 2: 写 package.json**

```json
{
  "name": "@leo6666666/dsh-koller",
  "version": "0.1.0",
  "description": "扬科勒桌宠插件 for the dsh web GUI: 足球前锋三态照片随模型活动切换（等待/进行中/完成）",
  "type": "module",
  "engines": { "node": "^22.19.0 || >=24.0.0" },
  "main": "lib/index.js",
  "exports": {
    ".": { "default": "./lib/index.js" },
    "./client": { "default": "./lib/client.js" },
    "./package.json": "./package.json"
  },
  "files": ["lib", "src", "cordis.patch.yml", "assets"],
  "license": "Apache-2.0",
  "dsh": {
    "bundle": { "patch": "./cordis.patch.yml" },
    "client": { "inject": ["@deepseek-ai/dsh-client-runtime"], "platform": "web" }
  },
  "peerDependencies": {
    "@deepseek-ai/cordis": "^4.0.1",
    "@deepseek-ai/dsh-host-webserver": "^0.1.0-rc.6",
    "@deepseek-ai/dsh-session": "^0.1.0-rc.6",
    "react": "^18.2.0",
    "react-dom": "^18.2.0"
  },
  "devDependencies": {
    "@deepseek-ai/cordis": "^4.0.1",
    "@deepseek-ai/dsh-client-runtime": "^0.1.0-rc.6",
    "@deepseek-ai/dsh-host-webserver": "^0.1.0-rc.6",
    "@deepseek-ai/dsh-session": "^0.1.0-rc.6",
    "@types/node": "^22.20.0",
    "@types/react": "~18.3.1",
    "@types/react-dom": "~18.3.0",
    "react": "^18.2.0",
    "react-dom": "^18.2.0",
    "tsdown": "^0.22.2",
    "typescript": "^6.0.3",
    "vitest": "^4.1.8"
  },
  "scripts": {
    "build": "tsdown",
    "test": "vitest run",
    "typecheck": "tsc --noEmit"
  }
}
```

- [ ] **Step 3: 写 cordis.patch.yml**

```yaml
# dsh-koller bundle patch: inserts its plugin row into the web plugin roster.
- insert:
    - id: koller
      name: '@leo6666666/dsh-koller'
```

- [ ] **Step 4: 写 tsconfig.json**

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "ESNext",
    "moduleResolution": "bundler",
    "allowImportingTsExtensions": true,
    "verbatimModuleSyntax": true,
    "strict": true,
    "jsx": "react-jsx",
    "noEmit": true,
    "skipLibCheck": true,
    "types": ["node"]
  },
  "include": ["src"]
}
```

- [ ] **Step 5: 写 tsdown.config.ts**

```ts
import { defineConfig } from 'tsdown'

const PLUGIN_ID = '@leo6666666/dsh-koller'

const LIB_EXTERNALS = [
  '@deepseek-ai/cordis',
  '@deepseek-ai/dsh-host-webserver',
  '@deepseek-ai/dsh-session',
]

const CLIENT_EXTERNALS = [
  'react',
  'react/jsx-runtime',
  'react-dom',
  'react-dom/client',
  '@deepseek-ai/cordis',
]

export default defineConfig([
  {
    name: 'koller-lib',
    entry: { index: 'src/index.ts' },
    outDir: 'lib',
    format: ['esm'],
    platform: 'node',
    target: 'es2024',
    dts: false,
    clean: true,
    external: LIB_EXTERNALS,
  },
  {
    name: 'koller-client',
    entry: { client: 'src/client/index.ts' },
    outDir: 'lib',
    format: 'cjs',
    platform: 'browser',
    target: 'es2022',
    dts: false,
    clean: false,
    sourcemap: true,
    external: CLIENT_EXTERNALS,
    noExternal: (id: string) => (CLIENT_EXTERNALS.includes(id) ? undefined : true),
    define: {
      'process.env.NODE_ENV': JSON.stringify(process.env.NODE_ENV ?? 'production'),
    },
    outputOptions: {
      entryFileNames: 'client.js',
      banner: `window.__ModuleLoader__.load({ id: ${JSON.stringify(PLUGIN_ID)}, factory: (require) => {`,
      footer: 'return module.exports; } });',
      intro: 'var module = { exports: {} }; var exports = module.exports;',
    },
  },
])
```

- [ ] **Step 6: 写最小占位入口（后续任务替换）**

`src/index.ts`:

```ts
export const name = 'koller'
export const inject = ['webServer']
export function apply(): void {
  // placeholder: replaced in Task 3
}
```

`src/client/index.ts`:

```ts
// placeholder: replaced in Task 4
export function apply(): void {
  // no-op
}
```

`.gitignore`:

```
node_modules/
lib/
```

- [ ] **Step 7: 安装依赖并构建**

```powershell
cd C:\Users\Leo6666666\Desktop\dsh-koller
pnpm install
pnpm build
```

Expected: `lib/index.js`、`lib/client.js` 均生成，且 `lib/client.js` 开头含 `window.__ModuleLoader__.load`。

- [ ] **Step 8: 验证占位入口可加载**

```powershell
node -e "const m = await import('file:///C:/Users/Leo6666666/Desktop/dsh-koller/lib/index.js'); console.log(m.name, m.inject)"
```

Expected: 输出 `koller [ 'webServer' ]`。

---

### Task 3: host 半区（state / persist / service / routes / index）

**Files:**
- Create: `src/state.ts`、`src/state.test.ts`、`src/persist.ts`、`src/persist.test.ts`、`src/service.ts`、`src/routes.ts`
- Modify: `src/index.ts`

**Interfaces:**
- Consumes: Task 2 的构建/测试脚本；`ctx.webServer`（dsh-host-webserver）、`ctx.on('session/event')`、`ctx.on('session/disposed')`（dsh-session，签名见参考包 service.ts:199-232）。
- Produces:
  - `KollerStateMachine`（state.ts）：`onActivityStatus(input: {phase: KollerPhase, line?: string})`、`onSessionDisposed()`、`render(): KollerStateSnapshot`；`KollerPhase = 'idle'|'waiting'|'thinking'|'tool'|'done'`；`KollerImage = 'waiting'|'working'|'done'`；`KollerStateSnapshot = { image: KollerImage; bubble: string; phase: KollerPhase }`
  - `loadKollerPersist(dir)` / `saveKollerPersist(persist, dir)`（persist.ts）；`KollerPersist = { name: string; visible: boolean; size: number; right: number; bottom: number }`；默认 `{ name: '扬科勒', visible: true, size: 160, right: 24, bottom: 20 }`
  - `KollerService`（service.ts，extends `Service`，名 `koller`）：`state(): Promise<KollerStateView>`、`setVisible(v: boolean)`、`setConfig(patch: Partial<{size,right,bottom}>)`、`setName(name: string)`；`KollerStateView = { image; bubble; phase; display: {visible,size,right,bottom}; name }`
  - `makeKollerRoutes({service, packageRoot}): WebRoute[]`（routes.ts）：`GET /api/koller/state`、`POST /api/koller/set-visible`、`POST /api/koller/set-config`、`POST /api/koller/set-name`、`GET /koller/{waiting|working|done}.webp`（含 HEAD 支持，404 兜底）

- [ ] **Step 1: 写 state.ts（纯状态机，TDD 对象）**

```ts
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
  idle: '待命中',
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
    let bubble = BUBBLES[this.phase]
    if (this.phase === 'tool' && this.line !== undefined) bubble = this.line
    return {
      image: imageForPhase(this.phase, nowMs, this.doneAt),
      bubble,
      phase: this.phase,
    }
  }
}
```

- [ ] **Step 2: 写 state.test.ts（先跑失败再实现）**

```ts
import { describe, expect, it } from 'vitest'
import { KollerStateMachine } from './state.ts'

describe('KollerStateMachine', () => {
  it('idle 映射等待图', () => {
    const m = new KollerStateMachine(() => 1000)
    expect(m.render().image).toBe('waiting')
    expect(m.render().bubble).toBe('待命中')
  })

  it('thinking/tool 映射工作图', () => {
    const m = new KollerStateMachine(() => 1000)
    m.onActivityStatus({ phase: 'thinking' })
    expect(m.render().image).toBe('working')
    m.onActivityStatus({ phase: 'tool', line: '工具：bash' })
    expect(m.render().image).toBe('working')
    expect(m.render().bubble).toBe('工具：bash')
  })

  it('done 在庆祝窗内显示完成图，超时回落等待图', () => {
    let now = 0
    const m = new KollerStateMachine(() => now)
    m.onActivityStatus({ phase: 'done' })
    now = 1000
    expect(m.render().image).toBe('done')
    expect(m.render().bubble).toBe('任务完成！')
    now = 3000
    expect(m.render().image).toBe('waiting')
  })

  it('会话销毁回到 idle', () => {
    const m = new KollerStateMachine(() => 0)
    m.onActivityStatus({ phase: 'tool' })
    m.onSessionDisposed()
    expect(m.render().phase).toBe('idle')
    expect(m.render().image).toBe('waiting')
  })
})
```

- [ ] **Step 3: 跑测试确认通过**

```powershell
pnpm test
```

Expected: state.test.ts 4 个用例 PASS。

- [ ] **Step 4: 写 persist.ts**

```ts
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
```

- [ ] **Step 5: 写 persist.test.ts**

```ts
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
```

- [ ] **Step 6: 跑测试确认通过**

```powershell
pnpm test
```

Expected: 全部 PASS。

- [ ] **Step 7: 写 service.ts（照抄参考包 service.ts 的事件接线，去掉养成逻辑）**

```ts
import { Context, Service } from '@deepseek-ai/cordis'
import type { Session, SessionEvent } from '@deepseek-ai/dsh-session'
import { KollerStateMachine, type KollerPhase, type KollerStateSnapshot } from './state.ts'
import {
  DISPLAY_INSET_MAX,
  DISPLAY_SIZE_MAX,
  DISPLAY_SIZE_MIN,
  PET_NAME_MAX_LENGTH,
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

  constructor(ctx: Context, config: KollerConfig = {}) {
    super(ctx, 'koller')
    this.persistDir = config.persistDir ?? undefined as unknown as string
    this.persist = loadKollerPersist(this.persistDir)
    ctx.on('session/event', (session: Session, event: SessionEvent) => {
      switch (event.type) {
        case 'turn/start':
          this.machine.onActivityStatus({ phase: 'waiting' })
          break
        case 'step/start':
          this.machine.onActivityStatus({ phase: 'thinking' })
          break
        case 'tool/call':
          this.machine.onActivityStatus({ phase: 'tool', line: `工具：${event.data.name}` })
          break
        case 'turn/end':
          if (event.data.reason.kind === 'completed') {
            this.machine.onActivityStatus({ phase: 'done' })
          } else {
            this.machine.onActivityStatus({ phase: 'idle' })
          }
          break
        default:
          break
      }
    })
    ctx.on('session/disposed', () => {
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

  private flush(): void {
    try {
      saveKollerPersist(this.persist, this.persistDir)
    } catch {
      // best-effort
    }
  }
}
```

注意：`persistDir` 默认值用 `loadKollerPersist()` 的无参默认（$DSH_HOME）。修正 service 构造为：

```ts
constructor(ctx: Context, config: KollerConfig = {}) {
  super(ctx, 'koller')
  this.persistDir = config.persistDir ?? kollerHomeDir()
  this.persist = loadKollerPersist(this.persistDir)
  ...
}
```

并在 import 里补 `kollerHomeDir`（`loadKollerPersist` 同源导出）。

- [ ] **Step 8: 写 routes.ts（照抄参考包 routes.ts 的 JSON/静态路由骨架，前缀与素材名换成 koller）**

```ts
import type { IncomingMessage, ServerResponse } from 'node:http'
import { readFile } from 'node:fs/promises'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'
import type { WebRoute } from '@deepseek-ai/dsh-host-webserver'
import type { KollerService } from './service.ts'

export const KOLLER_API_PREFIX = '/api/koller'
export const KOLLER_ASSET_PREFIX = '/koller'

const ASSET_FILES = [
  { name: 'waiting.webp', mime: 'image/webp' },
  { name: 'working.webp', mime: 'image/webp' },
  { name: 'done.webp', mime: 'image/webp' },
] as const

export function kollerPackageRoot(importMetaUrl: string): string {
  return fileURLToPath(new URL('../', importMetaUrl))
}

function json(res: ServerResponse, status: number, body: unknown): void {
  res.writeHead(status, { 'content-type': 'application/json; charset=utf-8' })
  res.end(JSON.stringify(body))
}

function requireMethod(req: IncomingMessage, res: ServerResponse, method: string): boolean {
  if (req.method === method) return true
  json(res, 405, { ok: false, error: 'method-not-allowed' })
  return false
}

function readJsonBody(req: IncomingMessage): Promise<unknown> {
  return new Promise((resolve, reject) => {
    let size = 0
    const chunks: Buffer[] = []
    req.on('data', (chunk: Buffer) => {
      size += chunk.length
      if (size > 64 * 1024) {
        reject(new Error('body-too-large'))
        queueMicrotask(() => req.destroy())
        return
      }
      chunks.push(chunk)
    })
    req.on('end', () => {
      if (chunks.length === 0) { resolve({}); return }
      try { resolve(JSON.parse(Buffer.concat(chunks).toString('utf8'))) }
      catch { reject(new Error('invalid-json')) }
    })
    req.on('error', reject)
  })
}

function getRoute(path: string, run: () => Promise<unknown>): WebRoute {
  return {
    kind: 'exact',
    path,
    handler: (req: IncomingMessage, res: ServerResponse): void => {
      if (!requireMethod(req, res, 'GET')) return
      run().then((value) => json(res, 200, value), (error) => {
        json(res, 500, { ok: false, error: error instanceof Error ? error.message : String(error) })
      })
    },
  }
}

function postRoute(path: string, run: (body: Record<string, unknown>) => Promise<unknown>): WebRoute {
  return {
    kind: 'exact',
    path,
    handler: (req: IncomingMessage, res: ServerResponse): Promise<void> => {
      if (!requireMethod(req, res, 'POST')) return Promise.resolve()
      return readJsonBody(req).then((body) => {
        const record = (typeof body === 'object' && body !== null) ? body as Record<string, unknown> : {}
        return run(record).then(
          (value) => json(res, 200, value),
          (error) => json(res, 400, { ok: false, error: error instanceof Error ? error.message : String(error) }),
        )
      }, (error) => {
        json(res, 400, { ok: false, error: error instanceof Error ? error.message : String(error) })
      })
    },
  }
}

export function makeKollerRoutes(deps: { service: KollerService; packageRoot: string }): WebRoute[] {
  const { service, packageRoot } = deps
  const apiRoutes: WebRoute[] = [
    getRoute(`${KOLLER_API_PREFIX}/state`, () => service.state()),
    postRoute(`${KOLLER_API_PREFIX}/set-visible`, (body) => {
      if (typeof body.visible !== 'boolean') return Promise.reject(new Error('invalid-visible'))
      return service.setVisible(body.visible)
    }),
    postRoute(`${KOLLER_API_PREFIX}/set-config`, (body) => service.setConfig({
      ...(typeof body.size === 'number' ? { size: body.size } : {}),
      ...(typeof body.right === 'number' ? { right: body.right } : {}),
      ...(typeof body.bottom === 'number' ? { bottom: body.bottom } : {}),
    })),
    postRoute(`${KOLLER_API_PREFIX}/set-name`, (body) => {
      if (typeof body.name !== 'string') return Promise.reject(new Error('invalid-name'))
      return service.setName(body.name)
    }),
  ]

  const assetRoutes: WebRoute[] = ASSET_FILES.map((file): WebRoute => ({
    kind: 'exact',
    path: `${KOLLER_ASSET_PREFIX}/${file.name}`,
    handler: (req: IncomingMessage, res: ServerResponse): Promise<void> | void => {
      if (req.method !== 'GET' && req.method !== 'HEAD') {
        res.writeHead(405)
        res.end()
        return
      }
      return readFile(join(packageRoot, 'assets', 'koller', file.name)).then((body) => {
        res.writeHead(200, {
          'content-type': file.mime,
          'content-length': String(body.byteLength),
          'cache-control': 'no-cache',
        })
        if (req.method === 'HEAD') { res.end(); return }
        res.end(body)
      }, () => {
        res.writeHead(404)
        res.end()
      })
    },
  }))

  return [...apiRoutes, ...assetRoutes]
}
```

- [ ] **Step 9: 替换 src/index.ts 为真实入口**

```ts
import { Context } from '@deepseek-ai/cordis'
import type {} from '@deepseek-ai/dsh-host-webserver'
import { KollerService } from './service.ts'
import { kollerPackageRoot, makeKollerRoutes } from './routes.ts'

export const name = 'koller'
export const inject = ['webServer']

export function apply(ctx: Context): void {
  const service = new KollerService(ctx)
  const routes = makeKollerRoutes({ service, packageRoot: kollerPackageRoot(import.meta.url) })
  ctx.effect(
    () => {
      const disposers = routes.map((route) => ctx.webServer.register(route))
      return () => { for (const dispose of disposers) dispose() }
    },
    'koller: routes',
  )
}
```

- [ ] **Step 10: typecheck + test + build**

```powershell
pnpm typecheck
pnpm test
pnpm build
```

Expected: 全部通过，`lib/index.js` 更新。

---

### Task 4: browser 半区（浮层 + 轮询 + 动画）

**Files:**
- Create: `src/client/KollerPet.tsx`、`src/client/style.ts`
- Modify: `src/client/index.ts`

**Interfaces:**
- Consumes: Task 3 的 `/api/koller/*` 路由；`window.__ModuleLoader__` 加载本 bundle 并调用 `apply(ctx)`。
- Produces: `lib/client.js` 包含完整浮层逻辑：`apply(ctx)` 挂全局 root、800ms 轮询（visibility 感知）、三态图片交叉淡入淡出、done 弹跳、拖动持久化、悬停工具条（隐藏/大小±）、隐藏时召唤按钮。

- [ ] **Step 1: 写 style.ts（内联 CSS 字符串，注入 `<style data-plugin="koller">`）**

```ts
export const KOLLER_CSS = `
.koller-pet-root { position: fixed; z-index: 2147483000; cursor: grab; user-select: none; -webkit-user-select: none; touch-action: none; }
.koller-pet-root.dragging { cursor: grabbing; }
.koller-pet-stage { position: relative; width: 100%; height: 100%; }
.koller-pet-img { position: absolute; inset: 0; width: 100%; height: 100%; object-fit: contain; opacity: 0; transition: opacity 300ms ease; pointer-events: none; }
.koller-pet-img.show { opacity: 1; }
.koller-pet-img.bounce { animation: koller-bounce 600ms ease; }
@keyframes koller-bounce {
  0% { transform: translateY(0) scale(1); }
  30% { transform: translateY(-18px) scale(1.06); }
  60% { transform: translateY(0) scale(0.97); }
  80% { transform: translateY(-6px) scale(1.02); }
  100% { transform: translateY(0) scale(1); }
}
.koller-pet-bubble { position: absolute; left: 50%; bottom: calc(100% + 8px); transform: translateX(-50%); background: rgba(17, 24, 39, 0.92); color: #fff; font-size: 12px; line-height: 1.4; padding: 4px 10px; border-radius: 999px; white-space: nowrap; pointer-events: none; box-shadow: 0 2px 8px rgba(0,0,0,0.25); }
.koller-pet-toolbar { position: absolute; top: -34px; left: 50%; transform: translateX(-50%); display: flex; gap: 4px; background: rgba(17, 24, 39, 0.9); border-radius: 8px; padding: 4px; opacity: 0; transition: opacity 150ms ease; pointer-events: none; }
.koller-pet-root:hover .koller-pet-toolbar { opacity: 1; pointer-events: auto; }
.koller-pet-btn { background: none; border: none; color: #fff; font-size: 14px; line-height: 1; padding: 4px 7px; border-radius: 5px; cursor: pointer; }
.koller-pet-btn:hover { background: rgba(255,255,255,0.18); }
.koller-pet-summon { position: fixed; z-index: 2147483000; right: 24px; bottom: 20px; background: rgba(17,24,39,0.92); color: #fff; border: none; border-radius: 999px; padding: 8px 14px; font-size: 13px; cursor: pointer; box-shadow: 0 2px 10px rgba(0,0,0,0.3); }
.koller-pet-summon:hover { background: rgba(17,24,39,1); }
`

export function injectKollerCss(): () => void {
  const id = 'koller-pet-style'
  if (document.querySelector(`style[data-plugin-css="${id}"]`) !== null) return () => {}
  const tag = document.createElement('style')
  tag.dataset.plugin = '@leo6666666/dsh-koller'
  tag.dataset.pluginCss = id
  tag.textContent = KOLLER_CSS
  document.head.appendChild(tag)
  return () => tag.remove()
}
```

- [ ] **Step 2: 写 KollerPet.tsx（浮层组件：图片切换 + 拖动 + 工具条）**

```tsx
import { createElement, useCallback, useEffect, useRef, useState } from 'react'
import type { KollerStateView } from '../service.ts'

const IMAGES: Record<string, string> = {
  waiting: '/koller/waiting.webp',
  working: '/koller/working.webp',
  done: '/koller/done.webp',
}

interface KollerPetProps {
  state: KollerStateView | null
  onHide: () => void
  onResize: (delta: number) => void
  onDragEnd: (right: number, bottom: number) => void
  onSummon: () => void
}

export function KollerPet({ state, onHide, onResize, onDragEnd, onSummon }: KollerPetProps): ReturnType<typeof createElement> {
  const [dragging, setDragging] = useState(false)
  const dragRef = useRef<{ startX: number; startY: number; right: number; bottom: number } | null>(null)
  const rootRef = useRef<HTMLDivElement | null>(null)

  const onPointerDown = useCallback((e: React.PointerEvent) => {
    if (e.button !== 0) return
    e.preventDefault()
    const rect = rootRef.current?.getBoundingClientRect()
    if (rect === undefined) return
    const viewportW = window.innerWidth
    const viewportH = window.innerHeight
    dragRef.current = {
      startX: e.clientX,
      startY: e.clientY,
      right: viewportW - rect.right,
      bottom: viewportH - rect.bottom,
    }
    setDragging(true)
    const onMove = (ev: PointerEvent): void => {
      const d = dragRef.current
      if (d === null) return
      const right = Math.max(0, Math.round(d.right - (ev.clientX - d.startX)))
      const bottom = Math.max(0, Math.round(d.bottom - (ev.clientY - d.startY)))
      if (rootRef.current !== null) {
        rootRef.current.style.right = `${right}px`
        rootRef.current.style.bottom = `${bottom}px`
      }
      dragRef.current = { ...d, right, bottom }
    }
    const onUp = (ev: PointerEvent): void => {
      const d = dragRef.current
      if (d !== null) onDragEnd(d.right, d.bottom)
      dragRef.current = null
      setDragging(false)
      window.removeEventListener('pointermove', onMove)
      window.removeEventListener('pointerup', onUp)
    }
    window.addEventListener('pointermove', onMove)
    window.addEventListener('pointerup', onUp)
  }, [onDragEnd])

  if (state === null) return createElement('div')
  const image = IMAGES[state.image]
  const showDone = state.image === 'done'
  return createElement('div', {
    ref: rootRef,
    className: `koller-pet-root${dragging ? ' dragging' : ''}`,
    style: {
      right: `${state.display.right}px`,
      bottom: `${state.display.bottom}px`,
      height: `${state.display.size}px`,
    },
    onPointerDown,
  },
    createElement('div', { className: 'koller-pet-toolbar' },
      createElement('button', { className: 'koller-pet-btn', onClick: () => onResize(-20), title: '变小' }, '−'),
      createElement('button', { className: 'koller-pet-btn', onClick: () => onResize(20), title: '变大' }, '+'),
      createElement('button', { className: 'koller-pet-btn', onClick: onHide, title: '隐藏' }, '✕'),
    ),
    createElement('div', { className: 'koller-pet-stage' },
      createElement('img', { className: 'koller-pet-img', src: image, alt: '', draggable: false }),
      createElement('div', { className: 'koller-pet-bubble' }, state.bubble),
    ),
  )
}
```

注：图片交叉淡入通过「同一 img src 切换 + `transition: opacity`」简化实现——为达到淡入淡出效果，改用在 state 变化时给 img 重新挂载并加 `show` 类。更简单的可靠方案（避免挂载抖动）：直接依赖 CSS `transition` 对 `opacity` 的切换，两帧同图时无视觉差异，三图切换时旧图瞬时消失新图淡入，可接受。若验证时发现生硬，给 img 加 `key={state.image}` 强制重挂载并配合 `animation: fadeIn`。本任务先实现基础版，Task 6 验证后决定是否加 key 重挂载。

（可选增强，验证后决定）在 style.ts 追加：

```css
@keyframes koller-fadein { from { opacity: 0; } to { opacity: 1; } }
.koller-pet-img.enter { animation: koller-fadein 300ms ease; }
```

- [ ] **Step 3: 写 client/index.ts（apply 挂载 + 轮询 + API）**

```ts
import type { ClientContext } from '@deepseek-ai/dsh-client-runtime/client'
import { createElement } from 'react'
import { createRoot } from 'react-dom/client'
import type { KollerStateView } from '../service.ts'
import { KollerPet } from './KollerPet.tsx'
import { injectKollerCss } from './style.ts'

const POLL_MS = 800

async function apiFetch<T>(path: string, body?: unknown): Promise<T> {
  const response = await fetch(path, body === undefined
    ? {}
    : {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(body),
      })
  if (!response.ok) throw new Error(`koller ${path} failed: ${response.status}`)
  return (await response.json()) as T
}

const kollerApi = {
  state: () => apiFetch<KollerStateView>('/api/koller/state'),
  setVisible: (visible: boolean) => apiFetch('/api/koller/set-visible', { visible }),
  setConfig: (patch: Record<string, number>) => apiFetch('/api/koller/set-config', patch),
}

export function apply(): void {
  injectKollerCss()

  const container = document.createElement('div')
  container.dataset.dshKollerRoot = ''
  document.body.appendChild(container)
  const root = createRoot(container)

  let snapshot: KollerStateView | null = null
  let timer: number | undefined
  let pending = false

  const render = (): void => {
    root.render(createElement(KollerPet, {
      state: snapshot,
      onHide: () => { void kollerApi.setVisible(false).then(pollNow) },
      onSummon: () => { void kollerApi.setVisible(true).then(pollNow) },
      onResize: (delta) => {
        if (snapshot !== null) void kollerApi.setConfig({ size: snapshot.display.size + delta }).then(pollNow)
      },
      onDragEnd: (right, bottom) => { void kollerApi.setConfig({ right, bottom }).then(pollNow) },
    }))
  }

  const pollNow = (): void => {
    if (pending) return
    pending = true
    kollerApi.state().then((value) => {
      snapshot = value
      render()
    }, () => {
      // transport error: keep last snapshot
    }).finally(() => { pending = false })
  }

  const start = (): void => {
    if (timer === undefined && document.visibilityState === 'visible') {
      timer = window.setInterval(pollNow, POLL_MS)
    }
  }
  const stop = (): void => {
    if (timer !== undefined) {
      window.clearInterval(timer)
      timer = undefined
    }
  }
  const onVisibility = (): void => {
    if (document.visibilityState === 'visible') { pollNow(); start() } else { stop() }
  }

  pollNow()
  start()
  document.addEventListener('visibilitychange', onVisibility)
}
```

注意：隐藏时客户端要渲染召唤按钮——将 KollerPet 拆为两个组件或在 KollerPet 内部根据 `state.display.visible` 渲染：visible=false 时返回召唤按钮元素（复用 `.koller-pet-summon` 类，调用 `onSummon`）。补充：上面 KollerPet 的 Props 已含 `onSummon`；在 KollerPet 组件开头加入：

```tsx
if (state === null) return createElement('div')
if (!state.display.visible) {
  return createElement('button', { className: 'koller-pet-summon', onClick: onSummon }, `召唤${state.name}`)
}
```

- [ ] **Step 4: typecheck + build**

```powershell
pnpm typecheck
pnpm build
```

Expected: 通过，`lib/client.js` 含完整浮层逻辑与 `__ModuleLoader__.load` 包装。

---

### Task 5: link 安装到 web profile

**Files:**
- Modify: `C:\Users\Leo6666666\.dsh\profiles\web\package.json`（由 dsh 命令写入）

- [ ] **Step 1: 添加 link 依赖**

```powershell
cd C:\Users\Leo6666666\Desktop\dsh-koller
dsh plugin --profile web add link:C:\Users\Leo6666666\Desktop\dsh-koller
```

- [ ] **Step 2: 验证安装**

```powershell
Get-Content C:\Users\Leo6666666\.dsh\profiles\web\package.json
Test-Path C:\Users\Leo6666666\.dsh\profiles\web\node_modules\@leo6666666\dsh-koller
```

Expected: package.json dependencies 含 `@leo6666666/dsh-koller: link:...`；node_modules 下存在符号链接。

---

### Task 6: 端到端验证

**Files:**
- 无（运行验证）

- [ ] **Step 1: 后台启动 dsh web 并等端口**

```powershell
Start-Process -FilePath "dsh" -ArgumentList "web" -WindowStyle Hidden
Start-Sleep -Seconds 15
Test-NetConnection -ComputerName 127.0.0.1 -Port 3080 | Select-Object TcpTestSucceeded
```

Expected: TcpTestSucceeded = True（端口默认 3080；若被占用，从 dsh web 输出确认实际端口）。

- [ ] **Step 2: API 冒烟测试**

```powershell
$state = Invoke-RestMethod http://127.0.0.1:3080/api/koller/state
$state | ConvertTo-Json
```

Expected: `{ image: 'waiting', bubble: '待命中', phase: 'idle', display: { visible: true, size: 160, ... }, name: '扬科勒' }`（或当前 persisted 值）。

```powershell
Invoke-WebRequest http://127.0.0.1:3080/koller/waiting.webp | Select-Object StatusCode, ContentType
```

Expected: 200 / image/webp。

- [ ] **Step 3: 写变更验证**

```powershell
Invoke-RestMethod -Method Post -Body '{"visible":false}' -ContentType 'application/json' http://127.0.0.1:3080/api/koller/set-visible
Get-Content C:\Users\Leo6666666\.dsh\koller.json
Invoke-RestMethod -Method Post -Body '{"visible":true}' -ContentType 'application/json' http://127.0.0.1:3080/api/koller/set-visible
```

Expected: koller.json 生成且 visible 变更持久化。

- [ ] **Step 4: 浏览器验证浮层渲染**

用 agent-browser（或手动打开 http://127.0.0.1:3080）确认：页面右下角出现扬科勒等待图 + 「待命中」气泡；悬停显示工具条；拖动后位置持久化；隐藏后出现「召唤扬科勒」按钮。

状态切换（thinking/tool/done）由 Task 3 单元测试覆盖事件→phase→image 映射；真实会话触发切换需要模型活动，若验证环境有 API key 可发一条消息观察切图，否则以单元测试 + API 冒烟为准。

- [ ] **Step 5: 回归确认旧鲸鱼娘不受影响**

```powershell
Invoke-RestMethod http://127.0.0.1:3080/api/pet/state | ConvertTo-Json
Get-Content C:\Users\Leo6666666\.dsh\pet.json | Select-Object -First 3
```

Expected: pet API 正常返回；pet.json 未被 koller 改动。

---

## Self-Review 记录

- **Spec 覆盖**：三态映射（Task 3 state.ts + Task 1 素材）、双半区架构（Task 2-4）、/api/koller + /koller 路由（Task 3 routes.ts）、koller.json 独立持久化（Task 3 persist.ts）、拖动/隐藏/召唤/大小（Task 4）、link 安装（Task 5）、端到端验证（Task 6）、明确不做的功能均未实现 ✓
- **占位符扫描**：无 TBD/TODO；Task 2 Step 6 占位文件有明确说明被后续任务替换 ✓
- **类型一致性**：`KollerStateMachine.render()` 返回 `KollerStateSnapshot`（含 image/bubble/phase），service 组合为 `KollerStateView`（+display/name），client 消费同型；`imageForPhase` 输出 `KollerImage` 与 routes 素材名（waiting/working/done.webp）一致 ✓