---
id: p9-sprint-parts
title: A stamina part and a sprint part that find each other
order: 4
kind: build
scaffold: stub
difficulty: 3
patterns: [component]
skills: [component, time]
terms: [actor-component, initialize-component, findcomponentbyclass, character-movement-component, dynamic-multicast-delegate, adddynamic, tick]
prerequisites: [p9-component-card]
xp: 110
estimatedMinutes: 30
concepts:
  - A stamina part owns the per-frame work and fills itself in InitializeComponent, before any part's BeginPlay
  - A sprint part finds its stamina sibling through the owner and stops when the sibling's delegate says it is empty
  - The same sprint part speeds up a character's own movement component when there is one, and still works on an actor with none
  - Parts assembled at runtime arrive one at a time, so a part cannot assume its siblings exist before they do
---

# Brief

When you press Play with the setup below, the actor sprints for a little over three seconds and then stops by itself, and a character carrying the same two parts walks at one and a half times its speed while it sprints.

Anything in the arena that runs needs stamina, and most of it can sprint. Two parts do that. `UDojoP9StaminaComponent` holds the pool: other parts spend from it at once with `TrySpend`, all or nothing, or ask it to drain a rate per second with `SetDrainPerSecond`. While nothing drains it, it regains `RegenPerSecond`, never past `MaxStamina`. When a spend or a drain takes it to zero it broadcasts `OnExhausted`. It is the only part that ticks. `UDojoP9SprintComponent` works on whatever actor carries it: `StartSprint` needs a stamina part on the same actor with stamina left, sets the drain to `CostPerSecond`, and listens for `OnExhausted`; if the owner also has a `UCharacterMovementComponent`, the sprint multiplies its `MaxWalkSpeed` by `SpeedMultiplier` and gives the old speed back on `StopSprint`.

The declarations, the constructors, the getters, and the exhaustion broadcast are given. Yours:

- Stamina: fill to `MaxStamina` in `InitializeComponent`; `TrySpend`, `SetDrainPerSecond` (never below zero), and `Refill`; and `TickComponent`, which drains while a rate is set and regenerates otherwise. Every loss goes through `AfterLoss` so the broadcast fires.
- Sprint: `StartSprint` (returns true if already sprinting), `StopSprint`, and unbinding from the stamina part in `EndPlay`. Bind once, even across many sprints.

Write the obvious version first and run the tests. One of them fails on purpose for most people. Read its name and message before you read the hints.

## See it in the editor

Place an empty actor and give it a Dojo P9 Stamina Component and a Dojo P9 Sprint Component with Add Component, in that order. In the Level Blueprint, on Begin Play, call Start Sprint on the sprint part and print its Is Sprinting every half second with a timer. Press Play: true for about three seconds, then false. Now place a Character instead (Place Actors, All Classes, Character), add the same two parts, and on Begin Play print its Character Movement's Max Walk Speed after Start Sprint: 900 instead of 600. The same sprint part, on two very different actors.

# Files

## DojoP9StaminaComponent.h

