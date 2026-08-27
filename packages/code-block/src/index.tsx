import type { CSSProperties, HTMLAttributes } from 'react';
import {
  filterEmailUnsafeStyles,
  mergeInlineStyles,
  splitStyleProps,
  useChakraStyles,
  useSlotRecipeStyles,
  type BaseChakraEmailProps,
} from '@chakra-email/core';

export interface CodeToken {
  content: string;
  style?: CSSProperties;
}

export type HighlightedCode = readonly (readonly CodeToken[])[];

/** Synchronous adapter contract for Prism, Shiki, or another tokenizer. */
export type CodeHighlighter = (
  code: string,
  language: string | undefined,
) => HighlightedCode;

export interface CodeBlockProps
  extends
    Omit<BaseChakraEmailProps, 'children'>,
    Omit<
      HTMLAttributes<HTMLPreElement>,
      keyof BaseChakraEmailProps | 'children'
    > {
  code: string;
  language?: string;
  lineNumbers?: boolean;
  highlighter?: CodeHighlighter;
  size?: string;
  variant?: string;
}

export const chakraEmailCodeBlockRecipeKey = 'chakraEmailCodeBlock';

export const plainTextHighlighter: CodeHighlighter = (code) =>
  code.split(/\r\n|\r|\n/).map((line) => [{ content: line }]);

export function CodeBlock({
  code,
  language,
  lineNumbers = false,
  highlighter = plainTextHighlighter,
  size,
  variant,
  ...props
}: CodeBlockProps) {
  const [styleProps, elementProps] = splitStyleProps(props);
  const recipeStyles = useSlotRecipeStyles(chakraEmailCodeBlockRecipeKey, {
    size,
    variant,
  });
  const rootStyles = mergeInlineStyles(
    recipeStyles.root,
    useChakraStyles(styleProps),
  );
  const lines = highlighter(code, language);
  const numberWidth = `${Math.max(String(lines.length).length, 1) + 1}ch`;

  return (
    <pre {...elementProps} data-language={language} style={rootStyles}>
      <code style={recipeStyles.code}>
        {lines.map((tokens, lineIndex) => (
          <span key={lineIndex} style={recipeStyles.line}>
            {lineNumbers ? (
              <span
                aria-hidden="true"
                data-skip-in-text="true"
                style={mergeInlineStyles(recipeStyles.lineNumber, {
                  width: numberWidth,
                })}
              >
                {lineIndex + 1}
              </span>
            ) : null}
            {tokens.map((token, tokenIndex) => (
              <span
                key={tokenIndex}
                style={mergeInlineStyles(
                  recipeStyles.token,
                  filterEmailUnsafeStyles(token.style ?? {}),
                )}
              >
                {token.content}
              </span>
            ))}
            {lineIndex < lines.length - 1 ? <br /> : null}
          </span>
        ))}
      </code>
    </pre>
  );
}
