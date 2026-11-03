---
id: s4-interactor
title: A sphere that offers the nearest thing to use
order: 3
kind: build
scaffold: faded
difficulty: 3
patterns: [component, observer]
skills: [components, delegates, collision]
terms: [actor-component, dynamic-multicast-delegate, broadcast, adddynamic, unbinding-delegates, tarray, tobjectptr]
prerequisites: [s4-interactable]
xp: 80
estimatedMinutes: 25
concepts:
  - Finding what is near by listening to overlaps instead of searching every frame
  - Offering only what can be used, nearest first, with the first arrival winning a tie
  - Announcing a change of focus only when something really changed
---

# Brief

When a hero with an interactor stands among a door and two signs, the nearest thing that can be used is the focus; locking the door moves the focus to a sign; using the focus works on whatever is in focus; and the interactor announces each change of focus or of its prompt exactly once.

Compiles against earlier quests: s4-interactable (`Quests/s4-interactable/DojoS4Interactable.h`).

The interactor is a sphere component with a reach of 200. It listens to its own overlaps, remembers the actors in reach that sign the interactable contract, and is written for you down to the two bodies that decide things. Fill them:

1. `Refresh`: of the actors in `Nearby`, pick the nearest one that the owner can use. At the same distance the one that arrived first keeps the focus. Read its prompt, and when neither the focus nor the prompt changed since last time, stop without announcing anything. Otherwise store both and broadcast `OnFocusChanged`.
2. `TryInteract`: false when there is no focus; otherwise use the focus on behalf of the owner through the interface, work the focus out again because using it may have changed it, and return what the use returned.

Dependency direction: the interactor knows only the interface. It holds no pointer to the prompt and no list of kinds; whoever shows a prompt subscribes to `OnFocusChanged`. `UDojoS4FocusSpy` is a ready-made listener that the tests use to count notices.

This is the second piece of the Village Gate boss.

## See it in the editor

Make a Blueprint actor `BP_Hero` with a `DojoS4Interactor` component, and place it in the level 100 units from a `DojoS4Door`, with a `DojoS4Sign` 150 units from the hero and another 600 away. In the level Blueprint, with the hero selected, get its interactor with Get Component by Class. On BeginPlay bind a custom event to On Focus Changed that prints the prompt, and on the 1 key call Try Interact. Press Play: the prompt `Open door` prints once; press 1 and `Close door` prints, with the door open.

# Files

## DojoS4Interactor.h

```cpp
#pragma once

#include "CoreMinimal.h"
#include "Components/SphereComponent.h"
#include "DojoS4Interactor.generated.h"

/** Broadcast when the thing the interactor would use changes, or its prompt does; Focus is null when nothing can be used. */
DECLARE_DYNAMIC_MULTICAST_DELEGATE_TwoParams(FDojoS4OnFocusChanged, AActor*, Focus, FText, Prompt);

/** A sphere on the hero that finds the interactables around it by overlap, picks the nearest one that can be used, and announces it; it never polls. */
UCLASS(ClassGroup = (Dojo), meta = (BlueprintSpawnableComponent))
class UDojoS4Interactor : public USphereComponent
{
	GENERATED_BODY()

public:
	/** Sets the reach, the overlap profile, and turns ticking off. */
	UDojoS4Interactor();

	/** Fires when the focus or its prompt changes. */
	UPROPERTY(BlueprintAssignable, Category = "Interactor")
	FDojoS4OnFocusChanged OnFocusChanged;

	/** The interactable that Interact would use now, or null. */
	UFUNCTION(BlueprintPure, Category = "Interactor")
	AActor* GetFocus() const;

	/** The focus's prompt, or empty text. */
	UFUNCTION(BlueprintPure, Category = "Interactor")
	FText GetFocusPrompt() const;

	/** Works the focus out again; call it after something nearby changes whether it can be used. */
	UFUNCTION(BlueprintCallable, Category = "Interactor")
	void Refresh();

	/** Uses the focus on behalf of the owner; false when there is no focus. */
	UFUNCTION(BlueprintCallable, Category = "Interactor")
	bool TryInteract();

protected:
	/** Starts listening to the sphere's own overlaps. */
	virtual void BeginPlay() override;

	/** Stops listening. */
	virtual void EndPlay(const EEndPlayReason::Type EndPlayReason) override;

private:
	/** Something entered the sphere. */
	UFUNCTION()
	void HandleBeginOverlap(UPrimitiveComponent* OverlappedComponent, AActor* OtherActor, UPrimitiveComponent* OtherComponent, int32 OtherBodyIndex, bool bFromSweep, const FHitResult& SweepResult);

	/** Something left the sphere. */
	UFUNCTION()
	void HandleEndOverlap(UPrimitiveComponent* OverlappedComponent, AActor* OtherActor, UPrimitiveComponent* OtherComponent, int32 OtherBodyIndex);

	/** The interactables inside the sphere, in the order they arrived. */
	UPROPERTY()
	TArray<TObjectPtr<AActor>> Nearby;

	UPROPERTY()
	TObjectPtr<AActor> CurrentFocus;

	FText CurrentPrompt;
};
```

