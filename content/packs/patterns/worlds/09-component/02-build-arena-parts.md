---
id: p9-arena-parts
title: Crates and statues assembled from parts
order: 2
kind: build
scaffold: worked
difficulty: 2
patterns: [component]
skills: [component, object-model]
terms: [actor-component, findcomponentbyclass, newobject, register-component, blueprint-function-library, dynamic-multicast-delegate, adddynamic]
prerequisites: [p9-one-prop-too-many-jobs]
xp: 50
estimatedMinutes: 15
concepts:
  - Health and loot each live in their own component, which any actor can carry
  - A kind of prop is a function that adds a set of parts to a plain actor
  - A part made at runtime is created, filled in, listed on the actor, and registered, in that order
  - One part listens to another through a delegate, so neither includes code it does not need
---

# Brief

When you press Play with the Level Blueprint below, the crate's Print String says it dropped a Bandage after its second hit, and the statue takes every hit and drops nothing.

The arena's props are now plain actors carrying parts. `UDojoP9HealthComponent` takes damage and broadcasts `OnDepleted` once when it reaches zero. `UDojoP9LootComponent` drops its item once, and `ListenTo` makes it drop when a given health part runs out. `UDojoP9PropKit` is a function library with one function per kind of prop: `MakeStatue` gives an actor a 250 health part and nothing else. Neither part includes the other's header except where loot listens to health, and neither knows what kind of actor it is on. Their settings (`MaxHealth`, `LootItem`, `LootCount`) are marked `ExposeOnSpawn`, so a Blueprint can fill them in when it adds a part.

Most of the code is written. First read the marked lines and say in a sentence why each one is there. Then fill the one gap: `MakeCrate`. A crate is a 40 health part plus a loot part that drops one Bandage, and the loot listens to that health. Build it from the kit's two helpers, the way `MakeStatue` is built, with the numbers in the kit's `DojoP9PropNumbers`.

## See it in the editor

Place two empty actors (Place Actors, Basic, Empty Actor) and name them Crate and Statue. In the Level Blueprint, on Begin Play, call Make Crate on the first and Make Statue on the second. From the crate, Get Component by Class with the loot component class, bind its On Loot Dropped to a custom event that prints the item, then get its health component and call Apply Damage with 25 twice. Press Play: one Bandage prints after the second hit. Select the crate in the Outliner while playing: its Details panel lists both parts. Then add a Dojo P9 Health Component to a third actor by hand with Add Component: the same part, assembled by a designer instead of by code. In the Level Blueprint, an Add Component by Class node with the health part chosen shows a Max Health pin, which is set before the part registers.

# Files

## DojoP9HealthComponent.h

```cpp
#pragma once

#include "CoreMinimal.h"
#include "Components/ActorComponent.h"
#include "DojoP9HealthComponent.generated.h"

class UDojoP9HealthComponent;

DECLARE_DYNAMIC_MULTICAST_DELEGATE_OneParam(FDojoP9HealthDepletedSignature, UDojoP9HealthComponent*, Health);

/** A health part any actor can carry: it takes damage and announces, once, when it runs out. */
UCLASS(ClassGroup = "Dojo", meta = (BlueprintSpawnableComponent)) // @explain: BlueprintSpawnableComponent puts the part in every actor's Add Component menu, so a designer can assemble a prop in the editor too.
class UDojoP9HealthComponent : public UActorComponent
{
	GENERATED_BODY()

public:
	/** Turns ticking off; health only changes when something hits it. */
	UDojoP9HealthComponent();

	/** Health at the start of play. */
	UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "Health", meta = (ClampMin = "1.0", ExposeOnSpawn = "true")) // @explain: ExposeOnSpawn, together with BlueprintReadWrite, makes an Add Component by Class node in a Blueprint show this setting as a pin, filled in before the part registers.
	float MaxHealth = 100.f;

	/** Broadcast once, when health reaches zero. */
	UPROPERTY(BlueprintAssignable, Category = "Health")
	FDojoP9HealthDepletedSignature OnDepleted;

	/** Takes Amount of health away, never below zero; ignored once depleted. */
	UFUNCTION(BlueprintCallable, Category = "Health")
	void ApplyDamage(float Amount);

	/** Health left. */
	UFUNCTION(BlueprintPure, Category = "Health")
	float GetHealth() const;

	/** True once health has reached zero. */
	UFUNCTION(BlueprintPure, Category = "Health")
	bool IsDepleted() const;

protected:
	/** Fills health to MaxHealth. */
	virtual void BeginPlay() override;

private:
	float Health = 0.f;
};
```

