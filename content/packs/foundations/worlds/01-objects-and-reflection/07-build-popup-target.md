---
id: f1-popup-target
title: A pop-up target that shows its state by name
order: 7
kind: build
scaffold: faded
difficulty: 2
patterns: [state]
skills: [reflection]
terms: [uenum, ufunction, blueprintcallable, uproperty, coding-standard]
prerequisites: [f1-uenum-and-ustruct]
xp: 60
estimatedMinutes: 15
concepts:
  - A UENUM holds one actor's state in a single field
  - UMETA display names reach the screen through reflection, with no switch statement
---

# Brief

When you press Play and run `ke * Raise`, the word above the target changes from Down to Up; `ke * Hit` drops it back to Down, and a second raise and hit leave it reading Broken.

The class is declared for you and every function has a comment naming its job. Your parts:

1. Declare `EDojoF1TargetState` at the top of the header: a reflected enum class with the values ETS_Lowered, ETS_Raised, and ETS_Broken (the enum's initials first, as the project's naming rule asks), shown to designers as Down, Up, and Broken.
2. Fill in the bodies of `Raise`, `Hit`, `Repair`, and `SetState`.

First version: a pair of booleans (`bIsRaised`, `bIsBroken`) would also work for three states. Try sketching the Hit rules with them on paper first and count the combinations you have to forbid (raised and broken at once makes no sense). One enum field makes those impossible combinations unrepresentable, and reflection turns its value into the label text for free.

Every state change goes through `SetState`, so the label can never disagree with the state.

## See it in the editor

Place a `DojoF1PopupTarget` in the sandbox map, set Hits To Break to 2, and press Play. The label reads Down. In the console run `ke * Raise` (Up), `ke * Hit` (Down), `ke * Raise`, `ke * Hit` (Broken), then `ke * Raise` again: it stays Broken. `ke * Repair` brings it back to Down. Select the target while playing (eject with F8) and watch the State field in Details change with it.

# Files

## DojoF1PopupTarget.h

```cpp
#pragma once

#include "CoreMinimal.h"
#include "GameFramework/Actor.h"
#include "DojoF1PopupTarget.generated.h"

class UTextRenderComponent;

// Your code: declare EDojoF1TargetState here, a reflected enum class with ETS_Lowered (shown as "Down"), ETS_Raised ("Up"), and ETS_Broken ("Broken").

/** A target that pops up, drops back when hit, and breaks after enough hits. */
UCLASS()
class ADojoF1PopupTarget : public AActor
{
	GENERATED_BODY()

public:
	/** Creates the label and turns ticking off. */
	ADojoF1PopupTarget();

	/** Floating text that shows the state's display name. */
	UPROPERTY(VisibleAnywhere, Category = "Target")
	TObjectPtr<UTextRenderComponent> Label;

	/** Hits that break the target for good. */
	UPROPERTY(EditAnywhere, BlueprintReadOnly, Category = "Target", meta = (ClampMin = "1"))
	int32 HitsToBreak = 2;

	/** Lowered to raised; does nothing in any other state. */
	UFUNCTION(BlueprintCallable, Category = "Target")
	void Raise();

	/** Counts a hit on a raised target and returns true; a hit on a lowered or broken target returns false. */
	UFUNCTION(BlueprintCallable, Category = "Target")
	bool Hit();

	/** Broken to lowered with the hit count cleared. */
	UFUNCTION(BlueprintCallable, Category = "Target")
	void Repair();

	/** The current state. */
	UFUNCTION(BlueprintPure, Category = "Target")
	EDojoF1TargetState GetState() const;

protected:
	/** Shows the starting state on the label. */
	virtual void BeginPlay() override;

private:
	/** Changes the state and shows its display name on the label. */
	void SetState(EDojoF1TargetState NewState);

	UPROPERTY(VisibleInstanceOnly, Category = "Target") // @explain: VisibleInstanceOnly shows the live state on a placed or spawned target in Details without letting anyone edit it.
	EDojoF1TargetState State = EDojoF1TargetState::ETS_Lowered;

	int32 HitsTaken = 0;
};
```

