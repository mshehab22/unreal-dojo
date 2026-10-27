---
id: p9-gladiator-refactor
title: Take the gladiator apart into parts
order: 5
kind: refactor
scaffold: stub
difficulty: 3
patterns: [component]
skills: [component, refactoring]
terms: [createdefaultsubobject, actor-component, character-movement-component, dynamic-multicast-delegate, adddynamic, character]
prerequisites: [p9-arena-parts, p9-sprint-parts]
xp: 100
estimatedMinutes: 25
concepts:
  - A class that keeps several abilities' state and runs them all in its own Tick is a container waiting to be emptied into parts
  - The container makes its parts in its constructor with CreateDefaultSubobject and keeps only the wiring between them
  - The class's public functions can stay, passing calls to its parts, so code that used the gladiator does not change
---

# Brief

When you press Play after the refactor, the gladiator plays exactly as before: it sprints at one and a half times its speed, tires in a little over three seconds, and a gladiator who goes down stops sprinting and cannot start again. What changed is that its Details panel now lists a Health, a Stamina, and a Sprint part.

`ADojoP9Gladiator` was written before the arena had parts. It keeps its own health, stamina, and sprint fields and runs all three in its own `Tick`. Meanwhile this world has built the same abilities as parts: the health part from the prop quest and the stamina and sprint parts from the last quest. A turret that needs health or a runner that needs a sprint cannot reuse anything inside the gladiator.

Refactor the gladiator into a container of those parts:

- In the constructor, create a health part, a stamina part, and a sprint part with `CreateDefaultSubobject`, kept in `HealthComponent`, `StaminaComponent`, and `SprintComponent` properties.
- Remove the gladiator's own numbers and fields; the parts' defaults already match them, and designers now tune the parts in the Details panel.
- Keep every public function, passing each call to the right part.
- Keep the one rule that spans two parts, "going down stops the sprint", in the gladiator: it listens to the health part's `OnDepleted`, stops listening when play ends (`EndPlay`), and stops the sprint part.
- The gladiator no longer needs to tick.

Compiles against earlier quests: p9-arena-parts (`Quests/p9-arena-parts/DojoP9HealthComponent.h`), p9-sprint-parts (`Quests/p9-sprint-parts/DojoP9StaminaComponent.h`, `Quests/p9-sprint-parts/DojoP9SprintComponent.h`).

## See it in the editor

Before the refactor, place a `DojoP9Gladiator` and look at its Details panel: health, stamina, and sprint numbers in three categories of the gladiator itself. After it, the same panel lists Health, Stamina, and Sprint in the component tree, each with its own numbers. Make a Blueprint child of the gladiator and open it: the three parts are there, inherited from the constructor. Add a Dojo P9 Health Component to a plain actor beside it and you have a second thing with health, and no gladiator code came with it.

# Files

## DojoP9Gladiator.h

```cpp
#pragma once

#include "CoreMinimal.h"
#include "GameFramework/Character.h"
#include "DojoP9Gladiator.generated.h"

/** An arena gladiator that keeps its own health, stamina, and sprint, and runs all three in its own Tick. */
UCLASS()
class ADojoP9Gladiator : public ACharacter
{
	GENERATED_BODY()

public:
	/** Turns ticking on; the gladiator drains and regains stamina every frame. */
	ADojoP9Gladiator();

	/** Health at the start of play. */
	UPROPERTY(EditAnywhere, Category = "Gladiator|Health", meta = (ClampMin = "1.0"))
	float MaxHealth = 100.f;

	/** Stamina when full. */
	UPROPERTY(EditAnywhere, Category = "Gladiator|Stamina", meta = (ClampMin = "1.0"))
	float MaxStamina = 100.f;

	/** Stamina regained per second while not sprinting. */
	UPROPERTY(EditAnywhere, Category = "Gladiator|Stamina", meta = (ClampMin = "0.0"))
	float StaminaRegenPerSecond = 25.f;

	/** Stamina drained per second while sprinting. */
	UPROPERTY(EditAnywhere, Category = "Gladiator|Sprint", meta = (ClampMin = "0.0"))
	float SprintCostPerSecond = 30.f;

	/** Walk speed is multiplied by this while sprinting. */
	UPROPERTY(EditAnywhere, Category = "Gladiator|Sprint", meta = (ClampMin = "1.0"))
	float SprintSpeedMultiplier = 1.5f;

	/** Takes Amount of health away; a gladiator who goes down stops sprinting. */
	UFUNCTION(BlueprintCallable, Category = "Gladiator")
	void ApplyDamage(float Amount);

	/** Health left. */
	UFUNCTION(BlueprintPure, Category = "Gladiator")
	float GetHealth() const;

	/** True once health has run out. */
	UFUNCTION(BlueprintPure, Category = "Gladiator")
	bool IsDown() const;

	/** Starts sprinting unless down or out of stamina; returns whether the gladiator is now sprinting. */
	UFUNCTION(BlueprintCallable, Category = "Gladiator")
	bool StartSprint();

	/** Stops sprinting. */
	UFUNCTION(BlueprintCallable, Category = "Gladiator")
	void StopSprint();

	/** True while sprinting. */
	UFUNCTION(BlueprintPure, Category = "Gladiator")
	bool IsSprinting() const;

	/** Stamina left. */
	UFUNCTION(BlueprintPure, Category = "Gladiator")
	float GetStamina() const;

	/** Drains stamina while sprinting and regains it otherwise; an empty bar stops the sprint. */
	virtual void Tick(float DeltaSeconds) override;

protected:
	/** Fills health and stamina. */
	virtual void BeginPlay() override;

private:
	float Health = 0.f;

	float Stamina = 0.f;

	float NormalWalkSpeed = 0.f;

	bool bSprinting = false;
};
```

