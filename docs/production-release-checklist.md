# Production Release Checklist

Complete this checklist for each public release, and review the repository and
credential settings whenever ownership or release workflows change. The
settings below live in GitHub and npm, so they cannot be enforced by files in
this repository alone.

## 0.3.0 release procedure

The seven existing public packages release together at `0.3.0`. This is not an
initial publish: leave **first_release** disabled. The workflow publishes the
version already committed on disk; it does not bump versions or create tags.

1. Complete the local release checks and mailbox verification below.
2. Merge the release-preparation branch, then wait for a successful CI **push**
   run on the exact `main` SHA to be published. A PR check or an older CI run
   does not satisfy the release gate.
3. Dispatch **Release** from `main` with `version: 0.3.0`, `dry_run: true`, and
   `first_release: false`. Review the package list and tarball contents.
4. Without advancing `main`, dispatch again with `dry_run: false` and approve
   the protected `npm-publish` environment. Ordinary releases use OIDC, not a
   stored `NODE_AUTH_TOKEN`.
5. Verify every package at npm, test a clean consumer, then create the GitHub
   release and `v0.3.0` tag at the exact published SHA.
6. Deploy the documentation site separately through Vercel. See
   [deployment settings](../apps/site/DEPLOYMENT.md); publishing npm packages
   does not deploy the site.

## Repository and GitHub

- [ ] The canonical repository is public at
      `https://github.com/chakra-email/chakra-email`, and local release checkouts
      use that repository as `origin` with `main` as their upstream branch.
- [ ] `main` requires pull requests, CODEOWNER approval, stale-review dismissal,
      and the following status checks:
  - `Verify (Node 24)`
  - `Compatibility floor (Node 20.19 / React 18)`
- [ ] Force pushes and branch deletion are disabled for `main`.
- [ ] `v*` tags cannot be updated or deleted, and only maintainers can create
      them after every package has been published successfully.
- [ ] The `npm-publish` environment requires reviewer approval, prevents
      self-review where available, restricts deployment to `main`, and does not
      permit unreviewed protection-rule bypasses.
- [ ] Vercel is connected to the canonical repository with `main` as its
      production branch, `apps/site` as its root, and `chakra.email` as its domain.

## npm package access

- [ ] The maintainer controls the unscoped `chakra-email` package name and can
      create public packages in the `@chakra-email` scope.
- [ ] Immediately before publishing, each name is checked with `npm view` to
      confirm that the intended version does not already exist:

  ```bash
  npm view @chakra-email/core@0.3.0 version
  npm view chakra-email@0.3.0 version
  npm view @chakra-email/chakra-v2@0.3.0 version
  npm view @chakra-email/preview@0.3.0 version
  npm view @chakra-email/react-email@0.3.0 version
  npm view @chakra-email/code-block@0.3.0 version
  npm view @chakra-email/markdown@0.3.0 version
  ```

  An expected version-not-found response means the version is available; a
  network or authentication failure does not. If any version already exists,
  inspect the prior publication before proceeding.

## Trusted Publishing

Verify each of the seven packages has a valid trusted publisher with these
values (these external settings have not been verified by local tests):

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

### Bootstrap only for packages that have never been published

Do not enable `first_release` for this `0.3.0` release. If a future release adds
a new package, plan its initial publication separately: a short-lived granular
token must have the narrowest required package/scope write permissions and
publishing access allowed by npm's current account policy. Store it only as
`NPM_BOOTSTRAP_TOKEN` in the protected `npm-publish` environment. Review an
explicit-version dry run, publish, configure trusted publishing, and revoke the
token. Do not reset or republish existing package versions to bootstrap a new one.

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

- [ ] The documentation site's Chakra Docs and Postkit dependencies resolve
      from a fresh checkout without a local yalc store. Follow the
      [site clean-install prerequisite](site.md#clean-install-release-prerequisite)
      before relying on CI, Vercel, or a local release-check result.
- [ ] A release-preparation commit aligns every public package manifest and the
      lockfile to the new immutable version, including first-party dependency
      ranges so consumers cannot resolve an older first-party package set.
      The Release Action validates this
      committed version; it does not create or commit a version bump.
- [ ] The changelog's Unreleased notes are moved under that version and release
      date before the release-preparation commit is merged.

- [ ] `nvm use` and `corepack enable` select Node `24.18.0` and pnpm `11.25.0`;
      `pnpm install --frozen-lockfile` succeeds from a clean checkout.
- [ ] `pnpm run release:check` passes on the exact release commit under Node 24.
- [ ] `pnpm run types:performance:check` passes on that same commit.
- [ ] The Node 20.19 / React 18 compatibility job passes on that same commit.
- [ ] The successful CI run was triggered by a push to `main`, and the Release
      workflow's `Require successful CI for release commit` job accepts its
      exact commit SHA.
- [ ] The workflow dry run reports the intended fixed version for all seven
      packages and only the intended package contents.
- [ ] The publish job runs from the reviewed `main` SHA without a newer commit
      landing between verification and publication.
- [ ] After all packages are published, a maintainer creates the matching
      `v{version}` GitHub release and tag from the exact published commit.
- [ ] The GitHub release, `v{version}` tag, changelog, committed package
      manifests, and all seven npm package versions agree.
- [ ] A clean consumer can install the published packages, run the documented
      React 18 and React 19 examples, and launch the installed preview CLI with
      its bundled browser assets.

If npm publication partially fails, stop and record which package versions
became public before retrying. Do not create the GitHub release or tag yet, and
never overwrite or reuse a version that reached the registry. Resolve
credentials or package access, then choose a recovery that preserves matching
Git, changelog, manifest, and npm versions.
