// Splits a build brief into its main text and the "See it in the editor" checklist, which the screen shows as ticks.

/** The heading every build brief has (content-engine checks it). */
const SEE_IT_HEADING = /^##\s+See it in the editor\s*$/im;

/** The brief without the subsection, and the subsection as checklist sentences. */
export interface SplitBrief
{
	main: string;
	seeItSteps: string[];
}

/** Cuts the subsection off the brief and turns it into steps: list items when it has a list, otherwise its sentences. */
export function splitBrief(brief: string): SplitBrief
{
	const match = SEE_IT_HEADING.exec(brief);

	if (!match) return { main: brief.trim(), seeItSteps: [] };

	const main = brief.slice(0, match.index).trim();
	const rest = brief.slice(match.index + match[0].length);
	const nextHeading = /^#{1,2}\s/m.exec(rest);
	const section = (nextHeading ? rest.slice(0, nextHeading.index) : rest).trim();
	const listItems = section.split("\n").filter((line) => /^\s*([-*]|\d+\.)\s+/.test(line)).map((line) => line.replace(/^\s*([-*]|\d+\.)\s+/, "").trim());
	const seeItSteps = listItems.length > 0 ? listItems : section.split(/(?<=[.!?])\s+(?=[A-Z`])/).map((sentence) => sentence.trim()).filter((sentence) => sentence.length > 0);

	return { main: nextHeading ? `${main}\n\n${rest.slice(nextHeading.index).trim()}` : main, seeItSteps };
}
