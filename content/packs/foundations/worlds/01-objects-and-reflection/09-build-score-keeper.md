---
id: f1-score-keeper
title: A score keeper that tells dummies from targets
order: 9
kind: build
scaffold: stub
difficulty: 2
patterns: []
skills: [object-model, references]
terms: [cast, isa, isvalid, tarray, tobjectptr, editanywhere]
prerequisites: [f1-cast-and-isa, f1-training-dummy, f1-popup-target]
xp: 80
estimatedMinutes: 20
concepts:
  - A designer-filled list of AActor pointers can hold anything
  - Cast to use a specific class, IsA to only ask the question
---

# Brief

When you press Play, strike a dummy twice, and break one pop-up target, running `ke * ShowScore` makes the number above the keeper read 35.

The declarations are given; every body is yours. The keeper holds a list of plain `AActor` pointers that a designer fills in the level. It scores each kind differently:

- a training dummy is worth `PointsPerDummyHit` for every strike it has taken;
- a pop-up target is worth `PointsPerBrokenTarget` once it is broken, and nothing before;
- anything else in the list, and any empty slot, scores nothing.

`CountPopupTargets` returns how many entries are pop-up targets in any state. It never needs a target's functions, so it only needs to ask the question.

`ShowScore` writes the current score into the keeper's own label, the same kind of floating text the dummy uses; create that label in the constructor the way the dummy does.

Dependency direction: the keeper holds references to the targets; the dummies and targets know nothing about the keeper and never include its header. Your two earlier quests are reused here unchanged.

Compiles against earlier quests: f1-training-dummy (`Quests/f1-training-dummy/DojoF1TrainingDummy.h`) and f1-popup-target (`Quests/f1-popup-target/DojoF1PopupTarget.h`).

Write the obvious version first and run the tests. This one fails on purpose the first time for most people. Find out why from the test output before you read the hints.

## See it in the editor

Place one dummy, one pop-up target, a plain cube, and one `DojoF1ScoreKeeper`. In the keeper's Details panel add the three to Targets with the eyedropper, plus one empty slot. Press Play, run `ke * Strike` twice, run `ke * Raise` and `ke * Hit` twice each until the target reads Broken, then run `ke * ShowScore`: the keeper's label reads 35 (two strikes at 5 and one broken target at 25). Eject with F8, change Points Per Dummy Hit to 10 on the keeper, and run it again: 45. Keep one of each kind: `ke *` calls the function on every actor that has it, so a second dummy would take every strike too.

# Files

## DojoF1ScoreKeeper.h

```cpp
#pragma once

#include "CoreMinimal.h"
#include "GameFramework/Actor.h"
#include "DojoF1ScoreKeeper.generated.h"

class UTextRenderComponent;

/** Totals the yard's score from the targets a designer wired to it; the targets know nothing about the keeper. */
UCLASS()
class ADojoF1ScoreKeeper : public AActor
{
	GENERATED_BODY()

public:
	/** Creates the label and turns ticking off. */
	ADojoF1ScoreKeeper();

	/** Floating text that shows the score after ShowScore. */
	UPROPERTY(VisibleAnywhere, Category = "Score")
	TObjectPtr<UTextRenderComponent> Label;

	/** Anything a designer picks in the level; only dummies and pop-up targets score. */
	UPROPERTY(EditAnywhere, Category = "Score")
	TArray<TObjectPtr<AActor>> Targets;

	/** Points for every strike a dummy has taken. */
	UPROPERTY(EditAnywhere, Category = "Score", meta = (ClampMin = "0"))
	int32 PointsPerDummyHit = 5;

	/** Points for every pop-up target that is broken. */
	UPROPERTY(EditAnywhere, Category = "Score", meta = (ClampMin = "0"))
	int32 PointsPerBrokenTarget = 25;

	/** Adds up dummy strikes and broken targets; skips empty slots and every other kind of actor. */
	UFUNCTION(BlueprintPure, Category = "Score")
	int32 CountScore() const;

	/** How many entries are pop-up targets, in any state. */
	UFUNCTION(BlueprintPure, Category = "Score")
	int32 CountPopupTargets() const;

	/** Writes the current score into the label. */
	UFUNCTION(BlueprintCallable, CallInEditor, Category = "Score")
	void ShowScore();
};
```

## DojoF1ScoreKeeper.cpp

```cpp
#include "DojoF1ScoreKeeper.h"

#include "Components/TextRenderComponent.h"
#include "Quests/f1-popup-target/DojoF1PopupTarget.h"
#include "Quests/f1-training-dummy/DojoF1TrainingDummy.h"

ADojoF1ScoreKeeper::ADojoF1ScoreKeeper()
{
}

int32 ADojoF1ScoreKeeper::CountScore() const
{
	return 0;
}

int32 ADojoF1ScoreKeeper::CountPopupTargets() const
{
	return 0;
}

void ADojoF1ScoreKeeper::ShowScore()
{
}
```

# Tests

