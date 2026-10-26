// Keeps a hidden e2e run from ever appearing on the macOS desktop: no Dock icon, no menu bar, never the active app (A970, A972).
import { app } from "electron";

/** Makes a macOS test app "prohibited": it has no Dock icon or menu bar and can never become active. Does nothing on other platforms. */
export function keepTestRunOffDesktop(): void
{
	if (process.platform !== "darwin") return;

	// No dock.hide() here: it would set the policy back to "accessory".
	app.setActivationPolicy("prohibited");
}
