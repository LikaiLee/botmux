# Lark post 富文本完整解析 Implementation Plan

**Goal:** 修复飞书 `post` 富文本解析，确保实时消息、history、quoted 都保留明确支持节点的用户可见语义内容，不再静默丢弃代码块，也不把未知结构化节点误拼进 prompt。

**Architecture:** 保持 `parseEventMessage()` 与 `parseApiMessage()` 共享 `extractTextContent()` 的架构，只重构 `msgType === 'post'` 分支的节点渲染。新增局部 helper 负责 post 节点到文本的转换、代码块 fence 渲染与段落内换行边界；未知节点默认忽略，新增 tag 必须基于真实 payload 或 schema 显式加入。

**Tech Stack:** TypeScript、Vitest；核心文件为 `src/im/lark/message-parser.ts` 和 `test/message-parser.test.ts`；验证命令为 `pnpm vitest run test/message-parser.test.ts` 与 `pnpm build`。

---

## File Structure

- Modify: `src/im/lark/message-parser.ts:384-425` — 扩展 `post` 富文本节点渲染，增加代码块渲染并明确未知节点不输出噪声。
- Modify: `test/message-parser.test.ts:397-426` — 增加 post 富文本代码块回归测试，覆盖 API 和 live 事件入口，并锁定未知节点默认忽略。

---

## FR Coverage

| FR | Implementing Task |
|---|---|
| FR-1 代码块 fence | Task 1 |
| FR-2 fence 前后换行 | Task 1 |
| FR-3 链接/mention/图片/文件不回退 | Task 2 |
| FR-4 未支持节点不产噪声 | Task 2 |
| FR-5 新 tag 必须显式支持 | Task 2 |
| FR-6 `parseEventMessage` 与 `parseApiMessage` 一致 | Task 1、Task 2 |
| FR-7 不改其他模块并完成验证 | Task 3 |

---

### Task 1: 支持 post 代码块并保护 fence 换行

**Files:**
- Modify: `src/im/lark/message-parser.ts:384-425`
- Test:   `test/message-parser.test.ts:397-426`

- [ ] **Step 1: Write the failing test**

在 `test/message-parser.test.ts` 的 `describe('Post message parsing', ...)` 内新增代码块 API/live 回归测试，以及代码内容包含三反引号时使用更长 fence 的测试。

- [ ] **Step 2: Verify test fails**

Run: `pnpm vitest run test/message-parser.test.ts`

Expected: FAIL，新增测试实际输出为 `前文后文` 或不包含 fenced code block。

- [ ] **Step 3: Minimal implementation**

在 `src/im/lark/message-parser.ts` 的 `resolveMentions()` 后、`extractTextContent()` 前新增 helper：`normalizeFenceLanguage()`、`renderPostCodeBlock()`、`renderPostNode()`、`joinPostNodeText()`。`renderPostNode()` 只支持 `text/a/at/code_block/img/media/file`；`renderPostCodeBlock()` 根据代码内容最长反引号串选择更长 fence。

- [ ] **Step 4: Verify test passes**

Run: `pnpm vitest run test/message-parser.test.ts`

Expected: PASS，新增代码块测试通过，现有 post 图片/文件测试继续通过。

- [ ] **Step 5: Commit**

```bash
git add src/im/lark/message-parser.ts test/message-parser.test.ts docs/specs/20260525-lark-post-richtext-complete/brainstorm.md docs/specs/20260525-lark-post-richtext-complete/spec.md docs/specs/20260525-lark-post-richtext-complete/plan.md
git commit -m "fix(lark): 保留 post 富文本代码块"
```

---

### Task 2: 锁定明确 tag 清单并避免未知节点噪声

**Files:**
- Modify: `src/im/lark/message-parser.ts:384-425`
- Test:   `test/message-parser.test.ts:397-426`

- [ ] **Step 1: Write the failing test**

在 `describe('Post message parsing', ...)` 内新增未知节点测试，断言未知文本节点和未知对象都不进入输出：

```ts
  it('does not render unsupported post nodes as noisy text', () => {
    const post = {
      zh_cn: {
        content: [
          [
            { tag: 'text', text: '普通' },
            { tag: 'unknown_text', text: '未知文本' },
            { tag: 'unknown_object', value: { nested: true } },
          ],
          [
            { tag: 'a', text: '文档', href: 'https://example.com' },
            { tag: 'at', user_name: 'Alice' },
          ],
        ],
      },
    };

    expect(parseApiMessage(makeMsg('post', post)).content).toBe('普通\n文档@Alice');
  });
```

- [ ] **Step 2: Verify test fails**

Run: `pnpm vitest run test/message-parser.test.ts`

Expected: 如果存在通用 unknown fallback，则 FAIL，实际输出包含 `未知文本`；如果已收窄，则 PASS。

- [ ] **Step 3: Minimal implementation**

确认 `renderPostNode()` 的最终 fallback 是 `return ''`，且没有 `node.text` / `node.content` / `text.content` / `content.text` 通用兜底。

- [ ] **Step 4: Verify test passes**

Run: `pnpm vitest run test/message-parser.test.ts`

Expected: PASS，未知节点不产生噪声，现有明确 tag 行为不回退。

- [ ] **Step 5: Commit**

```bash
git add src/im/lark/message-parser.ts test/message-parser.test.ts
git commit -m "test(lark): 锁定 post 未知节点默认忽略"
```

---

### Task 3: 验证构建和范围不回退

**Files:**
- Modify: `src/im/lark/message-parser.ts:384-425`
- Test:   `test/message-parser.test.ts:397-426`

- [ ] **Step 1: Write the failing test**

本任务不新增生产行为测试；Task 1 和 Task 2 已覆盖 FR-1 到 FR-6。本任务的验证目标是构建和范围控制。

执行前检查 diff 只触碰以下路径：

```bash
git diff --name-only
```

Expected paths:

```text
docs/specs/20260525-lark-post-richtext-complete/brainstorm.md
docs/specs/20260525-lark-post-richtext-complete/spec.md
docs/specs/20260525-lark-post-richtext-complete/plan.md
docs/specs/20260525-lark-post-richtext-complete/tasks.md
docs/specs/20260525-lark-post-richtext-complete/review.md
src/im/lark/message-parser.ts
test/message-parser.test.ts
```

- [ ] **Step 2: Verify test fails**

Run: `git diff --name-only`

Expected: 如果出现 `interactive`、`merge_forward`、`botmux send` 渲染相关文件，则本任务失败并撤回非必要改动。

- [ ] **Step 3: Minimal implementation**

如 diff 包含非范围文件，移除对应改动；保持只修改 `post` parser、测试和 SDD 文档。

- [ ] **Step 4: Verify test passes**

Run:

```bash
pnpm vitest run test/message-parser.test.ts && pnpm build
```

Expected: 两条命令均成功退出，`message-parser` 测试和 TypeScript 构建通过。

- [ ] **Step 5: Commit**

如果 Task 1/2 已分 commit，且本任务没有代码改动，则无需新增 commit；如只剩验证文档或小修，使用：

```bash
git add docs/specs/20260525-lark-post-richtext-complete/plan.md src/im/lark/message-parser.ts test/message-parser.test.ts
git commit -m "test(lark): 覆盖 post 富文本解析"
```
