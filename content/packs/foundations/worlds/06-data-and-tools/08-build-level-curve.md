---
id: f6-level-curve
title: Levels drawn as a curve
order: 8
kind: build
scaffold: stub
difficulty: 3
patterns: [component]
skills: [data, debugging]
terms: [curve-float, ensure-macro, actor-component, editanywhere]
prerequisites: [f6-check-and-ensure, f6-target-table]
xp: 80
estimatedMinutes: 20
concepts:
  - A curve answers how much XP a level needs, so designers redraw the pace without code
  - After AddXP, Level and XP match what the curve asks for the total XP gained
  - A missing curve is reported with ensure and survived
---

# Brief

When you add a Dojo F6 Level component to any actor, give it an XP curve that asks for 100 XP at level 1 rising to 500 at level 5, and run `ke * AddXP 350`, the level goes from 1 to 3 with 50 XP left over; without a curve, AddXP does nothing and the Output Log shows one ensure naming the component.

The declarations are given; every body is yours:

- `AddXP` adds XP and reads the XP each level needs from the curve. Afterwards `Level` and `XP` match the curve for all the XP gained so far, with the leftover kept toward the next level, and it returns how many levels were gained. At `MaxLevel` it stops: no more levels and no XP kept.
- `GetXPToNext` reads the curve at the current level; it is 0 at the top level or with no curve.
- With no curve, AddXP reports it with `ensureMsgf` (the message names the component and says it has no XP curve) and returns 0. How you write the condition is your choice. The test checks that the missing curve is survived; whether it is reported is a rubric line, because a plain ensure reports only once per editor session. A curve value of 0 or less is nonsense for a level, so that is reported with an ensure too, and AddXP stops there instead of hanging.
- `ResetProgress` goes back to level 1 with no XP.

Write it the obvious way first and run the tests. This one fails on purpose the first time for most people: read which assertion failed and why before you open the hints.

## See it in the editor

In the Content Browser, right-click, choose Miscellaneous, then Curve, and pick CurveFloat. Name it C_LevelXP, add a key at time 1 with value 100 and one at time 5 with value 500, then right-click each key and choose Linear interpolation so the levels in between read 200, 300, and 400. Add a Dojo F6 Level component to any actor, set its XP Curve, press Play, eject, select the actor, and run `ke * AddXP 350`: the Level component's Details panel shows Level as 3 and XP as 50. Clear the curve, play again, and run it once more: one ensure appears in the Output Log, and the game keeps running.

# Files

## DojoF6LevelComponent.h

```cpp
#pragma once

#include "CoreMinimal.h"
#include "Components/ActorComponent.h"
#include "DojoF6LevelComponent.generated.h"

class UCurveFloat;

/** Turns XP into levels using a designer-drawn curve of how much XP each level needs, so the pace is tuned without code. */
UCLASS(ClassGroup = (Dojo), meta = (BlueprintSpawnableComponent))
class UDojoF6LevelComponent : public UActorComponent
{
	GENERATED_BODY()

public:
	/** Turns ticking off; levels only change when XP is added. */
	UDojoF6LevelComponent();

	/** XP needed to leave each level: X is the current level, Y the XP. */
	UPROPERTY(EditAnywhere, BlueprintReadOnly, Category = "Level")
	TObjectPtr<UCurveFloat> XPCurve;

	/** The top level; XP stops counting there. */
	UPROPERTY(EditAnywhere, BlueprintReadOnly, Category = "Level", meta = (ClampMin = "1"))
	int32 MaxLevel = 5;

	/** Adds XP, levels up as many times as it pays for, and returns how many levels were gained. */
	UFUNCTION(BlueprintCallable, Category = "Level")
	int32 AddXP(float Amount);

	/** Back to level 1 with no XP. */
	UFUNCTION(BlueprintCallable, Category = "Level")
	void ResetProgress();

	/** The current level, starting at 1. */
	UFUNCTION(BlueprintPure, Category = "Level")
	int32 GetLevel() const;

	/** XP gathered toward the next level. */
	UFUNCTION(BlueprintPure, Category = "Level")
	float GetXP() const;

	/** XP needed to leave the current level, read from the curve; 0 at the top level or with no curve. */
	UFUNCTION(BlueprintPure, Category = "Level")
	float GetXPToNext() const;

private:
	/** The current level, shown read-only in Details so the editor step can check it. */
	UPROPERTY(VisibleAnywhere, Category = "Level")
	int32 Level = 1;

	/** XP gathered toward the next level, shown read-only in Details. */
	UPROPERTY(VisibleAnywhere, Category = "Level")
	float XP = 0.f;
};
```