## DojoP9HealthComponent.cpp

```cpp
#include "DojoP9HealthComponent.h"

UDojoP9HealthComponent::UDojoP9HealthComponent()
{
	PrimaryComponentTick.bCanEverTick = false;
}

void UDojoP9HealthComponent::BeginPlay()
{
	Super::BeginPlay();

	Health = MaxHealth;
}

void UDojoP9HealthComponent::ApplyDamage(float Amount)
{
	if (Amount <= 0.f || IsDepleted()) return;

	Health = FMath::Max(0.f, Health - Amount);
	if (Health <= 0.f) OnDepleted.Broadcast(this); // @explain: Health only announces that it ran out; it does not know whether anything drops loot, and needs no loot header.
}

float UDojoP9HealthComponent::GetHealth() const
{
	return Health;
}

bool UDojoP9HealthComponent::IsDepleted() const
{
	return Health <= 0.f;
}
```

## DojoP9LootComponent.h

```cpp
#pragma once

#include "CoreMinimal.h"
#include "Components/ActorComponent.h"
#include "DojoP9LootComponent.generated.h"

class UDojoP9HealthComponent;

DECLARE_DYNAMIC_MULTICAST_DELEGATE_TwoParams(FDojoP9LootDroppedSignature, FName, Item, int32, Count);

/** A loot part any actor can carry: it drops its items once, for example when a health part it listens to runs out. */
UCLASS(ClassGroup = "Dojo", meta = (BlueprintSpawnableComponent))
class UDojoP9LootComponent : public UActorComponent
{
	GENERATED_BODY()

public:
	/** Turns ticking off; loot only acts when told to drop. */
	UDojoP9LootComponent();

	/** The item this part drops. */
	UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "Loot", meta = (ExposeOnSpawn = "true"))
	FName LootItem = TEXT("Bandage");

	/** How many of LootItem drop. */
	UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "Loot", meta = (ClampMin = "1", ExposeOnSpawn = "true"))
	int32 LootCount = 1;

	/** Broadcast once, when the loot drops. */
	UPROPERTY(BlueprintAssignable, Category = "Loot")
	FDojoP9LootDroppedSignature OnLootDropped;

	/** Drops the loot when Health runs out. */
	UFUNCTION(BlueprintCallable, Category = "Loot")
	void ListenTo(UDojoP9HealthComponent* Health);

	/** Drops the loot; later calls do nothing. */
	UFUNCTION(BlueprintCallable, Category = "Loot")
	void Drop();

	/** True once the loot has dropped. */
	UFUNCTION(BlueprintPure, Category = "Loot")
	bool HasDropped() const;

protected:
	/** Stops listening to the health part. */
	virtual void EndPlay(const EEndPlayReason::Type EndPlayReason) override;

private:
	/** Called by the health part it listens to. */
	UFUNCTION()
	void HandleHealthDepleted(UDojoP9HealthComponent* Health);

	/** The health part this loot listens to, if any. */
	TWeakObjectPtr<UDojoP9HealthComponent> Source;

	bool bDropped = false;
};
```

## DojoP9LootComponent.cpp

