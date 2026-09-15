import { describe, expect, it } from 'vitest';
import * as coreRoot from '@chakra-email/core';
import * as coreComponents from '@chakra-email/core/components';
import * as coreRender from '@chakra-email/core/render';
import * as coreSecurity from '@chakra-email/core/security';
import * as coreSystem from '@chakra-email/core/system';
import * as coreTheme from '@chakra-email/core/theme';
import * as wrapperRoot from './index';
import * as wrapperComponents from './components';
import * as wrapperRender from './render';
import * as wrapperSecurity from './security';
import * as wrapperSystem from './system';
import * as wrapperTheme from './theme';

/**
 * Runtime exports of core that the wrapper intentionally omits or renames,
 * keyed by entry point. Add entries here (with a reason) instead of
 * loosening the parity assertion. Currently every runtime export of core
 * must be re-exported unchanged.
 */
const allowedOmissions: Record<string, readonly string[]> = {
  '.': [],
  './components': [],
  './render': [],
  './security': [],
  './system': [],
  './theme': [],
};

function runtimeExports(mod: object): string[] {
  // Named runtime values only: default exports are excluded, and type-only
  // exports never exist at runtime so they are invisible here by design.
  return Object.keys(mod)
    .filter((name) => name !== 'default')
    .sort();
}

function missingExports(
  coreModule: object,
  wrapperModule: object,
  entry: string,
): string[] {
  const wrapperNames = new Set(runtimeExports(wrapperModule));
  const omissions = allowedOmissions[entry] ?? [];

  return runtimeExports(coreModule).filter(
    (name) => !wrapperNames.has(name) && !omissions.includes(name),
  );
}

describe('chakra-email export parity with @chakra-email/core', () => {
  it('re-exports every runtime export of the core root entry', () => {
    expect(missingExports(coreRoot, wrapperRoot, '.')).toEqual([]);
  });

  it('re-exports every runtime export of core/components', () => {
    expect(
      missingExports(coreComponents, wrapperComponents, './components'),
    ).toEqual([]);
  });

  it('re-exports every runtime export of core/render', () => {
    expect(missingExports(coreRender, wrapperRender, './render')).toEqual([]);
  });

  it('re-exports every runtime export of core/security', () => {
    expect(missingExports(coreSecurity, wrapperSecurity, './security')).toEqual(
      [],
    );
  });

  it('re-exports every runtime export of core/system', () => {
    expect(missingExports(coreSystem, wrapperSystem, './system')).toEqual([]);
  });

  it('re-exports every runtime export of core/theme', () => {
    expect(missingExports(coreTheme, wrapperTheme, './theme')).toEqual([]);
  });

  it('adds the wrapper-specific exports on top of core parity', () => {
    // Extra exports beyond core are allowed; these are the documented ones.
    expect(runtimeExports(wrapperRoot)).toEqual(
      expect.arrayContaining([
        'ChakraEmailProvider',
        'createChakraV3EmailTheme',
      ]),
    );
    expect(runtimeExports(wrapperTheme)).toEqual(
      expect.arrayContaining([
        'ChakraEmailProvider',
        'createChakraV3EmailTheme',
      ]),
    );
  });
});