```cpp
#pragma once

#include "CoreMinimal.h"
#include "Components/ActorComponent.h"
#include "DojoP9StaminaComponent.generated.h"

DECLARE_DYNAMIC_MULTICAST_DELEGATE(FDojoP9StaminaExhaustedSignature);

/** A stamina part any actor can carry: other parts spend it in one go or drain it over time, and it refills while nothing drains it. Component pattern. */
UCLASS(ClassGroup = "Dojo", meta = (BlueprintSpawnableComponent))
class UDojoP9StaminaComponent : public UActorComponent
{
	GENERATED_BODY()

public:
	/** Ticks every frame and asks for InitializeComponent. */
	UDojoP9StaminaComponent();

	/** Stamina when full. */
	UPROPERTY(EditAnywhere, Category = "Stamina", meta = (ClampMin = "1.0"))
	float MaxStamina = 100.f;

	/** Stamina regained per second while nothing drains it. */
	UPROPERTY(EditAnywhere, Category = "Stamina", meta = (ClampMin = "0.0"))
	float RegenPerSecond = 25.f;

	/** Broadcast when a drain or a spend takes stamina to zero. */
	UPROPERTY(BlueprintAssignable, Category = "Stamina")
	FDojoP9StaminaExhaustedSignature OnExhausted;

	/** Spends Amount at once if there is that much; returns false, spending nothing, if there is not. */
	UFUNCTION(BlueprintCallable, Category = "Stamina")
	bool TrySpend(float Amount);

	/** Drains this much stamina per second until set back to zero; regeneration pauses while it drains. */
	UFUNCTION(BlueprintCallable, Category = "Stamina")
	void SetDrainPerSecond(float Rate);

	/** Fills stamina back to MaxStamina. */
	UFUNCTION(BlueprintCallable, Category = "Stamina")
	void Refill();

	/** Stamina left. */
	UFUNCTION(BlueprintPure, Category = "Stamina")
	float GetStamina() const;

	/** True while stamina is at zero. */
	UFUNCTION(BlueprintPure, Category = "Stamina")
	bool IsExhausted() const;

	/** Fills stamina before anything can spend it. */
	virtual void InitializeComponent() override;

	/** Drains or regenerates by DeltaTime. */
	virtual void TickComponent(float DeltaTime, ELevelTick TickType, FActorComponentTickFunction* ThisTickFunction) override;

private:
	/** Broadcasts OnExhausted when stamina has just reached zero. */
	void AfterLoss(float Before);

	float Stamina = 0.f;

	float DrainPerSecond = 0.f;
};
```

## DojoP9StaminaComponent.cpp

```cpp
#include "DojoP9StaminaComponent.h"

UDojoP9StaminaComponent::UDojoP9StaminaComponent()
{
	PrimaryComponentTick.bCanEverTick = true;
	bWantsInitializeComponent = true;
}

void UDojoP9StaminaComponent::InitializeComponent()
{
	Super::InitializeComponent();
}

bool UDojoP9StaminaComponent::TrySpend(float Amount)
{
	return false;
}

void UDojoP9StaminaComponent::SetDrainPerSecond(float Rate)
{
}

void UDojoP9StaminaComponent::Refill()
{
}

float UDojoP9StaminaComponent::GetStamina() const
{
	return Stamina;
}

bool UDojoP9StaminaComponent::IsExhausted() const
{
	return Stamina <= 0.f;
}

void UDojoP9StaminaComponent::TickComponent(float DeltaTime, ELevelTick TickType, FActorComponentTickFunction* ThisTickFunction)
{
	Super::TickComponent(DeltaTime, TickType, ThisTickFunction);
}

void UDojoP9StaminaComponent::AfterLoss(float Before)
{
	if (Before > 0.f && Stamina <= 0.f) OnExhausted.Broadcast();
}
```

## DojoP9SprintComponent.h

```cpp
#pragma once

#include "CoreMinimal.h"
#include "Components/ActorComponent.h"
#include "DojoP9SprintComponent.generated.h"

class UDojoP9StaminaComponent;

/** A sprint part: it drains its owner's stamina part while sprinting, speeds up the owner's character movement if there is one, and stops when stamina runs out. Component pattern. */
UCLASS(ClassGroup = "Dojo", meta = (BlueprintSpawnableComponent))
class UDojoP9SprintComponent : public UActorComponent
{
	GENERATED_BODY()

public:
	/** Turns ticking off; the stamina part does the per-frame work. */
	UDojoP9SprintComponent();

	/** Stamina drained per second while sprinting. */
	UPROPERTY(EditAnywhere, Category = "Sprint", meta = (ClampMin = "0.0"))
	float CostPerSecond = 30.f;

	/** Walk speed is multiplied by this while sprinting. */
	UPROPERTY(EditAnywhere, Category = "Sprint", meta = (ClampMin = "1.0"))
	float SpeedMultiplier = 1.5f;

	/** Starts sprinting if the owner has a stamina part with stamina left; returns whether the owner is now sprinting. */
	UFUNCTION(BlueprintCallable, Category = "Sprint")
	bool StartSprint();

	/** Stops sprinting and gives back the normal speed. */
	UFUNCTION(BlueprintCallable, Category = "Sprint")
	void StopSprint();

	/** True while sprinting. */
	UFUNCTION(BlueprintPure, Category = "Sprint")
	bool IsSprinting() const;

protected:
	/** Stops listening to the stamina part. */
	virtual void EndPlay(const EEndPlayReason::Type EndPlayReason) override;

private:
	/** Called by the stamina part when it runs out. */
	UFUNCTION()
	void HandleExhausted();

	/** The owner's stamina part. */
	UPROPERTY()
	TObjectPtr<UDojoP9StaminaComponent> Stamina;

	/** Walk speed before the sprint began. */
	float NormalWalkSpeed = 0.f;

	bool bSprinting = false;
};
```

