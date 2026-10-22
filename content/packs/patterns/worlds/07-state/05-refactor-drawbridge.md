---
id: p7-drawbridge-refactor
title: Four flags into one mode
order: 5
kind: refactor
scaffold: stub
difficulty: 3
patterns: [state]
skills: [state, refactoring]
terms: [uenum, tick, finite-state-machine]
prerequisites: [p7-ballista]
xp: 90
estimatedMinutes: 20
concepts:
  - Booleans that describe one thing allow combinations that make no sense, and every input must guard against them
  - One mode field makes those combinations impossible to store
  - Inputs and the frame update become a check of the current mode
---

# Brief

When you press Play, the drawbridge raises, lowers, jams, and recovers exactly as before, but a jammed bridge now reports that it is not moving, and nothing can set it moving until it is repaired.

The starter works for the paths its author tried. The bridge describes itself with four booleans: up, moving, moving up, and jammed. Read the input functions and look for what the booleans allow. Jam a bridge on its way up and it is jammed and still "moving". Jam a lowered bridge, then raise it, and it is jammed and moving again. Nothing moves on screen, because Tick checks the jam first, but anything that asks `IsMoving` (a gate sound, a guard waiting to cross) gets the wrong answer. Every new input would need its own guard against every other flag.

Refactor it into one mode:

- One reflected enum, `EDojoP7BridgeState`, with the values Down, Raising, Up, Lowering, and Jammed (using the `EBS_` initials and display names), held in a single property named `State`. The four booleans go away.
- Each input checks the mode. Raise only starts from Down, Lower only from Up, Jam works from anywhere, and Repair only from Jammed, lowering a bridge left part-way up or settling one that was down.
- Tick moves the bridge only while Raising or Lowering, and switches to Up or Down at the end of its travel.
- The public functions keep their names and meaning, and the label shows the mode's display name.

## See it in the editor

Place a `DojoP7Drawbridge`, press Play, and open the console. Run `ke * Raise`, and halfway up run `ke * Jam`: the bridge stops and the label reads Jammed. Run `ke * Raise`: nothing. Run `ke * Repair`: it lowers itself back down. While playing, select the bridge (eject with F8) and watch its single State field in Details change as you go, where before four checkboxes flickered.

# Files

## DojoP7Drawbridge.h

```cpp
#pragma once

#include "CoreMinimal.h"
#include "GameFramework/Actor.h"
#include "DojoP7Drawbridge.generated.h"

class UTextRenderComponent;

/** The arena's drawbridge: it raises and lowers over a few seconds, can jam, and lowers after a repair. */
UCLASS()
class ADojoP7Drawbridge : public AActor
{
	GENERATED_BODY()

public:
	/** Creates the label and turns ticking on. */
	ADojoP7Drawbridge();

	/** Floating text that shows what the bridge is doing. */
	UPROPERTY(VisibleAnywhere, Category = "Bridge")
	TObjectPtr<UTextRenderComponent> Label;

	/** Seconds for a full raise or lower. */
	UPROPERTY(EditAnywhere, Category = "Bridge", meta = (ClampMin = "0.1"))
	float TravelSeconds = 2.f;

	/** Starts raising a lowered bridge. */
	UFUNCTION(BlueprintCallable, Category = "Bridge")
	void Raise();

	/** Starts lowering a raised bridge. */
	UFUNCTION(BlueprintCallable, Category = "Bridge")
	void Lower();

	/** The chains jam: the bridge stops where it is until repaired. */
	UFUNCTION(BlueprintCallable, Category = "Bridge")
	void Jam();

	/** Frees the chains; a bridge left part-way up then lowers itself for safety. */
	UFUNCTION(BlueprintCallable, Category = "Bridge")
	void Repair();

	/** How far up the bridge is, from 0 (down) to 1 (up). */
	UFUNCTION(BlueprintPure, Category = "Bridge")
	float GetHeight() const;

	/** True while the bridge is travelling. */
	UFUNCTION(BlueprintPure, Category = "Bridge")
	bool IsMoving() const;

	/** True while the chains are jammed. */
	UFUNCTION(BlueprintPure, Category = "Bridge")
	bool IsJammed() const;

	/** True when the bridge is fully up and still. */
	UFUNCTION(BlueprintPure, Category = "Bridge")
	bool IsUp() const;

	/** True when the bridge is fully down and still. */
	UFUNCTION(BlueprintPure, Category = "Bridge")
	bool IsDown() const;

	/** Moves a travelling bridge and tilts the actor to match. */
	virtual void Tick(float DeltaSeconds) override;

protected:
	/** Shows the starting state. */
	virtual void BeginPlay() override;

private:
	/** Writes what the bridge is doing into the label. */
	void RefreshLabel();

	/** True when fully up. */
	UPROPERTY(VisibleInstanceOnly, Category = "Bridge")
	bool bIsUp = false;

	/** True while travelling. */
	UPROPERTY(VisibleInstanceOnly, Category = "Bridge")
	bool bIsMoving = false;

	/** Which way a travelling bridge goes. */
	UPROPERTY(VisibleInstanceOnly, Category = "Bridge")
	bool bMovingUp = false;

	/** True while the chains are jammed. */
	UPROPERTY(VisibleInstanceOnly, Category = "Bridge")
	bool bIsJammed = false;

	float Height = 0.f;
};
```

