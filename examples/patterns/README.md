# Copyable email patterns

These templates are starting points, not another runtime package. Copy the
files you need into the application that owns your email templates, then adapt
the copy, data contract, and delivery metadata there.

- `verification-code.email.tsx` covers short-lived authentication codes.
- `receipt.email.tsx` covers line items and transaction totals.
- `notification.email.tsx` covers a message with one primary action and a
  visible fallback URL.
- `email-shell.tsx` provides the shared document, preview text, container, and
  transactional footer.
- `theme.ts` is the single branding seam for the examples.

The patterns use the default semantic tokens (`bg`, `fg`, `border`, and
`accent`) instead of hard-coded component colors. Replace the `brand` palette
in `theme.ts`, or swap in your application theme, to adapt all three examples.
Keep absolute URLs, accurate preview props, and provider-managed sender data in
the consuming application.
