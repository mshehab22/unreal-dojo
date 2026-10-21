// What the renderer needs to know about the OS: which modifier key shortcuts use and how to label it.

/** True on macOS, where shortcuts use Cmd instead of Ctrl. */
export function isMacPlatform(): boolean
{
	return typeof navigator !== "undefined" && /Mac/i.test(navigator.userAgent);
}

/** The label for the shortcut modifier key on this OS. */
export function modifierKeyLabel(): string
{
	return isMacPlatform() ? "⌘" : "Ctrl";
}

/** True when the event has the OS's shortcut modifier held (Cmd on macOS, Ctrl elsewhere). */
export function hasShortcutModifier(event: KeyboardEvent): boolean
{
	return isMacPlatform() ? event.metaKey : event.ctrlKey;
}
