# Lark post 富文本完整解析 Spec

## Overview
本需求修复飞书 `post` 富文本消息进入 botmux 后的内容保真问题：实时消息、`botmux history`、`botmux quoted` 都必须通过同一套 `post` 节点解析策略保留用户可见语义内容，避免代码块、链接、mention、图片/文件占位等在传给 CLI 前被静默丢弃。

## User Stories

### Story 1: 用户发送含代码块的飞书富文本消息
- **Acceptance**: 当用户在飞书 `post` 消息中发送代码块和普通正文时，Claude 收到的 `<user_message>` 内容包含 fenced code block、语言标识和前后正文，且代码块不会与正文粘连。
- **Technical implementation**: `src/im/lark/message-parser.ts` 的 `extractTextContent()` 在 `msgType === 'post'` 分支中识别代码块节点并渲染为 markdown fence。

### Story 2: 用户发送常见富文本样式内容
- **Acceptance**: 当 `post` 消息包含已明确支持的富文本节点时，解析结果保留可见文本内容；未支持节点不得被通用 fallback 误拼进 prompt。
- **Technical implementation**: `src/im/lark/message-parser.ts` 的 `post` 节点映射逻辑只支持明确 tag，新增 tag 必须基于真实 payload 或 schema 显式加入。

### Story 3: 用户通过 history 或 quoted 回看富文本消息
- **Acceptance**: 同一条 `post` 消息通过实时事件、`botmux history`、`botmux quoted` 读取时，解析出的正文结构一致，至少在代码块、普通文本、链接、mention、图片/文件占位上保持同样语义。
- **Technical implementation**: `parseEventMessage()` 与 `parseApiMessage()` 继续共享 `extractTextContent()` 的 `post` 分支，并在 `test/message-parser.test.ts` 对两个入口都加回归测试。

## Functional Requirements

| ID | Requirement | Acceptance check |
|---|---|---|
| FR-1 | 当 `post` 富文本包含代码块节点时，系统必须把代码块渲染为 markdown fence，并保留语言标识和代码正文。 | `pnpm vitest run test/message-parser.test.ts` 中的 `parseApiMessage` 代码块用例断言完整输出。 |
| FR-2 | 当代码块前后存在普通文本节点时，系统必须在 fence 前后保留换行边界，不得输出 `前文```...```后文` 这类粘连结构。 | `pnpm vitest run test/message-parser.test.ts` 中的混排结构用例使用完整字符串或换行结构断言。 |
| FR-3 | 当 `post` 富文本包含链接、mention、图片、视频图片占位或文件节点时，系统必须保持现有可读输出语义，不得回退已有行为。 | `pnpm vitest run test/message-parser.test.ts` 中现有 post 图片/文件用例继续通过，并新增/保留链接、mention 覆盖。 |
| FR-4 | 当 `post` 富文本包含未明确支持的节点时，系统不得通过通用 `text/content` fallback 把结构化内容误拼进 prompt。 | 新增未知节点测试，断言未知文本节点和未知对象都不产生噪声。 |
| FR-5 | 新增 `post` 富文本 tag 支持时，系统必须基于真实 payload 或 schema 显式加入 tag 分支，不得通过通用未知节点 fallback 扩大范围。 | 代码中 `renderPostNode()` 只包含明确 tag 分支；未知节点测试锁定默认忽略。 |
| FR-6 | `parseEventMessage()` 与 `parseApiMessage()` 必须对同一类 `post` 富文本结构输出一致的用户可见内容。 | `pnpm vitest run test/message-parser.test.ts` 中分别覆盖 live 事件入口和 API 消息入口。 |
| FR-7 | 修复不得改变 `interactive` 卡片、`merge_forward` 展开、`botmux send` markdown/card 渲染、附件下载能力。 | `pnpm build` 通过；相关现有 message-parser 测试继续通过，diff 不触碰非必要模块。 |

## Success Criteria
1. 会话 `7be99f68` 中同类“代码块 + 正文”消息在修复后不会只剩普通正文。
2. `post` 富文本的用户可见内容在实时消息、history、quoted 三条入口中保持一致。
3. 代码块输出可读、可复制，且不会与前后正文粘连。
4. 未支持的结构化节点不会通过通用 fallback 误拼进 prompt。
5. 现有图片/文件占位与资源编号行为不回退。
6. `pnpm vitest run test/message-parser.test.ts` 与 `pnpm build` 通过。

## Key Entities
- `extractTextContent()`: `src/im/lark/message-parser.ts` 中负责把 Lark message content 转成可读文本的核心函数。
- `resolvePostBody()`: `src/im/lark/message-parser.ts` 中负责兼容 wrapped/unwrapped post body 的解析入口。
- `parseEventMessage()`: `src/im/lark/message-parser.ts` 中实时 WS 事件的消息解析入口。
- `parseApiMessage()`: `src/im/lark/message-parser.ts` 中 REST/API 拉取消息的解析入口，用于 history/quoted 等路径。
- `test/message-parser.test.ts`: 消息解析回归测试文件。

## Assumptions
- 飞书 `post` 的主体结构仍是 `content` 段落数组，节点以 `tag` 区分类型。
- 真实代码块 payload 可通过现有消息、OpenAPI 或本地调试日志确认；实现不得只凭猜测字段名落地。
- 样式类节点只有在真实 payload 或 schema 证明其 tag 应被显式支持时才加入支持清单。
- 未知节点不做通用 fallback，不把任意 text/content 字段拼进 prompt。

## Clarifications
- 修复范围: 只覆盖 `post` 富文本解析。
- 未知节点策略: 默认忽略，不做通用 text/content fallback。
- 代码块格式: 使用 markdown fence，并做前后换行保护。

## Out of Scope
- 不改 `interactive` 卡片解析。
- 不改 `merge_forward` 展开策略。
- 不改 `botmux send` 的 markdown/card 渲染。
- 不新增附件下载能力。
