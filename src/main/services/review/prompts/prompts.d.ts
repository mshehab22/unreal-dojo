// Lets TypeScript import the prompt markdown files as strings through Vite's `?raw` suffix.

declare module "*.md?raw"
{
	/** The file's text. */
	const text: string;
	export default text;
}
