---
id: f3-announcer
title: An announcer whose sentences designers can rewrite
order: 6
kind: build
scaffold: stub
difficulty: 3
patterns: []
skills: [strings]
terms: [ftext, fname, fstring, text-macro, ue-log]
prerequisites: [f3-roster]
xp: 80
estimatedMinutes: 20
concepts:
  - FText::Format with named arguments keeps sentences translatable and reorderable
  - Numbers in FText are formatted for the reader's culture
---

# Brief

When you press Play and run `ke * AnnounceTurn Ana 40 60`, the label reads Ana scored 40 (best 60); after a designer changes Turn Format in the Details panel to `{Player}: {Score}`, the same command reads Ana: 40.

The declarations are given; every body is yours. Defaults, set in the constructor with `LOCTEXT` under the namespace `DojoF3Announcer`:

- Turn Format: `{Player} scored {Score} (best {Best})`
- Leader Format: `{Player} leads with {Score}`
- No Scores Text: `No scores yet`

`AnnounceTurn` and `AnnounceLeader` fill the format with named arguments, put the result on the label, write it to the `LogDojo` log, and return it. `AnnounceLeader` with `NAME_None` shows No Scores Text. Numbers must reach the format as text made for the reader, so 1200 shows as 1,200 in English.

Dependency direction: the announcer only turns values into text. It does not know where the names and scores come from; the roster and the score board from earlier in this world know nothing about it.

## See it in the editor

Place a `DojoF3Announcer`, press Play, and run `ke * AnnounceTurn Ana 40 60`. Then run `ke * AnnounceLeader Bo 1200`: the label reads Bo leads with 1,200. Eject with F8, change Turn Format to `Best {Best}, this turn {Score}: {Player}`, and run the first command again: the words move and every value still lands in its place.

# Files

## DojoF3Announcer.h

```cpp
#pragma once

#include "CoreMinimal.h"
#include "GameFramework/Actor.h"
#include "DojoF3Announcer.generated.h"

class UTextRenderComponent;

/** Turns turn results and the leader into display text from formats designers can rewrite and translators can localize. */
UCLASS()
class ADojoF3Announcer : public AActor
{
	GENERATED_BODY()

public:
	/** Creates the label, the default formats, and turns ticking off. */
	ADojoF3Announcer();

	/** Floating text that shows the latest announcement. */
	UPROPERTY(VisibleAnywhere, Category = "Announcer")
	TObjectPtr<UTextRenderComponent> Label;

	/** Format for a turn result; may use {Player}, {Score}, and {Best}. */
	UPROPERTY(EditAnywhere, Category = "Announcer")
	FText TurnFormat;

	/** Format for the leader; may use {Player} and {Score}. */
	UPROPERTY(EditAnywhere, Category = "Announcer")
	FText LeaderFormat;

	/** Shown by AnnounceLeader when nobody has scored. */
	UPROPERTY(EditAnywhere, Category = "Announcer")
	FText NoScoresText;

	/** Formats a turn result, shows it on the label, logs it, and returns it. */
	UFUNCTION(BlueprintCallable, Category = "Announcer")
	FText AnnounceTurn(FName Player, int32 Score, int32 Best);

	/** Formats the leader (or NoScoresText for NAME_None), shows it on the label, logs it, and returns it. */
	UFUNCTION(BlueprintCallable, Category = "Announcer")
	FText AnnounceLeader(FName Player, int32 Score);

private:
	/** Puts the text on the label and writes it to the log. */
	void Show(const FText& Text);
};
```

## DojoF3Announcer.cpp

```cpp
#include "DojoF3Announcer.h"

#include "Components/TextRenderComponent.h"
#include "Dojo.h"

ADojoF3Announcer::ADojoF3Announcer()
{
}

FText ADojoF3Announcer::AnnounceTurn(FName Player, int32 Score, int32 Best)
{
	return FText::GetEmpty();
}

FText ADojoF3Announcer::AnnounceLeader(FName Player, int32 Score)
{
	return FText::GetEmpty();
}

void ADojoF3Announcer::Show(const FText& Text)
{
}
```

# Tests

