// The Monaco editor itself: one model per file, glossary hover and completion, marked-line decorations, and the quest shortcuts. Loaded lazily by CodeEditor.
import { useEffect, useRef } from "react";

import type { GlossaryAlias } from "@shared/types/catalog";

import { registerGlossaryProviders, setGlossaryData } from "./glossaryProviders";
import { defineDojoTheme, DOJO_THEME, monaco } from "./monacoSetup";

/** One file the editor can show. */
export interface EditorFile
{
	name: string;
	value: string;
}

/** Keyboard commands the quest screen handles. */
export interface EditorCommands
{
	onRun?: () => void;
	onSubmit?: () => void;
	onSave?: () => void;
}

/** Props for MonacoCodeEditor. */
export interface MonacoCodeEditorProps
{
	/** Namespaces the models, so two quests never share a file. */
	readonly modelKey: string;
	readonly files: readonly EditorFile[];
	readonly activeFile: string;
	readonly onChange?: (name: string, value: string) => void;
	readonly onBlur?: () => void;
	readonly readOnly?: boolean;

	/** 1-based lines of the active file to mark (worked-level lines to explain). */
	readonly markedLines?: readonly number[];
	readonly aliases?: readonly GlossaryAlias[];
	readonly questTermIds?: readonly string[];
	readonly commands?: EditorCommands;
	readonly ariaLabel: string;
}

/** The model for one file of one quest, created on first use. */
function modelFor(modelKey: string, file: EditorFile): monaco.editor.ITextModel
{
	const uri = monaco.Uri.parse(`file:///${encodeURIComponent(modelKey)}/${encodeURIComponent(file.name)}`);

	return monaco.editor.getModel(uri) ?? monaco.editor.createModel(file.value, "cpp", uri);
}

/** A Monaco editor bound to the given files. Models outlive a file switch, so undo history stays per file. */
export function MonacoCodeEditor({ modelKey, files, activeFile, onChange, onBlur, readOnly = false, markedLines = [], aliases = [], questTermIds = [], commands, ariaLabel }: MonacoCodeEditorProps)
{
	const hostReference = useRef<HTMLDivElement>(null);
	const editorReference = useRef<monaco.editor.IStandaloneCodeEditor | null>(null);
	const decorationsReference = useRef<monaco.editor.IEditorDecorationsCollection | null>(null);
	const latest = useRef({ onChange, onBlur, commands, activeFile });

	latest.current = { onChange, onBlur, commands, activeFile };

	// Create the editor once.
	useEffect(() =>
	{
		const host = hostReference.current;

		if (!host) return;

		defineDojoTheme();
		registerGlossaryProviders();

		const editor = monaco.editor.create(host, {
			theme: DOJO_THEME,
			automaticLayout: true,
			fontFamily: "JetBrains Mono Variable, ui-monospace, monospace",
			fontSize: 13,
			lineHeight: 20,
			minimap: { enabled: false },
			scrollBeyondLastLine: false,
			renderLineHighlight: "line",
			tabSize: 4,
			insertSpaces: false,
			padding: { top: 12, bottom: 12 },
			ariaLabel,
			fixedOverflowWidgets: true,
			wordWrap: "on",
			wrappingIndent: "indent",
		});

		editorReference.current = editor;
		decorationsReference.current = editor.createDecorationsCollection([]);

		editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.Enter, () => latest.current.commands?.onRun?.());
		editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyMod.Shift | monaco.KeyCode.Enter, () => latest.current.commands?.onSubmit?.());
		editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyS, () => latest.current.commands?.onSave?.());

		const changeListener = editor.onDidChangeModelContent(() =>
		{
			const model = editor.getModel();

			if (model) latest.current.onChange?.(latest.current.activeFile, model.getValue());
		});
		const blurListener = editor.onDidBlurEditorText(() => latest.current.onBlur?.());

		return () =>
		{
			changeListener.dispose();
			blurListener.dispose();
			editor.dispose();
			editorReference.current = null;
		};
	}, []);

	// Show the active file, and keep every model in step with values set from outside (load, reset).
	useEffect(() =>
	{
		const editor = editorReference.current;

		if (!editor) return;

		for (const file of files)
		{
			const model = modelFor(modelKey, file);

			if (model.getValue() !== file.value) model.setValue(file.value);
		}

		const active = files.find((file) => file.name === activeFile);

		if (active && editor.getModel() !== modelFor(modelKey, active)) editor.setModel(modelFor(modelKey, active));
	}, [modelKey, files, activeFile]);

	// Read-only while a gate is closed.
	useEffect(() =>
	{
		editorReference.current?.updateOptions({ readOnly, readOnlyMessage: { value: "Explain the marked lines first; the gaps open after that." } });
	}, [readOnly]);

	// Mark the lines to explain.
	useEffect(() =>
	{
		decorationsReference.current?.set(markedLines.map((line) => ({ range: new monaco.Range(line, 1, line, 1), options: { isWholeLine: true, className: "dojo-marked-line", glyphMarginClassName: "dojo-marked-glyph", linesDecorationsClassName: "dojo-marked-gutter" } })));
	}, [markedLines, activeFile]);

	// Glossary data for hover and completion.
	useEffect(() =>
	{
		setGlossaryData(aliases, questTermIds);
	}, [aliases, questTermIds]);

	return <div ref={hostReference} data-testid="code-editor" className="h-full min-h-0 w-full overflow-hidden" />;
}
