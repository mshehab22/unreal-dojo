// The part of Electron's `app` that the quit helpers need, so tests pass a fake.

/** What the quit helpers use from Electron's `app`: the `before-quit` event and `quit()`. */
export interface QuittingApp
{
	on(eventName: "before-quit", listener: (event: { preventDefault(): void }) => void): void;
	quit(): void;
}
