---
id: s6-sense-memory
title: A memory that turns perception into facts
order: 2
kind: build
scaffold: worked
difficulty: 2
patterns: [component, observer]
skills: [ai, components, delegates]
terms: [ai-perception, ai-stimulus, actor-component, dynamic-multicast-delegate, adddynamic, tweakobjectptr, endplay]
prerequisites: [s6-guard-plan, p7-state-when-not, p1-observer-when-not]
xp: 60
estimatedMinutes: 15
concepts:
  - Sight and hearing updates becoming one target, one visible flag, and one clue with a time
  - Seeing beats hearing, and losing sight leaves the last place as a clue
  - A memory that announces each change and never keeps a vanished intruder alive
---

# Brief

When a guard's perception sees an intruder at 400 units, the memory says the intruder is in sight with a clue at 400; when sight is lost at 450, the intruder is no longer in sight but the clue moves to 450; and a noise while the intruder is in sight changes nothing.

Most of the code is written for you. Explain the marked lines, then fill the two gaps:

1. `NoteSight`, the lost branch: losing sight of an actor this memory is not following changes nothing. Otherwise the followed actor is no longer in sight, and the rest of the function records the place as the newest clue.
2. `NoteNoise`: a noise while the followed actor is in sight changes nothing. Otherwise the noise becomes the newest clue, and the change is announced once.

Dependency direction: the memory listens to a perception component and knows nothing about who listens to the memory. The perception component knows nothing about the memory; it only broadcasts `OnTargetPerceptionUpdated`. `UDojoS6MemorySpy` is a ready-made listener the tests use to count notices.

This is the first piece of the Night Shift boss.

## See it in the editor

Make a Blueprint class from AIController called `BP_Watcher`. Add an AIPerception component, give it an AI Sight config with Sight Radius 1200 and Detection by Affiliation ticked for neutrals, and add a `DojoS6SenseMemoryComponent`. On BeginPlay call Watch on the memory with the perception component, and bind a custom event to its On Memory Changed that prints Is Target Visible and Get Clue Location. Place a Pawn in the level with AI Controller Class set to `BP_Watcher` and Auto Possess AI set to Placed in World or Spawned. Press Play and walk in front of it: it prints true and where you stood; step behind it and it prints false and the last place it saw you.

# Files

## DojoS6SenseMemoryComponent.h