## DojoS4Interactor.cpp

```cpp
#include "DojoS4Interactor.h"

#include "Quests/s4-interactable/DojoS4Interactable.h"

UDojoS4Interactor::UDojoS4Interactor()
{
	PrimaryComponentTick.bCanEverTick = false;

	InitSphereRadius(200.f);
	SetCollisionProfileName(TEXT("OverlapAllDynamic"));
	SetGenerateOverlapEvents(true);
}

void UDojoS4Interactor::BeginPlay()
{
	Super::BeginPlay();

	OnComponentBeginOverlap.AddUniqueDynamic(this, &UDojoS4Interactor::HandleBeginOverlap);
	OnComponentEndOverlap.AddUniqueDynamic(this, &UDojoS4Interactor::HandleEndOverlap);
}

void UDojoS4Interactor::EndPlay(const EEndPlayReason::Type EndPlayReason)
{
	OnComponentBeginOverlap.RemoveDynamic(this, &UDojoS4Interactor::HandleBeginOverlap);
	OnComponentEndOverlap.RemoveDynamic(this, &UDojoS4Interactor::HandleEndOverlap);

	Super::EndPlay(EndPlayReason);
}

AActor* UDojoS4Interactor::GetFocus() const
{
	return CurrentFocus;
}

FText UDojoS4Interactor::GetFocusPrompt() const
{
	return CurrentPrompt;
}

void UDojoS4Interactor::Refresh()
{
	Nearby.RemoveAll([](const TObjectPtr<AActor>& Candidate) { return !IsValid(Candidate); });

	// Your code: pick the nearest actor in Nearby that can be used by the owner; at the same distance the one that arrived first keeps it.
	// Your code: read its prompt (empty when there is none) and stop here, announcing nothing, when neither the focus nor the prompt changed.
	// Your code: store the new focus and prompt, then announce them with OnFocusChanged.
}

bool UDojoS4Interactor::TryInteract()
{
	// Your code: return false when there is no focus.
	// Your code: use the focus on behalf of the owner through the interface, work the focus out again because using it may have changed it, and return what the use returned.
	return false;
}

void UDojoS4Interactor::HandleBeginOverlap(UPrimitiveComponent* OverlappedComponent, AActor* OtherActor, UPrimitiveComponent* OtherComponent, int32 OtherBodyIndex, bool bFromSweep, const FHitResult& SweepResult)
{
	if (OtherActor == nullptr || OtherActor == GetOwner() || !OtherActor->GetClass()->ImplementsInterface(UDojoS4Interactable::StaticClass()))
	{
		return;
	}

	Nearby.AddUnique(OtherActor);
	Refresh();
}

void UDojoS4Interactor::HandleEndOverlap(UPrimitiveComponent* OverlappedComponent, AActor* OtherActor, UPrimitiveComponent* OtherComponent, int32 OtherBodyIndex)
{
	if (Nearby.Remove(OtherActor) > 0)
	{
		Refresh();
	}
}
```

## DojoS4FocusSpy.h

```cpp
#pragma once

#include "CoreMinimal.h"
#include "UObject/Object.h"
#include "DojoS4FocusSpy.generated.h"

class UDojoS4Interactor;

/** A listener that counts an interactor's focus notices and remembers the last focus and prompt; it only subscribes. */
UCLASS()
class UDojoS4FocusSpy : public UObject
{
	GENERATED_BODY()

public:
	/** Starts listening to the interactor, once however many times it is called. */
	UFUNCTION(BlueprintCallable, Category = "Focus Spy")
	void Watch(UDojoS4Interactor* Interactor);

	/** How many notices have arrived. */
	UFUNCTION(BlueprintPure, Category = "Focus Spy")
	int32 GetNoticeCount() const;

	/** The focus in the last notice, or null. */
	UFUNCTION(BlueprintPure, Category = "Focus Spy")
	AActor* GetLastFocus() const;

	/** The prompt in the last notice. */
	UFUNCTION(BlueprintPure, Category = "Focus Spy")
	FString GetLastPrompt() const;

private:
	/** Counts the notice and keeps what it carried. */
	UFUNCTION()
	void HandleFocusChanged(AActor* Focus, FText Prompt);

	int32 NoticeCount = 0;

	UPROPERTY()
	TObjectPtr<AActor> LastFocus;

	FString LastPrompt;
};
```

