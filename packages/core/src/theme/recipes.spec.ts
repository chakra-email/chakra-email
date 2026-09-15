import { describe, expect, it } from 'vitest';
import {
  defineRecipe,
  defineSlotRecipe,
  resolveRecipe,
  resolveSlotRecipe,
} from './recipes';

describe('email recipes', () => {
  it('resolves base, default, selected, and compound recipe styles', () => {
    const recipe = defineRecipe({
      base: { color: 'fg', p: 2, style: { display: 'block' } },
      variants: {
        size: {
          sm: { px: 2 },
          lg: { px: 4 },
        },
        variant: {
          solid: { bg: 'accent' },
          outline: { border: '1px solid {colors.border}' },
        },
      },
      defaultVariants: { size: 'sm', variant: 'solid' },
      compoundVariants: [
        {
          size: 'lg',
          variant: 'outline',
          css: { fontWeight: 'bold', style: { textAlign: 'center' } },
        },
      ],
    });

    expect(resolveRecipe(recipe)).toEqual({
      color: 'fg',
      p: 2,
      style: { display: 'block' },
      px: 2,
      bg: 'accent',
    });
    expect(resolveRecipe(recipe, { size: 'lg', variant: 'outline' })).toEqual({
      color: 'fg',
      p: 2,
      px: 4,
      border: '1px solid {colors.border}',
      fontWeight: 'bold',
      style: { display: 'block', textAlign: 'center' },
    });
  });

  it('resolves each slot independently', () => {
    const recipe = defineSlotRecipe({
      slots: ['root', 'label'],
      base: {
        root: { bg: 'bg' },
        label: { color: 'fg' },
      },
      variants: {
        active: {
          true: {
            root: { borderColor: 'accent' },
            label: { fontWeight: 'bold' },
          },
          false: {},
        },
      },
      defaultVariants: { active: false },
    });

    expect(resolveSlotRecipe(recipe, { active: true })).toEqual({
      root: { bg: 'bg', borderColor: 'accent' },
      label: { color: 'fg', fontWeight: 'bold' },
    });
  });
});