```cpp
#pragma once

#include "CoreMinimal.h"
#include "Components/ActorComponent.h"
#include "Perception/AIPerceptionTypes.h"
#include "DojoS6SenseMemoryComponent.generated.h"

class UAIPerceptionComponent;
class UDojoS6SenseMemoryComponent;

/** Broadcast after the memory changed, with the memory itself so one handler can serve many guards. */
DECLARE_DYNAMIC_MULTICAST_DELEGATE_OneParam(FDojoS6OnMemoryChanged, UDojoS6SenseMemoryComponent*, Memory);

/** What a guard knows (the Component pattern): who it is following, whether that one is in sight, and the newest clue, turned from perception updates into plain facts and announced like the sender in the Observer pattern. */
UCLASS(ClassGroup = (Dojo), meta = (BlueprintSpawnableComponent))
class UDojoS6SenseMemoryComponent : public UActorComponent
{
	GENERATED_BODY()

public:
	/** Turns ticking off; the memory only reacts to news. */
	UDojoS6SenseMemoryComponent();

	/** Fires once per piece of news that changed the memory, after the memory holds it. */
	UPROPERTY(BlueprintAssignable, Category = "Memory")
	FDojoS6OnMemoryChanged OnMemoryChanged;

	/** Starts listening to a perception component's updates, and stops listening to the one before; null stops listening. */
	UFUNCTION(BlueprintCallable, Category = "Memory")
	void Watch(UAIPerceptionComponent* Perception);

	/** Turns one perception update into a sighting or a noise, by the sense that produced it. */
	UFUNCTION()
	void HandlePerception(AActor* Actor, FAIStimulus Stimulus);

	/** Records that SeenActor was seen at Location, or, when bSeen is false, that it just went out of sight there. */
	UFUNCTION(BlueprintCallable, Category = "Memory")
	void NoteSight(AActor* SeenActor, bool bSeen, FVector Location);

	/** Records a noise at NoiseLocation as the newest clue, unless the followed actor is in sight. */
	UFUNCTION(BlueprintCallable, Category = "Memory")
	void NoteNoise(FVector NoiseLocation);

	/** Forgets the followed actor and the clue. */
	UFUNCTION(BlueprintCallable, Category = "Memory")
	void Forget();

	/** The actor being followed, or null. */
	UFUNCTION(BlueprintPure, Category = "Memory")
	AActor* GetTarget() const;

	/** True while the followed actor is in sight. */
	UFUNCTION(BlueprintPure, Category = "Memory")
	bool IsTargetVisible() const;

	/** True when there is a clue: the last place the actor was seen, or a noise. */
	UFUNCTION(BlueprintPure, Category = "Memory")
	bool HasClue() const;

	/** Where the newest clue is. */
	UFUNCTION(BlueprintPure, Category = "Memory")
	FVector GetClueLocation() const;

	/** Seconds since the newest clue was noted, or -1 when there is none. */
	UFUNCTION(BlueprintPure, Category = "Memory")
	float GetClueAge() const;

protected:
	/** Stops listening, so a perception component that outlives the memory calls nothing. */
	virtual void EndPlay(const EEndPlayReason::Type EndPlayReason) override;

private:
	/** Saves Location as the newest clue, stamped with the current time. */
	void SetClue(const FVector& Location);

	/** The world's time in seconds, or zero outside a world. */
	double Now() const;

	UPROPERTY()
	TObjectPtr<UAIPerceptionComponent> WatchedPerception;

	TWeakObjectPtr<AActor> RememberedTarget; // @explain: A weak pointer does not keep the intruder alive, and it reads as null once the intruder is destroyed, so the memory never points at a dead actor.
	bool bTargetVisible = false;
	bool bHasClue = false;
	FVector ClueLocation = FVector::ZeroVector;
	double ClueTime = 0.0;
};
```

## DojoS6SenseMemoryComponent.cpp

