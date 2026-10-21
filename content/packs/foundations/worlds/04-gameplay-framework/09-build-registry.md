---
id: f4-registry
title: A registry every target joins on its own
order: 9
kind: build
scaffold: stub
difficulty: 3
patterns: []
skills: [framework, components]
terms: [world-subsystem, actor-component, beginplay, endplay, isvalid]
prerequisites: [f4-subsystems]
xp: 80
estimatedMinutes: 20
concepts:
  - A world subsystem as the one shared list for a level
  - A component that registers its owner for exactly as long as it is in play
---

# Brief

When you press Play in a level with three actors that carry a registry entry, the registry counts 3; destroy one and the count drops to 2 at once, and asking for the nearest actor never returns the destroyed one.

The declarations of both classes are given; every body is yours.

- `UDojoF4TargetRegistry` is a world subsystem: one per world, made by the engine. It keeps registered actors in the order they registered, never twice. `FindNearest(From, MaxRange)` returns the registered actor nearest to From within MaxRange; on equal distance, the one that registered first wins.
- `UDojoF4RegistryEntryComponent` is a small component: add it to any actor and that actor joins the registry when play starts and leaves it when it leaves play.

Dependency direction: entries know the registry; the registry knows only actors, never the component, and the actors themselves know nothing about either.

Write the registering part first and run the tests. This one fails on purpose the first time for most people: read which assertion failed and why before you open the hints.

## See it in the editor

Place three cubes and add a Dojo F4 Registry Entry component to each. In the level Blueprint, on a key press, get the Dojo F4 Target Registry node (subsystems get one automatically) and print Get Registered Count: 3. Destroy one cube from another key press and print again: 2. Drop a fourth cube in while playing with the entry already on it and the count rises without any code knowing about it.

# Files

## DojoF4TargetRegistry.h

```cpp
#pragma once

#include "CoreMinimal.h"
#include "Subsystems/WorldSubsystem.h"
#include "DojoF4TargetRegistry.generated.h"

/** One per world: keeps the actors that registered themselves and answers which one is nearest. */
UCLASS()
class UDojoF4TargetRegistry : public UWorldSubsystem
{
	GENERATED_BODY()

public:
	/** Adds Actor once; ignores invalid actors. */
	UFUNCTION(BlueprintCallable, Category = "Registry")
	void Register(AActor* Actor);

	/** Removes Actor if it is registered. */
	UFUNCTION(BlueprintCallable, Category = "Registry")
	void Unregister(AActor* Actor);

	/** True while Actor is registered. */
	UFUNCTION(BlueprintPure, Category = "Registry")
	bool IsRegistered(const AActor* Actor) const;

	/** How many actors are registered. */
	UFUNCTION(BlueprintPure, Category = "Registry")
	int32 GetRegisteredCount() const;

	/** The registered actor nearest to From within MaxRange; on equal distance the one registered first wins; nullptr when none is in range. */
	UFUNCTION(BlueprintPure, Category = "Registry")
	AActor* FindNearest(FVector From, float MaxRange) const;

private:
	/** Oldest registration first. */
	UPROPERTY()
	TArray<TObjectPtr<AActor>> Registered;
};
```

## DojoF4TargetRegistry.cpp

```cpp
#include "DojoF4TargetRegistry.h"

#include "GameFramework/Actor.h"

void UDojoF4TargetRegistry::Register(AActor* Actor)
{
}

void UDojoF4TargetRegistry::Unregister(AActor* Actor)
{
}

bool UDojoF4TargetRegistry::IsRegistered(const AActor* Actor) const
{
	return false;
}

int32 UDojoF4TargetRegistry::GetRegisteredCount() const
{
	return 0;
}

AActor* UDojoF4TargetRegistry::FindNearest(FVector From, float MaxRange) const
{
	return nullptr;
}
```

## DojoF4RegistryEntryComponent.h

```cpp
#pragma once

#include "CoreMinimal.h"
#include "Components/ActorComponent.h"
#include "DojoF4RegistryEntryComponent.generated.h"

/** Added to any actor, registers that actor with the world's target registry for exactly as long as it is in play. */
UCLASS(ClassGroup = (Dojo), meta = (BlueprintSpawnableComponent))
class UDojoF4RegistryEntryComponent : public UActorComponent
{
	GENERATED_BODY()

public:
	/** Turns ticking off. */
	UDojoF4RegistryEntryComponent();

protected:
	/** Registers the owner. */
	virtual void BeginPlay() override;

	/** Unregisters the owner, for every reason play can end. */
	virtual void EndPlay(const EEndPlayReason::Type EndPlayReason) override;
};
```

## DojoF4RegistryEntryComponent.cpp

```cpp
#include "DojoF4RegistryEntryComponent.h"

#include "DojoF4TargetRegistry.h"
#include "Engine/World.h"

UDojoF4RegistryEntryComponent::UDojoF4RegistryEntryComponent()
{
}

void UDojoF4RegistryEntryComponent::BeginPlay()
{
}

void UDojoF4RegistryEntryComponent::EndPlay(const EEndPlayReason::Type EndPlayReason)
{
}
```

# Tests

