---
id: s4-interactable
title: One contract for everything the hero can use
order: 2
kind: build
scaffold: worked
difficulty: 2
patterns: []
skills: [interfaces, actors]
terms: [uinterface, iinterface, blueprintnativeevent, ftext, tobjectptr]
prerequisites: [s4-interaction-plan]
xp: 60
estimatedMinutes: 15
concepts:
  - A contract that doors, signs, and villagers all sign, so callers never ask which one they have
  - A thing that cannot be used right now says so instead of being used and refusing
---

# Brief

When you place a door and a sign and ask each one for its prompt through the interface, the door says `Open door` and the sign says `Read sign`; using the door opens it and the prompt becomes `Close door`, and a locked door says `Locked`, cannot be used, and stays shut when you try.

Most of the code is written for you. Explain the marked lines, then fill the two gaps in `ADojoS4Door`:

1. `GetPrompt_Implementation`: `Locked` while the door is locked, otherwise `Close door` when it is open and `Open door` when it is shut.
2. `Interact_Implementation`: a locked door does nothing and returns false; otherwise flip it between open and shut, show the new state on the label, and return true.

Dependency direction: the door and the sign know the interface and nothing about any hero. Whoever uses them, later an interactor, knows only the interface and nothing about doors or signs. Both carry a box that reports overlaps, so a sphere on the hero can find them.

This is the first piece of the Village Gate boss.

## See it in the editor

Place a `DojoS4Door` and a `DojoS4Sign` in the level. In the level Blueprint, get both with the Outliner's references, and on BeginPlay call Get Prompt on each through the interface and print the results. On the 1 key call Interact on the door with the player pawn and print Get Prompt again. Press Play: `Open door` and `Read sign` print; press 1 and `Close door` prints, with the label above the door reading OPEN.

# Files

## DojoS4Interactable.h

```cpp
#pragma once

#include "CoreMinimal.h"
#include "UObject/Interface.h"
#include "DojoS4Interactable.generated.h"

/** The reflected half of the interactable interface; it only exists so the engine can find the interface. */
UINTERFACE(Blueprintable) // @explain: UINTERFACE makes the interface visible to reflection, so Blueprints can implement it and the engine can ask whether a class does.
class UDojoS4Interactable : public UInterface
{
	GENERATED_BODY()
};

/** Anything a player can walk up to and use; the interactor asks for the interface instead of casting to each class. */
class IDojoS4Interactable
{
	GENERATED_BODY()

public:
	/** The short verb phrase shown to the player, such as "Open door". */
	UFUNCTION(BlueprintNativeEvent, BlueprintCallable, Category = "Interact")
	FText GetPrompt() const;

	/** True when this interactor may use it right now; a thing that cannot be used is never offered. */
	UFUNCTION(BlueprintNativeEvent, BlueprintCallable, Category = "Interact")
	bool CanInteract(AActor* Interactor) const;

	/** Reacts to the interactor using it; returns true when something happened. */
	UFUNCTION(BlueprintNativeEvent, BlueprintCallable, Category = "Interact") // @explain: A native event is implemented in C++ in a function ending in _Implementation, and a Blueprint may override it; callers go through Execute_Interact.
	bool Interact(AActor* Interactor);
};
```

## DojoS4Door.h

```cpp
#pragma once

#include "CoreMinimal.h"
#include "DojoS4Interactable.h"
#include "GameFramework/Actor.h"
#include "DojoS4Door.generated.h"

class UBoxComponent;
class UTextRenderComponent;

/** A door that opens and closes when used and can be locked; its box lets interactors find it by overlap. */
UCLASS()
class ADojoS4Door : public AActor, public IDojoS4Interactable // @explain: A class has one base class but can implement any number of interfaces, so a door is an actor and also something that can be interacted with.
{
	GENERATED_BODY()

public:
	/** Creates the box and the label and turns ticking off. */
	ADojoS4Door();

	/** The box an interactor's sphere overlaps. */
	UPROPERTY(VisibleAnywhere, Category = "Door")
	TObjectPtr<UBoxComponent> Body;

	/** Floating text that shows SHUT, OPEN, or LOCKED. */
	UPROPERTY(VisibleAnywhere, Category = "Door")
	TObjectPtr<UTextRenderComponent> Label;

	/** True while the door is open. */
	UFUNCTION(BlueprintPure, Category = "Door")
	bool IsOpen() const;

	/** True while the door is locked. */
	UFUNCTION(BlueprintPure, Category = "Door")
	bool IsLocked() const;

	/** Shuts the door and locks it. */
	UFUNCTION(BlueprintCallable, Category = "Door")
	void Lock();

	/** Unlocks the door; it stays shut until someone opens it. */
	UFUNCTION(BlueprintCallable, Category = "Door")
	void Unlock();

	/** "Locked", "Close door", or "Open door". */
	virtual FText GetPrompt_Implementation() const override;

	/** A locked door cannot be used. */
	virtual bool CanInteract_Implementation(AActor* Interactor) const override;

	/** Opens a shut door and shuts an open one; false for a locked door. */
	virtual bool Interact_Implementation(AActor* Interactor) override;

private:
	/** Shows the door's state on the label. */
	void RefreshLabel();

	bool bOpen = false;
	bool bLocked = false;
};
```

