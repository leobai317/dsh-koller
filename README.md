# dsh-koller — 扬科勒桌宠插件

> 给 dsh Web UI 加一位前锋搭档：扬科勒的三张照片会随模型活动状态自动切换（等待 / 进行中 / 完成），还可以拖动、缩放和隐藏。

## 功能

| 功能 | 说明 |
|---|---|
| 状态切换 | 监听 dsh 核心会话事件，在等待、思考 / 工具调用、任务完成三张照片之间切换 |
| 状态气泡 | 照片上方显示当前状态文案（如「思考中…」「任务完成！」） |
| 完成庆祝 | 任务完成时显示完成照片并弹跳，2.4 秒后自动回落到等待状态 |
| 拖动摆位 | 按住照片拖到任意位置，松手后持久化 right / bottom |
| 缩放 | 悬停照片后使用「+/−」调整显示大小（80–400px） |
| 隐藏 / 召唤 | 悬停工具条可隐藏；隐藏后右下角显示「召唤扬科勒」按钮 |
| 命名持久化 | 通过 API 可修改宠物名（1–20 字符，默认「扬科勒」） |
| 省电轮询 | 浏览器半区每 800ms 轮询一次状态，页面隐藏时自动暂停 |

## 状态映射

| 模型状态 | 事件 | 显示图片 | 气泡文案 |
|---|---|---|---|
| 空闲 | 无会话 / `session/disposed` | `waiting.webp` | 准备中 |
| 等待 | `turn/start` | `waiting.webp` | 等待任务 |
| 思考 | `step/start` | `working.webp` | 思考中… |
| 工具调用 | `tool/call` | `working.webp` | 工具：{name} |
| 任务完成 | `turn/end`（`reason.kind === completed`） | `done.webp` | 任务完成！ |
| 出错 / 结束 | `turn/end`（其他原因） | `waiting.webp` | 准备中 |

## 目录结构

```
dsh-koller/
├── assets/koller/          # 三张透明背景 webp 素材
│   ├── waiting.webp        # 等待 / 空闲
│   ├── working.webp        # 思考 / 工具调用
│   └── done.webp           # 任务完成
├── docs/superpowers/       # 设计与实施文档
├── src/
│   ├── index.ts            # host 半区：cordis 插件入口，注册路由
│   ├── service.ts          # KollerService：会话事件 → 状态机 + 持久化
│   ├── state.ts            # 状态机与庆祝窗（2400ms）
│   ├── persist.ts          # $DSH_HOME/koller.json 原子读写
│   ├── routes.ts           # /api/koller/* JSON 路由 + /koller/* 素材路由
│   └── client/
│       ├── index.ts        # 浏览器半区：React root 挂 body，800ms 轮询
│       ├── KollerPet.tsx   # 浮层组件：拖动 / 缩放 / 隐藏 / 召唤
│       └── style.ts        # 内联 CSS
├── cordis.patch.yml        # bundle patch：向 web 插件名单插入 koller
├── package.json
└── tsdown.config.ts        # lib ESM + client CJS bundle 构建配置
```

## 架构

```
dsh session 事件 ──> KollerService（host 半区）
                        │  状态机 + 持久化
                        │  暴露 /api/koller/* 和 /koller/*
React root（document.body） <── 800ms 轮询 ── 浏览器半区
                        │
                    KollerPet 浮层（右下角）
```

- **Host 半区**：Cordis 插件监听 `session/event`，根据会话事件推导状态，并通过同源 JSON 路由暴露给浏览器。
- **Browser 半区**：React 根节点挂载到 `document.body`，轮询 `/api/koller/state` 并渲染图片浮层；页面隐藏时停止轮询。
- **持久化**：配置保存在 `$DSH_HOME/koller.json`（未设置 `DSH_HOME` 时默认为 `~/.dsh/koller.json`），使用临时文件 + rename 原子写入。

## HTTP API

| 方法 | 路径 | 说明 |
|---|---|---|
| `GET` | `/api/koller/state` | 获取当前状态与显示配置 |
| `POST` | `/api/koller/set-visible` | `{ "visible": boolean }` 显示 / 隐藏 |
| `POST` | `/api/koller/set-config` | `{ "size"?, "right"?, "bottom"? }` 调整显示配置 |
| `POST` | `/api/koller/set-name` | `{ "name": string }` 修改宠物名 |
| `GET` / `HEAD` | `/koller/{waiting,working,done}.webp` | 素材静态路由 |

## 安装

前置要求：Node `^22.19.0` 或 `>=24.0.0`、pnpm、已安装可用的 `dsh` CLI。

### 本地仓库安装（当前推荐）

```sh
git clone https://github.com/leobai317/dsh-koller.git
cd dsh-koller
pnpm install
pnpm build
dsh plugin --profile web add link:$(pwd)
```

安装后重启 `dsh web`，扬科勒会出现在界面右下角。

link 模式下修改源码后，重新执行 `pnpm build` 并刷新页面即可，无需重新安装。

### 发布到 npm 后

```sh
dsh plugin --profile web add @leo6666666/dsh-koller
```

## 开发

```sh
pnpm install    # 安装依赖
pnpm build      # 构建 lib/index.js（host）+ lib/client.js（浏览器 bundle）
pnpm test       # vitest 单元测试（state / persist）
pnpm typecheck  # tsc --noEmit 类型检查
```

说明：`node_modules/`、`lib/` 和 `.superpowers/` 已在 `.gitignore` 中忽略，仓库只保存源码与素材。

## License

[Apache-2.0](./LICENSE)
