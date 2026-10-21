// Loads Monaco from the bundle (no CDN; CSP is script-src 'self'), with only the editor features the quest screens use, its worker, C++, and the Dojo theme.
import * as monaco from "monaco-editor/editor/editor.api.js";
import EditorWorker from "monaco-editor/editor/editor.worker.js?worker";

import "monaco-editor/editor/browser/coreCommands.js";
import "monaco-editor/features/codeEditor/register.js";
import "monaco-editor/features/codicon/register.js";
import "monaco-editor/features/hover/register.js";
import "monaco-editor/features/suggest/register.js";
import "monaco-editor/editor/contrib/suggest/browser/suggestController.js";
import "monaco-editor/features/find/register.js";
import "monaco-editor/features/bracketMatching/register.js";
import "monaco-editor/features/comment/register.js";
import "monaco-editor/features/clipboard/register.js";
import "monaco-editor/features/contextmenu/register.js";
import "monaco-editor/features/cursorUndo/register.js";
import "monaco-editor/features/folding/register.js";
import "monaco-editor/features/linesOperations/register.js";
import "monaco-editor/features/multicursor/register.js";
import "monaco-editor/features/wordHighlighter/register.js";
import "monaco-editor/features/wordOperations/register.js";
import "monaco-editor/features/indentation/register.js";
import "monaco-editor/features/snippet/register.js";
import "monaco-editor/features/readOnlyMessage/register.js";
import "monaco-editor/languages/definitions/cpp/register.js";

import "./monacoDecorations.css";

/** The theme name every Dojo editor uses. */
export const DOJO_THEME = "dojo-ink";

/** Reads a color token from the stylesheet, so the editor follows tokens.css instead of repeating hex values. */
function token(name: string): string
{
	return getComputedStyle(document.documentElement).getPropertyValue(name).trim() || "#000000";
}

/** Hex without the leading mark, for Monaco's token rules. */
function bare(hex: string): string
{
	return hex.replace(/^#/, "");
}

/** Monaco's worker runs from a bundled file on our own origin. */
self.MonacoEnvironment = {
	getWorker: () => new EditorWorker(),
};

/** Defines the Dojo editor theme from the design tokens; safe to call more than once. */
export function defineDojoTheme(): void
{
	monaco.editor.defineTheme(DOJO_THEME, {
		base: "vs-dark",
		inherit: true,
		rules: [
			{ token: "comment", foreground: bare(token("--color-paper-faint")), fontStyle: "italic" },
			{ token: "keyword", foreground: bare(token("--color-patterns")) },
			{ token: "string", foreground: bare(token("--color-systems")) },
			{ token: "number", foreground: bare(token("--color-foundations")) },
			{ token: "type", foreground: bare(token("--color-mechanics")) },
		],
		colors: {
			"editor.background": token("--color-ink"),
			"editor.foreground": token("--color-paper"),
			"editorLineNumber.foreground": token("--color-line-strong"),
			"editorLineNumber.activeForeground": token("--color-paper-muted"),
			"editor.lineHighlightBackground": token("--color-surface"),
			"editorCursor.foreground": token("--color-foundations"),
			"editor.selectionBackground": `${token("--color-foundations")}40`,
			"editorWidget.background": token("--color-overlay"),
			"editorWidget.border": token("--color-line-strong"),
			"editorHoverWidget.background": token("--color-overlay"),
			"editorHoverWidget.border": token("--color-line-strong"),
			"editorSuggestWidget.background": token("--color-overlay"),
			"editorSuggestWidget.border": token("--color-line-strong"),
			"editorSuggestWidget.selectedBackground": token("--color-raised"),
		},
	});
}

export { monaco };
