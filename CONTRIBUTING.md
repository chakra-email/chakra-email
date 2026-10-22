# Contributing

Thanks for helping improve Chakra Email.

## Development

```bash
nvm use
corepack enable
pnpm install --frozen-lockfile
pnpm run check
```

This is an Nx workspace. Prefer running tasks through the pnpm scripts or `pnpm nx`.
Use the Node.js 24 version pinned in `.nvmrc`. Node 20.19 is tested only as the
published package compatibility floor. The repository defaults to Node 24 in
`.nvmrc` and pins the pnpm CLI through the root `packageManager` field.

`pnpm run check` is the canonical CI and release gate. It includes the dependency
audit, lint, coverage, clean build, typecheck, examples, export checks, dry package
inspection, and a clean tarball consumer using React 18.

## Pull Requests

Before opening a pull request:

- Add or update tests for behavior changes.
- Update package docs for public API changes.
- Run `pnpm run check`.

## Package Boundaries

- Application users should import from `chakra-email` or `@chakra-email/chakra-v2`.
- Shared implementation lives in `@chakra-email/core`.
- Local template tooling lives in `@chakra-email/preview`; keep it out of application production dependencies.
- Keep adapter packages thin unless a theme-version-specific behavior is required.

## Releases

All seven public packages use one fixed version. Version and changelog changes are
reviewed and committed through a normal pull request; the `Release` GitHub
Actions workflow only verifies and publishes the package versions already on
`main`. It never commits, tags, pushes, or creates a GitHub release.

To prepare a later release, create a branch and run:

```bash
pnpm nx release version 0.3.0
pnpm nx release changelog 0.3.0
pnpm run check
```

Replace `0.3.0` with the intended exact version, review the package manifests,
lockfile, and `CHANGELOG.md`, then merge those changes through a pull request.
Align internal first-party dependency ranges and the site version pill too.
Nx is configured not to commit, tag, push, or create a GitHub release. The
`0.3.0` preparation is already committed; do not run another version bump just
to retry a publication.

To publish:

1. Go to Actions → Release → "Run workflow".
2. Enter the exact version already committed in every public package. Relative
   values such as `patch` are rejected.
3. Enable **first release** only when the package names have never been
   published. Leave **dry run** enabled and review the package publication
   preview.
4. Re-run with dry run disabled. Approval from the protected `npm-publish`
   environment is required before publication.
5. After every package is successfully published, create the matching
   `v{version}` GitHub release from the exact commit that was published.

The workflow accepts dispatches only from `main`, requires successful CI for
the exact dispatch commit, aborts if `main` advances during environment
approval, rebuilds the packages, and verifies the requested version against
every public package manifest. It needs only read access to GitHub and OIDC
permission for npm trusted publishing.

You can preview the prepared 0.3.0 publication locally with:

```bash
pnpm run build
RELEASE_VERSION=0.3.0 RELEASE_DRY_RUN=true RELEASE_FIRST_RELEASE=false \
  node scripts/run-release.mjs
```

For every release, complete the
[production release checklist](docs/production-release-checklist.md).

Repository administrators must configure the following controls in GitHub; files
in the repository cannot enforce them by themselves:

- Protect `main`, require pull requests and CODEOWNER review, dismiss stale
  approvals, prevent force pushes/deletion, and require the Node 24 CI and compatibility checks.
- Protect `v*` tags from updates and deletion. Maintainers create a matching tag
  and GitHub release only after every package has been published successfully.
- Protect the `npm-publish` environment with required reviewers and restrict it
  to `main`.
- For the first publish only, create a short-lived
  [granular access token](https://docs.npmjs.com/about-access-tokens/) with the
  narrowest read/write package access that covers the new package names and
  **Bypass 2FA** enabled. Store it as the protected environment secret
  `NPM_BOOTSTRAP_TOKEN`; the workflow validates it with `npm whoami` before Nx
  publishes any package.
- For each of the seven public packages, verify its
  [trusted publisher](https://docs.npmjs.com/trusted-publishers/) with GitHub
  owner `chakra-email`, repository `chakra-email`, workflow `release.yml`,
  environment `npm-publish`, and allowed action `npm publish`. Then revoke the
  granular token and delete `NPM_BOOTSTRAP_TOKEN`; normal releases authenticate
  with short-lived OIDC credentials.
- After a tokenless trusted publish succeeds, configure npm publishing access to
  require 2FA and disallow traditional tokens. Keep provenance enabled.
- Connect the documentation site to Vercel with Root Directory `apps/site`.
  Use the committed build configuration and deploy the reviewed release commit;
  see [deployment settings](apps/site/DEPLOYMENT.md). npm publication and site
  deployment are separate operations.

## Documentation

Docs should favor copy-pasteable examples and realistic email templates. When adding new components, update:

- Root `README.md`
- Package README if the component is public
- `docs/components.md`
- Relevant examples