## DojoF6LevelComponent.cpp

```cpp
#include "DojoF6LevelComponent.h"

#include "Curves/CurveFloat.h"

UDojoF6LevelComponent::UDojoF6LevelComponent()
{
	PrimaryComponentTick.bCanEverTick = false;
}

int32 UDojoF6LevelComponent::AddXP(float Amount)
{
	return 0;
}

void UDojoF6LevelComponent::ResetProgress()
{
}

int32 UDojoF6LevelComponent::GetLevel() const
{
	return 1;
}

float UDojoF6LevelComponent::GetXP() const
{
	return 0.f;
}

float UDojoF6LevelComponent::GetXPToNext() const
{
	return 0.f;
}
```

# Tests

```cpp
#include "Misc/AutomationTest.h"

#if WITH_AUTOMATION_TESTS

#include "Curves/CurveFloat.h"
#include "Quests/f6-level-curve/DojoF6LevelComponent.h"
#include "Support/DojoTestActor.h"
#include "Support/DojoTestWorld.h"

IMPLEMENT_SIMPLE_AUTOMATION_TEST(FDojo_F6_LevelCurve_LevelsFromTheCurve, "Dojo.F6.LevelCurve.LevelsFromTheCurve", EAutomationTestFlags::EditorContext | EAutomationTestFlags::ProductFilter)

/** Feeds XP to a level component with a 100 to 500 curve and checks levels, leftovers, the cap, and a redrawn curve. */
bool FDojo_F6_LevelCurve_LevelsFromTheCurve::RunTest(const FString& Parameters)
{
	FDojoTestWorld TestWorld;

	ADojoTestActor* Owner = TestWorld.SpawnActor<ADojoTestActor>();
	UDojoF6LevelComponent* Levels = TestWorld.AddComponent<UDojoF6LevelComponent>(Owner);
	if (!TestNotNull(TEXT("Level component added"), Levels)) return false;

	UCurveFloat* Curve = NewObject<UCurveFloat>();
	Curve->FloatCurve.AddKey(1.f, 100.f);
	Curve->FloatCurve.AddKey(5.f, 500.f);
	Levels->XPCurve = Curve;

	TestEqual(TEXT("Starts at level 1"), Levels->GetLevel(), 1);
	TestEqual(TEXT("Level 1 needs 100 from the curve"), Levels->GetXPToNext(), 100.f);

	TestEqual(TEXT("60 XP gains no level"), Levels->AddXP(60.f), 0);
	TestEqual(TEXT("The 60 is kept"), Levels->GetXP(), 60.f);

	TestEqual(TEXT("290 more gains two levels at once"), Levels->AddXP(290.f), 2);
	TestEqual(TEXT("Level 3 after 350 in all"), Levels->GetLevel(), 3);
	TestEqual(TEXT("50 left over after paying 100 and 200"), Levels->GetXP(), 50.f);
	TestEqual(TEXT("Level 3 needs 300 from the curve"), Levels->GetXPToNext(), 300.f);

	TestEqual(TEXT("A huge gain stops at the top level"), Levels->AddXP(10000.f), 2);
	TestEqual(TEXT("Level 5 is the top"), Levels->GetLevel(), 5);
	TestEqual(TEXT("No XP is kept at the top"), Levels->GetXP(), 0.f);
	TestEqual(TEXT("Nothing more is needed at the top"), Levels->GetXPToNext(), 0.f);
	TestEqual(TEXT("XP at the top gains nothing"), Levels->AddXP(5.f), 0);

	Levels->ResetProgress();
	TestEqual(TEXT("Reset returns to level 1"), Levels->GetLevel(), 1);
	TestEqual(TEXT("Reset clears the XP"), Levels->GetXP(), 0.f);

	Curve->FloatCurve.UpdateOrAddKey(1.f, 40.f);
	TestEqual(TEXT("A redrawn curve is read at once"), Levels->GetXPToNext(), 40.f);

	return true;
}

IMPLEMENT_SIMPLE_AUTOMATION_TEST(FDojo_F6_LevelCurve_MissingCurveIsReported, "Dojo.F6.LevelCurve.MissingCurveIsReported", EAutomationTestFlags::EditorContext | EAutomationTestFlags::ProductFilter)

/** Adds XP with no curve and checks the component survives it at level 1; the ensure that reports it may log once per session. */
bool FDojo_F6_LevelCurve_MissingCurveIsReported::RunTest(const FString& Parameters)
{
	// A plain ensure reports only the first time per editor session, so a rerun may log nothing. Every line of its report, whatever the condition and message say, comes through LogOutputDevice: all are allowed, none is required.
	AddExpectedError(TEXT("^LogOutputDevice:|Ensure condition failed"), EAutomationExpectedErrorFlags::Contains, -1);

	FDojoTestWorld TestWorld;

	ADojoTestActor* Owner = TestWorld.SpawnActor<ADojoTestActor>();
	UDojoF6LevelComponent* Levels = TestWorld.AddComponent<UDojoF6LevelComponent>(Owner);
	if (!TestNotNull(TEXT("Level component added"), Levels)) return false;

	TestEqual(TEXT("No curve, no levels"), Levels->AddXP(100.f), 0);
	TestEqual(TEXT("Still level 1"), Levels->GetLevel(), 1);
	TestEqual(TEXT("No curve, nothing needed"), Levels->GetXPToNext(), 0.f);

	return true;
}

#endif
```

