// Placeholder root component until ui-core builds the real frame (M0.3).
import { useEffect, useState } from "react";

/** Shows the app name and version so the smoke test and a first launch have something to look at. */
export function App()
{
	const [version, setVersion] = useState("");

	useEffect(() =>
	{
		void window.dojo.getAppVersion().then(setVersion);
	}, []);

	return (
		<main className="flex h-screen flex-col items-center justify-center gap-3 bg-background text-foreground select-none">
			<h1 className="text-4xl font-semibold tracking-tight">Unreal Dojo</h1>
			<p className="text-muted-foreground">Learn Unreal Engine C++ by practicing.</p>
			<p data-testid="app-version" className="text-xs text-muted-foreground">
				{version ? `v${version}` : ""}
			</p>
		</main>
	);
}
