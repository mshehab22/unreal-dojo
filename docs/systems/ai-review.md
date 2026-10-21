# System: ai-review

Owner: builder-review. Folder: `src/main/services/review/`. Research: `research/tooling-and-stack.md` section 10.

## Purpose

Three graders behind one service: code review for build and refactor quests, breakdown grading, and explain-in-one-sentence grading. Three providers: Claude Code CLI (learner's subscription), Anthropic API (learner's key), tests-only (no AI).

## Providers

`IReviewProvider { id; isAvailable(); complete(request: { systemPrompt, userMessage, jsonSchema }): Promise<string> }`. The graders build prompts and parse JSON; providers only transport.

- ClaudeCodeProvider: `claude -p --output-format json --json-schema <schema file> --system-prompt-file <prompt file> --tools "" --max-turns 1 --no-session-persistence --strict-mcp-config --setting-sources user`, user message on stdin, `cwd` a clean temp folder, 3 minute timeout. Locate `claude` on PATH plus `/usr/local/bin`, `/opt/homebrew/bin`, `%APPDATA%\npm`. Record the CLI version at startup; if a flag is rejected, fall back to `--output-format text` and the tolerant parser.
- AnthropicApiProvider: `@anthropic-ai/sdk`, model from settings (default `claude-sonnet-5-5`), key from `safeStorage`, structured output through the same schema. Handles 429 with one retry after the stated wait, then surfaces the error.
- TestsOnlyProvider: deterministic; turns test results and the rubric into findings; explain items get "self-check against the model answer".

Selection: settings `auto` picks the first available in that order. Review is skipped when the build fails (the compiler already said what is wrong) and when the learner only pressed Run.

## Graders and schemas

Code review (`CodeReviewer`): system prompt = senior Unreal programmer mentoring; never writes the solution or more than one corrected line; cites file and line; judges correctness against the brief, the rubric line by line, Unreal conventions (UPROPERTY on every UObject pointer, TObjectPtr, delegate unbinding on EndPlay, no Tick where a timer or event fits, const correctness, forward declarations, header hygiene, quest-prefixed names), pattern use when the quest names one, naming, one-line comments. Output schema: `{ score 0..100, summary, rubric: [{ line, met: boolean, note }], findings: [{ severity: problem|suggestion|praise, title, detail, file?, line? }], reflectionQuestion, alternativeHint }`.

Breakdown grader (`BreakdownGrader`): input = spec, required pieces, reference plans, learner plan (pieces with purpose labels and edges), revision note. Rules: accept different valid splits; match labels by meaning; a required piece missing after revision is a hard fail; flag god classes, data owned by the wrong piece, missing events, wrong order; most of the score comes from the revision. Schema: `{ score, summary, requiredPiecesCovered: [{ label, covered, matchedTo? }], concerns[], strengths[], revisionQuality: 0..100, alternativeToShow: index }`.

Explain grader (`ExplainGrader`): one sentence from the learner against a model answer, graded on correctness, abstraction level (describes purpose, not line-by-line), and ambiguity. Schema: `{ score 0..100, verdict: correct|partly|incorrect, note }`. Always free for the learner.

Follow-up (`FindingExplainer`): "why is this a finding?" sends the finding and the code back for a plain-English explanation. Free, no XP effect, cached per finding.

## Done criteria

- Unit tests on recorded provider outputs for all three graders, including fenced and prose-wrapped JSON and a schema violation.
- One live run through Claude Code and one through the API logged in `docs/iterations.md` with the exact command line that worked and the CLI version.
- Prompts live in `src/main/services/review/prompts/*.md` and are versioned; a prompt change needs a note in `docs/decisions.md`.
