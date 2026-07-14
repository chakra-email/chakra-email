import type { CSSProperties } from 'react';
import { describe, expect, it } from 'vitest';
import { filterEmailUnsafeStyles, stylesToInlineString } from './email-safe';

describe('email-safe style utilities', () => {
  it('filters unsafe styles and downgrades unsupported display values', () => {
    expect(
      filterEmailUnsafeStyles({
        animation: 'spin 1s',
        boxShadow: '0 1px 2px black',
        display: 'grid',
        color: '#111111',
      }),
    ).toEqual({
      display: 'block',
      color: '#111111',
    });
  });

  it('allows opacity through while still stripping box-shadow', () => {
    expect(
      filterEmailUnsafeStyles({
        opacity: 0.5,
        boxShadow: '0 1px 2px black',
      }),
    ).toEqual({
      opacity: 0.5,
    });
  });

  it.each([
    'inline-flex',
    'inline-grid',
    '-webkit-flex',
    '-webkit-inline-box',
    '-ms-flexbox',
    '-ms-grid',
  ] as const)('downgrades display:%s to block', (display) => {
    expect(filterEmailUnsafeStyles({ display })).toEqual({ display: 'block' });
  });

  it('strips camel-cased and kebab-cased vendor-prefixed unsafe properties', () => {
    const styles = {
      color: '#111111',
      WebkitTransform: 'rotate(2deg)',
      MozTransition: 'all 1s',
      msFilter: 'grayscale(1)',
      OAnimation: 'spin 1s',
      '-webkit-box-shadow': '0 1px 2px black',
      '-webkit-backdrop-filter': 'blur(2px)',
    } as unknown as CSSProperties;

    expect(filterEmailUnsafeStyles(styles)).toEqual({ color: '#111111' });
  });

  it('serializes inline styles and skips empty values', () => {
    expect(
      stylesToInlineString({
        backgroundColor: '#ffffff',
        color: undefined,
        marginTop: 8,
      }),
    ).toBe('background-color: #ffffff; margin-top: 8px');
  });

  it('appends px to numeric lengths but keeps unitless properties unitless', () => {
    expect(
      stylesToInlineString({
        marginTop: 8,
        padding: 0,
        lineHeight: 1.5,
        opacity: 0.8,
        fontWeight: 600,
        zIndex: 10,
      }),
    ).toBe(
      'margin-top: 8px; padding: 0; line-height: 1.5; opacity: 0.8; font-weight: 600; z-index: 10',
    );
  });
});