## DojoP9Gladiator.cpp

```cpp
#include "DojoP9Gladiator.h"

#include "GameFramework/CharacterMovementComponent.h"

ADojoP9Gladiator::ADojoP9Gladiator()
{
	PrimaryActorTick.bCanEverTick = true;
}

void ADojoP9Gladiator::BeginPlay()
{
	Super::BeginPlay();

	Health = MaxHealth;
	Stamina = MaxStamina;
}

void ADojoP9Gladiator::ApplyDamage(float Amount)
{
	if (Amount <= 0.f || IsDown()) return;

	Health = FMath::Max(0.f, Health - Amount);
	if (IsDown()) StopSprint();
}

float ADojoP9Gladiator::GetHealth() const
{
	return Health;
}

bool ADojoP9Gladiator::IsDown() const
{
	return Health <= 0.f;
}

bool ADojoP9Gladiator::StartSprint()
{
	if (bSprinting) return true;
	if (IsDown() || Stamina <= 0.f) return false;

	NormalWalkSpeed = GetCharacterMovement()->MaxWalkSpeed;
	GetCharacterMovement()->MaxWalkSpeed = NormalWalkSpeed * SprintSpeedMultiplier;
	bSprinting = true;
	return true;
}

void ADojoP9Gladiator::StopSprint()
{
	if (!bSprinting) return;

	bSprinting = false;
	GetCharacterMovement()->MaxWalkSpeed = NormalWalkSpeed;
}

bool ADojoP9Gladiator::IsSprinting() const
{
	return bSprinting;
}

float ADojoP9Gladiator::GetStamina() const
{
	return Stamina;
}

void ADojoP9Gladiator::Tick(float DeltaSeconds)
{
	Super::Tick(DeltaSeconds);

	if (!bSprinting)
	{
		Stamina = FMath::Min(MaxStamina, Stamina + StaminaRegenPerSecond * DeltaSeconds);
		return;
	}

	Stamina = FMath::Max(0.f, Stamina - SprintCostPerSecond * DeltaSeconds);
	if (Stamina <= 0.f) StopSprint();
}
```

# Tests