```cpp
#include "DojoP9LootComponent.h"

#include "DojoP9HealthComponent.h"

UDojoP9LootComponent::UDojoP9LootComponent()
{
	PrimaryComponentTick.bCanEverTick = false;
}

void UDojoP9LootComponent::ListenTo(UDojoP9HealthComponent* Health)
{
	if (!IsValid(Health)) return;

	if (UDojoP9HealthComponent* Previous = Source.Get()) Previous->OnDepleted.RemoveDynamic(this, &UDojoP9LootComponent::HandleHealthDepleted);

	Source = Health;
	Health->OnDepleted.AddUniqueDynamic(this, &UDojoP9LootComponent::HandleHealthDepleted);
}

void UDojoP9LootComponent::Drop()
{
	if (bDropped) return;

	bDropped = true;
	OnLootDropped.Broadcast(LootItem, LootCount);
}

bool UDojoP9LootComponent::HasDropped() const
{
	return bDropped;
}

void UDojoP9LootComponent::EndPlay(const EEndPlayReason::Type EndPlayReason)
{
	if (UDojoP9HealthComponent* Health = Source.Get()) Health->OnDepleted.RemoveDynamic(this, &UDojoP9LootComponent::HandleHealthDepleted);

	Super::EndPlay(EndPlayReason);
}

void UDojoP9LootComponent::HandleHealthDepleted(UDojoP9HealthComponent* Health)
{
	Drop();
}
```

## DojoP9PropKit.h

```cpp
#pragma once

#include "CoreMinimal.h"
#include "Kismet/BlueprintFunctionLibrary.h"
#include "DojoP9PropKit.generated.h"

class UActorComponent;

/** Assembles arena props from parts: a kind of prop is a set of components, not a class. */
UCLASS()
class UDojoP9PropKit : public UBlueprintFunctionLibrary
{
	GENERATED_BODY()

public:
	/** Gives Prop a 250 health part and nothing else. */
	UFUNCTION(BlueprintCallable, Category = "Props")
	static void MakeStatue(AActor* Prop);

	/** Gives Prop a 40 health part and a loot part that drops one Bandage when that health runs out. */
	UFUNCTION(BlueprintCallable, Category = "Props")
	static void MakeCrate(AActor* Prop);

private:
	/** Creates a part owned by Prop, not yet registered, so its settings can be filled in first. */
	template<typename TPart>
	static TPart* CreatePart(AActor* Prop)
	{
		return NewObject<TPart>(Prop);
	}

	/** Adds a filled-in part to Prop and registers it; on a playing actor its BeginPlay runs inside this call. */
	static void AttachPart(AActor* Prop, UActorComponent* Part);
};
```

## DojoP9PropKit.cpp

```cpp
#include "DojoP9PropKit.h"

#include "DojoP9HealthComponent.h"
#include "DojoP9LootComponent.h"
#include "GameFramework/Actor.h"

namespace DojoP9PropNumbers
{
	constexpr float StatueHealth = 250.f;
	constexpr float CrateHealth = 40.f;
	const FName CrateLoot = TEXT("Bandage");
}

void UDojoP9PropKit::MakeStatue(AActor* Prop)
{
	if (!IsValid(Prop)) return;

	UDojoP9HealthComponent* Health = CreatePart<UDojoP9HealthComponent>(Prop);
	Health->MaxHealth = DojoP9PropNumbers::StatueHealth; // @explain: The numbers go in before the part registers, because registering a part on an actor that is already playing runs its BeginPlay inside that call, and BeginPlay fills health from MaxHealth.
	AttachPart(Prop, Health);
}

void UDojoP9PropKit::MakeCrate(AActor* Prop)
{
}

void UDojoP9PropKit::AttachPart(AActor* Prop, UActorComponent* Part)
{
	Prop->AddInstanceComponent(Part); // @explain: Lists the part on the actor, so the editor's Details panel and saving see a part that was made at runtime.
	Part->RegisterComponent();
}
```

