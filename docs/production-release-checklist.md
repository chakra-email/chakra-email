# Production Release Checklist

Complete this checklist before the first public release and repeat it whenever
repository ownership, publishing credentials, or release workflows change. The
settings below live in GitHub and npm, so they cannot be enforced by files in
this repository alone.

## Repository and GitHub

- [ ] The canonical repository is public at
      `https://github.com/ryanhefner/chakra-email`, and local release checkouts
      use that repository as `origin` with `main` as their upstream branch.
- [ ] `main` requires pull requests, CODEOWNER approval, stale-review dismissal,
      and the following status checks:
  - `Verify (Node 22)`
  - `Verify (Node 24)`
  - `Compatibility floor (Node 20.19 / React 18)`
- [ ] Force pushes and branch deletion are disabled for `main`.
- [ ] `v*` tags cannot be updated or deleted, and only the approved release
      actor can create them.
- [ ] Only the release actor or its narrowly scoped GitHub App can bypass the
      pull-request rule for the Nx-generated release commit and tag.
- [ ] The `npm-publish` environment requires reviewer approval, prevents
      self-review where available, restricts deployment to `main`, and does not
      permit unreviewed protection-rule bypasses.
- [ ] GitHub Pages uses GitHub Actions as its source.

## npm Bootstrap

- [ ] The maintainer controls the unscoped `chakra-email` package name and can
      create public packages in the `@chakra-email` scope.
- [ ] Immediately before publishing, each name is checked with `npm view` to
      confirm that the intended version does not already exist:

  ```bash
  npm view @chakra-email/core@0.1.0 version
  npm view chakra-email@0.1.0 version
  npm view @chakra-email/chakra-v2@0.1.0 version
  ```

- [ ] A short-lived granular access token has the narrowest package read/write
      access that covers all three names, has **Bypass 2FA** enabled, and is
      stored only as the protected `npm-publish` environment secret
      `NPM_BOOTSTRAP_TOKEN`.
- [ ] The first-release workflow uses the explicit version `0.1.0`, has
      **first release** enabled, and completes a reviewed dry run before the
      publish dispatch.

## Trusted Publishing

After the bootstrap publish, configure each package with the same trusted
publisher values:

- GitHub owner: `ryanhefner`
- Repository: `chakra-email`
- Workflow filename: `release.yml`
- Environment: `npm-publish`
- Allowed action: `npm publish`

Then complete these checks:

- [ ] A tokenless release authenticates through OIDC on a GitHub-hosted runner.
- [ ] npm publishing access is set to require 2FA and disallow traditional
      tokens.
- [ ] The bootstrap granular token is revoked and `NPM_BOOTSTRAP_TOKEN` is
      deleted from the GitHub environment.
- [ ] Each public package shows npm provenance tied to the expected public
      repository and release workflow.

See npm's documentation for
[granular access tokens](https://docs.npmjs.com/about-access-tokens/),
[trusted publishers](https://docs.npmjs.com/trusted-publishers/), and
[provenance](https://docs.npmjs.com/generating-provenance-statements/).

## Release Verification

- [ ] `npm run release:check` passes on the exact release commit under Node 22
      and Node 24.
- [ ] The workflow dry run reports the intended fixed version for all three
      packages and only the expected changelog changes.
- [ ] The publish job runs from the reviewed `main` SHA without a newer commit
      landing between verification and publication.
- [ ] The GitHub release, `v{version}` tag, changelog, and all three npm package
      versions agree.
- [ ] A clean consumer can install the published packages and run the documented
      React 18 and React 19 examples.

If npm publication fails after Nx has pushed the release commit or tag, stop and
record which package versions became public before retrying. Never overwrite or
reuse a version that reached the registry. Resolve credentials or package access,
then choose a recovery that preserves matching Git, changelog, and npm versions.
