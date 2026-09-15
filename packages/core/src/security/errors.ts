export type EmailRenderErrorCode =
  | 'AST_TOO_LARGE'
  | 'INVALID_COMPONENT_PROP'
  | 'NESTING_TOO_DEEP'
  | 'OUTPUT_TOO_LARGE'
  | 'SOURCE_TOO_LARGE'
  | 'UNSAFE_URL';

export type EmailRenderErrorDetails = Readonly<
  Record<string, boolean | number | string>
>;

export interface EmailRenderErrorOptions {
  cause?: unknown;
  details?: EmailRenderErrorDetails;
}

/** An operational rendering failure that never includes source content. */
export class EmailRenderError extends Error {
  readonly code: EmailRenderErrorCode;
  readonly details?: EmailRenderErrorDetails;

  constructor(
    code: EmailRenderErrorCode,
    message: string,
    options: EmailRenderErrorOptions = {},
  ) {
    super(
      message,
      options.cause === undefined ? undefined : { cause: options.cause },
    );
    this.name = 'EmailRenderError';
    this.code = code;
    this.details = options.details;
  }
}

export function isEmailRenderError(error: unknown): error is EmailRenderError {
  return error instanceof EmailRenderError;
}