## DojoS4Door.cpp

```cpp
#include "DojoS4Door.h"

#include "Components/BoxComponent.h"
#include "Components/TextRenderComponent.h"

ADojoS4Door::ADojoS4Door()
{
	PrimaryActorTick.bCanEverTick = false;

	Body = CreateDefaultSubobject<UBoxComponent>(TEXT("Body"));
	RootComponent = Body;
	Body->SetBoxExtent(FVector(50.f, 50.f, 100.f));
	Body->SetCollisionProfileName(TEXT("OverlapAllDynamic"));
	Body->SetGenerateOverlapEvents(true); // @explain: Overlap events are already on for a box, but the interactor finds the door only through them, so the code states the dependency instead of relying on the default.

	Label = CreateDefaultSubobject<UTextRenderComponent>(TEXT("Label"));
	Label->SetupAttachment(Body);
	Label->SetHorizontalAlignment(EHTA_Center);
	Label->SetText(FText::FromString(TEXT("SHUT")));
}

bool ADojoS4Door::IsOpen() const
{
	return bOpen;
}

bool ADojoS4Door::IsLocked() const
{
	return bLocked;
}

void ADojoS4Door::Lock()
{
	bOpen = false;
	bLocked = true;
	RefreshLabel();
}

void ADojoS4Door::Unlock()
{
	bLocked = false;
	RefreshLabel();
}

FText ADojoS4Door::GetPrompt_Implementation() const
{
	// Your code: return "Locked" while the door is locked, otherwise "Close door" when it is open and "Open door" when it is shut.
	return FText::GetEmpty();
}

bool ADojoS4Door::CanInteract_Implementation(AActor* Interactor) const
{
	return !bLocked;
}

bool ADojoS4Door::Interact_Implementation(AActor* Interactor)
{
	// Your code: do nothing and return false for a locked door.
	// Your code: otherwise flip the door between open and shut, show the new state on the label, and return true.
	return false;
}

void ADojoS4Door::RefreshLabel()
{
	const TCHAR* State = bLocked ? TEXT("LOCKED") : (bOpen ? TEXT("OPEN") : TEXT("SHUT"));
	Label->SetText(FText::FromString(State));
}
```

## DojoS4Sign.h

```cpp
#pragma once

#include "CoreMinimal.h"
#include "DojoS4Interactable.h"
#include "GameFramework/Actor.h"
#include "DojoS4Sign.generated.h"

class UBoxComponent;

/** A sign that can be read any number of times; a second kind of interactable that shares nothing with the door but the interface. */
UCLASS()
class ADojoS4Sign : public AActor, public IDojoS4Interactable
{
	GENERATED_BODY()

public:
	/** Creates the box and turns ticking off. */
	ADojoS4Sign();

	/** The box an interactor's sphere overlaps. */
	UPROPERTY(VisibleAnywhere, Category = "Sign")
	TObjectPtr<UBoxComponent> Body;

	/** How many times the sign has been read. */
	UFUNCTION(BlueprintPure, Category = "Sign")
	int32 GetReadCount() const;

	/** Always "Read sign". */
	virtual FText GetPrompt_Implementation() const override;

	/** A sign can always be read. */
	virtual bool CanInteract_Implementation(AActor* Interactor) const override;

	/** Counts one reading and returns true. */
	virtual bool Interact_Implementation(AActor* Interactor) override;

private:
	int32 ReadCount = 0;
};
```

## DojoS4Sign.cpp

```cpp
#include "DojoS4Sign.h"

#include "Components/BoxComponent.h"

ADojoS4Sign::ADojoS4Sign()
{
	PrimaryActorTick.bCanEverTick = false;

	Body = CreateDefaultSubobject<UBoxComponent>(TEXT("Body"));
	RootComponent = Body;
	Body->SetBoxExtent(FVector(30.f, 30.f, 60.f));
	Body->SetCollisionProfileName(TEXT("OverlapAllDynamic"));
	Body->SetGenerateOverlapEvents(true);
}

int32 ADojoS4Sign::GetReadCount() const
{
	return ReadCount;
}

FText ADojoS4Sign::GetPrompt_Implementation() const
{
	return FText::FromString(TEXT("Read sign"));
}

bool ADojoS4Sign::CanInteract_Implementation(AActor* Interactor) const
{
	return true;
}

bool ADojoS4Sign::Interact_Implementation(AActor* Interactor)
{
	++ReadCount;
	return true;
}
```

