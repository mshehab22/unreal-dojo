// Checks the glossary: related ids resolve, docs links are pinned to 5.8, and no two entries claim one spelling.
import { buildGlossaryAliases } from "../../../src/main/content/buildGlossaryAliases";
import type { ContentProblem } from "../../../src/shared/types/content";
import type { ContentCheck } from "../ContentCheck";
import { errorAt } from "./checkHelpers";

/** The query string every Epic docs link carries so it opens the 5.8 page (D10). */
const PINNED_VERSION = "application_version=5.8";

/** Related ids, pinned links, and spellings shared by two entries (which would make the TermLinker ambiguous). */
export const glossaryCheck: ContentCheck = {
	name: "glossary",
	run(input)
	{
		const problems: ContentProblem[] = [];
		const ids = new Set(input.content.glossary.map((entry) => entry.id));

		for (const entry of input.content.glossary)
		{
			const section = `entry ${entry.id}`;

			for (const related of entry.related)
			{
				if (related === entry.id) problems.push(errorAt("glossary.json", "related: an entry cannot be related to itself", section));
				else if (!ids.has(related)) problems.push(errorAt("glossary.json", `related: "${related}" is not a glossary id`, section));
			}

			if (!entry.unrealDocsUrl.includes(PINNED_VERSION)) problems.push(errorAt("glossary.json", `unrealDocsUrl: pin the link with ?${PINNED_VERSION}`, section));
		}

		const owners = new Map<string, string>();
		const position = new Map(input.content.glossary.map((entry, index) => [entry.id, index]));

		// In glossary order, so the later entry is the one reported whichever order the alias builder returns.
		const aliases = buildGlossaryAliases(input.content.glossary).sort((first, second) => (position.get(first.entryId) ?? 0) - (position.get(second.entryId) ?? 0));

		for (const alias of aliases)
		{
			const key = alias.caseSensitive ? alias.text : alias.text.toLowerCase();
			const owner = owners.get(key);

			if (owner === undefined) owners.set(key, alias.entryId);
			else if (owner !== alias.entryId) problems.push(errorAt("glossary.json", `"${alias.text}" is a spelling of both "${owner}" and "${alias.entryId}"; the TermLinker cannot tell them apart`, `entry ${alias.entryId}`));
		}

		return problems;
	},
};