```cpp
#include "DojoS6SenseMemoryComponent.h"

#include "Engine/World.h"
#include "Perception/AIPerceptionComponent.h"
#include "Perception/AIPerceptionSystem.h"
#include "Perception/AISense_Hearing.h"
#include "Perception/AISense_Sight.h"

/** Turns ticking off; the memory only reacts to news. */
UDojoS6SenseMemoryComponent::UDojoS6SenseMemoryComponent()
{
	PrimaryComponentTick.bCanEverTick = false;
}

/** Starts listening to a perception component's updates, and stops listening to the one before. */
void UDojoS6SenseMemoryComponent::Watch(UAIPerceptionComponent* Perception)
{
	if (WatchedPerception != nullptr)
	{
		WatchedPerception->OnTargetPerceptionUpdated.RemoveDynamic(this, &UDojoS6SenseMemoryComponent::HandlePerception);
	}

	WatchedPerception = Perception;

	if (WatchedPerception != nullptr)
	{
		WatchedPerception->OnTargetPerceptionUpdated.AddUniqueDynamic(this, &UDojoS6SenseMemoryComponent::HandlePerception); // @explain: AddUniqueDynamic ignores a second identical binding, so watching the same perception twice still gives one handler call per update.
	}
}

/** Turns one perception update into a sighting or a noise, by the sense that produced it. */
void UDojoS6SenseMemoryComponent::HandlePerception(AActor* Actor, FAIStimulus Stimulus)
{
	const TSubclassOf<UAISense> Sense = UAIPerceptionSystem::GetSenseClassForStimulus(this, Stimulus); // @explain: A stimulus carries only a sense id; the world's perception system maps that id back to the sense class, such as sight or hearing.

	if (Sense == UAISense_Sight::StaticClass())
	{
		NoteSight(Actor, Stimulus.WasSuccessfullySensed(), Stimulus.StimulusLocation); // @explain: Sight sends one update when it starts seeing an actor and another, with WasSuccessfullySensed false, when it loses it, so one function handles both.
	}
	else if (Sense == UAISense_Hearing::StaticClass() && Stimulus.WasSuccessfullySensed())
	{
		NoteNoise(Stimulus.StimulusLocation);
	}
}

/** Records a sighting, or the moment the followed actor went out of sight. */
void UDojoS6SenseMemoryComponent::NoteSight(AActor* SeenActor, bool bSeen, FVector Location)
{
	if (SeenActor == nullptr)
	{
		return;
	}

	if (bSeen)
	{
		RememberedTarget = SeenActor;
		bTargetVisible = true;
	}
	else
	{
		// Your code: losing sight of an actor this memory is not following changes nothing, so leave without announcing.
		// Your code: otherwise the followed actor is no longer in sight.
	}

	SetClue(Location);
	OnMemoryChanged.Broadcast(this);
}

/** Records a noise as the newest clue, unless the followed actor is in sight. */
void UDojoS6SenseMemoryComponent::NoteNoise(FVector NoiseLocation)
{
	// Your code: while the followed actor is in sight, a noise changes nothing.
	// Your code: otherwise the noise becomes the newest clue, and the change is announced once.
}

/** Forgets the followed actor and the clue, announcing only when there was something to forget. */
void UDojoS6SenseMemoryComponent::Forget()
{
	if (!RememberedTarget.IsValid() && !bHasClue)
	{
		return;
	}

	RememberedTarget.Reset();
	bTargetVisible = false;
	bHasClue = false;
	OnMemoryChanged.Broadcast(this);
}

/** The actor being followed, or null. */
AActor* UDojoS6SenseMemoryComponent::GetTarget() const
{
	return RememberedTarget.Get();
}

/** True while the followed actor is in sight. */
bool UDojoS6SenseMemoryComponent::IsTargetVisible() const
{
	return bTargetVisible && RememberedTarget.IsValid();
}

/** True when there is a clue. */
bool UDojoS6SenseMemoryComponent::HasClue() const
{
	return bHasClue;
}

/** Where the newest clue is. */
FVector UDojoS6SenseMemoryComponent::GetClueLocation() const
{
	return ClueLocation;
}

/** Seconds since the newest clue was noted, or -1 when there is none. */
float UDojoS6SenseMemoryComponent::GetClueAge() const
{
	if (!bHasClue)
	{
		return -1.f;
	}

	return static_cast<float>(Now() - ClueTime);
}

/** Stops listening before the component leaves play. */
void UDojoS6SenseMemoryComponent::EndPlay(const EEndPlayReason::Type EndPlayReason)
{
	Watch(nullptr); // @explain: The perception component may outlive this memory, so the binding is removed here, or the perception component would call into a component that left play.
	Super::EndPlay(EndPlayReason);
}

/** Saves Location as the newest clue, stamped with the current time. */
void UDojoS6SenseMemoryComponent::SetClue(const FVector& Location)
{
	bHasClue = true;
	ClueLocation = Location;
	ClueTime = Now();
}

/** The world's time in seconds, or zero outside a world. */
double UDojoS6SenseMemoryComponent::Now() const
{
	const UWorld* World = GetWorld();
	return World != nullptr ? World->GetTimeSeconds() : 0.0;
}
```

## DojoS6MemorySpy.h

```cpp
#pragma once

#include "CoreMinimal.h"
#include "UObject/Object.h"
#include "DojoS6MemorySpy.generated.h"

class UDojoS6SenseMemoryComponent;

/** A listener that counts a memory's change notices and remembers what the memory said when the last one arrived; it only subscribes. */
UCLASS()
class UDojoS6MemorySpy : public UObject
{
	GENERATED_BODY()

public:
	/** Starts listening to the memory's changes, once however many times it is called. */
	UFUNCTION(BlueprintCallable, Category = "Memory Spy")
	void Watch(UDojoS6SenseMemoryComponent* Memory);

	/** How many notices have arrived. */
	UFUNCTION(BlueprintPure, Category = "Memory Spy")
	int32 GetNoticeCount() const;

	/** Whether the memory said its target was in sight when the last notice arrived. */
	UFUNCTION(BlueprintPure, Category = "Memory Spy")
	bool WasVisibleAtLastNotice() const;

private:
	/** Counts the notice and reads the memory that sent it. */
	UFUNCTION()
	void HandleChanged(UDojoS6SenseMemoryComponent* Memory);

	int32 NoticeCount = 0;
	bool bVisibleAtLastNotice = false;
};
```

