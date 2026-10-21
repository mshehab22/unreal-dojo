// The quest code editor, loaded on demand so Monaco never weighs on app start. Everything else imports this, not the Monaco files.
import { lazy, Suspense } from "react";

import { LoadingBlock } from "@/components/LoadingBlock";

import type { MonacoCodeEditorProps } from "./monaco/MonacoCodeEditor";

/** Monaco and its features, split into their own chunk. */
const MonacoCodeEditor = lazy(() => import("./monaco/MonacoCodeEditor").then((module) => ({ default: module.MonacoCodeEditor })));

/** A Monaco editor with a quiet placeholder while its chunk loads. */
export function CodeEditor(props: MonacoCodeEditorProps)
{
	return (
		<Suspense fallback={<LoadingBlock height="h-full" />}>
			<MonacoCodeEditor {...props} />
		</Suspense>
	);
}
