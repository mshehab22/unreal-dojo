// /dev/tokens: every design token and base component on one page, for building and reviewing screens.
import { NEUTRAL_COLORS, OUTCOME_COLORS, PACK_IDS, TIER_COLORS, FONT_FAMILIES, RADII, SHADOWS, SPACING, SPACING_STEPS, TYPE_SCALE } from "@/styles/tokenCatalog";

import { ColorSwatch } from "./ColorSwatch";
import { ComponentShowcase } from "./ComponentShowcase";
import { GallerySection } from "./GallerySection";
import { MotionSample } from "./MotionSample";
import { PackAccentCard } from "./PackAccentCard";
import { TokenRow } from "./TokenRow";

/** The sentence every type sample sets, so sizes compare on the same words. */
const TYPE_SAMPLE = "Spawn the actor, bind the delegate";

/** The token gallery. Reached at #/dev/tokens; not in the rail. */
export function TokenGalleryScreen()
{
	return (
		<section data-testid="screen-devTokens" className="mx-auto flex w-full max-w-5xl flex-col gap-10">
			<header className="flex flex-col gap-4">
				<div className="flex items-center gap-3 font-mono text-xs tracking-widest text-paper-faint uppercase">
					<span className="text-pack">Dev</span>
					<span className="h-px w-8 bg-line-strong" />
					<span>src/renderer/src/styles/tokens.css</span>
				</div>
				<h1 className="text-5xl font-bold tracking-tight">Design tokens</h1>
				<p className="max-w-2xl text-lg text-paper-muted">
					Every color, size, and timing the app uses, read live from the stylesheet. Screens use these tokens and nothing else.
				</p>
			</header>

			<GallerySection title="Pack accents" note="Wrap any part of the UI in data-pack to switch its accent.">
				<div className="grid grid-cols-4 gap-3">
					{PACK_IDS.map((pack) => (
						<PackAccentCard key={pack} pack={pack} />
					))}
				</div>
			</GallerySection>

			<GallerySection title="Surfaces and text" note="Sumi ink with warm paper text. On every surface, muted text is at least 6.9:1 and faint text at least 4.8:1.">
				<div className="grid grid-cols-3 gap-3">
					{NEUTRAL_COLORS.map((token) => (
						<ColorSwatch key={token.name} token={token} />
					))}
				</div>
			</GallerySection>

			<GallerySection title="Outcomes" note="Test results only. Never used as a pack accent.">
				<div className="grid grid-cols-3 gap-3">
					{OUTCOME_COLORS.map((token) => (
						<ColorSwatch key={token.name} token={token} />
					))}
				</div>
			</GallerySection>

			<GallerySection title="Pattern card tiers" note="Frames for bronze, silver, and gold cards on the Character screen.">
				<div className="grid grid-cols-3 gap-3">
					{TIER_COLORS.map((token) => (
						<ColorSwatch key={token.name} token={token} />
					))}
				</div>
			</GallerySection>

			<GallerySection title="Type families" note="Bundled with the app; nothing loads from the network.">
				<div className="rounded-lg border border-line bg-surface px-4">
					{FONT_FAMILIES.map((token) => (
						<TokenRow key={token.name} token={token}>
							<span className="text-2xl" style={{ fontFamily: `var(${token.name})` }}>
								{token.name === "--font-mono" ? "UCLASS() class AMyActor : public AActor" : "Plan it, build it, ship it"}
							</span>
						</TokenRow>
					))}
				</div>
			</GallerySection>

			<GallerySection title="Type scale" note="Display font from xl up, reading font below.">
				<div className="rounded-lg border border-line bg-surface px-4">
					{TYPE_SCALE.map((token, position) => (
						<TokenRow key={token.name} token={token}>
							<span
								className={position >= 5 ? "block truncate font-display font-semibold tracking-tight" : "block truncate"}
								style={{ fontSize: `var(${token.name})`, lineHeight: `var(${token.name}--line-height)` }}
							>
								{TYPE_SAMPLE}
							</span>
						</TokenRow>
					))}
				</div>
			</GallerySection>

			<GallerySection title="Spacing" note="One step is 4px. Layout sizes are named.">
				<div className="flex flex-col gap-4 rounded-lg border border-line bg-surface p-4">
					<div className="flex flex-col gap-2">
						{SPACING_STEPS.map((step) => (
							<div key={step} className="flex items-center gap-4">
								<code className="w-16 font-mono text-xs text-paper-muted">{step * 4}px</code>
								<div className="h-3 rounded-xs bg-pack" style={{ width: `calc(var(--spacing) * ${step})` }} />
								<code className="font-mono text-2xs text-paper-faint">p-{step}</code>
							</div>
						))}
					</div>
					<div>
						{SPACING.map((token) => (
							<TokenRow key={token.name} token={token}>
								<div className="h-3 rounded-xs bg-line-strong" style={{ width: `var(${token.name})` }} />
							</TokenRow>
						))}
					</div>
				</div>
			</GallerySection>

			<GallerySection title="Radii and shadows">
				<div className="grid grid-cols-6 gap-3">
					{RADII.map((token) => (
						<div key={token.name} className="flex flex-col gap-2">
							<div className="h-20 border border-line-strong bg-raised" style={{ borderRadius: `var(${token.name})` }} />
							<code className="font-mono text-2xs text-paper">{token.name}</code>
							<span className="text-2xs text-paper-muted">{token.purpose}</span>
						</div>
					))}
				</div>
				<div className="grid grid-cols-3 gap-6 pt-2">
					{SHADOWS.map((token) => (
						<div key={token.name} className="flex flex-col gap-3">
							<div className="h-20 rounded-lg bg-raised" style={{ boxShadow: `var(${token.name})` }} />
							<div className="flex flex-col">
								<code className="font-mono text-xs text-paper">{token.name}</code>
								<span className="text-xs text-paper-muted">{token.purpose}</span>
							</div>
						</div>
					))}
				</div>
			</GallerySection>

			<GallerySection title="Motion" note="Feedback is 150ms or less; longer motion is for reward moments. All of it drops to zero under reduced motion.">
				<MotionSample />
			</GallerySection>

			<GallerySection title="Components" note="shadcn/ui base components the frame uses, restyled with the tokens.">
				<ComponentShowcase />
			</GallerySection>
		</section>
	);
}