# Tests

```cpp
#include "Misc/AutomationTest.h"

#if WITH_AUTOMATION_TESTS

#include "Quests/p9-arena-parts/DojoP9HealthComponent.h"
#include "Quests/p9-arena-parts/DojoP9LootComponent.h"
#include "Quests/p9-arena-parts/DojoP9PropKit.h"
#include "Support/DojoTestActor.h"
#include "Support/DojoTestWorld.h"

IMPLEMENT_SIMPLE_AUTOMATION_TEST(FDojo_P9_ArenaParts_StatueIsHealthOnly, "Dojo.P9.ArenaParts.StatueIsHealthOnly", EAutomationTestFlags::EditorContext | EAutomationTestFlags::ProductFilter)

/** A statue is a plain actor with a 250 health part and no loot part; running out of health drops nothing. */
bool FDojo_P9_ArenaParts_StatueIsHealthOnly::RunTest(const FString& Parameters)
{
	FDojoTestWorld TestWorld;

	ADojoTestActor* Statue = TestWorld.SpawnActor<ADojoTestActor>();
	if (!TestNotNull(TEXT("Statue spawned"), Statue)) return false;

	UDojoP9PropKit::MakeStatue(Statue);

	UDojoP9HealthComponent* Health = Statue->FindComponentByClass<UDojoP9HealthComponent>();
	if (!TestNotNull(TEXT("The statue has a health part"), Health)) return false;
	TestEqual(TEXT("The statue's numbers were set before it registered"), Health->GetHealth(), 250.f);
	TestNull(TEXT("The statue has no loot part"), Statue->FindComponentByClass<UDojoP9LootComponent>());

	Health->ApplyDamage(300.f);
	TestTrue(TEXT("The statue's health ran out"), Health->IsDepleted());
	TestEqual(TEXT("Health never goes below zero"), Health->GetHealth(), 0.f);

	UDojoP9PropKit::MakeStatue(nullptr);

	return true;
}

IMPLEMENT_SIMPLE_AUTOMATION_TEST(FDojo_P9_ArenaParts_CrateIsHealthAndLoot, "Dojo.P9.ArenaParts.CrateIsHealthAndLoot", EAutomationTestFlags::EditorContext | EAutomationTestFlags::ProductFilter)

/** A crate is a 40 health part plus a Bandage loot part wired to it: the loot drops once, when the health runs out. */
bool FDojo_P9_ArenaParts_CrateIsHealthAndLoot::RunTest(const FString& Parameters)
{
	FDojoTestWorld TestWorld;

	ADojoTestActor* Crate = TestWorld.SpawnActor<ADojoTestActor>();
	if (!TestNotNull(TEXT("Crate spawned"), Crate)) return false;

	UDojoP9PropKit::MakeCrate(Crate);

	UDojoP9HealthComponent* Health = Crate->FindComponentByClass<UDojoP9HealthComponent>();
	UDojoP9LootComponent* Loot = Crate->FindComponentByClass<UDojoP9LootComponent>();
	if (!TestNotNull(TEXT("The crate has a health part"), Health) || !TestNotNull(TEXT("The crate has a loot part"), Loot)) return false;
	TestEqual(TEXT("The crate has 40 health"), Health->GetHealth(), 40.f);
	TestEqual(TEXT("The crate drops a Bandage"), Loot->LootItem, FName(TEXT("Bandage")));

	Health->ApplyDamage(25.f);
	TestFalse(TEXT("A dented crate keeps its loot"), Loot->HasDropped());

	Health->ApplyDamage(25.f);
	TestTrue(TEXT("A broken crate drops its loot"), Loot->HasDropped());

	return true;
}

IMPLEMENT_SIMPLE_AUTOMATION_TEST(FDojo_P9_ArenaParts_EachCrateHasItsOwnParts, "Dojo.P9.ArenaParts.EachCrateHasItsOwnParts", EAutomationTestFlags::EditorContext | EAutomationTestFlags::ProductFilter)

/** Two crates built by the same kit share code but not parts: breaking one drops only its own loot. */
bool FDojo_P9_ArenaParts_EachCrateHasItsOwnParts::RunTest(const FString& Parameters)
{
	FDojoTestWorld TestWorld;

	ADojoTestActor* First = TestWorld.SpawnActor<ADojoTestActor>();
	ADojoTestActor* Second = TestWorld.SpawnActor<ADojoTestActor>();
	if (!TestNotNull(TEXT("First crate spawned"), First) || !TestNotNull(TEXT("Second crate spawned"), Second)) return false;

	UDojoP9PropKit::MakeCrate(First);
	UDojoP9PropKit::MakeCrate(Second);

	UDojoP9HealthComponent* FirstHealth = First->FindComponentByClass<UDojoP9HealthComponent>();
	UDojoP9LootComponent* FirstLoot = First->FindComponentByClass<UDojoP9LootComponent>();
	UDojoP9LootComponent* SecondLoot = Second->FindComponentByClass<UDojoP9LootComponent>();
	if (!TestNotNull(TEXT("First crate's health"), FirstHealth) || !TestNotNull(TEXT("First crate's loot"), FirstLoot) || !TestNotNull(TEXT("Second crate's loot"), SecondLoot)) return false;

	FirstHealth->ApplyDamage(100.f);
	TestTrue(TEXT("The broken crate dropped its loot"), FirstLoot->HasDropped());
	TestFalse(TEXT("The other crate kept its loot"), SecondLoot->HasDropped());

	return true;
}

#endif
```