# Tests

```cpp
#include "Misc/AutomationTest.h"

#if WITH_AUTOMATION_TESTS

#include "Components/BoxComponent.h"
#include "Components/TextRenderComponent.h"
#include "Quests/s4-interactable/DojoS4Door.h"
#include "Quests/s4-interactable/DojoS4Interactable.h"
#include "Quests/s4-interactable/DojoS4Sign.h"
#include "Support/DojoTestActor.h"
#include "Support/DojoTestWorld.h"

namespace DojoS4InteractableTest
{
	/** Asks any actor for its prompt through the interface, the way an interactor does. */
	FString PromptOf(AActor* Thing)
	{
		return IDojoS4Interactable::Execute_GetPrompt(Thing).ToString();
	}
}

IMPLEMENT_SIMPLE_AUTOMATION_TEST(FDojo_S4_Interactable_DoorStates, "Dojo.S4.Interactable.DoorStates", EAutomationTestFlags::EditorContext | EAutomationTestFlags::ProductFilter)

/** Opens, closes, locks, and unlocks a door through the interface and checks the prompt and the answers each time. */
bool FDojo_S4_Interactable_DoorStates::RunTest(const FString& Parameters)
{
	using namespace DojoS4InteractableTest;

	FDojoTestWorld TestWorld;

	ADojoS4Door* Door = TestWorld.SpawnActor<ADojoS4Door>();
	ADojoTestActor* Hero = TestWorld.SpawnActor<ADojoTestActor>();
	if (!TestNotNull(TEXT("Door spawned"), Door) || !TestNotNull(TEXT("Hero spawned"), Hero)) return false;

	TestTrue(TEXT("A door is an interactable"), Door->GetClass()->ImplementsInterface(UDojoS4Interactable::StaticClass()));
	TestEqual(TEXT("A shut door offers to open"), PromptOf(Door), FString(TEXT("Open door")));
	TestEqual(TEXT("The label says SHUT"), Door->Label->Text.ToString(), FString(TEXT("SHUT")));
	TestTrue(TEXT("A shut door can be used"), IDojoS4Interactable::Execute_CanInteract(Door, Hero));

	TestTrue(TEXT("Using a shut door does something"), IDojoS4Interactable::Execute_Interact(Door, Hero));
	TestTrue(TEXT("The door is open"), Door->IsOpen());
	TestEqual(TEXT("An open door offers to close"), PromptOf(Door), FString(TEXT("Close door")));
	TestEqual(TEXT("The label says OPEN"), Door->Label->Text.ToString(), FString(TEXT("OPEN")));

	TestTrue(TEXT("Using an open door does something"), IDojoS4Interactable::Execute_Interact(Door, Hero));
	TestFalse(TEXT("The door is shut again"), Door->IsOpen());
	TestEqual(TEXT("The label says SHUT again"), Door->Label->Text.ToString(), FString(TEXT("SHUT")));

	IDojoS4Interactable::Execute_Interact(Door, Hero);
	Door->Lock();
	TestFalse(TEXT("Locking shuts an open door"), Door->IsOpen());
	TestTrue(TEXT("The door is locked"), Door->IsLocked());
	TestEqual(TEXT("A locked door says so"), PromptOf(Door), FString(TEXT("Locked")));
	TestEqual(TEXT("And so does its label"), Door->Label->Text.ToString(), FString(TEXT("LOCKED")));
	TestFalse(TEXT("A locked door cannot be used"), IDojoS4Interactable::Execute_CanInteract(Door, Hero));
	TestFalse(TEXT("Using a locked door does nothing"), IDojoS4Interactable::Execute_Interact(Door, Hero));
	TestFalse(TEXT("A locked door stays shut"), Door->IsOpen());

	Door->Unlock();
	TestFalse(TEXT("The door is unlocked"), Door->IsLocked());
	TestFalse(TEXT("Unlocking does not open it"), Door->IsOpen());
	TestEqual(TEXT("An unlocked door offers to open"), PromptOf(Door), FString(TEXT("Open door")));
	TestEqual(TEXT("And its label says SHUT"), Door->Label->Text.ToString(), FString(TEXT("SHUT")));

	return true;
}

IMPLEMENT_SIMPLE_AUTOMATION_TEST(FDojo_S4_Interactable_TwoKindsOneInterface, "Dojo.S4.Interactable.TwoKindsOneInterface", EAutomationTestFlags::EditorContext | EAutomationTestFlags::ProductFilter)

/** Treats a sign and a door the same way through the interface, and checks a plain actor is not an interactable. */
bool FDojo_S4_Interactable_TwoKindsOneInterface::RunTest(const FString& Parameters)
{
	using namespace DojoS4InteractableTest;

	FDojoTestWorld TestWorld;

	ADojoS4Sign* Sign = TestWorld.SpawnActor<ADojoS4Sign>();
	ADojoS4Door* Door = TestWorld.SpawnActor<ADojoS4Door>();
	ADojoTestActor* Hero = TestWorld.SpawnActor<ADojoTestActor>();
	if (!TestNotNull(TEXT("Sign spawned"), Sign) || !TestNotNull(TEXT("Hero spawned"), Hero)) return false;

	TArray<AActor*> Things = { Sign, Door, Hero };
	int32 Usable = 0;

	for (AActor* Thing : Things)
	{
		if (Thing->GetClass()->ImplementsInterface(UDojoS4Interactable::StaticClass()) && IDojoS4Interactable::Execute_CanInteract(Thing, Hero))
		{
			++Usable;
		}
	}

	TestEqual(TEXT("The sign and the door are interactables and the hero is not"), Usable, 2);
	TestEqual(TEXT("A sign has its own prompt"), PromptOf(Sign), FString(TEXT("Read sign")));

	TestTrue(TEXT("Reading works"), IDojoS4Interactable::Execute_Interact(Sign, Hero));
	TestTrue(TEXT("Reading again works"), IDojoS4Interactable::Execute_Interact(Sign, Hero));
	TestEqual(TEXT("Both readings were counted"), Sign->GetReadCount(), 2);

	return true;
}

IMPLEMENT_SIMPLE_AUTOMATION_TEST(FDojo_S4_Interactable_FindableByOverlap, "Dojo.S4.Interactable.FindableByOverlap", EAutomationTestFlags::EditorContext | EAutomationTestFlags::ProductFilter)

/** Checks through reflection and components that the interface is a real one and that both kinds carry an overlap box. */
bool FDojo_S4_Interactable_FindableByOverlap::RunTest(const FString& Parameters)
{
	FDojoTestWorld TestWorld;

	ADojoS4Door* Door = TestWorld.SpawnActor<ADojoS4Door>();
	ADojoS4Sign* Sign = TestWorld.SpawnActor<ADojoS4Sign>();
	if (!TestNotNull(TEXT("Door spawned"), Door) || !TestNotNull(TEXT("Sign spawned"), Sign)) return false;

	TestTrue(TEXT("The interface is a reflected interface class"), UDojoS4Interactable::StaticClass()->HasAnyClassFlags(CLASS_Interface));

	for (const UBoxComponent* Box : { Door->Body.Get(), Sign->Body.Get() })
	{
		if (!TestNotNull(TEXT("Both kinds have a box"), Box)) continue;

		TestTrue(TEXT("The box reports overlaps"), Box->GetGenerateOverlapEvents());
		TestEqual(TEXT("The box uses the overlap profile"), Box->GetCollisionProfileName(), FName(TEXT("OverlapAllDynamic")));
	}

	return true;
}

#endif
```