```cpp
#include "Misc/AutomationTest.h"

#if WITH_AUTOMATION_TESTS

#include "GameFramework/CharacterMovementComponent.h"
#include "Quests/p9-arena-parts/DojoP9HealthComponent.h"
#include "Quests/p9-gladiator-refactor/DojoP9Gladiator.h"
#include "Quests/p9-sprint-parts/DojoP9SprintComponent.h"
#include "Quests/p9-sprint-parts/DojoP9StaminaComponent.h"
#include "Support/DojoTestWorld.h"
#include "UObject/UnrealType.h"

IMPLEMENT_SIMPLE_AUTOMATION_TEST(FDojo_P9_GladiatorRefactor_SprintTiresTheGladiator, "Dojo.P9.GladiatorRefactor.SprintTiresTheGladiator", EAutomationTestFlags::EditorContext | EAutomationTestFlags::ProductFilter)

/** The gladiator sprints at one and a half times the speed, tires at 30 a second, and stops when stamina runs out. */
bool FDojo_P9_GladiatorRefactor_SprintTiresTheGladiator::RunTest(const FString& Parameters)
{
	FDojoTestWorld TestWorld;

	ADojoP9Gladiator* Gladiator = TestWorld.SpawnActor<ADojoP9Gladiator>();
	if (!TestNotNull(TEXT("Gladiator spawned"), Gladiator)) return false;

	const float Normal = Gladiator->GetCharacterMovement()->MaxWalkSpeed;
	TestEqual(TEXT("The gladiator starts with full stamina"), Gladiator->GetStamina(), 100.f);

	TestTrue(TEXT("The sprint starts"), Gladiator->StartSprint());
	TestEqual(TEXT("Sprinting is faster"), Gladiator->GetCharacterMovement()->MaxWalkSpeed, Normal * 1.5f);

	TestWorld.Tick(60);
	TestEqual(TEXT("A second of sprinting costs 30"), Gladiator->GetStamina(), 70.f, 0.5f);

	for (int32 Frame = 0; Frame < 600 && Gladiator->IsSprinting(); Frame++) TestWorld.Tick(1);
	TestFalse(TEXT("The sprint stopped when stamina ran out"), Gladiator->IsSprinting());
	TestEqual(TEXT("The normal speed is back"), Gladiator->GetCharacterMovement()->MaxWalkSpeed, Normal);
	TestFalse(TEXT("An exhausted gladiator cannot sprint"), Gladiator->StartSprint());

	return true;
}

IMPLEMENT_SIMPLE_AUTOMATION_TEST(FDojo_P9_GladiatorRefactor_DownedGladiatorStops, "Dojo.P9.GladiatorRefactor.DownedGladiatorStops", EAutomationTestFlags::EditorContext | EAutomationTestFlags::ProductFilter)

/** A gladiator who goes down mid-sprint stops sprinting and cannot start again. */
bool FDojo_P9_GladiatorRefactor_DownedGladiatorStops::RunTest(const FString& Parameters)
{
	FDojoTestWorld TestWorld;

	ADojoP9Gladiator* Gladiator = TestWorld.SpawnActor<ADojoP9Gladiator>();
	if (!TestNotNull(TEXT("Gladiator spawned"), Gladiator)) return false;

	Gladiator->StartSprint();
	Gladiator->ApplyDamage(60.f);
	TestEqual(TEXT("A hit takes health"), Gladiator->GetHealth(), 40.f);
	TestTrue(TEXT("A hurt gladiator keeps sprinting"), Gladiator->IsSprinting());

	Gladiator->ApplyDamage(60.f);
	TestTrue(TEXT("The second hit puts the gladiator down"), Gladiator->IsDown());
	TestEqual(TEXT("Health stops at zero"), Gladiator->GetHealth(), 0.f);
	TestFalse(TEXT("Going down stops the sprint"), Gladiator->IsSprinting());
	TestFalse(TEXT("A downed gladiator cannot sprint"), Gladiator->StartSprint());

	return true;
}

IMPLEMENT_SIMPLE_AUTOMATION_TEST(FDojo_P9_GladiatorRefactor_BuiltFromParts, "Dojo.P9.GladiatorRefactor.BuiltFromParts", EAutomationTestFlags::EditorContext | EAutomationTestFlags::ProductFilter)

/** The gladiator carries this world's health, stamina, and sprint parts, made in its constructor, and declares no numbers of its own. */
bool FDojo_P9_GladiatorRefactor_BuiltFromParts::RunTest(const FString& Parameters)
{
	FDojoTestWorld TestWorld;

	ADojoP9Gladiator* Gladiator = TestWorld.SpawnActor<ADojoP9Gladiator>();
	if (!TestNotNull(TEXT("Gladiator spawned"), Gladiator)) return false;

	const UDojoP9HealthComponent* Health = Gladiator->FindComponentByClass<UDojoP9HealthComponent>();
	const UDojoP9StaminaComponent* Stamina = Gladiator->FindComponentByClass<UDojoP9StaminaComponent>();
	const UDojoP9SprintComponent* Sprint = Gladiator->FindComponentByClass<UDojoP9SprintComponent>();
	TestTrue(TEXT("The gladiator has a health part made in its constructor"), Health != nullptr && Health->IsDefaultSubobject());
	TestTrue(TEXT("The gladiator has a stamina part made in its constructor"), Stamina != nullptr && Stamina->IsDefaultSubobject());
	TestTrue(TEXT("The gladiator has a sprint part made in its constructor"), Sprint != nullptr && Sprint->IsDefaultSubobject());

	for (TFieldIterator<FProperty> It(ADojoP9Gladiator::StaticClass(), EFieldIteratorFlags::ExcludeSuper); It; ++It)
	{
		const bool bIsNumber = It->IsA<FFloatProperty>() || It->IsA<FDoubleProperty>();
		TestFalse(FString::Printf(TEXT("The gladiator keeps no number of its own; %s belongs on a part"), *It->GetName()), bIsNumber);
	}

	return true;
}

#endif
```

# Hints

- The behavior tests pass before and after. `BuiltFromParts` is the one that tells you the refactor is done: it looks for the three parts and for any float the gladiator still declares itself.
- Forward-declare the three part classes in the header and include their headers, with the paths from the brief, in the source file.
- Bind to `OnDepleted` in BeginPlay, not in the constructor, and give the handler the delegate's one parameter, the health part, even if the gladiator does not use it.

# Rubric

- The gladiator creates the health, stamina, and sprint parts in its constructor with CreateDefaultSubobject.
- The gladiator declares no health, stamina, or sprint numbers or fields of its own, and no longer ticks.
- Every public function stays and passes its call to the right part.
- Going down stops the sprint through the health part's OnDepleted, bound in BeginPlay and unbound in EndPlay.
- The parts are this world's parts, unchanged; none of them knows about the gladiator.

# Alternative

The public functions could be removed instead, so callers ask the parts directly: `Gladiator->FindComponentByClass<UDojoP9SprintComponent>()->StartSprint()`. That is the end state many teams reach, since a caller that only needs a sprint then works on anything that sprints. Keeping the functions for now makes the refactor safe to land in one step, because nothing that used the gladiator changes; the functions can be retired one caller at a time later.