```cpp
#include "Misc/AutomationTest.h"

#if WITH_AUTOMATION_TESTS

#include "Components/TextRenderComponent.h"
#include "Quests/f1-popup-target/DojoF1PopupTarget.h"
#include "Quests/f1-score-keeper/DojoF1ScoreKeeper.h"
#include "Quests/f1-training-dummy/DojoF1TrainingDummy.h"
#include "Support/DojoTestActor.h"
#include "Support/DojoTestWorld.h"

IMPLEMENT_SIMPLE_AUTOMATION_TEST(FDojo_F1_ScoreKeeper_ScoresMixedTargets, "Dojo.F1.ScoreKeeper.ScoresMixedTargets", EAutomationTestFlags::EditorContext | EAutomationTestFlags::ProductFilter)

/** Wires a dummy, two pop-up targets, a plain actor, and an empty slot to a keeper and checks the score and the target count. */
bool FDojo_F1_ScoreKeeper_ScoresMixedTargets::RunTest(const FString& Parameters)
{
	FDojoTestWorld TestWorld;

	ADojoF1ScoreKeeper* Keeper = TestWorld.SpawnActor<ADojoF1ScoreKeeper>();
	ADojoF1TrainingDummy* Dummy = TestWorld.SpawnActor<ADojoF1TrainingDummy>();
	ADojoF1PopupTarget* BrokenTarget = TestWorld.SpawnActor<ADojoF1PopupTarget>();
	ADojoF1PopupTarget* WholeTarget = TestWorld.SpawnActor<ADojoF1PopupTarget>();
	ADojoTestActor* Bystander = TestWorld.SpawnActor<ADojoTestActor>();
	if (!TestNotNull(TEXT("Keeper spawned"), Keeper) || !TestNotNull(TEXT("Dummy spawned"), Dummy)) return false;
	if (!TestNotNull(TEXT("Targets spawned"), BrokenTarget) || !TestNotNull(TEXT("Targets spawned"), WholeTarget) || !TestNotNull(TEXT("Bystander spawned"), Bystander)) return false;

	Keeper->Targets = { Dummy, Bystander, nullptr, BrokenTarget, WholeTarget };

	TestEqual(TEXT("Nothing scored yet"), Keeper->CountScore(), 0);
	TestEqual(TEXT("Two of the entries are pop-up targets"), Keeper->CountPopupTargets(), 2);

	Dummy->Strike();
	Dummy->Strike();
	for (int32 Hit = 0; Hit < BrokenTarget->HitsToBreak; ++Hit)
	{
		BrokenTarget->Raise();
		BrokenTarget->Hit();
	}
	WholeTarget->Raise();

	TestEqual(TEXT("Two dummy strikes at 5 plus one broken target at 25"), Keeper->CountScore(), 35);

	Keeper->ShowScore();
	if (!TestNotNull(TEXT("Keeper has a label"), Keeper->Label.Get())) return false;
	TestEqual(TEXT("The label shows the score"), Keeper->Label->Text.ToString(), FString(TEXT("35")));

	Keeper->PointsPerDummyHit = 10;
	TestEqual(TEXT("The score follows the editable points"), Keeper->CountScore(), 45);

	return true;
}

#endif
```

# Hints

- Look at what the test puts in the Targets list: not every entry is a dummy or a target, and one is not anything at all.
- One kind of conversion returns null when the object is the wrong class, and an if statement can declare and test its result in one go; the yes-or-no question has its own member function on every UObject.
- Both live in `Templates/Casts.h` and `UObject/UObjectBaseUtility.h`; `IsValid` comes from `UObject/Object.h`.

# Rubric

- Each entry is converted with Cast and the result is checked before any function is called on it.
- Empty slots and actors of other classes are skipped without a crash.
- CountPopupTargets uses IsA (after a validity check) because it never needs the target's functions.
- Points come from the editable properties, never from numbers typed in the loop.
- The keeper holds the references; dummies and targets do not know the keeper exists.
- No Tick is used: the score is counted when asked, and the label is created once in the constructor.

# Alternative

The keeper could keep two typed lists, `TArray<TObjectPtr<ADojoF1TrainingDummy>>` and one for pop-up targets, so no Cast is needed and the eyedropper only accepts the right class. That is safer for designers, but every new scoring class adds another list and another loop. One generic list with Cast keeps the editor wiring in one place; when the list of kinds grows past two or three, the better step is a shared interface the keeper calls on anything, which Pack 1 World 5 builds.

# Parsons

```yaml
- id: keeper-count-popups
  prompt: Put CountPopupTargets in order.
  lines:
    - "int32 ADojoF1ScoreKeeper::CountPopupTargets() const"
    - "{"
    - "	int32 Count = 0;"
    - "	for (AActor* Target : Targets)"
    - "	{"
    - "		if (IsValid(Target) && Target->IsA<ADojoF1PopupTarget>()) Count++;"
    - "	}"
    - "	return Count;"
    - "}"
  distractors:
    - line: "		if (static_cast<ADojoF1PopupTarget*>(Target)) Count++;"
      mistake: static_cast never checks the class, so it counts every non-null actor as a target.
```
