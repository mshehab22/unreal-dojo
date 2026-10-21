---
id: f4-hit-counter
title: A hit counter any actor can wear
order: 4
kind: build
scaffold: worked
difficulty: 2
patterns: [component]
skills: [components]
terms: [actor-component, uclass, blueprintcallable, primary-actor-tick]
prerequisites: [f4-components, f1-popup-target]
xp: 50
estimatedMinutes: 12
concepts:
  - An actor component adds the same behavior to unrelated actors
  - BlueprintSpawnableComponent puts a component in the Add Component menu
---

# Brief

When you add a Dojo F4 Hit Counter to a crate and to a World 1 pop-up target in the editor and run `ke * RegisterHit` three times, both read down in their Details panels; each one counts its own hits.

Most of `UDojoF4HitCounterComponent` is written for you. Explain the marked lines, then fill the two gaps:

1. In the header, let designers add the component from the Add Component menu.
2. In the source file, write `RegisterHit`: count one hit, unless the owner is already down.

The counter knows its owner through `GetOwner()`; the owner does not need to know the counter exists, which is how it can be added to the World 1 pop-up target without changing that class.

Compiles against earlier quests: f1-popup-target, in the tests only (`Quests/f1-popup-target/DojoF1PopupTarget.h`).

## See it in the editor

Place a cube and a `DojoF1PopupTarget`. Select each, press Add in the Details panel, and type Hit Counter: Dojo F4 Hit Counter appears in the list once the first gap is filled. Press Play, eject with F8, select the cube's Hit Counter, and watch its Hits value as you run `ke * RegisterHit`: every counter in the level counts, each separately, and none goes past Hits To Down.

# Files

## DojoF4HitCounterComponent.h

```cpp
#pragma once

#include "CoreMinimal.h"
#include "Components/ActorComponent.h" // @explain: The base header for UActorComponent, behavior without a transform.
#include "DojoF4HitCounterComponent.generated.h"

/** Counts hits on whatever actor it is added to and reports when that actor is down. Component pattern: the behavior lives here, not in the owner's class. */
// Your code: let designers add this from the Add Component menu, grouped under Dojo.
UCLASS()
class UDojoF4HitCounterComponent : public UActorComponent
{
	GENERATED_BODY()

public:
	/** Turns ticking off; the counter only changes when hit. */
	UDojoF4HitCounterComponent();

	/** Hits that put the owner down. */
	UPROPERTY(EditAnywhere, BlueprintReadOnly, Category = "Hits", meta = (ClampMin = "1"))
	int32 HitsToDown = 3;

	/** Counts one hit, unless the owner is already down. */
	UFUNCTION(BlueprintCallable, Category = "Hits") // @explain: Callable from Blueprint and the console, so any owner's Blueprint can report a hit.
	void RegisterHit();

	/** Clears the hits so the owner stands again. */
	UFUNCTION(BlueprintCallable, Category = "Hits")
	void ResetHits();

	/** Hits counted so far. */
	UFUNCTION(BlueprintPure, Category = "Hits")
	int32 GetHits() const;

	/** True once HitsToDown hits have been counted. */
	UFUNCTION(BlueprintPure, Category = "Hits")
	bool IsDown() const;

private:
	int32 Hits = 0; // @explain: Private state, changed only through RegisterHit and ResetHits, so no caller can set an impossible count.
};
```

## DojoF4HitCounterComponent.cpp

```cpp
#include "DojoF4HitCounterComponent.h"

UDojoF4HitCounterComponent::UDojoF4HitCounterComponent()
{
	PrimaryComponentTick.bCanEverTick = false; // @explain: Components tick like actors unless told not to; this one only reacts to calls.
}

void UDojoF4HitCounterComponent::RegisterHit()
{
	// Your code: do nothing when the owner is already down; otherwise count the hit.
}

void UDojoF4HitCounterComponent::ResetHits()
{
	Hits = 0;
}

int32 UDojoF4HitCounterComponent::GetHits() const
{
	return Hits;
}

bool UDojoF4HitCounterComponent::IsDown() const
{
	return Hits >= HitsToDown; // @explain: Down is worked out from the count and the editable limit, so there is no second flag to keep in step.
}
```

# Tests

