# dsh-koller 桌宠插件设计（扬科勒）

日期：2026-08-17
状态：已批准（用户确认，进入实施）

## 目标

为 DeepSeek Harness（dsh）Web UI 做一个新的桌宠插件：捷克前锋扬科勒。三张透明背景照片对应三种工作状态，嵌入 dsh Web UI 右下角，随模型活动切换。

## 角色与状态映射

| 状态 | 图片 | 触发事件 | 气泡文案 |
|---|---|---|---|
| 等待任务 | 01.png | idle / 无会话 | 待命中 |
| 进行中 | 02.png | step/start（思考）、tool/call（工具） | 思考中… / 工具：{name} |
| 任务完成 | 03.png | turn/end reason.completed | 任务完成！（2.4s 后回落等待） |
| 出错 | 01.png | turn/end reason 非 completed | 出错了 |

## 架构

复用已验证的 @linxin666/dsh-pet 双半区模式：

- **Host 半区**（Cordis 插件，Node 侧）
  - `PetService` 监听核心 `session/event`（turn/start、step/start、tool/call、turn/end、session/disposed）
  - 极简状态机（无亲密度/投喂）
  - 注册 `/api/koller/*` 同源 JSON 路由 + `/koller/*` 素材路由
  - 持久化 `$DSH_HOME/koller.json`（独立文件，不碰鲸鱼娘的 pet.json）
- **Browser 半区**（React，挂 document.body 全局 root）
  - 800ms 轮询 `/api/koller/state`（页面隐藏时停轮询）
  - 三张照片按状态交叉淡入淡出，完成时 CSS 弹跳
  - 拖动重摆位（持久化 right/bottom）、悬停工具条（隐藏/大小±）、隐藏后召唤按钮

## 交互（精简版）

- 拖动：按住拖到新位置，松手持久化
- 悬停工具条：隐藏按钮、大小 +/−
- 隐藏后：固定位置召唤按钮「召唤扬科勒」
- 不做：亲密度、投喂、养成、设置面板卡片、失败专属图

## 素材处理

- 三张原图尺寸不一（729×2211 / 1708×2237 / 1677×2325），处理为统一规范：等高 640px、透明背景保留、压缩为 webp/png 放入 `assets/koller/`
- 渲染：固定高度（默认 160px 可调），宽度自适应

## 项目结构

```
Desktop/dsh-koller/
|-- package.json          # dsh.bundle.patch + dsh.client 声明
|-- cordis.patch.yml      # 插入插件行 id: koller
|-- tsconfig.json / tsconfig.test.json
|-- tsdown.config.ts      # host ESM + browser bundle
|-- src/
|   |-- index.ts          # 插件入口（cordis apply，注册路由 + 设置）
|   |-- service.ts        # KollerService：状态机接线 + 配置（RPC 服务面）
|   |-- state.ts          # 状态机：session 事件 → phase → 图片
|   |-- persist.ts        # 持久化（$DSH_HOME/koller.json，原子写入）
|   |-- routes.ts         # /api/koller/* JSON API + /koller/* 素材静态路由
|   `-- client/           # 浏览器半区
|       |-- index.ts      # 全局挂载（createRoot → body）+ 轮询 + 交互
|       |-- KollerPet.tsx # 浮层组件（portal + 图片切换动画 + 拖动）
|       `-- koller.css    # 样式（内联注入，不用 CSS Modules，避免构建复杂度）
|-- assets/koller/        # waiting.webp / working.webp / done.webp
`-- docs/superpowers/specs/2026-08-17-dsh-koller-design.md
```

## 安装与验证

```sh
cd Desktop/dsh-koller
pnpm install && pnpm build
dsh plugin --profile web add link:C:\Users\Leo6666666\Desktop\dsh-koller
# 重启 dsh web
```

验证：页面右下角出现扬科勒；发消息时切 02、完成时切 03 弹跳、结束后回落 01；拖动/隐藏/召唤/大小生效；重启 dsh 后位置与可见性保持。

## 明确不做（YAGNI）

- 亲密度/投喂/小鱼干经济
- 失败专属动画图（无素材，出错回落等待图）
- 设置面板卡片（大小/位置通过拖动与悬停工具条调节）
- 多语言字典（仅中文文案）