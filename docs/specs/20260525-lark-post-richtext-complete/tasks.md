# Lark post 富文本完整解析 Tasks

| ID | Description | Files | Depends-On | Acceptance |
|---|---|---|---|---|
| T-1 | 为 `post` 富文本代码块增加 markdown fence 渲染，并验证 API/live 两个入口输出一致。 | `src/im/lark/message-parser.ts`, `test/message-parser.test.ts` | — | `pnpm vitest run test/message-parser.test.ts` 通过代码块 API/live 回归测试。 |
| T-2 | 锁定 `post` 富文本明确 tag 清单，并验证未知节点不会产生噪声。 | `src/im/lark/message-parser.ts`, `test/message-parser.test.ts` | T-1 | `pnpm vitest run test/message-parser.test.ts` 通过未知节点默认忽略回归测试。 |
| T-3 | 验证改动范围、message-parser 单测和 TypeScript 构建，确认不触碰 out-of-scope 模块。 | `docs/specs/20260525-lark-post-richtext-complete/*`, `src/im/lark/message-parser.ts`, `test/message-parser.test.ts` | T-2 | `git diff --name-only` 只包含范围内文件，且 `pnpm vitest run test/message-parser.test.ts && pnpm build` 成功。 |

## Dispatch notes
- T-1 和 T-2 都修改同一组文件，必须串行执行。
- T-3 依赖 T-2 的最终 diff 和测试结果。
- 任务文件边界不干净，不适合 dispatch；选择 implement，由主 agent 在当前会话内按 T-1 → T-2 → T-3 顺序完成。
