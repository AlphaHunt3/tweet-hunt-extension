import type { MultiFieldData, MultiFieldItem } from '~types';

export const AI_ABILITY_MIN_SCORE = 70;

export interface AbilityModelData {
  abilities: MultiFieldItem[];
  summary: string;
  updateTime?: string | number | null;
}

export function getAbilityModelData(
  multiField: MultiFieldData | null | undefined,
  lang: string,
  minScore?: number,
): AbilityModelData {
  try {
    if (!multiField) return { abilities: [], summary: '', updateTime: null };

    const languageFields = lang === 'zh' ? multiField.cn : multiField.en;
    if (!languageFields?.fields || !Array.isArray(languageFields.fields)) {
      return {
        abilities: [],
        summary: '',
        updateTime:
          multiField.update ?? multiField.updateDate ?? multiField.updatedAt ?? null,
      };
    }

    const abilities =
      typeof minScore === 'number'
        ? languageFields.fields.filter((item: MultiFieldItem) => {
          const key = Object.keys(item)[0];
          const score = Number(item?.[key]);
          return Number.isFinite(score) && score >= minScore;
        })
        : languageFields.fields;

    return {
      abilities,
      summary: languageFields.summary || '',
      updateTime:
        multiField.update ?? multiField.updateDate ?? multiField.updatedAt ?? null,
    };
  } catch {
    return { abilities: [], summary: '', updateTime: null };
  }
}

export function toAbilityList(abilities: MultiFieldItem[]) {
  return abilities
    .map((item) => {
      const name = Object.keys(item ?? {})[0];
      return { name, score: Number(item?.[name]) };
    })
    .filter((item) => Boolean(item.name) && Number.isFinite(item.score))
    .sort((a, b) => b.score - a.score);
}
