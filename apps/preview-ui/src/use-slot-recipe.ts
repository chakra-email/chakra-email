import {
  useChakraContext,
  useSlotRecipe,
  type SlotRecipeConfig,
} from '@chakra-ui/react';

export function usePreviewSlotRecipe(key: string, fallback: SlotRecipeConfig) {
  const system = useChakraContext();

  // Resolve the configured recipe first: passing the fallback directly to
  // useSlotRecipe would take precedence over the consumer's theme overrides.
  return useSlotRecipe({ key, recipe: system.getSlotRecipe(key, fallback) });
}
