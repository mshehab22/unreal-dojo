---
id: example-build-stub-lantern-switch
title: A switch that lights every lantern it owns
order: 4
kind: build
scaffold: stub
difficulty: 2
patterns: []
skills: [actors, references]
terms: [tarray, tobjectptr, editanywhere]
prerequisites: [example-build-faded-flicker]
xp: 80
estimatedMinutes: 20
concepts:
  - An actor can hold editor-set references to other actors
  - Toggling a group through one owner
---

# Brief

When you press Play, every lantern wired to the switch goes dark, and calling `Toggle` on the switch lights them all again at once.

The declarations are given; every function body is yours. The switch holds the references: it knows its lanterns, and the lanterns know nothing about the switch. Skip any entry in the array that is empty, because a designer can leave a slot unassigned.

## See it in the editor

Place three lanterns and one switch. In the switch's Details panel add the three lanterns to `Lanterns` with the eyedropper. Press Play: all three are dark. In the console, run `ke * Toggle` and all three light up together.

# Files

## DojoExLanternSwitch.h

```cpp
#pragma once

#include "CoreMinimal.h"
#include "GameFramework/Actor.h"
#include "DojoExLanternSwitch.generated.h"

class ADojoExLantern;

/** A switch that holds references to lanterns and lights or darkens them all at once. */
UCLASS()
class ADojoExLanternSwitch : public AActor
{
	GENERATED_BODY()

public:
	/** Turns ticking off; the switch only reacts to Toggle. */
	ADojoExLanternSwitch();

	UPROPERTY(EditAnywhere, Category = "Switch")
	TArray<TObjectPtr<ADojoExLantern>> Lanterns;

	/** Flips the switch and applies the new state to every lantern. */
	UFUNCTION(BlueprintCallable, CallInEditor, Category = "Switch")
	void Toggle();

	/** Whether the switch is currently on. */
	bool IsOn() const;

protected:
	/** Applies the starting state to every wired lantern. */
	virtual void BeginPlay() override;

private:
	/** Sets every wired lantern's light to match the switch. */
	void ApplyToAll();

	bool bIsOn = false;
};
```

## DojoExLanternSwitch.cpp

```cpp
#include "DojoExLanternSwitch.h"

#include "Components/PointLightComponent.h"
#include "Quests/example-build-worked-lantern/DojoExLantern.h"

/** Turns ticking off; the switch only reacts to Toggle. */
ADojoExLanternSwitch::ADojoExLanternSwitch()
{
}

/** Applies the starting state to every wired lantern. */
void ADojoExLanternSwitch::BeginPlay()
{
}

/** Flips the switch and applies the new state to every lantern. */
void ADojoExLanternSwitch::Toggle()
{
}

/** Whether the switch is currently on. */
bool ADojoExLanternSwitch::IsOn() const
{
	return false;
}

/** Sets every wired lantern's light to match the switch, skipping empty slots. */
void ADojoExLanternSwitch::ApplyToAll()
{
}
```

# Tests

```cpp
#include "Misc/AutomationTest.h"

#if WITH_AUTOMATION_TESTS

#include "Components/PointLightComponent.h"
#include "Quests/example-build-worked-lantern/DojoExLantern.h"
#include "Quests/example-build-stub-lantern-switch/DojoExLanternSwitch.h"
#include "Support/DojoTestWorld.h"

IMPLEMENT_SIMPLE_AUTOMATION_TEST(FDojo_Examples_Switch_TogglesAll, "Dojo.Examples.Switch.TogglesAll", EAutomationTestFlags::EditorContext | EAutomationTestFlags::ProductFilter)

/** Wires two lanterns and one empty slot to a switch, toggles twice, and checks every lantern follows. */
bool FDojo_Examples_Switch_TogglesAll::RunTest(const FString& Parameters)
{
	FDojoTestWorld TestWorld;

	ADojoExLanternSwitch* Switch = TestWorld.SpawnActor<ADojoExLanternSwitch>();
	ADojoExLantern* First = TestWorld.SpawnActor<ADojoExLantern>();
	ADojoExLantern* Second = TestWorld.SpawnActor<ADojoExLantern>();
	if (!TestNotNull(TEXT("Switch spawned"), Switch) || !TestNotNull(TEXT("Lanterns spawned"), Second)) return false;

	Switch->Lanterns = { First, nullptr, Second };

	Switch->Toggle();
	TestTrue(TEXT("Switch is on after one toggle"), Switch->IsOn());
	TestEqual(TEXT("First lantern lit"), First->Light->Intensity, First->Brightness);
	TestEqual(TEXT("Second lantern lit"), Second->Light->Intensity, Second->Brightness);

	Switch->Toggle();
	TestFalse(TEXT("Switch is off after two toggles"), Switch->IsOn());
	TestEqual(TEXT("First lantern dark"), First->Light->Intensity, 0.f);

	return true;
}

#endif
```

# Hints

- Decide where the single source of truth for on or off lives, then make every function read it.
- A range-based for loop over the array gives each entry; the light on a lantern is a public member.
- `IsValid` from `UObject/Object.h` tells you whether an entry is set and still alive.

# Rubric

- The switch holds the lantern references; lanterns never reference the switch.
- One function applies the state to every lantern, and Toggle and BeginPlay both call it.
- Empty or destroyed entries are skipped with IsValid.
- No Tick is used.
- The array is editable in the Details panel with a category.

# Alternative

The lanterns could each find the switch with a tag search in BeginPlay and subscribe to it. That removes the editor wiring step but makes every lantern depend on the switch and on a tag string. Wiring from the switch keeps the dependency pointing one way and shows up plainly in the Details panel.
