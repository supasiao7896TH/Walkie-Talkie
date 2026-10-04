import { describe, it, expect } from 'vitest';
import { escapeHtml, badge, statusBadge, targetLabel } from '../src/modules/ui-utils.js';
import { TARGET_TYPE } from '../src/modules/app-config.js';

describe('ui-utils XSS Prevention and Helpers', () => {
  it('escapes dangerous HTML characters properly', () => {
    expect(escapeHtml('<script>alert("xss")</script>')).toBe(
      '&lt;script&gt;alert(&quot;xss&quot;)&lt;/script&gt;'
    );
    expect(escapeHtml("Tom & Jerry's")).toBe("Tom &amp; Jerry&#39;s");
    expect(escapeHtml(null)).toBe('');
    expect(escapeHtml(undefined)).toBe('');
    expect(escapeHtml(123)).toBe('123');
  });

  it('generates badge HTML correctly', () => {
    const html = badge('ok', 'Normal');
    expect(html).toContain('rounded-full');
    expect(html).toContain('Normal');
  });

  it('escapes labels inside targetLabel properly', () => {
    const state = {
      radios: [
        { id: 'r1', serieNo: '<b>123</b>', position: '<img src=x onerror=alert(1)>' }
      ],
      accessories: [
        { id: 'a1', radioId: 'r1', details: '<script>' }
      ]
    };

    const radioLabel = targetLabel(state, TARGET_TYPE.RADIO, 'r1');
    expect(radioLabel).not.toContain('<img');
    expect(radioLabel).toContain('&lt;img src=x onerror=alert(1)&gt;');
    expect(radioLabel).toContain('&lt;b&gt;123&lt;/b&gt;');

    const accLabel = targetLabel(state, TARGET_TYPE.ACCESSORY, 'a1');
    expect(accLabel).not.toContain('<script>');
    expect(accLabel).toContain('&lt;script&gt;');
  });
});