## DojoP7Drawbridge.cpp

```cpp
#include "DojoP7Drawbridge.h"

#include "Components/TextRenderComponent.h"

ADojoP7Drawbridge::ADojoP7Drawbridge()
{
	PrimaryActorTick.bCanEverTick = true;

	Label = CreateDefaultSubobject<UTextRenderComponent>(TEXT("Label"));
	RootComponent = Label;
	Label->SetHorizontalAlignment(EHTA_Center);
}

void ADojoP7Drawbridge::BeginPlay()
{
	Super::BeginPlay();

	RefreshLabel();
}

void ADojoP7Drawbridge::Raise()
{
	if (bIsUp || bIsMoving) return;

	bIsMoving = true;
	bMovingUp = true;
	RefreshLabel();
}

void ADojoP7Drawbridge::Lower()
{
	if (bIsMoving || Height <= 0.f) return;

	bIsMoving = true;
	bMovingUp = false;
	bIsUp = false;
	RefreshLabel();
}

void ADojoP7Drawbridge::Jam()
{
	bIsJammed = true;
	RefreshLabel();
}

void ADojoP7Drawbridge::Repair()
{
	if (!bIsJammed) return;

	bIsJammed = false;
	if (Height > 0.f)
	{
		bIsMoving = true;
		bMovingUp = false;
		bIsUp = false;
	}
	RefreshLabel();
}

void ADojoP7Drawbridge::Tick(float DeltaSeconds)
{
	Super::Tick(DeltaSeconds);

	if (bIsJammed || !bIsMoving) return;

	Height += (bMovingUp ? 1.f : -1.f) * DeltaSeconds / TravelSeconds;

	if (Height >= 1.f)
	{
		Height = 1.f;
		bIsMoving = false;
		bIsUp = true;
	}
	else if (Height <= 0.f)
	{
		Height = 0.f;
		bIsMoving = false;
	}

	SetActorRotation(FRotator(Height * 80.f, 0.f, 0.f));
	RefreshLabel();
}

float ADojoP7Drawbridge::GetHeight() const
{
	return Height;
}

bool ADojoP7Drawbridge::IsMoving() const
{
	return bIsMoving;
}

bool ADojoP7Drawbridge::IsJammed() const
{
	return bIsJammed;
}

bool ADojoP7Drawbridge::IsUp() const
{
	return bIsUp;
}

bool ADojoP7Drawbridge::IsDown() const
{
	return Height <= 0.f && !bIsMoving;
}

void ADojoP7Drawbridge::RefreshLabel()
{
	const TCHAR* Text = bIsJammed ? TEXT("Jammed") : bIsMoving ? (bMovingUp ? TEXT("Raising") : TEXT("Lowering")) : bIsUp ? TEXT("Up") : TEXT("Down");
	Label->SetText(FText::FromString(Text));
}
```

# Tests