# Hints

- A door has more than one state, so decide which one the prompt reports first.
- The prompt is text, and the label above the door already has a function that shows the current state.
- Do the check that can refuse before anything changes, so a refused use leaves the door exactly as it was.

# Rubric

- The interface has three functions and every caller uses it through the generated `Execute_` functions, never by casting to a door or a sign.
- The prompt always matches the door's true state, including Locked.
- A locked door cannot be used and an attempt changes nothing.
- A thing says it cannot be used through `CanInteract` instead of being offered and then refusing.
- Both kinds carry a box with overlap events on, so something can find them without knowing their class.
- The door and the sign know the interface and nothing about any hero.

# Alternative

An abstract base class `ADojoS4UsableActor` with the three functions would also work, and gives the door and the sign shared code, such as the box. But anything that is already some other kind of actor, a character that can be talked to or a pickup that can be used, could not join, because a class has only one base. An interface asks only that a class sign the contract, so a villager that is a pawn or a prop that is a static mesh can be used the same way. This is why Pack 1's interact quest used an interface.

# Parsons

```yaml
- id: door-interact
  prompt: Put Interact in order.
  lines:
    - "bool ADojoS4Door::Interact_Implementation(AActor* Interactor)"
    - "{"
    - "	if (bLocked)"
    - "	{"
    - "		return false;"
    - "	}"
    - "	bOpen = !bOpen;"
    - "	RefreshLabel();"
    - "	return true;"
    - "}"
  distractors:
    - line: "	return Super::Interact_Implementation(Interactor);"
      mistake: AActor has no Interact function to call; the interface only declares the function and the door is the one that defines what it does.
    - line: "	IDojoS4Interactable::Execute_Interact(this, Interactor);"
      mistake: That asks the door to use itself and would call this same function again without end; the body of the implementation just does the work.
```
