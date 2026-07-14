# Components

Chakra Email components render email-safe HTML and accept Chakra-style style props where appropriate.

## Document

- `Html` - root document element.
- `Head` - common email metadata.
- `Preview` - hidden inbox preview text.
- `Body` - email body wrapper.

## Layout

- `Container` - centered table wrapper with a max width.
- `Section` - full-width table section.
- `Row` - table row for explicit table layouts.
- `Column` - table cell for explicit table layouts.
- `Box` - low-level element wrapper.
- `Stack` - vertical spacing between children.
- `Spacer` - fixed-height vertical spacer.

## Text And Content

- `Text` - paragraph, span, or div text.
- `Heading` - `h1` through `h6`.
- `Link` - styled anchor.
- `Badge` - inline label.
- `Hr` - horizontal rule.
- `Img` - email-safe image element.
- `Button` - table-backed call-to-action link.

## Markdown Body Components

Use these when mapping markdown AST nodes to email-safe React elements:

- `Blockquote`
- `Code`
- `Pre`
- `List`
- `ListItem`
- `Table`
- `TableHead`
- `TableBody`
- `TableFoot`
- `TableRow`
- `TableHeader`
- `TableCell`
- `TableCaption`

## Style Props

Common style props include:

- Color: `color`, `bg`, `bgColor`, `backgroundColor`, `borderColor`
- Spacing: `p`, `px`, `py`, `pt`, `pb`, `pl`, `pr`, `m`, `mx`, `my`, `mt`, `mb`, `ml`, `mr`
- Sizing: `w`, `width`, `h`, `height`, `maxW`, `maxWidth`, `minW`, `minWidth`
- Typography: `fontSize`, `fontWeight`, `fontFamily`, `lineHeight`, `letterSpacing`
- Borders: `border`, `borderWidth`, `borderRadius`, `rounded`, `borderTop`, `borderBottom`, `borderLeft`, `borderRight`

Unsafe browser-focused styles such as transforms, filters, flex, and grid are filtered or normalized for email output.

## Email Client Compatibility

The layout primitives target the current and previous major versions of Apple Mail on macOS and iOS, Gmail on the web and mobile, Outlook.com and the new Outlook, Yahoo Mail, and Word-based Outlook for Windows (Microsoft 365, 2021, 2019, and 2016). `Container`, `Section`, `Column`, and `Button` emit table-cell spacing and legacy width/background attributes for that baseline.

`Button` does not generate Outlook-only VML. Standards-based clients get anchor padding so the full visual CTA is clickable, while Word-based Outlook gets an `mso-padding-alt` table-cell fallback. Rounded corners and a fully clickable padded area remain progressive enhancements in Word-based Outlook; use a custom VML button when those details are a product requirement.

Unit tests validate generated markup, not rendering inside mailbox applications. Before a production send, run representative templates through an external email-client screenshot service and include every client and version required by your audience in that test matrix.
