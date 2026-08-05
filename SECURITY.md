# Security Policy

## Supported Versions

Security fixes are provided for the latest published minor version.

Node.js 22 and 24 are the actively tested runtimes. Node.js 20.19 remains a
compatibility floor while it is declared in package `engines`, but Node 20 is
end-of-life and is not recommended for production deployments.

## Reporting A Vulnerability

Please report security issues privately through a [GitHub security advisory](https://github.com/chakra-email/chakra-email/security/advisories/new). If private vulnerability reporting is unavailable, email [hi@ryanhefner.com](mailto:hi@ryanhefner.com) with `[chakra-email security]` in the subject. Include affected versions, impact, reproduction steps, and any proposed mitigation when possible.

You should receive an acknowledgement within five business days and an initial
assessment within ten business days. The maintainer will coordinate remediation
and public disclosure timing with the reporter.

Do not create a public issue for a suspected vulnerability.

## Dependency And Release Assurance

The canonical `npm run release:check` gate audits the complete dependency tree,
runs coverage and static checks, inspects package contents, and installs the
packed artifacts in a clean React 18 consumer. Dependabot monitors npm and
GitHub Actions dependencies. Release publication is restricted to the protected
`npm-publish` environment, uses npm trusted publishing after the one-time package
bootstrap, and generates npm provenance.

## Markdown And Raw HTML

Chakra Email components are designed to render email-safe inline HTML, but markdown parsing and sanitization are application concerns. If you enable raw HTML in markdown input, sanitize it before rendering.
