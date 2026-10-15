---
name: git-history
description: Commit, reword, retag and publish in this repo without breaking its conventions. Use when committing, fixing commit messages, rewriting history, moving the v1/v2 tags, or pushing.
---

# Git history

## Commit messages

Subject starts with a lowercase letter, imperative, short, no trailing period. Keep proper nouns (`TypeScript`, `Sombra`).

```
fix stale team scores after clearing a team
```

On PowerShell there are no heredocs: pass the subject and each body paragraph as separate `-m` flags.

Agent commits stay authored by the user and end with this trailer, after a blank line:

```
Co-authored-by: Cursor <cursoragent@cursor.com>
```

Pass it as its own `-m`. The Python history at `v1` (`9acb2ee`) does not get the trailer.

## Refs

- `main` is the working branch; `master` / `v1` are the old Python app (`9acb2ee`)
- `v2` is an annotated tag on the TypeScript port commit (`port the counter engine to TypeScript and drop Python`)
- `origin` may lag local `main`; check `git status -sb` before pushing

## Rewording or rewriting

1. Make a backup first: `git branch backup/<reason> main`
2. Rewrite only the range that needs it. For message-only fixes, keep authors, dates and trees:

   ```bash
   FILTER_BRANCH_SQUELCH_WARNING=1 git filter-branch -f \
     --msg-filter "sed '1s/^./\L&/'" --tag-name-filter cat -- ^<last-good> main v2
   ```

3. Verify: `git diff backup/<reason> main` is empty, subjects look right, `git cat-file -t v2` is still `tag`
4. Delete `refs/original/*` once verified (the backup branch remains)

## Publishing

- Never force-push without the user asking
- Rewritten pushed commits need `git push --force-with-lease origin main`
- Moved tags need `git push --force origin <tag>`
- The remote sometimes returns HTTP 500; retry once before investigating
