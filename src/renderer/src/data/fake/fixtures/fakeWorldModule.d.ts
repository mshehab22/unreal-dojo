// The type of `virtual:dojo-fake-world`, which tools/fake/fakeWorldPlugin.ts builds from content/ at build and test time (A365).
declare module "virtual:dojo-fake-world"
{
	import type { LearnerWorld } from "@shared/types/catalog";

	/** The real Pack 1 World 1 as the renderer receives it, plus the hint texts only `revealHint` hands out and the reference files only `viewSolution` hands out (A1390). */
	const fixture: { packId: string; world: LearnerWorld; hints: Record<string, string[]>; solutions: Record<string, Record<string, string>> };

	export default fixture;
}
