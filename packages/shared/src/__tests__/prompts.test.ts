import { describe, it, expect } from 'vitest';
import { SYSTEM_PROMPT } from '../ai/prompts';

describe('SYSTEM_PROMPT', () => {
  it('contains PII guardrail rule', () => {
    expect(SYSTEM_PROMPT).toContain('Do NOT extract');
  });

  it('mentions personal identifiers in the guardrail', () => {
    expect(SYSTEM_PROMPT).toContain('personal identifiers');
  });

  it('specifically calls out phone numbers in the guardrail', () => {
    expect(SYSTEM_PROMPT).toContain('phone numbers');
  });
});