```cpp
#include "Misc/AutomationTest.h"

#if WITH_AUTOMATION_TESTS

#include "Engine/World.h"
#include "Quests/f4-registry/DojoF4RegistryEntryComponent.h"
#include "Quests/f4-registry/DojoF4TargetRegistry.h"
#include "Support/DojoTestActor.h"
#include "Support/DojoTestWorld.h"

namespace DojoF4RegistryTest
{
	/** Spawns a bare actor at Location with a registry entry component. */
	ADojoTestActor* SpawnEntry(FDojoTestWorld& TestWorld, const FVector& Location)
	{
		ADojoTestActor* Actor = TestWorld.SpawnActor<ADojoTestActor>();
		Actor->SetActorLocation(Location);
		TestWorld.AddComponent<UDojoF4RegistryEntryComponent>(Actor);
		return Actor;
	}
}

IMPLEMENT_SIMPLE_AUTOMATION_TEST(FDojo_F4_Registry_TracksActorsInPlay, "Dojo.F4.Registry.TracksActorsInPlay", EAutomationTestFlags::EditorContext | EAutomationTestFlags::ProductFilter)

/** Registers three actors through their components, destroys one, and checks the registry forgets it at once. */
bool FDojo_F4_Registry_TracksActorsInPlay::RunTest(const FString& Parameters)
{
	using namespace DojoF4RegistryTest;

	FDojoTestWorld TestWorld;

	UDojoF4TargetRegistry* Registry = TestWorld.GetWorld()->GetSubsystem<UDojoF4TargetRegistry>();
	if (!TestNotNull(TEXT("The world has a registry"), Registry)) return false;
	TestEqual(TEXT("Empty at first"), Registry->GetRegisteredCount(), 0);

	ADojoTestActor* First = SpawnEntry(TestWorld, FVector(100.f, 0.f, 0.f));
	ADojoTestActor* Second = SpawnEntry(TestWorld, FVector(400.f, 0.f, 0.f));
	ADojoTestActor* Third = SpawnEntry(TestWorld, FVector(900.f, 0.f, 0.f));

	TestEqual(TEXT("Three actors registered themselves"), Registry->GetRegisteredCount(), 3);
	TestTrue(TEXT("The first is registered"), Registry->IsRegistered(First));

	Registry->Register(First);
	TestEqual(TEXT("Registering twice changes nothing"), Registry->GetRegisteredCount(), 3);

	TestTrue(TEXT("The nearest to the origin is the first"), Registry->FindNearest(FVector::ZeroVector, 1000.f) == First);

	First->Destroy();
	TestFalse(TEXT("A destroyed actor is unregistered at once"), Registry->IsRegistered(First));
	TestEqual(TEXT("Two left"), Registry->GetRegisteredCount(), 2);
	TestTrue(TEXT("The nearest is now the second"), Registry->FindNearest(FVector::ZeroVector, 1000.f) == Second);
	TestNull(TEXT("Nothing within 300 of the origin"), Registry->FindNearest(FVector::ZeroVector, 300.f));
	TestTrue(TEXT("The third is still registered"), Registry->IsRegistered(Third));

	return true;
}

IMPLEMENT_SIMPLE_AUTOMATION_TEST(FDojo_F4_Registry_TieGoesToFirstRegistered, "Dojo.F4.Registry.TieGoesToFirstRegistered", EAutomationTestFlags::EditorContext | EAutomationTestFlags::ProductFilter)

/** Registers two actors at the same distance and checks the earlier registration wins, whichever comes later in space. */
bool FDojo_F4_Registry_TieGoesToFirstRegistered::RunTest(const FString& Parameters)
{
	using namespace DojoF4RegistryTest;

	FDojoTestWorld TestWorld;

	UDojoF4TargetRegistry* Registry = TestWorld.GetWorld()->GetSubsystem<UDojoF4TargetRegistry>();
	if (!TestNotNull(TEXT("The world has a registry"), Registry)) return false;

	ADojoTestActor* Earlier = SpawnEntry(TestWorld, FVector(0.f, 200.f, 0.f));
	ADojoTestActor* Later = SpawnEntry(TestWorld, FVector(0.f, -200.f, 0.f));
	if (!TestNotNull(TEXT("Actors spawned"), Earlier) || !TestNotNull(TEXT("Actors spawned"), Later)) return false;

	TestTrue(TEXT("Equal distance: the one registered first wins"), Registry->FindNearest(FVector::ZeroVector, 500.f) == Earlier);

	return true;
}

#endif
```

# Hints

- The failing assertion asks about an actor right after Destroy, before any garbage collection: think about which of your functions runs when an actor leaves play, and what it leaves in the list.
- The component reaches the registry through its world's subsystem getter and passes its owner; the leaving half belongs in EndPlay, before the parent's EndPlay. For the tie, only replace the current best when the new distance is strictly smaller.
- `UWorld::GetSubsystem` is in `Engine/World.h`; `TArray::AddUnique` and `TArray::Remove` are in `Containers/Array.h`; `FVector::DistSquared` compares distances without square roots.

# Rubric

- The registry is a world subsystem reached with GetSubsystem, never created with NewObject.
- The entry component registers its owner in BeginPlay and unregisters it in EndPlay, calling Super in both, so a destroyed actor leaves the registry at once.
- Register ignores invalid actors and never adds the same actor twice.
- FindNearest uses squared distances within the range and keeps the earlier registration on a tie.
- The registered array is a UPROPERTY, and the registry knows actors, never the component.
- No actor searches the world for the others; they register themselves.

# Alternative

Each system that needs the targets could call `UGameplayStatics::GetAllActorsOfClass` whenever it wants the list. That needs no registry and no component, but it walks every actor in the world on each call and only finds actors of one class, so a crate and a dummy cannot be in the same list. A registry with self-registering entries costs two small classes and makes every lookup a walk over only the actors that asked to be there.
