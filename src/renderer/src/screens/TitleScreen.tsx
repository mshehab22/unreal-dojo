// Title screen: the wordmark, version, a continue button, and the environment chips (unchecked until first-run lands).
import { ArrowRightIcon } from "lucide-react";
import { useEffect, useState } from "react";

import { useNavigate } from "@/app/router/useRoute";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { PACK_ACCENTS, PACK_IDS } from "@/styles/tokenCatalog";

/** The environment checks the title screen will report once the engine and review services exist. */
const ENVIRONMENT_CHIPS: readonly string[] = ["Engine", "Sandbox", "Review", "Loop mode"];

/** The first screen the learner sees. */
export function TitleScreen()
{
	const navigate = useNavigate();
	const [version, setVersion] = useState("");

	useEffect(() =>
	{
		void window.dojo.getAppVersion().then(setVersion);
	}, []);

	return (
		<section data-testid="screen-title" className="mx-auto flex h-full w-full max-w-5xl flex-col justify-center gap-12 pb-8">
			<div className="flex flex-col gap-6">
				<div className="flex items-center gap-3 font-mono text-xs tracking-widest text-paper-faint uppercase">
					<span className="text-pack">Unreal Engine 5</span>
					<span className="h-px w-8 bg-line-strong" />
					<span>C++ by practice</span>
				</div>
				<h1 className="text-[5.5rem] leading-[0.92] font-extrabold tracking-[-0.035em]">Unreal Dojo</h1>
				<p className="max-w-xl text-xl text-paper-muted">
					Learn Unreal Engine C++ by practicing. Plan the mechanic, write the code, ship it to your studio.
				</p>
			</div>

			<div className="flex items-center gap-4">
				<Button variant="pack" size="lg" onClick={() => navigate("studio")}>
					Continue
					<ArrowRightIcon />
				</Button>
				<p data-testid="app-version" className="font-mono text-xs text-paper-faint">
					{version ? `v${version}` : ""}
				</p>
			</div>

			<div className="flex flex-col gap-3">
				<div className="font-mono text-2xs tracking-widest text-paper-faint uppercase">Environment</div>
				<div className="flex flex-wrap gap-2">
					{ENVIRONMENT_CHIPS.map((chip) => (
						<Badge key={chip}>
							{chip}
							<span className="text-paper-faint">not checked</span>
						</Badge>
					))}
				</div>
			</div>

			<div className="grid grid-cols-4 gap-2">
				{PACK_IDS.map((pack) => (
					<div key={pack} data-pack={pack} className="flex flex-col gap-2">
						<div className="h-1 rounded-pill bg-pack" />
						<div className="font-mono text-2xs tracking-widest text-pack uppercase">{PACK_ACCENTS[pack].label}</div>
					</div>
				))}
			</div>
		</section>
	);
}
