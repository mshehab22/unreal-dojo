// A React error boundary around one screen: when the screen throws while rendering, a friendly card replaces it and the app frame keeps working.
import { ChevronDownIcon, RotateCwIcon, TriangleAlertIcon } from "lucide-react";
import { Component, type ErrorInfo, type ReactNode } from "react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

/** Props for ScreenErrorBoundary. */
interface ScreenErrorBoundaryProps
{
	readonly children: ReactNode;

	/** Moves the app to the Studio screen. The boundary also clears its own error, so this works when the Studio itself is the screen that broke. */
	readonly onGoToStudio: () => void;
}

/** What the boundary remembers: the error it caught, and whether the learner opened the details. */
interface ScreenErrorBoundaryState
{
	readonly error: Error | null;
	readonly showDetails: boolean;
}

/** Catches a render error from the screen inside it and offers Reload and Go to Studio. The navigation rail and frame are outside it and stay usable. */
export class ScreenErrorBoundary extends Component<ScreenErrorBoundaryProps, ScreenErrorBoundaryState>
{
	override state: ScreenErrorBoundaryState = { error: null, showDetails: false };

	/** Turns a thrown render error into the state that shows the card. */
	static getDerivedStateFromError(error: unknown): ScreenErrorBoundaryState
	{
		return { error: error instanceof Error ? error : new Error(String(error)), showDetails: false };
	}

	/** Writes the error and the component stack to the console, where the developer tools can read it. */
	override componentDidCatch(error: Error, info: ErrorInfo): void
	{
		console.error("A screen threw while rendering.", error, info.componentStack);
	}

	/** Clears the error so the screen renders again from scratch. */
	private readonly reload = (): void =>
	{
		this.setState({ error: null, showDetails: false });
	};

	/** Leaves for the Studio, and clears the error in case the Studio is where the app already was. */
	private readonly goToStudio = (): void =>
	{
		this.props.onGoToStudio();
		this.reload();
	};

	/** Opens or closes the error message. */
	private readonly toggleDetails = (): void =>
	{
		this.setState((current) => ({ showDetails: !current.showDetails }));
	};

	/** Renders the screen, or the friendly card when it broke. */
	override render(): ReactNode
	{
		const { error, showDetails } = this.state;

		if (!error) return this.props.children;

		return (
			<section data-testid="screen-error" role="alert" className="mx-auto flex min-h-full w-full max-w-xl flex-col justify-center py-6">
				<div className="flex flex-col gap-4 rounded-xl border border-fail/30 bg-fail/[0.06] p-6">
					<div className="flex items-center gap-3">
						<TriangleAlertIcon className="size-5 shrink-0 text-fail" strokeWidth={2} />
						<h1 className="text-xl font-semibold text-paper">Something went wrong on this screen</h1>
					</div>
					<p className="text-sm text-paper-muted">Your progress is safe. Reload the screen to try again, or go back to the Studio. The rest of the app still works.</p>
					<div className="flex flex-wrap items-center gap-2">
						<Button variant="pack" onClick={this.reload}>
							<RotateCwIcon />
							Reload
						</Button>
						<Button variant="secondary" onClick={this.goToStudio}>
							Go to Studio
						</Button>
						<button
							type="button"
							onClick={this.toggleDetails}
							aria-expanded={showDetails}
							className="flex items-center gap-1 text-xs text-paper-faint transition-colors duration-(--duration-fast) hover:text-paper-muted"
						>
							<ChevronDownIcon className={cn("size-3.5 transition-transform duration-(--duration-fast)", showDetails && "rotate-180")} />
							{showDetails ? "Hide details" : "Show details"}
						</button>
					</div>
					{showDetails && (
						<pre data-testid="screen-error-details" className="max-h-48 overflow-auto rounded-sm bg-ink/70 p-2 font-mono text-2xs whitespace-pre-wrap text-paper-muted select-text">
							{error.message}
						</pre>
					)}
				</div>
			</section>
		);
	}
}
