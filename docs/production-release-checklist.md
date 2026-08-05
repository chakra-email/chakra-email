# Production Release Checklist

Complete this checklist before the first public release and repeat it whenever
repository ownership, publishing credentials, or release workflows change. The
settings below live in GitHub and npm, so they cannot be enforced by files in
this repository alone.

## Repository and GitHub

- [ ] The canonical repository is public at
      `https://github.com/chakra-email/chakra-email`, and local release checkouts
      use that repository as `origin` with `main` as their upstream branch.
- [ ] `main` requires pull requests, CODEOWNER approval, stale-review dismissal,
      and the following status checks:
  - `Verify (Node 22)`
  - `Verify (Node 24)`
  - `Compatibility floor (Node 20.19 / React 18)`
- [ ] Force pushes and branch deletion are disabled for `main`.
- [ ] `v*` tags cannot be updated or deleted, and only the dedicated release
      GitHub App can create them.
- [ ] A dedicated release GitHub App has only repository **Contents: read and
      write** permission, is installed only on `chakra-email/chakra-email`, and
      is the sole bypass actor for the Nx-generated release commit and tag.
- [ ] The app's client ID is stored as the `RELEASE_APP_CLIENT_ID` secret and
      its complete PEM private key is stored as `RELEASE_APP_PRIVATE_KEY` on the
      protected `npm-publish` environment.
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
  npm view @chakra-email/preview@0.1.0 version
  ```

- [ ] A short-lived granular access token has the narrowest package read/write
      access that covers all four names, has **Bypass 2FA** enabled, and is
      stored only as the protected `npm-publish` environment secret
      `NPM_BOOTSTRAP_TOKEN`.
- [ ] The first-release workflow uses the explicit version `0.1.0`, has
      **first release** enabled, and completes a reviewed dry run before the
      publish dispatch.

## Trusted Publishing

After the bootstrap publish, configure each package with the same trusted
publisher values:

- GitHub owner: `chakra-email`
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

## Mailbox Client Verification

Complete the [email-client test matrix](email-client-test-matrix.md) using
messages sent by the production delivery path, not HTML pasted directly into a
preview tool.

- [ ] The matrix records the release version, exact commit SHA, send date,
      delivery provider, screenshot service, fixtures, and evidence links.
- [ ] Every client and version in the documented compatibility baseline has a
      result for each applicable fixture and display mode.
- [ ] CTA click targets, multi-column layout, preview text, remote and CID
      images, Markdown tables, long content, and fallback typography are
      represented across the fixtures.
- [ ] All content links and images use deliberate absolute public URLs or valid
      `cid:` attachments; no relative URL relies on mailbox-client resolution.
- [ ] Failures are fixed and rerun, or accepted limitations are documented with
      an owner and product approval before publishing.

## Release Verification

- [ ] `npm run release:check` passes on the exact release commit under Node 22
      and Node 24.
- [ ] The Node 20.19 / React 18 compatibility job passes on that same commit.
- [ ] The successful CI run was triggered by a push to `main`, and the Release
      workflow's `Require successful CI for release commit` job accepts its
      exact commit SHA.
- [ ] The workflow dry run reports the intended fixed version for all four
      packages and only the expected changelog changes.
- [ ] The publish job runs from the reviewed `main` SHA without a newer commit
      landing between verification and publication.
- [ ] The GitHub release, `v{version}` tag, changelog, and all four npm package
      versions agree.
- [ ] A clean consumer can install the published packages, run the documented
      React 18 and React 19 examples, and launch the installed preview CLI with
      its bundled browser assets.

If npm publication fails after Nx has pushed the release commit or tag, stop and
record which package versions became public before retrying. Never overwrite or
reuse a version that reached the registry. Resolve credentials or package access,
then choose a recovery that preserves matching Git, changelog, and npm versions.
