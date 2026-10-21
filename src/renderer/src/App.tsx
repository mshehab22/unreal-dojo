// Root component: the app frame. Providers that later tasks add (stores, error boundary) wrap it here.
import { AppFrame } from "./app/AppFrame";

/** The whole renderer UI. */
export function App()
{
	return <AppFrame />;
}
