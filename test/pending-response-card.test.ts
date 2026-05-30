import { describe, expect, it } from 'vitest';

import { buildMergedPendingResponseCard, buildPendingResponseCard } from '../src/im/lark/card-builder.js';

describe('pending response card', () => {
  it('builds a processing card without manual quote text', () => {
    const card = JSON.parse(buildPendingResponseCard());
    const bodyText = JSON.stringify(card.body);

    expect(card.schema).toBe('2.0');
    expect(card.header.title).toEqual({ tag: 'plain_text', content: '处理中' });
    expect(bodyText).toContain('🔄 正在处理你的请求...');
    expect(bodyText).not.toContain('| 回复 用户A');
    expect(bodyText).not.toContain('params 顶层业务字段');
  });

  it('builds a merged card for superseded pending requests', () => {
    const card = JSON.parse(buildMergedPendingResponseCard());

    expect(card.header.title.content).toBe('已合并');
    expect(JSON.stringify(card)).toContain('已收到后续消息，合并处理中');
  });
});