## DojoP9SprintComponent.cpp

```cpp
#include "DojoP9SprintComponent.h"

#include "DojoP9StaminaComponent.h"
#include "GameFramework/Actor.h"
#include "GameFramework/CharacterMovementComponent.h"

UDojoP9SprintComponent::UDojoP9SprintComponent()
{
	PrimaryComponentTick.bCanEverTick = false;
}

bool UDojoP9SprintComponent::StartSprint()
{
	return false;
}

void UDojoP9SprintComponent::StopSprint()
{
}

bool UDojoP9SprintComponent::IsSprinting() const
{
	return bSprinting;
}

void UDojoP9SprintComponent::EndPlay(const EEndPlayReason::Type EndPlayReason)
{
	Super::EndPlay(EndPlayReason);
}

void UDojoP9SprintComponent::HandleExhausted()
{
	StopSprint();
}
```

# Tests

```cpp
#include "Misc/AutomationTest.h"

#if WITH_AUTOMATION_TESTS

#include "GameFramework/Character.h"
#include "GameFramework/CharacterMovementComponent.h"
#include "Quests/p9-sprint-parts/DojoP9SprintComponent.h"
#include "Quests/p9-sprint-parts/DojoP9StaminaComponent.h"
#include "Support/DojoTestActor.h"
#include "Support/DojoTestWorld.h"

IMPLEMENT_SIMPLE_AUTOMATION_TEST(FDojo_P9_SprintParts_StaminaSpendsAndRefills, "Dojo.P9.SprintParts.StaminaSpendsAndRefills", EAutomationTestFlags::EditorContext | EAutomationTestFlags::ProductFilter)

/** Stamina is full as soon as it is added, spends all or nothing, regenerates over time up to full, and refills on request. */
bool FDojo_P9_SprintParts_StaminaSpendsAndRefills::RunTest(const FString& Parameters)
{
	FDojoTestWorld TestWorld;

	ADojoTestActor* Runner = TestWorld.SpawnActor<ADojoTestActor>();
	if (!TestNotNull(TEXT("Runner spawned"), Runner)) return false;

	UDojoP9StaminaComponent* Stamina = TestWorld.AddComponent<UDojoP9StaminaComponent>(Runner);
	if (!TestNotNull(TEXT("Stamina added"), Stamina)) return false;
	TestEqual(TEXT("Stamina is full before anything spends it"), Stamina->GetStamina(), 100.f);

	TestFalse(TEXT("Spending more than there is fails"), Stamina->TrySpend(150.f));
	TestEqual(TEXT("And spends nothing"), Stamina->GetStamina(), 100.f);

	TestTrue(TEXT("Spending what there is works"), Stamina->TrySpend(100.f));
	TestTrue(TEXT("Stamina is exhausted"), Stamina->IsExhausted());

	TestWorld.Tick(60);
	TestEqual(TEXT("A second of rest regains 25"), Stamina->GetStamina(), 25.f, 0.5f);

	TestWorld.Tick(600);
	TestEqual(TEXT("Rest never goes past full"), Stamina->GetStamina(), 100.f);

	Stamina->TrySpend(70.f);
	Stamina->Refill();
	TestEqual(TEXT("Refill fills at once"), Stamina->GetStamina(), 100.f);

	return true;
}

IMPLEMENT_SIMPLE_AUTOMATION_TEST(FDojo_P9_SprintParts_SprintDrainsUntilEmpty, "Dojo.P9.SprintParts.SprintDrainsUntilEmpty", EAutomationTestFlags::EditorContext | EAutomationTestFlags::ProductFilter)

/** Sprinting drains 30 stamina a second; when stamina runs out the sprint stops by itself, and a rested runner can sprint again. */
bool FDojo_P9_SprintParts_SprintDrainsUntilEmpty::RunTest(const FString& Parameters)
{
	FDojoTestWorld TestWorld;

	ADojoTestActor* Runner = TestWorld.SpawnActor<ADojoTestActor>();
	if (!TestNotNull(TEXT("Runner spawned"), Runner)) return false;

	UDojoP9StaminaComponent* Stamina = TestWorld.AddComponent<UDojoP9StaminaComponent>(Runner);
	UDojoP9SprintComponent* Sprint = TestWorld.AddComponent<UDojoP9SprintComponent>(Runner);
	if (!TestNotNull(TEXT("Stamina added"), Stamina) || !TestNotNull(TEXT("Sprint added"), Sprint)) return false;

	TestTrue(TEXT("The sprint starts"), Sprint->StartSprint());
	TestWorld.Tick(60);
	TestEqual(TEXT("A second of sprinting costs 30"), Stamina->GetStamina(), 70.f, 0.5f);

	for (int32 Frame = 0; Frame < 600 && Sprint->IsSprinting(); Frame++) TestWorld.Tick(1);
	TestFalse(TEXT("Running out of stamina stops the sprint"), Sprint->IsSprinting());
	TestTrue(TEXT("Stamina is exhausted"), Stamina->IsExhausted());
	TestFalse(TEXT("An exhausted runner cannot sprint"), Sprint->StartSprint());

	TestWorld.Tick(60);
	TestTrue(TEXT("Stamina came back once the sprint stopped draining it"), Stamina->GetStamina() > 20.f);
	TestTrue(TEXT("A rested runner sprints again"), Sprint->StartSprint());

	Sprint->StopSprint();
	const float Rested = Stamina->GetStamina();
	TestWorld.Tick(30);
	TestTrue(TEXT("Stopping the sprint stops the drain"), Stamina->GetStamina() > Rested);

	return true;
}

IMPLEMENT_SIMPLE_AUTOMATION_TEST(FDojo_P9_SprintParts_PartsAddedInEitherOrder, "Dojo.P9.SprintParts.PartsAddedInEitherOrder", EAutomationTestFlags::EditorContext | EAutomationTestFlags::ProductFilter)

/** A runner assembled at runtime with the sprint part added before the stamina part still sprints on that stamina. */
bool FDojo_P9_SprintParts_PartsAddedInEitherOrder::RunTest(const FString& Parameters)
{
	FDojoTestWorld TestWorld;

	ADojoTestActor* Runner = TestWorld.SpawnActor<ADojoTestActor>();
	if (!TestNotNull(TEXT("Runner spawned"), Runner)) return false;

	UDojoP9SprintComponent* Sprint = TestWorld.AddComponent<UDojoP9SprintComponent>(Runner);
	UDojoP9StaminaComponent* Stamina = TestWorld.AddComponent<UDojoP9StaminaComponent>(Runner);
	if (!TestNotNull(TEXT("Sprint added"), Sprint) || !TestNotNull(TEXT("Stamina added"), Stamina)) return false;

	TestTrue(TEXT("The sprint finds the stamina added after it"), Sprint->StartSprint());
	TestWorld.Tick(60);
	TestEqual(TEXT("And drains it"), Stamina->GetStamina(), 70.f, 0.5f);

	return true;
}

IMPLEMENT_SIMPLE_AUTOMATION_TEST(FDojo_P9_SprintParts_SprintSpeedsUpACharacter, "Dojo.P9.SprintParts.SprintSpeedsUpACharacter", EAutomationTestFlags::EditorContext | EAutomationTestFlags::ProductFilter)

/** On a character, the sprint part multiplies the movement component's walk speed and gives it back when the sprint stops. */
bool FDojo_P9_SprintParts_SprintSpeedsUpACharacter::RunTest(const FString& Parameters)
{
	FDojoTestWorld TestWorld;

	ACharacter* Runner = TestWorld.SpawnActor<ACharacter>();
	if (!TestNotNull(TEXT("Character spawned"), Runner)) return false;

	TestWorld.AddComponent<UDojoP9StaminaComponent>(Runner);
	UDojoP9SprintComponent* Sprint = TestWorld.AddComponent<UDojoP9SprintComponent>(Runner);
	if (!TestNotNull(TEXT("Sprint added"), Sprint)) return false;

	UCharacterMovementComponent* Movement = Runner->GetCharacterMovement();
	const float Normal = Movement->MaxWalkSpeed;

	Sprint->StopSprint();
	TestEqual(TEXT("Stopping a sprint that never started changes nothing"), Movement->MaxWalkSpeed, Normal);

	Sprint->StartSprint();
	TestEqual(TEXT("Sprinting walks at one and a half times the speed"), Movement->MaxWalkSpeed, Normal * 1.5f);

	Sprint->StopSprint();
	TestEqual(TEXT("Stopping gives the normal speed back"), Movement->MaxWalkSpeed, Normal);

	return true;
}

#endif
```