## DojoS6MemorySpy.cpp

```cpp
#include "DojoS6MemorySpy.h"

#include "DojoS6SenseMemoryComponent.h"

/** Starts listening to the memory's changes, once however many times it is called. */
void UDojoS6MemorySpy::Watch(UDojoS6SenseMemoryComponent* Memory)
{
	if (Memory == nullptr)
	{
		return;
	}

	Memory->OnMemoryChanged.AddUniqueDynamic(this, &UDojoS6MemorySpy::HandleChanged);
}

/** How many notices have arrived. */
int32 UDojoS6MemorySpy::GetNoticeCount() const
{
	return NoticeCount;
}

/** Whether the memory said its target was in sight when the last notice arrived. */
bool UDojoS6MemorySpy::WasVisibleAtLastNotice() const
{
	return bVisibleAtLastNotice;
}

/** Counts the notice and reads the memory that sent it. */
void UDojoS6MemorySpy::HandleChanged(UDojoS6SenseMemoryComponent* Memory)
{
	++NoticeCount;
	bVisibleAtLastNotice = Memory->IsTargetVisible();
}
```

# Tests

```cpp
#include "Misc/AutomationTest.h"

#if WITH_AUTOMATION_TESTS

#include "AI/AISystemBase.h"
#include "AIController.h"
#include "Engine/World.h"
#include "Perception/AIPerceptionComponent.h"
#include "Perception/AIPerceptionSystem.h"
#include "Perception/AISense_Hearing.h"
#include "Perception/AISense_Sight.h"
#include "Quests/s6-sense-memory/DojoS6MemorySpy.h"
#include "Quests/s6-sense-memory/DojoS6SenseMemoryComponent.h"
#include "Support/DojoTestActor.h"
#include "Support/DojoTestWorld.h"
#include "UObject/StrongObjectPtr.h"

namespace DojoS6SenseMemoryTest
{
	/** Puts a memory on a fresh actor. */
	UDojoS6SenseMemoryComponent* MakeMemory(FDojoTestWorld& TestWorld)
	{
		ADojoTestActor* Owner = TestWorld.SpawnActor<ADojoTestActor>();
		return TestWorld.AddComponent<UDojoS6SenseMemoryComponent>(Owner);
	}
}

IMPLEMENT_SIMPLE_AUTOMATION_TEST(FDojo_S6_SenseMemory_SightAndLoss, "Dojo.S6.SenseMemory.SightAndLoss", EAutomationTestFlags::EditorContext | EAutomationTestFlags::ProductFilter)

/** Sees an intruder, loses it, and checks the target, the visible flag, the clue, and its age at each step. */
bool FDojo_S6_SenseMemory_SightAndLoss::RunTest(const FString& Parameters)
{
	using namespace DojoS6SenseMemoryTest;

	FDojoTestWorld TestWorld;
	UDojoS6SenseMemoryComponent* Memory = MakeMemory(TestWorld);
	if (!TestNotNull(TEXT("Memory created"), Memory)) return false;
	ADojoTestActor* Intruder = TestWorld.SpawnActor<ADojoTestActor>();
	ADojoTestActor* Stranger = TestWorld.SpawnActor<ADojoTestActor>();

	TestFalse(TEXT("A new memory has no clue"), Memory->HasClue());
	TestEqual(TEXT("A new memory's clue age is -1"), Memory->GetClueAge(), -1.f);

	Memory->NoteSight(Intruder, true, FVector(400.f, 0.f, 0.f));
	TestTrue(TEXT("The intruder is followed"), Memory->GetTarget() == Intruder);
	TestTrue(TEXT("The intruder is in sight"), Memory->IsTargetVisible());
	TestEqual(TEXT("Where it was seen is the clue"), Memory->GetClueLocation(), FVector(400.f, 0.f, 0.f));

	TestWorld.Tick(60);
	TestTrue(TEXT("The clue ages with the world's clock"), FMath::IsNearlyEqual(Memory->GetClueAge(), 1.f, 0.05f));

	Memory->NoteSight(Stranger, false, FVector(900.f, 0.f, 0.f));
	TestTrue(TEXT("Losing sight of someone else changes nothing"), Memory->IsTargetVisible() && Memory->GetClueLocation() == FVector(400.f, 0.f, 0.f));

	Memory->NoteSight(Intruder, false, FVector(450.f, 0.f, 0.f));
	TestFalse(TEXT("Lost sight means not in sight"), Memory->IsTargetVisible());
	TestTrue(TEXT("The intruder is still the one followed"), Memory->GetTarget() == Intruder);
	TestEqual(TEXT("The place it was lost is the newest clue"), Memory->GetClueLocation(), FVector(450.f, 0.f, 0.f));
	TestTrue(TEXT("The new clue is fresh"), Memory->GetClueAge() < 0.05f);

	Memory->NoteSight(nullptr, true, FVector(1.f, 2.f, 3.f));
	TestEqual(TEXT("A sighting of nothing is ignored"), Memory->GetClueLocation(), FVector(450.f, 0.f, 0.f));

	Memory->NoteSight(Intruder, true, FVector(500.f, 0.f, 0.f));
	Intruder->Destroy();
	TestNull(TEXT("A destroyed intruder is not kept alive"), Memory->GetTarget());
	TestFalse(TEXT("A destroyed intruder is not in sight"), Memory->IsTargetVisible());

	Memory->Forget();
	TestFalse(TEXT("Forget clears the clue"), Memory->HasClue());
	TestEqual(TEXT("A forgotten clue has age -1"), Memory->GetClueAge(), -1.f);

	return true;
}

IMPLEMENT_SIMPLE_AUTOMATION_TEST(FDojo_S6_SenseMemory_SightBeatsHearing, "Dojo.S6.SenseMemory.SightBeatsHearing", EAutomationTestFlags::EditorContext | EAutomationTestFlags::ProductFilter)

/** Hears noises before, during, and after a sighting, and checks that only noises out of sight become clues, each with one notice. */
bool FDojo_S6_SenseMemory_SightBeatsHearing::RunTest(const FString& Parameters)
{
	using namespace DojoS6SenseMemoryTest;

	FDojoTestWorld TestWorld;
	UDojoS6SenseMemoryComponent* Memory = MakeMemory(TestWorld);
	if (!TestNotNull(TEXT("Memory created"), Memory)) return false;
	ADojoTestActor* Intruder = TestWorld.SpawnActor<ADojoTestActor>();
	TStrongObjectPtr<UDojoS6MemorySpy> Spy(NewObject<UDojoS6MemorySpy>());
	Spy->Watch(Memory);

	Memory->NoteNoise(FVector(300.f, 0.f, 0.f));
	TestTrue(TEXT("A noise is a clue"), Memory->HasClue());
	TestEqual(TEXT("The noise is where the clue is"), Memory->GetClueLocation(), FVector(300.f, 0.f, 0.f));
	TestNull(TEXT("A noise follows nobody"), Memory->GetTarget());
	TestEqual(TEXT("One notice for the noise"), Spy->GetNoticeCount(), 1);

	Memory->NoteSight(Intruder, true, FVector(500.f, 0.f, 0.f));
	TestEqual(TEXT("One notice for the sighting"), Spy->GetNoticeCount(), 2);
	TestTrue(TEXT("The notice arrived after the memory knew"), Spy->WasVisibleAtLastNotice());

	Memory->NoteNoise(FVector(900.f, 0.f, 0.f));
	TestEqual(TEXT("A noise while the intruder is in sight is not a clue"), Memory->GetClueLocation(), FVector(500.f, 0.f, 0.f));
	TestEqual(TEXT("A noise that changed nothing sends no notice"), Spy->GetNoticeCount(), 2);

	Memory->NoteSight(Intruder, false, FVector(550.f, 0.f, 0.f));
	TestFalse(TEXT("The notice for the loss says not in sight"), Spy->WasVisibleAtLastNotice());
	Memory->NoteNoise(FVector(900.f, 0.f, 0.f));
	TestEqual(TEXT("Out of sight, a noise is the newest clue again"), Memory->GetClueLocation(), FVector(900.f, 0.f, 0.f));
	TestEqual(TEXT("Four changes, four notices"), Spy->GetNoticeCount(), 4);

	Memory->Forget();
	Memory->Forget();
	TestEqual(TEXT("Forgetting an empty memory sends no notice"), Spy->GetNoticeCount(), 5);

	return true;
}

IMPLEMENT_SIMPLE_AUTOMATION_TEST(FDojo_S6_SenseMemory_ListensToPerception, "Dojo.S6.SenseMemory.ListensToPerception", EAutomationTestFlags::EditorContext | EAutomationTestFlags::ProductFilter)

/** Sends sight and hearing updates through a real perception component's event and checks how the memory reads them, then that it stops listening. */
bool FDojo_S6_SenseMemory_ListensToPerception::RunTest(const FString& Parameters)
{
	FDojoTestWorld TestWorld;

	// A game world made in code starts without an AI system, so the test makes and starts one, as a level starting play does.
	UWorld* World = TestWorld.GetWorld();
	if (World->GetAISystem() == nullptr && World->CreateAISystem() != nullptr)
	{
		World->GetAISystem()->InitializeActorsForPlay(false);
		World->GetAISystem()->StartPlay();
	}

	UAIPerceptionSystem* PerceptionSystem = UAIPerceptionSystem::GetCurrent(*TestWorld.GetWorld());
	if (!TestNotNull(TEXT("The test world has a perception system"), PerceptionSystem)) return false;
	PerceptionSystem->RegisterSenseClass(UAISense_Sight::StaticClass());
	PerceptionSystem->RegisterSenseClass(UAISense_Hearing::StaticClass());

	AAIController* Controller = TestWorld.SpawnActor<AAIController>();
	if (!TestNotNull(TEXT("Controller spawned"), Controller)) return false;
	UAIPerceptionComponent* Perception = TestWorld.AddComponent<UAIPerceptionComponent>(Controller);
	UDojoS6SenseMemoryComponent* Memory = TestWorld.AddComponent<UDojoS6SenseMemoryComponent>(Controller);
	ADojoTestActor* Intruder = TestWorld.SpawnActor<ADojoTestActor>();
	TStrongObjectPtr<UDojoS6MemorySpy> Spy(NewObject<UDojoS6MemorySpy>());
	Spy->Watch(Memory);

	Memory->Watch(Perception);
	Memory->Watch(Perception);

	const FAIStimulus Seen(*GetDefault<UAISense_Sight>(), 1.f, FVector(400.f, 0.f, 0.f), FVector::ZeroVector);
	Perception->OnTargetPerceptionUpdated.Broadcast(Intruder, Seen);
	TestTrue(TEXT("A sight update puts the intruder in sight"), Memory->IsTargetVisible() && Memory->GetTarget() == Intruder);
	TestEqual(TEXT("Watching twice still means one notice per update"), Spy->GetNoticeCount(), 1);

	const FAIStimulus Lost(*GetDefault<UAISense_Sight>(), 1.f, FVector(450.f, 0.f, 0.f), FVector::ZeroVector, FAIStimulus::SensingFailed);
	Perception->OnTargetPerceptionUpdated.Broadcast(Intruder, Lost);
	TestFalse(TEXT("A failed sight update means sight was lost"), Memory->IsTargetVisible());
	TestEqual(TEXT("The place sight was lost is the clue"), Memory->GetClueLocation(), FVector(450.f, 0.f, 0.f));

	const FAIStimulus Heard(*GetDefault<UAISense_Hearing>(), 1.f, FVector(-200.f, 0.f, 0.f), FVector::ZeroVector);
	Perception->OnTargetPerceptionUpdated.Broadcast(Intruder, Heard);
	TestEqual(TEXT("A hearing update is a noise at the stimulus location"), Memory->GetClueLocation(), FVector(-200.f, 0.f, 0.f));
	TestTrue(TEXT("A noise does not put anyone in sight"), !Memory->IsTargetVisible());

	Memory->Watch(nullptr);
	Perception->OnTargetPerceptionUpdated.Broadcast(Intruder, Seen);
	TestFalse(TEXT("After Watch(nullptr) the memory hears nothing"), Memory->IsTargetVisible());
	TestEqual(TEXT("No notice after unwatching"), Spy->GetNoticeCount(), 3);

	return true;
}

#endif
```

