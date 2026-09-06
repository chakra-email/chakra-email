import type {
  EmailRecipeDefinition,
  EmailRecipeStyle,
  EmailSlotRecipeDefinition,
  RecipeSelection,
  RecipeVariantValue,
} from './types.js';

const UNSAFE_KEYS = new Set(['__proto__', 'constructor', 'prototype']);

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

function mergeStyleLayers(
  ...layers: Array<EmailRecipeStyle | null | undefined>
): EmailRecipeStyle {
  const output: Record<string, unknown> = {};

  for (const layer of layers) {
    if (!layer) {
      continue;
    }

    for (const [key, value] of Object.entries(layer)) {
      if (UNSAFE_KEYS.has(key)) {
        continue;
      }

      if (
        (key === 'style' || key === '_light' || key === '_dark') &&
        isRecord(output[key]) &&
        isRecord(value)
      ) {
        output[key] = { ...output[key], ...value };
        continue;
      }

      // Reinsert later declarations so shorthand/longhand ordering follows
      // recipe layer precedence when the styles become an inline object.
      delete output[key];
      output[key] = value;
    }
  }

  return output as EmailRecipeStyle;
}

function getSelection(
  defaults: RecipeSelection | undefined,
  selection: RecipeSelection | undefined,
): RecipeSelection {
  return { ...defaults, ...selection };
}

function variantKey(value: RecipeVariantValue): string {
  return String(value);
}

function matchesCompoundVariant(
  compound: Record<string, unknown>,
  selection: RecipeSelection,
): boolean {
  return Object.entries(compound).every(([name, expected]) => {
    if (name === 'css') {
      return true;
    }

    const actual = selection[name];
    return Array.isArray(expected)
      ? expected.some((value) => value === actual)
      : expected === actual;
  });
}

export function defineRecipe<const Recipe extends EmailRecipeDefinition>(
  recipe: Recipe,
): Recipe {
  return recipe;
}

export function defineSlotRecipe<
  const Recipe extends EmailSlotRecipeDefinition,
>(recipe: Recipe): Recipe {
  return recipe;
}

export function resolveRecipe(
  recipe: EmailRecipeDefinition | null | undefined,
  selection?: RecipeSelection,
): EmailRecipeStyle {
  if (!recipe) {
    return {};
  }

  const resolvedSelection = getSelection(recipe.defaultVariants, selection);
  const layers: EmailRecipeStyle[] = [];

  if (recipe.base) {
    layers.push(recipe.base);
  }

  for (const [name, value] of Object.entries(resolvedSelection)) {
    if (value === null || value === undefined) {
      continue;
    }

    const variant = recipe.variants?.[name]?.[variantKey(value)];
    if (variant) {
      layers.push(variant);
    }
  }

  for (const compound of recipe.compoundVariants ?? []) {
    if (matchesCompoundVariant(compound, resolvedSelection)) {
      layers.push(compound.css);
    }
  }

  return mergeStyleLayers(...layers);
}

export function resolveSlotRecipe(
  recipe: EmailSlotRecipeDefinition | null | undefined,
  selection?: RecipeSelection,
): Record<string, EmailRecipeStyle> {
  if (!recipe) {
    return {};
  }

  const resolvedSelection = getSelection(recipe.defaultVariants, selection);
  const layers: Array<Record<string, EmailRecipeStyle>> = [];

  if (recipe.base) {
    layers.push(recipe.base);
  }

  for (const [name, value] of Object.entries(resolvedSelection)) {
    if (value === null || value === undefined) {
      continue;
    }

    const variant = recipe.variants?.[name]?.[variantKey(value)];
    if (variant) {
      layers.push(variant);
    }
  }

  for (const compound of recipe.compoundVariants ?? []) {
    if (matchesCompoundVariant(compound, resolvedSelection)) {
      layers.push(compound.css);
    }
  }

  const slotNames = new Set(recipe.slots);
  for (const layer of layers) {
    for (const slot of Object.keys(layer)) {
      if (!UNSAFE_KEYS.has(slot)) {
        slotNames.add(slot);
      }
    }
  }

  return Object.fromEntries(
    [...slotNames].map((slot) => [
      slot,
      mergeStyleLayers(...layers.map((layer) => layer[slot])),
    ]),
  );
}

export { mergeStyleLayers as mergeRecipeStyles };
