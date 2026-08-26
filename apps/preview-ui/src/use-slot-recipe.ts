import { useMemo } from 'react';
import * as ChakraStyledSystemRuntime from '@chakra-ui/react/styled-system';
import type { SystemStyleObject } from '@chakra-ui/react/styled-system';

type SlotRecipeConfig = object;

interface PreviewSystem {
  getSlotRecipe: (key: string, fallback: SlotRecipeConfig) => SlotRecipeConfig;
  sva: (
    config: SlotRecipeConfig,
  ) => (props?: Record<string, unknown>) => Record<string, SystemStyleObject>;
}

const { useChakraContext } = ChakraStyledSystemRuntime as unknown as {
  useChakraContext: () => PreviewSystem;
};

export function usePreviewSlotRecipe(key: string, fallback: SlotRecipeConfig) {
  const system = useChakraContext();

  return useMemo(
    () => system.sva(structuredClone(system.getSlotRecipe(key, fallback))),
    [fallback, key, system],
  );
}