```cpp
#include "Misc/AutomationTest.h"

#if WITH_AUTOMATION_TESTS

#include "Components/TextRenderComponent.h"
#include "Internationalization/Internationalization.h"
#include "Quests/f3-announcer/DojoF3Announcer.h"
#include "Support/DojoTestWorld.h"

IMPLEMENT_SIMPLE_AUTOMATION_TEST(FDojo_F3_Announcer_FormatsTurnsAndLeader, "Dojo.F3.Announcer.FormatsTurnsAndLeader", EAutomationTestFlags::EditorContext | EAutomationTestFlags::ProductFilter)

/** Announces a turn and a leader with the default formats and checks the label, the returned text, and number grouping. */
bool FDojo_F3_Announcer_FormatsTurnsAndLeader::RunTest(const FString& Parameters)
{
	FDojoTestWorld TestWorld;

	ADojoF3Announcer* Announcer = TestWorld.SpawnActor<ADojoF3Announcer>();
	if (!TestNotNull(TEXT("Announcer spawned"), Announcer)) return false;
	if (!TestNotNull(TEXT("Announcer has a label"), Announcer->Label.Get())) return false;

	// Number grouping follows the current culture; pin English so the expected text is the same on every machine.
	FInternationalization::FCultureStateSnapshot Snapshot;
	FInternationalization::Get().BackupCultureState(Snapshot);
	FInternationalization::Get().SetCurrentCulture(TEXT("en"));

	const FText Turn = Announcer->AnnounceTurn(TEXT("Ana"), 40, 60);
	TestEqual(TEXT("The turn text"), Turn.ToString(), FString(TEXT("Ana scored 40 (best 60)")));
	TestEqual(TEXT("The label shows it"), Announcer->Label->Text.ToString(), FString(TEXT("Ana scored 40 (best 60)")));

	const FText Leader = Announcer->AnnounceLeader(TEXT("Bo"), 1200);
	TestEqual(TEXT("Large numbers are grouped for the reader"), Leader.ToString(), FString(TEXT("Bo leads with 1,200")));

	TestEqual(TEXT("Nobody to announce"), Announcer->AnnounceLeader(NAME_None, 0).ToString(), FString(TEXT("No scores yet")));

	FInternationalization::Get().RestoreCultureState(Snapshot);
	return true;
}

IMPLEMENT_SIMPLE_AUTOMATION_TEST(FDojo_F3_Announcer_DesignersRewordFormats, "Dojo.F3.Announcer.DesignersRewordFormats", EAutomationTestFlags::EditorContext | EAutomationTestFlags::ProductFilter)

/** Changes the formats the way a designer would in Details and checks the announcements follow, with arguments in a new order. */
bool FDojo_F3_Announcer_DesignersRewordFormats::RunTest(const FString& Parameters)
{
	FDojoTestWorld TestWorld;

	ADojoF3Announcer* Announcer = TestWorld.SpawnActor<ADojoF3Announcer>();
	if (!TestNotNull(TEXT("Announcer spawned"), Announcer)) return false;

	Announcer->TurnFormat = FText::FromString(TEXT("Best {Best}, this turn {Score}: {Player}"));
	TestEqual(TEXT("A reordered format still fills every argument"), Announcer->AnnounceTurn(TEXT("Cy"), 7, 9).ToString(), FString(TEXT("Best 9, this turn 7: Cy")));

	Announcer->LeaderFormat = FText::FromString(TEXT("Top: {Player}"));
	TestEqual(TEXT("A format may leave an argument out"), Announcer->AnnounceLeader(TEXT("Cy"), 9).ToString(), FString(TEXT("Top: Cy")));

	return true;
}

#endif
```

# Hints

- The tests change the formats after the actor exists, so the sentence must come from the properties every time, never be built with Printf; start from the one sentence that works with the default format, then make it read the property.
- Named arguments go into a small map of argument names to values, which the format function takes with the format; numbers become text through a function that formats them for the current culture.
- `FFormatNamedArguments`, `FText::Format`, and `FText::AsNumber` are in `Internationalization/Text.h`; `LOCTEXT` needs `#define LOCTEXT_NAMESPACE` before it and `#undef` at the end of the file.

# Rubric

- The three defaults are set in the constructor with LOCTEXT under one namespace, defined and undefined in the source file.
- Both announcements use FText::Format with named arguments, so a reordered or shortened format still works.
- Numbers are passed as culture-formatted text, so 1200 reads 1,200 in English.
- AnnounceLeader with NAME_None shows NoScoresText.
- Every announcement goes through one Show function that sets the label and logs to LogDojo.
- The announcer only turns values into text and knows nothing about the roster or the board.

# Alternative

`FString::Printf` with `%s scored %d` is shorter and reads fine in English. It fixes the word order in code, so a language that puts the score first needs a code change, and it prints 1200 the same way everywhere. Many games start with Printf on debug labels, as this world's score board does, and move player-facing sentences to FText formats as soon as anyone mentions translation; doing it from the start costs a few lines.

# Parsons

```yaml
- id: announcer-turn
  prompt: Put AnnounceTurn in order.
  lines:
    - "FText ADojoF3Announcer::AnnounceTurn(FName Player, int32 Score, int32 Best)"
    - "{"
    - "	FFormatNamedArguments Arguments;"
    - "	Arguments.Add(TEXT(\"Player\"), FText::FromName(Player));"
    - "	Arguments.Add(TEXT(\"Score\"), FText::AsNumber(Score));"
    - "	Arguments.Add(TEXT(\"Best\"), FText::AsNumber(Best));"
    - "	const FText Text = FText::Format(TurnFormat, Arguments);"
    - "	Show(Text);"
    - "	return Text;"
    - "}"
  distractors:
    - line: "	const FText Text = FText::FromString(FString::Printf(TEXT(\"%s scored %d (best %d)\"), *Player.ToString(), Score, Best));"
      mistake: Printf fixes the sentence in code, so the designer's format is ignored and numbers lose their grouping.
```