# Hints

- MakeStatue is the pattern to copy: create a part, fill in its number, attach it. The crate does that twice, once for each part.
- Fill in each part before attaching it. A part attached to an actor that is already playing runs its BeginPlay at once, so a number set afterwards is too late.
- The last step is the wiring: after both parts are attached, tell the loot part which health part to listen to.

# Rubric

- MakeCrate adds a 40 health part and a Bandage loot part to the actor it is given, and nothing else.
- Each part is created, filled in, and only then attached and registered.
- The loot part listens to the crate's own health part, so breaking one crate never drops another crate's loot.
- The numbers and the item come from the kit's named constants, not literals in MakeCrate.
- The parts know nothing about crates; a crate exists only as the set of parts MakeCrate adds.

# Alternative

A crate could be a class, `ADojoP9Crate`, that creates the same two parts in its constructor with `CreateDefaultSubobject`. That is the usual choice when a kind is fixed and designers make Blueprint children of it; the card quest next covers it. The kit's approach suits props whose mix is chosen while the game runs, such as a round that builds props from a list. Both use the same parts, which is the point: the parts do not care how they were assembled.

# Parsons

```yaml
- id: crate-assembly
  prompt: Put MakeCrate in order.
  lines:
    - "void UDojoP9PropKit::MakeCrate(AActor* Prop)"
    - "{"
    - "	if (!IsValid(Prop)) return;"
    - "	UDojoP9HealthComponent* Health = CreatePart<UDojoP9HealthComponent>(Prop);"
    - "	Health->MaxHealth = DojoP9PropNumbers::CrateHealth;"
    - "	AttachPart(Prop, Health);"
    - "	UDojoP9LootComponent* Loot = CreatePart<UDojoP9LootComponent>(Prop);"
    - "	Loot->LootItem = DojoP9PropNumbers::CrateLoot;"
    - "	AttachPart(Prop, Loot);"
    - "	Loot->ListenTo(Health);"
    - "}"
  distractors:
    - line: "	Loot->ListenTo(Prop->FindComponentByClass<UDojoP9HealthComponent>());"
      mistake: It works for a crate with one health part, but the kit already holds the exact part it just made; looking it up again is extra work and would pick the wrong part on an actor that carried two.
```