## DojoS4FocusSpy.cpp

```cpp
#include "DojoS4FocusSpy.h"

#include "DojoS4Interactor.h"

void UDojoS4FocusSpy::Watch(UDojoS4Interactor* Interactor)
{
	if (Interactor == nullptr)
	{
		return;
	}

	Interactor->OnFocusChanged.AddUniqueDynamic(this, &UDojoS4FocusSpy::HandleFocusChanged);
}

int32 UDojoS4FocusSpy::GetNoticeCount() const
{
	return NoticeCount;
}

AActor* UDojoS4FocusSpy::GetLastFocus() const
{
	return LastFocus;
}

FString UDojoS4FocusSpy::GetLastPrompt() const
{
	return LastPrompt;
}

void UDojoS4FocusSpy::HandleFocusChanged(AActor* Focus, FText Prompt)
{
	++NoticeCount;
	LastFocus = Focus;
	LastPrompt = Prompt.ToString();
}
```

# Tests

```cpp
#include "Misc/AutomationTest.h"

#if WITH_AUTOMATION_TESTS

#include "Components/BoxComponent.h"
#include "Quests/s4-interactable/DojoS4Door.h"
#include "Quests/s4-interactable/DojoS4Sign.h"
#include "Quests/s4-interactor/DojoS4FocusSpy.h"
#include "Quests/s4-interactor/DojoS4Interactor.h"
#include "Support/DojoTestActor.h"
#include "Support/DojoTestWorld.h"
#include "UObject/StrongObjectPtr.h"

namespace DojoS4InteractorTest
{
	/** A hero at the origin with an interactor sphere on its root. */
	struct FHero
	{
		ADojoTestActor* Actor = nullptr;
		UDojoS4Interactor* Interactor = nullptr;
	};

	/** Spawns the hero and attaches the interactor, the way a designer would in the Components panel. */
	FHero MakeHero(FDojoTestWorld& TestWorld)
	{
		FHero Hero;
		Hero.Actor = TestWorld.SpawnActor<ADojoTestActor>();
		Hero.Interactor = TestWorld.AddComponent<UDojoS4Interactor>(Hero.Actor);
		Hero.Interactor->AttachToComponent(Hero.Actor->GetRootComponent(), FAttachmentTransformRules::SnapToTargetNotIncludingScale);
		return Hero;
	}

	/** Spawns an interactable of this class at this place. */
	template<typename TThing>
	TThing* SpawnAt(FDojoTestWorld& TestWorld, const FVector& Location)
	{
		TThing* Thing = TestWorld.SpawnActor<TThing>();
		Thing->SetActorLocation(Location);
		return Thing;
	}
}

IMPLEMENT_SIMPLE_AUTOMATION_TEST(FDojo_S4_Interactor_NearestUsableWins, "Dojo.S4.Interactor.NearestUsableWins", EAutomationTestFlags::EditorContext | EAutomationTestFlags::ProductFilter)

/** Walks a hero among a door and two signs and checks the focus, the prompt, and the notices at each step. */
bool FDojo_S4_Interactor_NearestUsableWins::RunTest(const FString& Parameters)
{
	using namespace DojoS4InteractorTest;

	FDojoTestWorld TestWorld;

	FHero Hero = MakeHero(TestWorld);
	TStrongObjectPtr<UDojoS4FocusSpy> Spy(NewObject<UDojoS4FocusSpy>());
	Spy->Watch(Hero.Interactor);
	Spy->Watch(Hero.Interactor);
	if (!TestNotNull(TEXT("Interactor created"), Hero.Interactor)) return false;

	TestEqual(TEXT("The reach is 200"), Hero.Interactor->GetScaledSphereRadius(), 200.f);
	TestTrue(TEXT("Nothing is in reach at first"), Hero.Interactor->GetFocus() == nullptr);
	TestFalse(TEXT("With no focus, interacting does nothing"), Hero.Interactor->TryInteract());

	ADojoS4Door* Door = SpawnAt<ADojoS4Door>(TestWorld, FVector(100.f, 0.f, 0.f));
	TestWorld.Tick(2);
	ADojoS4Sign* Sign = SpawnAt<ADojoS4Sign>(TestWorld, FVector(150.f, 0.f, 0.f));
	ADojoS4Sign* FarSign = SpawnAt<ADojoS4Sign>(TestWorld, FVector(600.f, 0.f, 0.f));
	TestWorld.Tick(2);

	TestTrue(TEXT("The door, 100 away, is the focus"), Hero.Interactor->GetFocus() == Door);
	TestEqual(TEXT("The prompt is the door's"), Hero.Interactor->GetFocusPrompt().ToString(), FString(TEXT("Open door")));
	TestEqual(TEXT("Only the arrival of the door changed the focus"), Spy->GetNoticeCount(), 1);

	TestTrue(TEXT("Using the focus works"), Hero.Interactor->TryInteract());
	TestTrue(TEXT("The door opened"), Door->IsOpen());
	TestTrue(TEXT("The focus is still the door"), Hero.Interactor->GetFocus() == Door);
	TestEqual(TEXT("But its prompt changed"), Spy->GetLastPrompt(), FString(TEXT("Close door")));
	TestEqual(TEXT("And that was announced"), Spy->GetNoticeCount(), 2);

	Door->Lock();
	Hero.Interactor->Refresh();
	TestTrue(TEXT("A locked door is skipped, so the sign is the focus"), Hero.Interactor->GetFocus() == Sign);
	TestEqual(TEXT("The prompt is the sign's"), Spy->GetLastPrompt(), FString(TEXT("Read sign")));
	TestEqual(TEXT("That was announced"), Spy->GetNoticeCount(), 3);

	Hero.Interactor->Refresh();
	TestEqual(TEXT("Refreshing with nothing changed announces nothing"), Spy->GetNoticeCount(), 3);

	TestTrue(TEXT("Reading the sign works"), Hero.Interactor->TryInteract());
	TestEqual(TEXT("The sign was read once"), Sign->GetReadCount(), 1);
	TestEqual(TEXT("Reading changes neither focus nor prompt, so no notice"), Spy->GetNoticeCount(), 3);

	Door->Unlock();
	Hero.Interactor->Refresh();
	TestTrue(TEXT("The unlocked door is nearer again"), Hero.Interactor->GetFocus() == Door);
	TestEqual(TEXT("It offers to open"), Spy->GetLastPrompt(), FString(TEXT("Open door")));

	Hero.Actor->SetActorLocation(FVector(600.f, 0.f, 0.f));
	TestWorld.Tick(2);
	TestTrue(TEXT("Standing by the far sign it is the focus"), Hero.Interactor->GetFocus() == FarSign);
	TestEqual(TEXT("With its prompt"), Hero.Interactor->GetFocusPrompt().ToString(), FString(TEXT("Read sign")));

	Hero.Actor->SetActorLocation(FVector(3000.f, 0.f, 0.f));
	TestWorld.Tick(2);
	TestTrue(TEXT("Out of everyone's reach there is no focus"), Hero.Interactor->GetFocus() == nullptr);
	TestTrue(TEXT("And the last notice said so"), Spy->GetLastFocus() == nullptr && Spy->GetLastPrompt().IsEmpty());
	TestFalse(TEXT("Interacting does nothing again"), Hero.Interactor->TryInteract());

	return true;
}

IMPLEMENT_SIMPLE_AUTOMATION_TEST(FDojo_S4_Interactor_TiesAndLeavers, "Dojo.S4.Interactor.TiesAndLeavers", EAutomationTestFlags::EditorContext | EAutomationTestFlags::ProductFilter)

/** Puts two signs at the same distance, then removes the first, and checks the first arrival wins and a vanished focus is replaced. */
bool FDojo_S4_Interactor_TiesAndLeavers::RunTest(const FString& Parameters)
{
	using namespace DojoS4InteractorTest;

	FDojoTestWorld TestWorld;

	FHero Hero = MakeHero(TestWorld);
	ADojoS4Sign* First = SpawnAt<ADojoS4Sign>(TestWorld, FVector(100.f, 0.f, 0.f));
	TestWorld.Tick(2);
	ADojoS4Sign* Second = SpawnAt<ADojoS4Sign>(TestWorld, FVector(-100.f, 0.f, 0.f));
	TestWorld.Tick(2);

	TestTrue(TEXT("At the same distance the first to arrive keeps the focus"), Hero.Interactor->GetFocus() == First);

	First->Destroy();
	Hero.Interactor->Refresh();
	TestTrue(TEXT("When the focus is destroyed the other sign takes over"), Hero.Interactor->GetFocus() == Second);

	Second->Destroy();
	Hero.Interactor->Refresh();
	TestTrue(TEXT("With both gone there is no focus"), Hero.Interactor->GetFocus() == nullptr);
	TestFalse(TEXT("And nothing to use"), Hero.Interactor->TryInteract());

	return true;
}

IMPLEMENT_SIMPLE_AUTOMATION_TEST(FDojo_S4_Interactor_IgnoresOthers, "Dojo.S4.Interactor.IgnoresOthers", EAutomationTestFlags::EditorContext | EAutomationTestFlags::ProductFilter)

/** Brings a bystander that is not an interactable into reach and checks it is ignored, then removes the interactor and checks it stops listening. */
bool FDojo_S4_Interactor_IgnoresOthers::RunTest(const FString& Parameters)
{
	using namespace DojoS4InteractorTest;

	FDojoTestWorld TestWorld;

	FHero Hero = MakeHero(TestWorld);
	TStrongObjectPtr<UDojoS4FocusSpy> Spy(NewObject<UDojoS4FocusSpy>());
	Spy->Watch(Hero.Interactor);

	ADojoTestActor* Bystander = TestWorld.SpawnActor<ADojoTestActor>();
	UBoxComponent* Shape = TestWorld.AddComponent<UBoxComponent>(Bystander);
	Shape->AttachToComponent(Bystander->GetRootComponent(), FAttachmentTransformRules::SnapToTargetNotIncludingScale);
	Shape->SetCollisionProfileName(TEXT("OverlapAllDynamic"));
	Shape->SetGenerateOverlapEvents(true);
	Bystander->SetActorLocation(FVector(50.f, 0.f, 0.f));
	TestWorld.Tick(2);

	TestTrue(TEXT("A bystander that is not an interactable is never the focus"), Hero.Interactor->GetFocus() == nullptr);
	TestEqual(TEXT("And it caused no notice"), Spy->GetNoticeCount(), 0);

	TestTrue(TEXT("The interactor listens to its own sphere"), Hero.Interactor->OnComponentBeginOverlap.IsBound());
	Hero.Interactor->DestroyComponent();
	TestFalse(TEXT("A removed interactor has stopped listening"), Hero.Interactor->OnComponentBeginOverlap.IsBound());
	TestFalse(TEXT("And for the end of an overlap too"), Hero.Interactor->OnComponentEndOverlap.IsBound());

	return true;
}

#endif
```

