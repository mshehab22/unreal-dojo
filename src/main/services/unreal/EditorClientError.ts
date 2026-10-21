// The one error the editor client throws, telling a lost connection from a tool that answered with an error.

/** `connection`: the server did not answer or the session broke. `tool`: the server answered and the tool reported an error. `format`: the answer was not the shape expected. */
export type EditorClientErrorKind = "connection" | "tool" | "format";

/** Thrown by EditorToolClient calls. Runners fall back to the headless loop on `connection` and report `tool` and `format` errors. */
export class EditorClientError extends Error
{
	/** Which kind of failure this is. */
	readonly kind: EditorClientErrorKind;

	/** Builds the error with its kind and a plain message. */
	constructor(kind: EditorClientErrorKind, message: string)
	{
		super(message);

		this.name = "EditorClientError";
		this.kind = kind;
	}
}