## DojoF1PopupTarget.cpp

```cpp
#include "DojoF1PopupTarget.h"

#include "Components/TextRenderComponent.h"

ADojoF1PopupTarget::ADojoF1PopupTarget()
{
	PrimaryActorTick.bCanEverTick = false;

	Label = CreateDefaultSubobject<UTextRenderComponent>(TEXT("Label"));
	RootComponent = Label;
	Label->SetHorizontalAlignment(EHTA_Center);
}

void ADojoF1PopupTarget::BeginPlay()
{
	Super::BeginPlay();

	SetState(State); // @explain: Routing the starting value through SetState makes the label show it from the first frame.
}

void ADojoF1PopupTarget::Raise()
{
	// Your code: only a lowered target rises.
}

bool ADojoF1PopupTarget::Hit()
{
	// Your code: ignore the hit unless raised.
	// Your code: count it, then break the target or drop it back down.
	return false;
}

void ADojoF1PopupTarget::Repair()
{
	// Your code: only a broken target is repaired; clear its hits and lower it.
}

EDojoF1TargetState ADojoF1PopupTarget::GetState() const
{
	return State;
}

void ADojoF1PopupTarget::SetState(EDojoF1TargetState NewState)
{
	// Your code: store the state, then put its display name on the label.
}
```

# Tests

```cpp
#include "Misc/AutomationTest.h"

#if WITH_AUTOMATION_TESTS

#include "Components/TextRenderComponent.h"
#include "Quests/f1-popup-target/DojoF1PopupTarget.h"
#include "Support/DojoTestWorld.h"

IMPLEMENT_SIMPLE_AUTOMATION_TEST(FDojo_F1_PopupTarget_EnumIsReflected, "Dojo.F1.PopupTarget.EnumIsReflected", EAutomationTestFlags::EditorContext | EAutomationTestFlags::ProductFilter)

/** Reads the enum back through reflection and checks its display names. */
bool FDojo_F1_PopupTarget_EnumIsReflected::RunTest(const FString& Parameters)
{
	const UEnum* StateEnum = StaticEnum<EDojoF1TargetState>();
	if (!TestNotNull(TEXT("EDojoF1TargetState is a UENUM"), StateEnum)) return false;

	TestEqual(TEXT("Lowered shows as Down"), StateEnum->GetDisplayNameTextByValue(static_cast<int64>(EDojoF1TargetState::ETS_Lowered)).ToString(), FString(TEXT("Down")));
	TestEqual(TEXT("Raised shows as Up"), StateEnum->GetDisplayNameTextByValue(static_cast<int64>(EDojoF1TargetState::ETS_Raised)).ToString(), FString(TEXT("Up")));
	TestEqual(TEXT("Broken shows as Broken"), StateEnum->GetDisplayNameTextByValue(static_cast<int64>(EDojoF1TargetState::ETS_Broken)).ToString(), FString(TEXT("Broken")));

	return true;
}

IMPLEMENT_SIMPLE_AUTOMATION_TEST(FDojo_F1_PopupTarget_RaiseHitBreakRepair, "Dojo.F1.PopupTarget.RaiseHitBreakRepair", EAutomationTestFlags::EditorContext | EAutomationTestFlags::ProductFilter)

/** Walks a target through every state and checks the label always shows the state's display name. */
bool FDojo_F1_PopupTarget_RaiseHitBreakRepair::RunTest(const FString& Parameters)
{
	FDojoTestWorld TestWorld;

	ADojoF1PopupTarget* Target = TestWorld.SpawnActor<ADojoF1PopupTarget>();
	if (!TestNotNull(TEXT("Target spawned"), Target)) return false;
	if (!TestNotNull(TEXT("Target has a label"), Target->Label.Get())) return false;

	TestEqual(TEXT("Starts lowered"), Target->GetState(), EDojoF1TargetState::ETS_Lowered);
	TestEqual(TEXT("Label reads Down at start"), Target->Label->Text.ToString(), FString(TEXT("Down")));
	TestFalse(TEXT("A lowered target cannot be hit"), Target->Hit());

	Target->Raise();
	TestEqual(TEXT("Raised after Raise"), Target->GetState(), EDojoF1TargetState::ETS_Raised);
	TestEqual(TEXT("Label reads Up"), Target->Label->Text.ToString(), FString(TEXT("Up")));

	TestTrue(TEXT("A raised target takes the hit"), Target->Hit());
	TestEqual(TEXT("Drops back after the first hit"), Target->GetState(), EDojoF1TargetState::ETS_Lowered);

	Target->Raise();
	Target->Hit();
	TestEqual(TEXT("Broken after the second hit"), Target->GetState(), EDojoF1TargetState::ETS_Broken);
	TestEqual(TEXT("Label reads Broken"), Target->Label->Text.ToString(), FString(TEXT("Broken")));

	Target->Raise();
	TestEqual(TEXT("A broken target cannot be raised"), Target->GetState(), EDojoF1TargetState::ETS_Broken);

	Target->Repair();
	TestEqual(TEXT("Repair lowers it"), Target->GetState(), EDojoF1TargetState::ETS_Lowered);

	Target->Raise();
	Target->Hit();
	TestEqual(TEXT("Repair cleared the hits, so one hit drops it instead of breaking it"), Target->GetState(), EDojoF1TargetState::ETS_Lowered);

	return true;
}

#endif
```

