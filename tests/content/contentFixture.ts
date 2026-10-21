// Test helpers: build throwaway content folders on disk from the real format examples.
import { mkdir, mkdtemp, readdir, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";

/** The repo's format examples, one per kind; the tests use them as known-good quest files. */
export const EXAMPLES_FOLDER = resolve("content/examples");

/** Reads every example file, keyed by file name. */
export async function readExamples(): Promise<Map<string, string>>
{
	const names = (await readdir(EXAMPLES_FOLDER)).filter((name) => name.endsWith(".md")).sort();
	const texts = await Promise.all(names.map((name) => readFile(join(EXAMPLES_FOLDER, name), "utf8")));

	return new Map(names.map((name, index) => [name, texts[index] ?? ""]));
}

/** Gives an example quest a new id and order, and drops its prerequisites, so many copies can live in one pack. */
export function retagQuest(text: string, id: string, order: number): string
{
	return text
		.replace(/^id: .+$/m, `id: ${id}`)
		.replace(/^order: .+$/m, `order: ${order}`)
		.replace(/^prerequisites: \[.*\]$/m, "prerequisites: []");
}

/** A temporary content folder; call `remove()` when the test is done. */
export interface ContentFixture
{
	root: string;
	write(path: string, text: string): Promise<void>;
	remove(): Promise<void>;
}

/** Creates an empty temporary content folder. */
export async function createContentFixture(): Promise<ContentFixture>
{
	const root = await mkdtemp(join(tmpdir(), "dojo-content-"));

	return {
		root,
		async write(path, text)
		{
			const full = join(root, path);
			await mkdir(dirname(full), { recursive: true });
			await writeFile(full, text, "utf8");
		},
		async remove()
		{
			await rm(root, { recursive: true, force: true });
		},
	};
}

/** Writes a pack manifest for `packId` with the given order. */
export async function writePack(fixture: ContentFixture, packId: string, order: number = 1): Promise<void>
{
	await fixture.write(`packs/${packId}/pack.json`, JSON.stringify({ id: packId, title: `Pack ${packId}`, summary: "A test pack.", order }));
}

/** Writes a world manifest at `packs/<packId>/worlds/<folder>`; the world id is the folder name after the number. */
export async function writeWorld(fixture: ContentFixture, packId: string, folder: string): Promise<void>
{
	const id = folder.replace(/^\d+-/, "");
	await fixture.write(`packs/${packId}/worlds/${folder}/world.json`, JSON.stringify({ id, title: `World ${id}`, summary: "A test world." }));
}

/**
 * Writes a pack with `questCount` quests spread over worlds of `questsPerWorld`, cycling through the format
 * examples so every kind is present. Used by the 300-quest timing check.
 */
export async function writeLargePack(fixture: ContentFixture, questCount: number, questsPerWorld: number = 25): Promise<void>
{
	const examples = [...(await readExamples()).values()];
	const writes: Promise<void>[] = [];

	await writePack(fixture, "large");

	for (let index = 0; index < questCount; index++)
	{
		const worldNumber = String(Math.floor(index / questsPerWorld) + 1).padStart(2, "0");
		const folder = `${worldNumber}-world-${worldNumber}`;
		const order = (index % questsPerWorld) + 1;

		if (order === 1) writes.push(writeWorld(fixture, "large", folder));

		const text = retagQuest(examples[index % examples.length] ?? "", `large-quest-${index + 1}`, order);
		writes.push(fixture.write(`packs/large/worlds/${folder}/${String(order).padStart(2, "0")}-quest-${index + 1}.md`, text));
	}

	await Promise.all(writes);
}