# Hints

- The failing test adds the sprint part first and the stamina part second. On an actor that is already playing, registering a part runs its BeginPlay inside that call. What was on the actor when the sprint part's BeginPlay ran?
- A sibling can arrive after you do. Look the stamina part up when you first need it, in StartSprint, and keep it once found.
- Binding the same function to a delegate twice trips an ensure; `AddUniqueDynamic` binds only if it is not bound yet, so StartSprint can call it every time.

# Rubric

- Stamina is full from InitializeComponent, before any part's BeginPlay runs.
- TrySpend is all or nothing; the drain and the regeneration happen only in the stamina part's TickComponent, scaled by DeltaTime, and every loss reaches AfterLoss.
- The sprint finds its stamina sibling through the owner when it first needs it, so the parts work in either assembly order.
- The sprint stops through the OnExhausted delegate, binds once, and unbinds in EndPlay.
- The sprint changes MaxWalkSpeed only when the owner has a character movement component, and restores the speed it found.
- Only the stamina part ticks.

# Alternative

The sprint could tick and drain stamina itself each frame with `TrySpend(CostPerSecond * DeltaTime)`. That works, but two parts would tick and both would change the same number in the same frame, so the result would depend on which ticked first unless you add a tick prerequisite. Letting the stamina part own every change and the sprint only set a rate keeps the order out of it. The sprint could also add a stamina part to its owner when it finds none. That hides a missing part a designer forgot, and two parts that each add what they need can end up with two stamina pools; refusing to sprint without one keeps assembly in one place.

# Parsons

```yaml
- id: start-sprint
  prompt: Put StartSprint in order.
  lines:
    - "bool UDojoP9SprintComponent::StartSprint()"
    - "{"
    - "	if (bSprinting) return true;"
    - "	if (!IsValid(Stamina)) Stamina = GetOwner()->FindComponentByClass<UDojoP9StaminaComponent>();"
    - "	if (!IsValid(Stamina) || Stamina->IsExhausted()) return false;"
    - "	Stamina->OnExhausted.AddUniqueDynamic(this, &UDojoP9SprintComponent::HandleExhausted);"
    - "	Stamina->SetDrainPerSecond(CostPerSecond);"
    - "	bSprinting = true;"
    - "	return true;"
    - "}"
  distractors:
    - line: "	ADojoP9Gladiator* Gladiator = Cast<ADojoP9Gladiator>(GetOwner());"
      mistake: Casting the owner to one class ties the sprint to that class; it then fails on every other actor that carries it.
```
