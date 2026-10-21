// Renders a query's three states the same way everywhere: a quiet skeleton, the AppError with retry, or the content.
import type { ReactNode } from "react";

import type { QueryResult } from "@/data/useDojoQuery";

import { AppErrorView } from "./AppErrorView";
import { LoadingBlock } from "./LoadingBlock";

/** Props for QueryView. */
interface QueryViewProps<Value>
{
	readonly query: QueryResult<Value>;
	readonly children: (data: Value) => ReactNode;
	readonly loadingHeight?: string;
}

/** Shows the content once data exists; the error (with retry) when the first fetch failed; a skeleton before that. */
export function QueryView<Value>({ query, children, loadingHeight }: QueryViewProps<Value>)
{
	if (query.data !== undefined) return <>{children(query.data)}</>;

	if (query.error) return <AppErrorView error={query.error} onRetry={query.reload} />;

	return <LoadingBlock height={loadingHeight} />;
}
