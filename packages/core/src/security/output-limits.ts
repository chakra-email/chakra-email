import { EmailRenderError } from './errors.js';

export interface EmailOutputLimits {
  maxHtmlBytes?: number;
  maxTextBytes?: number;
}

export const strictEmailOutputLimits: Readonly<Required<EmailOutputLimits>> =
  Object.freeze({
    maxHtmlBytes: 2_000_000,
    maxTextBytes: 2_000_000,
  });

function byteLength(value: string): number {
  return new TextEncoder().encode(value).byteLength;
}

function validateLimit(value: number | undefined, name: string): void {
  if (value !== undefined && (!Number.isSafeInteger(value) || value <= 0)) {
    throw new EmailRenderError(
      'INVALID_COMPONENT_PROP',
      `${name} must be a positive safe integer.`,
    );
  }
}

export function assertEmailOutputLimits(
  output: { html?: string; text?: string },
  limits: EmailOutputLimits | undefined,
): void {
  if (!limits) {
    return;
  }

  validateLimit(limits.maxHtmlBytes, 'maxHtmlBytes');
  validateLimit(limits.maxTextBytes, 'maxTextBytes');

  if (
    output.html !== undefined &&
    limits.maxHtmlBytes !== undefined &&
    byteLength(output.html) > limits.maxHtmlBytes
  ) {
    throw new EmailRenderError(
      'OUTPUT_TOO_LARGE',
      'Rendered email HTML exceeds the configured byte limit.',
      {
        details: {
          actualBytes: byteLength(output.html),
          limitBytes: limits.maxHtmlBytes,
          output: 'html',
        },
      },
    );
  }

  if (
    output.text !== undefined &&
    limits.maxTextBytes !== undefined &&
    byteLength(output.text) > limits.maxTextBytes
  ) {
    throw new EmailRenderError(
      'OUTPUT_TOO_LARGE',
      'Rendered email text exceeds the configured byte limit.',
      {
        details: {
          actualBytes: byteLength(output.text),
          limitBytes: limits.maxTextBytes,
          output: 'text',
        },
      },
    );
  }
}
