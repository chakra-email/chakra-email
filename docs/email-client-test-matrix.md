# Email-Client Test Matrix

Complete a copy of this matrix before the first public release and whenever a
change can affect rendered markup, inline styles, URLs, or MIME assembly. Store
screenshot and message-source evidence somewhere the release team can access
after the external testing service expires the run.

Unit and snapshot tests remain the first line of defense. This matrix verifies
the behavior that only a delivered message can reveal: mailbox HTML rewriting,
image loading, dark-mode transformations, Outlook's Word rendering engine, and
the actual clickable area of calls to action.

## Run Record

- Release version:
- Commit SHA:
- Test date (UTC):
- Tester:
- Delivery provider and sending domain:
- Screenshot service and run URL:
- Fixture message IDs or archived `.eml` files:

Do not test by pasting rendered HTML directly into the screenshot service. Send
each fixture through the production MIME and delivery path so tracking rewrites,
remote images, CID attachments, headers, and plain-text alternatives are
represented.

## Required Fixtures

Use production-like content and stable HTTPS assets. Record the exact fixture
revision in the run record.

1. **Layout and CTA:** preview text, a centered 600px container, remote image,
   fixed and fluid columns, stacked content, solid and outline buttons, footer
   links, long wrapping text, and fallback fonts.
2. **Markdown body:** headings, paragraphs, inline code, blockquote, ordered and
   unordered lists, a data table, an absolute link, an absolute image, and a
   long unbroken value.
3. **CID image:** include when the delivery provider supports MIME attachments;
   the rendered `cid:` source must match the attachment `Content-ID`.

Every relative URL from fixture content must be resolved against its deliberate
public base before rendering. Inspect the delivered message source to confirm
that no relative `href` or `src` remains.

## Acceptance Checks

For every applicable matrix row, verify:

- inbox preview text is present but hidden from the opened message body;
- the container, columns, spacing, tables, and long content remain readable;
- buttons retain legible colors, usable padding, and the documented clickable
  area;
- remote images and CID images render when enabled, with useful alt text when
  images are blocked;
- light and dark modes preserve sufficient legibility despite client color
  transformations;
- links open the intended absolute destination or action;
- fallback fonts, Unicode, and plain-text alternatives remain usable; and
- no unexpected horizontal scrolling, clipping, overlap, or unsupported CSS is
  visible.

Word-based Outlook does not receive a VML button. Its rounded corners and fully
padded clickable area are progressive enhancements, as documented in
[Components](components.md#email-client-compatibility); judge those rows against
the documented fallback rather than standards-based client output.

## Compatibility Baseline

Replace “current” and “previous” with the exact application and operating-system
versions tested. Use `Pass`, `Fail`, or `N/A` in each fixture column and link to
screenshots or archived evidence in the final column.

| Client family                       | Exact version tested | Display modes | Layout and CTA | Markdown body | CID image | Evidence and notes |
| ----------------------------------- | -------------------- | ------------- | -------------- | ------------- | --------- | ------------------ |
| Apple Mail on macOS — current       |                      | Light / dark  | Pending        | Pending       | Pending   |                    |
| Apple Mail on macOS — previous      |                      | Light / dark  | Pending        | Pending       | Pending   |                    |
| Apple Mail on iOS — current         |                      | Light / dark  | Pending        | Pending       | Pending   |                    |
| Apple Mail on iOS — previous        |                      | Light / dark  | Pending        | Pending       | Pending   |                    |
| Gmail web                           |                      | Light / dark  | Pending        | Pending       | Pending   |                    |
| Gmail for Android                   |                      | Light / dark  | Pending        | Pending       | Pending   |                    |
| Gmail for iOS                       |                      | Light / dark  | Pending        | Pending       | Pending   |                    |
| Outlook.com                         |                      | Light / dark  | Pending        | Pending       | Pending   |                    |
| New Outlook for Windows             |                      | Light / dark  | Pending        | Pending       | Pending   |                    |
| Outlook for Windows — Microsoft 365 |                      | Light / dark  | Pending        | Pending       | Pending   |                    |
| Outlook for Windows 2021            |                      | Light         | Pending        | Pending       | Pending   |                    |
| Outlook for Windows 2019            |                      | Light         | Pending        | Pending       | Pending   |                    |
| Outlook for Windows 2016            |                      | Light         | Pending        | Pending       | Pending   |                    |
| Yahoo Mail web                      |                      | Light / dark  | Pending        | Pending       | Pending   |                    |
| Yahoo Mail mobile                   |                      | Light / dark  | Pending        | Pending       | Pending   |                    |

Add rows for any client or assistive configuration required by audience data,
contracts, or product policy. Do not remove a baseline row without updating the
compatibility claim in [Components](components.md#email-client-compatibility).

## Exit Criteria

- Every required row names an exact tested version and has evidence.
- No unexplained `Fail` remains.
- Accepted differences match documented progressive enhancements or have a
  named owner and product approval.
- A markup, URL, or MIME fix is rerun in every affected client family.
- The completed matrix is linked from the release record before npm publishing.