# Hints

- The failing assertion is about one gain that pays for two levels: count how many times your level-up code can run per call.
- Level up in a loop that keeps going while the XP covers the next level and the top is not reached, and read the curve again on every pass, because each level needs a different amount.
- `UCurveFloat::GetFloatValue` is in `Curves/CurveFloat.h`; `ensureMsgf` is in `Misc/AssertionMacros.h` and returns the condition, so it fits inside an if.

# Rubric

- After AddXP, Level and XP match the curve for the total XP gained, and the leftover XP is kept toward the next level.
- The XP each level needs is read from the curve at the current level, never computed in code.
- AddXP stops at MaxLevel and keeps no XP there.
- A missing curve is reported with ensureMsgf naming the component, and AddXP returns 0 instead of crashing.
- A curve value of 0 or less is reported with an ensure, and AddXP stops instead of hanging.
- ResetProgress returns to level 1 with no XP.

# Alternative

AddXP repeats its check because one big gain can pay for several levels at once; a single `if` would level up once and silently drop the rest of the XP. That is the bug the first run was built to show.

The XP per level could be a formula, such as 100 times the level, written in code. That is fine until a designer wants level 4 to be a wall and level 5 a breather; then every change is a code change. A curve lets them drag points in the curve editor and see the shape. For a handful of exact numbers, a data table with one row per level is the other common choice, and Unreal's `UCurveTable` stores many named curves in one table asset when a game needs several, such as XP, health, and damage per level.

# Parsons

```yaml
- id: level-loop
  prompt: Put the level-up loop in order.
  lines:
    - "while (Level < MaxLevel)"
    - "{"
    - "	const float Needed = GetXPToNext();"
    - "	if (!ensureMsgf(Needed > 0.f, TEXT(\"%s: the XP curve asks for %f XP at level %d\"), *GetName(), Needed, Level)) break;"
    - "	if (XP < Needed) break;"
    - "	XP -= Needed;"
    - "	Level++;"
    - "	Gained++;"
    - "}"
  distractors:
    - line: "if (XP >= Needed)"
      mistake: An if levels up at most once per call, so one big reward loses the levels it paid for.
```
