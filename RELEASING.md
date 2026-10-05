# Releasing a new version

The Google Tag Manager Community Template Gallery reads `metadata.yaml` on the `main` branch. Each entry
points at the commit whose `template.tpl` is that version. New versions usually appear in the gallery
within 2 to 3 days, and containers that use the template then show an update notice. Updates are never
applied automatically.

## First publication

1. Make sure the repository is public, `template.tpl`, `metadata.yaml` and `LICENSE` are at the root of
   `main`, and issues are enabled so users can report problems.
2. Sign in to the [Community Template Gallery](https://tagmanager.google.com/gallery) with a GitHub account
   that has access to this repository.
3. Open the ⋮ menu, choose **Submit Template**, enter the repository URL and click **Submit**.

Later versions don't need to be submitted again: the gallery reads `metadata.yaml`.

## Version numbers

The template follows [Semantic Versioning](https://semver.org/):

| Change | Version | Examples |
| --- | --- | --- |
| Breaks installed tags | Major (`2.0.0`) | Renaming or removing a field, changing a field's type or values, changing the script URL contract |
| Adds something compatible | Minor (`1.1.0`) | A new optional field, a new event type, a new signal toggle |
| Fixes or polishes | Patch (`1.0.1`) | Bug fixes, help text, labels, tests |

Avoid major versions. Installed tags depend on the field names, their types and the select values, so
`scripts/validate.mjs` fails if one of them is removed or changes type. New fields and new select values
are compatible. If a major version is unavoidable, update the contract at the top of `scripts/validate.mjs`
in the same pull request and explain the migration in `CHANGELOG.md`.

## Steps

1. **Change `template.tpl`.** Edit it in the GTM template editor or by hand, keeping the same file
   format as an editor export.
2. **Test it in GTM.** Import the file in a test workspace, open **Tests** and click **Run Tests**. Then
   use **Preview** to check that the tag fires, `https://pixel.byads.co/t/v1.js` loads, and the beacon
   reaches `https://pixel.byads.co/v1/beacon`.
3. **Update `CHANGELOG.md`.** Add a section for the new version at the top.
4. **Commit the template.**

   ```sh
   git add template.tpl CHANGELOG.md
   git commit -m "feat: <what changed> (vX.Y.Z)"
   ```

5. **Add the version to `metadata.yaml`, at the top of `versions`, and commit it.** Use the full SHA of
   the commit from step 4 (`git rev-parse HEAD`).

   ```yaml
   versions:
     # Latest version
     - sha: <full SHA of the commit from step 4>
       changeNotes: <one or two sentences for gallery users; use a |2 block for several lines>
     # Older versions
     - sha: ...
   ```

   ```sh
   git add metadata.yaml
   git commit -m "chore: publish vX.Y.Z in the Community Template Gallery"
   ```

6. **Validate.** Run `npm ci --ignore-scripts` once, then `npm run validate`. It checks the gallery rules, the license, the field names
   and select values installed tags depend on, the permissions, that the newest `metadata.yaml` entry has
   the same `template.tpl` as your branch, and that every version already published on `origin/main` is
   still listed in the same order. The same check runs on every push and pull request.
7. **Tag and release.** Tag the template commit from step 4, then push and create the release:

   ```sh
   git tag -a vX.Y.Z <sha from step 4> -m "vX.Y.Z"
   git push origin main vX.Y.Z
   gh release create vX.Y.Z --verify-tag --title "vX.Y.Z" --notes-file <notes>
   ```

## Rules

- Never rewrite or force-push `main` after a SHA is listed in `metadata.yaml`. The gallery needs every
  listed commit.
- Never delete `LICENSE` or `metadata.yaml`. Removing either one removes the template from the gallery.
- Keep a single `template.tpl` at the repository root.
