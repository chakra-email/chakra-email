# Contributing

Thanks for helping improve Chakra Email.

## Development

```bash
nvm use
npm install
npm run check
```

This is an Nx workspace. Prefer running tasks through the npm scripts or `npm exec nx --`.
Use an active Node.js release (22 or 24). Node 20.19 is tested only as the
published package compatibility floor. The repository defaults to Node 24 in
`.nvmrc` and pins the npm CLI through the root `packageManager` field.

`npm run check` is the canonical CI and release gate. It includes the dependency
audit, lint, coverage, clean build, typecheck, examples, export checks, dry package
inspection, and a clean tarball consumer using React 18.

## Pull Requests

Before opening a pull request:

- Add or update tests for behavior changes.
- Update package docs for public API changes.
- Run `npm run check`.

## Package Boundaries

- Application users should import from `chakra-email` or `@chakra-email/chakra-v2`.
- Shared implementation lives in `@chakra-email/core`.
- Keep adapter packages thin unless a theme-version-specific behavior is required.

## Releases

Releases are versioned and published with [Nx release](https://nx.dev/features/manage-releases) via the `Release` GitHub Actions workflow (`.github/workflows/release.yml`). All three packages are versioned together (fixed versioning), and the workspace `CHANGELOG.md` and a `v{version}` git tag are generated automatically. The workflow accepts dispatches only from `main`, validates version input without shell interpolation, and runs the same `npm run release:check` gate as CI before credentials are exposed.

To publish:

1. Go to Actions → Release → "Run workflow".
2. Choose a version specifier (`patch`, `minor`, `major`, `prerelease`, or an explicit version like `0.2.0`). For the initial release, choose the explicit version `0.1.0`.
3. Leave **dry run** enabled for the first run and review the output (version bumps, changelog, publish preview). Nothing is pushed or published in a dry run.
4. Re-run the workflow with dry run disabled. Approval from the protected `npm-publish` environment is required before the workflow can commit, tag, push, and publish to npm with provenance.

For the very first release (no `v*` tag or published package yet), set the
version to `0.1.0` and enable the **first release** input. Relative keywords are
rejected for first releases because Nx applies them to the version already in
the package manifests; `patch` would otherwise turn `0.1.0` into `0.1.1`.

You can preview the initial release locally with
`npm exec nx -- release 0.1.0 --dry-run --first-release`, or a later release
with `npm exec nx -- release patch --dry-run` (no credentials needed).

Repository administrators must configure the following controls in GitHub; files
in the repository cannot enforce them by themselves:

- Protect `main`, require pull requests and CODEOWNER review, dismiss stale
  approvals, prevent force pushes/deletion, and require the Node 22/24 CI checks.
- Give only the environment-approved release actor a ruleset bypass for its
  generated version commit and tag. If the repository does not permit the
  built-in Actions token to bypass the pull-request rule, use a GitHub App token
  scoped to this repository instead; do not weaken the rule for all writers.
- Protect the `npm-publish` environment with required reviewers and restrict it
  to `main`.
- For the first publish only, store a least-privilege npm automation token as
  the environment secret `NPM_BOOTSTRAP_TOKEN`. After all three packages exist,
  configure each package's npm trusted publisher for this repository,
  `release.yml`, and the `npm-publish` environment. Then revoke and delete the
  bootstrap token; normal releases authenticate with short-lived OIDC credentials.
- After trusted publishing succeeds, configure npm publishing access to require
  2FA and disallow traditional tokens. Keep provenance enabled.
- Configure GitHub Pages to use GitHub Actions as its source. Documentation is
  deployed only from the exact `main` commit that completed CI successfully.

## Documentation

Docs should favor copy-pasteable examples and realistic email templates. When adding new components, update:

- Root `README.md`
- Package README if the component is public
- `docs/components.md`
- Relevant examples