# Hints

- Both gaps are guards first, then a change. Ask what would make the news meaningless, return early in that case, and only then touch the memory.
- In the lost branch, compare the actor that went out of sight with the one the memory follows; a weak pointer's `Get` gives you the followed actor, or null. Returning early skips the clue and the notice, which is what "changes nothing" means.
- In `NoteNoise`, the visible flag decides whether the noise matters. For the change itself there is already a private function that stores a clue with the current time, and the delegate is broadcast the same way `NoteSight` does it, after the clue is stored.

# Rubric

- A sighting makes its actor the followed one and puts it in sight; losing sight of the followed actor keeps it followed, takes it out of sight, and moves the clue to where it was lost.
- Losing sight of an actor the memory is not following, and a noise while the followed actor is in sight, change nothing and send no notice.
- A noise out of sight becomes the newest clue with a fresh age, and every real change sends exactly one notice, after the memory holds the news.
- The memory points at the perception component only to unbind, never keeps a destroyed actor alive, and stops listening when it leaves play.
- The perception component and the listeners hold no knowledge of the memory's rules; the sense of each update is read from the stimulus, not guessed from the actor.

# Alternative

The guard could read the perception component directly whenever it decides, with `GetCurrentlyPerceivedActors` or `GetActorsPerception`, and skip the memory. That works for one decision in one place, but every decision then repeats the same rules (which sense counts, whether sight beats hearing, how old a clue may be), and nothing announces a change, so something must poll. The memory puts those rules in one component and turns perception into three facts the rest of the guard reads. It is the Component pattern from Pack 2's "Actors built from parts" world, holding one concern for any controller, and the Observer pattern twice: it listens to perception, and it announces its own changes to whoever subscribes.