# Hints

- `Refresh` is a search with a running best: start with no best, walk `Nearby`, skip what cannot be used, and keep the candidate only when it is strictly nearer. Strictly nearer is what lets the first arrival keep a tie.
- Comparing squared distances avoids a square root: `FVector::DistSquared`. `FText::EqualTo` compares texts, because two prompts can read the same while being different objects.
- Call the interface with `IDojoS4Interactable::Execute_CanInteract`, `Execute_GetPrompt`, and `Execute_Interact`; they take the actor as their first argument.

# Rubric

- The focus is the nearest actor that can be used by the owner, and at equal distances the first to arrive keeps it.
- `OnFocusChanged` is broadcast once per change of focus or prompt and never when nothing changed.
- `TryInteract` uses the focus through the interface, refreshes afterwards, and returns false with no focus.
- Everything is found by overlap events with no Tick, and a stale or destroyed actor never stays in focus.
- The interactor holds no pointer to any listener and knows no kind of usable thing.

# Alternative

The interactor could line trace from the camera on a custom collision channel and use whatever the ray hits. That matches shooters, where aiming decides, and needs no list of nearby things; it has to run the trace again when the player looks around, and a thing behind a prop needs the prop to block the channel. Overlaps suit third-person and top-down games where closeness decides. The two share their end: a focus and an event. This is the Component pattern from Pack 2's "Actors built from parts" world, with Observer from "The lens, then the first payoff" carrying the notices.

# Parsons

```yaml
- id: interactor-try-interact
  prompt: Put TryInteract in order.
  lines:
    - "bool UDojoS4Interactor::TryInteract()"
    - "{"
    - "	if (!IsValid(CurrentFocus))"
    - "	{"
    - "		return false;"
    - "	}"
    - "	const bool bDone = IDojoS4Interactable::Execute_Interact(CurrentFocus, GetOwner());"
    - "	Refresh();"
    - "	return bDone;"
    - "}"
  distractors:
    - line: "	const bool bDone = CurrentFocus->Interact(GetOwner());"
      mistake: AActor has no Interact function; a thing is used through the interface's generated Execute_Interact, which works for any class that signs it.
    - line: "	Nearby.Empty();"
      mistake: Emptying the list forgets everything in reach, so nothing could be used again until it left and re-entered the sphere.
```