```cpp
#include "Misc/AutomationTest.h"

#if WITH_AUTOMATION_TESTS

#include "Quests/p7-drawbridge-refactor/DojoP7Drawbridge.h"
#include "Support/DojoTestWorld.h"
#include "UObject/UnrealType.h"

IMPLEMENT_SIMPLE_AUTOMATION_TEST(FDojo_P7_DrawbridgeRefactor_RaiseAndLower, "Dojo.P7.DrawbridgeRefactor.RaiseAndLower", EAutomationTestFlags::EditorContext | EAutomationTestFlags::ProductFilter)

/** The paths that already worked still work: up over two seconds, a second raise ignored, then down. */
bool FDojo_P7_DrawbridgeRefactor_RaiseAndLower::RunTest(const FString& Parameters)
{
	FDojoTestWorld TestWorld;

	ADojoP7Drawbridge* Bridge = TestWorld.SpawnActor<ADojoP7Drawbridge>();
	if (!TestNotNull(TEXT("Bridge spawned"), Bridge)) return false;

	TestTrue(TEXT("The bridge starts down"), Bridge->IsDown());

	Bridge->Raise();
	Bridge->Tick(1.f);
	TestTrue(TEXT("Halfway up it is moving"), Bridge->IsMoving());
	TestEqual(TEXT("Halfway up"), Bridge->GetHeight(), 0.5f, 0.001f);

	Bridge->Tick(1.f);
	TestTrue(TEXT("After two seconds it is up"), Bridge->IsUp());
	TestFalse(TEXT("And still"), Bridge->IsMoving());

	Bridge->Raise();
	TestFalse(TEXT("Raising a raised bridge does nothing"), Bridge->IsMoving());

	Bridge->Lower();
	Bridge->Tick(2.f);
	TestTrue(TEXT("Two seconds later it is down"), Bridge->IsDown());

	return true;
}

IMPLEMENT_SIMPLE_AUTOMATION_TEST(FDojo_P7_DrawbridgeRefactor_JammedMeansStopped, "Dojo.P7.DrawbridgeRefactor.JammedMeansStopped", EAutomationTestFlags::EditorContext | EAutomationTestFlags::ProductFilter)

/** A bridge jammed halfway up is not moving, cannot be raised, and lowers itself after a repair; a jammed lowered bridge cannot be raised either. */
bool FDojo_P7_DrawbridgeRefactor_JammedMeansStopped::RunTest(const FString& Parameters)
{
	FDojoTestWorld TestWorld;

	ADojoP7Drawbridge* Bridge = TestWorld.SpawnActor<ADojoP7Drawbridge>();
	ADojoP7Drawbridge* Lowered = TestWorld.SpawnActor<ADojoP7Drawbridge>();
	if (!TestNotNull(TEXT("Bridges spawned"), Bridge) || !TestNotNull(TEXT("Bridges spawned"), Lowered)) return false;

	Bridge->Raise();
	Bridge->Tick(1.f);
	Bridge->Jam();
	TestTrue(TEXT("The bridge is jammed"), Bridge->IsJammed());
	TestFalse(TEXT("A jammed bridge is not moving"), Bridge->IsMoving());

	Bridge->Tick(1.f);
	TestEqual(TEXT("It stays where it jammed"), Bridge->GetHeight(), 0.5f, 0.001f);

	Bridge->Raise();
	TestFalse(TEXT("Raising a jammed bridge does nothing"), Bridge->IsMoving());

	Bridge->Repair();
	TestTrue(TEXT("After a repair it lowers itself"), Bridge->IsMoving());
	Bridge->Tick(1.f);
	TestTrue(TEXT("And ends down"), Bridge->IsDown());

	Lowered->Jam();
	Lowered->Raise();
	TestFalse(TEXT("A jammed lowered bridge cannot be raised"), Lowered->IsMoving());

	return true;
}

IMPLEMENT_SIMPLE_AUTOMATION_TEST(FDojo_P7_DrawbridgeRefactor_OneModeField, "Dojo.P7.DrawbridgeRefactor.OneModeField", EAutomationTestFlags::EditorContext | EAutomationTestFlags::ProductFilter)

/** Reflection check: the bridge keeps its mode in one enum property named State, and holds no boolean properties of its own. */
bool FDojo_P7_DrawbridgeRefactor_OneModeField::RunTest(const FString& Parameters)
{
	const FEnumProperty* StateProperty = FindFProperty<FEnumProperty>(ADojoP7Drawbridge::StaticClass(), TEXT("State"));
	if (!TestNotNull(TEXT("The bridge has an enum property named State"), StateProperty)) return false;
	TestEqual(TEXT("State uses EDojoP7BridgeState"), StateProperty->GetEnum()->GetName(), FString(TEXT("EDojoP7BridgeState")));

	for (TFieldIterator<FProperty> It(ADojoP7Drawbridge::StaticClass(), EFieldIteratorFlags::ExcludeSuper); It; ++It)
	{
		TestFalse(FString::Printf(TEXT("%s is not a boolean flag"), *It->GetName()), It->IsA<FBoolProperty>());
	}

	return true;
}

#endif
```

# Hints

- Write down the five situations the bridge can really be in. Each one becomes a value of the enum, and every combination of booleans that matches none of them disappears.
- Every input and the frame update start by asking which of the five it is in now; the travel code only runs in the two travelling modes.
- Declare the enum the way the prize kiosk did, with UENUM, `EBS_` initials, and UMETA display names; `StaticEnum<EDojoP7BridgeState>()->GetDisplayNameTextByValue` gives the label its text.

# Rubric

- The bridge's mode is one enum property named State, and the four booleans are gone.
- Jammed is its own mode, so a jammed bridge can never also be moving or up.
- Each input acts only from the modes it belongs to and is ignored otherwise.
- Tick moves the bridge only while raising or lowering and changes mode at the end of travel.
- Public functions, defaults, and the travel timing are unchanged.
- Enum values follow the `EBS_` naming rule and carry display names for the label.

# Alternative

The booleans could stay, with a helper that checks every forbidden combination after each change and corrects it. That keeps the old fields and fixes today's bug, but each new boolean doubles the combinations the helper must police, and the next forgotten case is the next bug. A single mode turns the forbidden combinations into values that do not exist. If the bridge later gains a second, independent concern (say, a lock that can be on in any mode), that concern gets its own field or its own small machine rather than more values in this enum.