# Hints

- Every function body starts by asking which state the target is in now; write that guard first, then the change.
- The enum needs the reflection macro with BlueprintType above it, a byte-sized underlying type, and a display-name annotation after each value; the label wants the enum's display value as text.
- `UEnum` in `UObject/Class.h` has a static helper that turns any reflected enum value into its display text.

# Rubric

- EDojoF1TargetState is a UENUM(BlueprintType) enum class of uint8 with UMETA display names.
- The state lives in one enum field; there are no parallel booleans.
- Every change goes through SetState, so the label always matches the state.
- The label text comes from the enum's display name through reflection, not from a switch of hand-typed strings.
- Each function guards on the current state, so illegal moves (raising a broken target, hitting a lowered one) do nothing.
- The hit limit is the editable HitsToBreak property.

# Alternative

The label could be filled by a switch over the three values with a string per case. It works and needs no reflection, but every new state then needs a matching case, and a forgotten case shows a blank label with no warning. Reading the display name from the reflected enum keeps names in one place, next to the values, and the same names appear in the Details panel and in Blueprint dropdowns.

What you built is a small state machine: one field says which state the target is in, and each function only acts when the current state allows it. That shape is the State pattern, and Pack 2 gives it a world of its own.

# Parsons

```yaml
- id: popup-hit
  prompt: Put Hit in order.
  lines:
    - "bool ADojoF1PopupTarget::Hit()"
    - "{"
    - "	if (State != EDojoF1TargetState::ETS_Raised) return false;"
    - "	HitsTaken++;"
    - "	SetState(HitsTaken >= HitsToBreak ? EDojoF1TargetState::ETS_Broken : EDojoF1TargetState::ETS_Lowered);"
    - "	return true;"
    - "}"
  distractors:
    - line: "	State = EDojoF1TargetState::ETS_Broken;"
      mistake: Writing the field directly skips SetState, so the label would keep showing the old state.
- id: popup-set-state
  prompt: Put SetState in order.
  lines:
    - "void ADojoF1PopupTarget::SetState(EDojoF1TargetState NewState)"
    - "{"
    - "	State = NewState;"
    - "	Label->SetText(UEnum::GetDisplayValueAsText(State));"
    - "}"
  distractors:
    - line: "	Label->SetText(FText::AsNumber(static_cast<uint8>(State)));"
      mistake: That shows the enum's number, not the display name designers chose with UMETA.
```