# Parsons

```yaml
- id: memory-note-noise
  prompt: Put NoteNoise in order.
  lines:
    - "void UDojoS6SenseMemoryComponent::NoteNoise(FVector NoiseLocation)"
    - "{"
    - "	if (bTargetVisible)"
    - "	{"
    - "		return;"
    - "	}"
    - "	SetClue(NoiseLocation);"
    - "	OnMemoryChanged.Broadcast(this);"
    - "}"
  distractors:
    - line: "	RememberedTarget.Reset();"
      mistake: A noise says nothing about who was being followed; clearing the target would make the guard forget the intruder it just lost.
    - line: "	OnMemoryChanged.Clear();"
      mistake: Clear removes every listener from the event; the memory announces changes, it never decides who may listen.
- id: memory-watch
  prompt: Put the body of Watch in order, so a second call moves the binding instead of adding one.
  lines:
    - "if (WatchedPerception != nullptr)"
    - "{"
    - "	WatchedPerception->OnTargetPerceptionUpdated.RemoveDynamic(this, &UDojoS6SenseMemoryComponent::HandlePerception);"
    - "}"
    - "WatchedPerception = Perception;"
    - "if (WatchedPerception != nullptr)"
    - "{"
    - "	WatchedPerception->OnTargetPerceptionUpdated.AddUniqueDynamic(this, &UDojoS6SenseMemoryComponent::HandlePerception);"
    - "}"
  distractors:
    - line: "	WatchedPerception->OnPerceptionUpdated.AddDynamic(this, &UDojoS6SenseMemoryComponent::HandlePerception);"
      mistake: OnPerceptionUpdated sends a list of actors with no stimulus, so its handler has a different signature and cannot tell sight from hearing.
```
