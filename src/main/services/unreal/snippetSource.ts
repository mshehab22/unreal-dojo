// What both snippet checks compile: the prelude that blanks the reflection macros, and the snippet with UHT-only lines blanked (A403).

/** Blanks the reflection macros, whose real expansion needs code UHT generates; UPROPERTY and UFUNCTION are already empty outside UHT. */
export const SNIPPET_PRELUDE = [
	"// Unreal Dojo snippet check: reflection macros expand to nothing because UHT does not run on a snippet.",
	"#undef UCLASS",
	"#undef UINTERFACE",
	"#undef GENERATED_BODY",
	"#undef GENERATED_BODY_LEGACY",
	"#undef GENERATED_UCLASS_BODY",
	"#undef GENERATED_USTRUCT_BODY",
	"#undef GENERATED_UINTERFACE_BODY",
	"#undef GENERATED_IINTERFACE_BODY",
	"#define UCLASS(...)",
	"#define UINTERFACE(...)",
	"#define GENERATED_BODY(...)",
	"#define GENERATED_BODY_LEGACY(...)",
	"#define GENERATED_UCLASS_BODY(...)",
	"#define GENERATED_USTRUCT_BODY(...)",
	"#define GENERATED_UINTERFACE_BODY(...)",
	"#define GENERATED_IINTERFACE_BODY(...)",
	"",
].join("\n");

/** An `#include "X.generated.h"` line, blanked so line numbers stay the same. */
const GENERATED_INCLUDE = /^\s*#\s*include\s+"[^"]*\.generated\.h"\s*$/gm;

/** `Super::` calls. Without GENERATED_BODY, `Super` would fall through to the base class's own `Super` (`UObject` for an actor) and report a false error, so it is blanked with as many spaces, keeping columns; a typo in the called name is still caught. */
const SUPER_CALL = /\bSuper::/g;

/** The snippet as compiled: generated.h includes and `Super::` blanked, every line and column where the learner wrote it. */
export function prepareSnippet(code: string): string
{
	return code.replace(GENERATED_INCLUDE, "").replace(SUPER_CALL, (match) => " ".repeat(match.length));
}