```cpp
#include "Misc/AutomationTest.h"

#if WITH_AUTOMATION_TESTS

#include "Quests/f1-popup-target/DojoF1PopupTarget.h"
#include "Quests/f4-hit-counter/DojoF4HitCounterComponent.h"
#include "Support/DojoTestActor.h"
#include "Support/DojoTestWorld.h"

IMPLEMENT_SIMPLE_AUTOMATION_TEST(FDojo_F4_HitCounter_CountsOnAnyActor, "Dojo.F4.HitCounter.CountsOnAnyActor", EAutomationTestFlags::EditorContext | EAutomationTestFlags::ProductFilter)

/** Adds the counter to a bare actor and to a World 1 pop-up target, and checks each counts its own hits and knows its owner. */
bool FDojo_F4_HitCounter_CountsOnAnyActor::RunTest(const FString& Parameters)
{
	FDojoTestWorld TestWorld;

	ADojoTestActor* Crate = TestWorld.SpawnActor<ADojoTestActor>();
	ADojoF1PopupTarget* Target = TestWorld.SpawnActor<ADojoF1PopupTarget>();
	if (!TestNotNull(TEXT("Actors spawned"), Crate) || !TestNotNull(TEXT("Target spawned"), Target)) return false;

	UDojoF4HitCounterComponent* CrateCounter = TestWorld.AddComponent<UDojoF4HitCounterComponent>(Crate);
	UDojoF4HitCounterComponent* TargetCounter = TestWorld.AddComponent<UDojoF4HitCounterComponent>(Target);
	if (!TestNotNull(TEXT("Counter added to the crate"), CrateCounter) || !TestNotNull(TEXT("Counter added to the target"), TargetCounter)) return false;

	TestTrue(TEXT("The counter knows its owner"), CrateCounter->GetOwner() == Crate);
	TestTrue(TEXT("The owner finds its counter"), Target->FindComponentByClass<UDojoF4HitCounterComponent>() == TargetCounter);

	CrateCounter->RegisterHit();
	CrateCounter->RegisterHit();
	TestEqual(TEXT("Two hits on the crate"), CrateCounter->GetHits(), 2);
	TestFalse(TEXT("Not down after two"), CrateCounter->IsDown());
	TestEqual(TEXT("The target's counter is separate"), TargetCounter->GetHits(), 0);

	CrateCounter->RegisterHit();
	CrateCounter->RegisterHit();
	TestTrue(TEXT("Down after the third hit"), CrateCounter->IsDown());
	TestEqual(TEXT("A downed owner ignores more hits"), CrateCounter->GetHits(), 3);

	CrateCounter->ResetHits();
	TestFalse(TEXT("Reset stands it up"), CrateCounter->IsDown());
	TestEqual(TEXT("Reset clears the hits"), CrateCounter->GetHits(), 0);

	return true;
}

IMPLEMENT_SIMPLE_AUTOMATION_TEST(FDojo_F4_HitCounter_AppearsInAddComponent, "Dojo.F4.HitCounter.AppearsInAddComponent", EAutomationTestFlags::EditorContext | EAutomationTestFlags::ProductFilter)

/** Checks through reflection that designers can add the counter from the Add Component menu and call its functions from Blueprint. */
bool FDojo_F4_HitCounter_AppearsInAddComponent::RunTest(const FString& Parameters)
{
	const UClass* CounterClass = UDojoF4HitCounterComponent::StaticClass();
	TestTrue(TEXT("Listed in the Add Component menu"), CounterClass->HasMetaData(TEXT("BlueprintSpawnableComponent")));

	const UFunction* RegisterHit = CounterClass->FindFunctionByName(TEXT("RegisterHit"));
	if (!TestNotNull(TEXT("RegisterHit is a UFUNCTION"), RegisterHit)) return false;
	TestTrue(TEXT("RegisterHit is BlueprintCallable"), RegisterHit->HasAnyFunctionFlags(FUNC_BlueprintCallable));

	return true;
}

#endif
```

# Hints

- The menu only lists component classes that ask to be listed; that request sits inside the UCLASS brackets, and the sandbox's own sample health component shows the shape.
- The UCLASS needs a ClassGroup and the meta flag whose name says it may be spawned from a Blueprint; RegisterHit is one guard and one increment, like the World 1 dummy's Strike.
- Both specifiers are listed in `UObject/ObjectMacros.h`; look for BlueprintSpawnableComponent.

# Rubric

- The UCLASS has ClassGroup and BlueprintSpawnableComponent, so designers find it in the Add Component menu.
- RegisterHit counts one hit and ignores hits once the owner is down.
- The limit comes from the editable HitsToDown property.
- The component does not tick and never casts its owner to a specific class.
- The pop-up target from World 1 gains the behavior without any change to its class.

# Alternative

The same counting could live in a base class, say an ADojoF4HittableActor that the dummy and the target both derive from. That works until a third kind of actor that already has a different parent needs it, or until an actor needs two behaviors from two such bases. A component sidesteps both: you add it to anything, including engine classes and classes you cannot change. You have just used the Component pattern, the shape most Unreal gameplay code takes.

# Parsons

```yaml
- id: counter-register-hit
  prompt: Put RegisterHit in order.
  lines:
    - "void UDojoF4HitCounterComponent::RegisterHit()"
    - "{"
    - "	if (IsDown()) return;"
    - "	Hits++;"
    - "}"
  distractors:
    - line: "	GetOwner()->Destroy();"
      mistake: The counter only counts; destroying the owner is a decision for whoever reads IsDown.
- id: counter-constructor
  prompt: Put the constructor in order.
  lines:
    - "UDojoF4HitCounterComponent::UDojoF4HitCounterComponent()"
    - "{"
    - "	PrimaryComponentTick.bCanEverTick = false;"
    - "}"
  distractors:
    - line: "	PrimaryActorTick.bCanEverTick = false;"
      mistake: Components have their own tick settings in PrimaryComponentTick; PrimaryActorTick belongs to actors.
```
