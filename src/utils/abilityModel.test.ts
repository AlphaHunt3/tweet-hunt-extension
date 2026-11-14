import { describe, expect, test } from 'vitest';
import { AI_ABILITY_MIN_SCORE, getAbilityModelData, toAbilityList } from './abilityModel';

const field = {
  cn: { fields: [{ DeFi: 86 }, { 交易: 78 }, { Meme: 64 }], summary: '偏 DeFi' },
  en: { fields: [{ DeFi: 86 }, { Trading: 78 }], summary: 'DeFi first' },
  update: '2026-11-01',
};

describe('abilityModel', () => {
  test('picks the language and keeps the update time', () => {
    expect(getAbilityModelData(field, 'zh')).toEqual({
      abilities: field.cn.fields,
      summary: '偏 DeFi',
      updateTime: '2026-11-01',
    });
    expect(getAbilityModelData(field, 'en').summary).toBe('DeFi first');
  });

  test('filters by a minimum score and survives bad data', () => {
    expect(getAbilityModelData(field, 'zh', AI_ABILITY_MIN_SCORE).abilities).toEqual([{ DeFi: 86 }, { 交易: 78 }]);
    expect(getAbilityModelData(null, 'zh')).toEqual({ abilities: [], summary: '', updateTime: null });
    expect(getAbilityModelData({ cn: {}, updatedAt: 5 }, 'zh')).toEqual({ abilities: [], summary: '', updateTime: 5 });
  });

  test('converts to a name and score list, highest first', () => {
    expect(toAbilityList([{ Meme: 64 }, { DeFi: 86 }, { 交易: 78 }, { bad: 'x' }, {}])).toEqual([
      { name: 'DeFi', score: 86 },
      { name: '交易', score: 78 },
      { name: 'Meme', score: 64 },
    ]);
  });
});
