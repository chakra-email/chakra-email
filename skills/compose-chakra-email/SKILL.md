---
name: compose-chakra-email
description: Compose, theme, preview, render, migrate, or troubleshoot transactional email templates built with chakra-email packages. Use when creating an email system, choosing Chakra v3, Chakra v2, React Email, Markdown, or preview integrations, configuring recipes, or reviewing rendered output for email-client portability. Do not use for ordinary web UI or delivery-provider account administration.
---

# Compose Chakra Email

Build email templates as a feature of the host application. Preserve its data
contracts, delivery provider, Chakra version, module conventions, and existing
template architecture.

## Start with the host application

1. Inspect the package manager, React version, installed `chakra-email` and
   `@chakra-email/*` versions, Chakra theme format, template location, render
   path, delivery provider, and preview tooling.
2. Read the installed package exports and types before generating code. Prefer
   them over examples in this skill when versions differ.
3. Identify whether the request concerns template composition, theming,
   migration, preview tooling, renderer integration, or delivery wiring. Do not
   replace unrelated application architecture.
4. Choose only the packages the requested workflow needs. Read
   [packages and composition](references/packages-and-composition.md) when
   selecting packages, primitives, or migration paths.

## Compose the email system

1. Keep the document shell explicit: `Html`, `Head`, `Preview`, `Body`, then
   table-safe layout primitives and content.
2. Put shared tokens and recipes in a provider-owned theme. Prefer portable
   semantic colors such as `bg`, `fg`, `border`, and `accent` over component
   instances filled with palette-specific values.
3. Use tables, `Container`, `Section`, `Row`, and `Column` for important email
   layout. Treat browser-only CSS and dark-mode behavior as progressive
   enhancement rather than structural requirements.
4. Keep template props serializable and representative. If preview tooling is
   in scope, export safe `previewProps` and focused `previewVariants` without
   credentials or real customer data.
5. Generate matching HTML and plain text from one render pass when possible.
   Let the host own provider credentials, sender identity, attachments,
   tracking, retries, and delivery policy.

Read [theming and recipes](references/theming-and-recipes.md) when changing
appearance or adapting a Chakra theme. Read
[rendering, preview, and delivery](references/rendering-preview-and-delivery.md)
when configuring output, React Email compatibility, Markdown, local preview,
exports, or test sending.

## Verify the result

- Render representative default, long-content, empty, and edge-case variants
  to both HTML and plain text.
- Check document metadata, preview text, semantic structure, absolute links,
  accessible image alternatives, CTA fallbacks, and portable asset URLs.
- Run the host application's typecheck, tests, lint, and production build in
  proportion to the change.
- Use preview lint findings as guidance, not as mailbox-client certification.
  Validate production messages through the actual delivery path and the
  mailbox-client matrix required by the application.
- Treat preview modules as executable local code. Keep the preview server on a
  loopback host unless the user explicitly authorizes broader access.
- Never perform a real test send, publish packages, or push yalc updates unless
  the user has authorized that external side effect.
