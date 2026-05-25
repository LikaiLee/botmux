# Lark post 富文本完整解析 Brainstorm

## Background
飞书 `post` 富文本目前只解析少数 tag，代码块等有语义节点会被静默丢弃，导致 Claude、`botmux history`、`botmux quoted` 看到的内容和用户实际发送内容不一致。

## Goals & End State
- Goal: 实时消息、history、quoted 三条入口都能保留 post 富文本里的用户可见语义内容。
- Goal: 对代码块、链接、mention、图片/文件占位、常见文本样式/内联结构有明确解析策略。
- Goal: 未知节点不再被误当作普通文本拼进 prompt，避免结构化内容产生噪声。
- End State: `post` 富文本解析有明确支持清单和回归测试，代码块不会在传给 CLI 前丢失，未支持节点不会产生噪声。

## Key Decisions

| Decision | Choice | Rationale |
|---|---|---|
| 修复范围 | 只覆盖 `post` 富文本解析 | 问题根因在 post parser，避免扩大到 card/发送渲染 |
| 支持清单 | 基于真实 payload + 飞书 schema 建明确 tag 清单 | 避免猜测式兼容过宽 |
| 未知节点 | 默认忽略，不做通用 text/content fallback | 避免把非正文结构误拼进 prompt |
| 代码块 | markdown fence，前后换行保护 | 保证 Claude 可读、可复制，不与正文粘连 |
| 测试 | `parseEventMessage` + `parseApiMessage` + 混排结构断言 | 锁住 live/history/quoted 共同入口 |

## Out of Scope
- 不改 `interactive` 卡片解析。
- 不改 `merge_forward` 展开策略。
- 不改 `botmux send` 的 markdown/card 渲染。
- 不新增附件下载能力。

## Risks & Mitigations
- Risk: 飞书 post 节点结构可能有多种历史/客户端变体。Mitigation: 先确认真实 payload，再按 schema 补少量明确兼容。
- Risk: 未知节点可能包含新的用户可见语义。Mitigation: 不做通用 fallback；后续基于真实 payload 显式加入支持清单。
- Risk: fence 渲染可能和段落拼接冲突。Mitigation: 代码块输出自带最小换行边界，并用“正文 + 代码块 + 正文”测试锁定。
