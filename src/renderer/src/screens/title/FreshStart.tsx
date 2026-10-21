// The Title screen's start block for a learner who never ran setup: their name, then on to First-run.
import { ArrowRightIcon } from "lucide-react";
import { useState, type FormEvent } from "react";

import { AppErrorView } from "@/components/AppErrorView";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { QUERY_KEYS } from "@/data/queryKeys";
import { useDojoAction } from "@/data/useDojoAction";

/** Props for FreshStart. */
interface FreshStartProps
{
	readonly initialName: string;
	readonly onReady: () => void;
}

/** Asks for the learner's name, saves it, and moves to First-run setup. */
export function FreshStart({ initialName, onReady }: FreshStartProps)
{
	const [name, setName] = useState(initialName);
	const saveName = useDojoAction((client, playerName: string) => client.setPlayerName(playerName), [QUERY_KEYS.progress]);

	/** Saves the name and continues. */
	const submit = async (event: FormEvent): Promise<void> =>
	{
		event.preventDefault();

		if (await saveName.run(name.trim())) onReady();
	};

	return (
		<form onSubmit={submit} data-testid="fresh-start" className="flex max-w-xl flex-col gap-3">
			<label htmlFor="player-name" className="font-mono text-2xs tracking-widest text-paper-faint uppercase">
				What should your studio call you?
			</label>
			<div className="flex gap-3">
				<Input id="player-name" value={name} onChange={(event) => setName(event.target.value)} placeholder="Your name" autoComplete="off" maxLength={40} className="h-12 text-base" />
				<Button type="submit" variant="pack" size="lg" disabled={name.trim().length === 0 || saveName.isPending}>
					Set up your studio
					<ArrowRightIcon />
				</Button>
			</div>
			<p className="text-sm text-paper-faint">Setup finds your Unreal install, makes a practice project, and builds it once. About ten minutes, mostly the engine compiling.</p>
			{saveName.error && <AppErrorView error={saveName.error} compact />}
		</form>
	);
}
