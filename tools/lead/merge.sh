#!/usr/bin/env bash
# Lead merge: merges a reviewed branch into main with --no-ff, keeps both sides of docs-only conflicts, then runs every check.
# Usage, from the repository root (macOS Terminal or Git Bash on Windows): bash tools/lead/merge.sh <branch> "<merge message>"
# Stops on a code conflict so the Lead resolves it by hand. Set RUN_E2E=0 to skip the e2e step.
set -u

BRANCH=$1
MESSAGE="$2

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
LOG_FOLDER=${DOJO_LEAD_LOGS:-$(node -p "require('os').tmpdir()")}

if ! git merge --no-ff --no-edit -m "$MESSAGE" "$BRANCH" >/dev/null 2>&1; then
	CONFLICTS=$(git diff --name-only --diff-filter=U)

	for FILE in $CONFLICTS; do
		case "$FILE" in
			docs/*.md) ;;
			*) echo "CODE CONFLICT: $FILE. Resolve it by hand, keep every dependency, then commit."; exit 2 ;;
		esac
	done

	for FILE in $CONFLICTS; do
		npx tsx tools/lead/keepBothSides.ts "$FILE" && git add "$FILE"
	done

	git commit -q -m "$MESSAGE" || exit 3
	echo "Docs conflicts resolved by keeping both sides: $CONFLICTS"
fi

git log --oneline -1

npm ci >/dev/null 2>&1 || { echo "NPM CI FAILED"; exit 4; }

# npm ci sometimes skips the Electron download; e2e then fails at launch.
node -e "require('fs').accessSync(require('electron'))" 2>/dev/null || node node_modules/electron/install.js >/dev/null 2>&1

npm run typecheck >/dev/null 2>&1 && echo "TYPECHECK OK" || echo "TYPECHECK FAILED"
npm test 2>&1 | grep -E "Tests |FAIL" | head -5
npx tsx tools/verify-content.ts 2>&1 | tail -2
npm run build >/dev/null 2>&1 && echo "BUILD OK" || echo "BUILD FAILED"

# e2e opens its windows hidden and unfocused (A77); never set DOJO_TEST_SHOW_WINDOW here.
if [ "${RUN_E2E:-1}" = "1" ]; then
	npm run test:e2e > "$LOG_FOLDER/dojo-last-e2e.log" 2>&1
	grep -E "✘|flaky|failed|passed" "$LOG_FOLDER/dojo-last-e2e.log" | tail -5
else
	echo "E2E SKIPPED"
fi
