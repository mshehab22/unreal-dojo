---
id: f5-interact
title: A crate any prodder can open, through an interface
order: 5
kind: build
scaffold: faded
difficulty: 3
patterns: []
skills: [communication, interfaces]
terms: [uinterface, iinterface, blueprintnativeevent, isvalid]
prerequisites: [f5-interfaces, f1-training-dummy]
xp: 70
estimatedMinutes: 18
concepts:
  - A class keeps an interface's promise by implementing its function
  - Callers check Implements and call through Execute_
---

# Brief

When you press Play and the prodder prods a crate, the crate reads OPEN; prodding it again changes nothing, and prodding a World 1 training dummy does nothing at all, with no cast anywhere.

The interface is written for you. Fill in:

1. `ADojoF5Crate::Interact_Implementation`: open the crate and return true the first time; return false once it is already open.
2. `ADojoF5Prodder::Prod`: refuse invalid targets and targets that do not implement the interface; otherwise count the prod as reaching an interactable and call the interface on the target, returning its answer.

Dependency direction: the prodder knows only the interface; the crate knows only the interface; neither knows the other's class. The World 1 dummy is reused as something that does not keep the promise.

Compiles against earlier quests: f1-training-dummy, in the tests only (`Quests/f1-training-dummy/DojoF1TrainingDummy.h`).

## See it in the editor

Place a `DojoF5Prodder`, a `DojoF5Crate`, and a training dummy. In the level Blueprint, on key presses, call Prod on the prodder with the crate, then with the dummy. The crate opens on the first prod only. Then make a Blueprint actor, add the Dojo F5 Interactable interface in its Class Settings, implement Interact with a Print String, and prod it: the prodder reaches the Blueprint the same way it reaches the C++ crate.

# Files

## DojoF5Interactable.h

```cpp
#pragma once

#include "CoreMinimal.h"
#include "UObject/Interface.h"
#include "DojoF5Interactable.generated.h"

/** The reflected half of the interactable interface; it only exists so the engine can find the interface. */
UINTERFACE(Blueprintable) // @explain: Blueprintable lets Blueprint classes implement the interface too.
class UDojoF5Interactable : public UInterface
{
	GENERATED_BODY()
};

/** Anything a player can interact with; callers ask for the interface instead of casting to each class. */
class IDojoF5Interactable
{
	GENERATED_BODY()

public:
	/** Reacts to Instigator interacting; returns true when something happened. */
	UFUNCTION(BlueprintNativeEvent, BlueprintCallable, Category = "Interact") // @explain: A native event, so C++ classes implement Interact_Implementation and Blueprints override Interact.
	bool Interact(AActor* Instigator);
};
```

## DojoF5Crate.h

```cpp
#pragma once

#include "CoreMinimal.h"
#include "DojoF5Interactable.h"
#include "GameFramework/Actor.h"
#include "DojoF5Crate.generated.h"

class UTextRenderComponent;

/** A crate that opens the first time anyone interacts with it. */
UCLASS()
class ADojoF5Crate : public AActor, public IDojoF5Interactable // @explain: The crate keeps the promise by listing the I half as a second parent.
{
	GENERATED_BODY()

public:
	/** Creates the label and turns ticking off. */
	ADojoF5Crate();

	/** Floating text that shows SHUT or OPEN. */
	UPROPERTY(VisibleAnywhere, Category = "Crate")
	TObjectPtr<UTextRenderComponent> Label;

	/** True once opened. */
	UFUNCTION(BlueprintPure, Category = "Crate")
	bool IsOpen() const;

	/** Opens the crate and returns true; returns false once it is already open. */
	virtual bool Interact_Implementation(AActor* Instigator) override;

private:
	bool bOpen = false;
};
```

## DojoF5Crate.cpp

```cpp
#include "DojoF5Crate.h"

#include "Components/TextRenderComponent.h"

ADojoF5Crate::ADojoF5Crate()
{
	PrimaryActorTick.bCanEverTick = false;

	Label = CreateDefaultSubobject<UTextRenderComponent>(TEXT("Label"));
	RootComponent = Label;
	Label->SetHorizontalAlignment(EHTA_Center);
	Label->SetText(FText::FromString(TEXT("SHUT")));
}

bool ADojoF5Crate::IsOpen() const
{
	return bOpen;
}

bool ADojoF5Crate::Interact_Implementation(AActor* Instigator)
{
	// Your code: refuse when already open.
	// Your code: open, show OPEN on the label, and report that something happened.
	return false;
}
```

## DojoF5Prodder.h

```cpp
#pragma once

#include "CoreMinimal.h"
#include "GameFramework/Actor.h"
#include "DojoF5Prodder.generated.h"

/** Interacts with any actor that implements the interactable interface, without knowing its class. */
UCLASS()
class ADojoF5Prodder : public AActor
{
	GENERATED_BODY()

public:
	/** Creates the scene root and turns ticking off. */
	ADojoF5Prodder();

	/** Interacts with Target through the interface; false when Target is invalid, does not implement it, or nothing happened. */
	UFUNCTION(BlueprintCallable, Category = "Prodder")
	bool Prod(AActor* Target);

	/** How many prods reached an interactable actor, whatever it answered. */
	UFUNCTION(BlueprintPure, Category = "Prodder")
	int32 GetReachedCount() const;

private:
	int32 ReachedCount = 0;
};
```

## DojoF5Prodder.cpp

```cpp
#include "DojoF5Prodder.h"

#include "Components/SceneComponent.h"
#include "DojoF5Interactable.h"

ADojoF5Prodder::ADojoF5Prodder()
{
	PrimaryActorTick.bCanEverTick = false;

	RootComponent = CreateDefaultSubobject<USceneComponent>(TEXT("Root"));
}

bool ADojoF5Prodder::Prod(AActor* Target)
{
	// Your code: refuse an invalid target or one that does not implement the interface.
	// Your code: count the reach, then call Interact through the interface and return its answer.
	return false;
}

int32 ADojoF5Prodder::GetReachedCount() const
{
	return ReachedCount;
}
```

# Tests

```cpp
#include "Misc/AutomationTest.h"

#if WITH_AUTOMATION_TESTS

#include "Components/TextRenderComponent.h"
#include "Quests/f1-training-dummy/DojoF1TrainingDummy.h"
#include "Quests/f5-interact/DojoF5Crate.h"
#include "Quests/f5-interact/DojoF5Interactable.h"
#include "Quests/f5-interact/DojoF5Prodder.h"
#include "Support/DojoTestWorld.h"

IMPLEMENT_SIMPLE_AUTOMATION_TEST(FDojo_F5_Interact_OnlyInteractablesAnswer, "Dojo.F5.Interact.OnlyInteractablesAnswer", EAutomationTestFlags::EditorContext | EAutomationTestFlags::ProductFilter)

/** Prods a crate, a World 1 dummy, and nothing, and checks only the crate is reached and it opens once. */
bool FDojo_F5_Interact_OnlyInteractablesAnswer::RunTest(const FString& Parameters)
{
	FDojoTestWorld TestWorld;

	ADojoF5Prodder* Prodder = TestWorld.SpawnActor<ADojoF5Prodder>();
	ADojoF5Crate* Crate = TestWorld.SpawnActor<ADojoF5Crate>();
	ADojoF1TrainingDummy* Dummy = TestWorld.SpawnActor<ADojoF1TrainingDummy>();
	if (!TestNotNull(TEXT("Prodder spawned"), Prodder) || !TestNotNull(TEXT("Crate spawned"), Crate) || !TestNotNull(TEXT("Dummy spawned"), Dummy)) return false;

	TestTrue(TEXT("The crate implements the interface"), Crate->Implements<UDojoF5Interactable>());
	TestFalse(TEXT("The dummy does not"), Dummy->Implements<UDojoF5Interactable>());

	TestFalse(TEXT("Prodding nothing does nothing"), Prodder->Prod(nullptr));
	TestFalse(TEXT("Prodding a dummy does nothing"), Prodder->Prod(Dummy));
	TestEqual(TEXT("Neither reached an interactable"), Prodder->GetReachedCount(), 0);

	TestTrue(TEXT("The first prod opens the crate"), Prodder->Prod(Crate));
	TestTrue(TEXT("The crate is open"), Crate->IsOpen());
	TestEqual(TEXT("Its label reads OPEN"), Crate->Label->Text.ToString(), FString(TEXT("OPEN")));

	TestFalse(TEXT("A second prod reaches it but changes nothing"), Prodder->Prod(Crate));
	TestEqual(TEXT("Both crate prods reached it"), Prodder->GetReachedCount(), 2);

	return true;
}

IMPLEMENT_SIMPLE_AUTOMATION_TEST(FDojo_F5_Interact_InterfaceIsBlueprintReady, "Dojo.F5.Interact.InterfaceIsBlueprintReady", EAutomationTestFlags::EditorContext | EAutomationTestFlags::ProductFilter)

/** Checks through reflection that Blueprints can implement the interface and override Interact. */
bool FDojo_F5_Interact_InterfaceIsBlueprintReady::RunTest(const FString& Parameters)
{
	const UClass* InterfaceClass = UDojoF5Interactable::StaticClass();
	TestTrue(TEXT("It is an interface"), InterfaceClass->HasAnyClassFlags(CLASS_Interface));
	TestTrue(TEXT("The crate class implements it"), ADojoF5Crate::StaticClass()->ImplementsInterface(InterfaceClass));

	const UFunction* Interact = InterfaceClass->FindFunctionByName(TEXT("Interact"));
	if (!TestNotNull(TEXT("Interact is a UFUNCTION"), Interact)) return false;
	TestTrue(TEXT("Blueprint can override Interact"), Interact->HasAnyFunctionFlags(FUNC_BlueprintEvent));

	return true;
}

#endif
```

# Hints

- The prodder must never mention the crate's class; everything it needs is on the actor and the interface.
- Actors can be asked whether they implement an interface by its reflected U class; the interface's generated static helper takes the target and the instigator.
- `UObject::Implements<T>` is in `UObject/Object.h`; the `Execute_Interact` helper is generated into `DojoF5Interactable.generated.h`.

# Rubric

- Interact_Implementation opens once and returns true, then false, and shows OPEN on the label.
- Prod refuses invalid targets and non-implementers with Implements on the U class.
- Prod calls through IDojoF5Interactable::Execute_Interact, so Blueprint implementations work too.
- The prodder never casts to the crate or any other concrete class.
- The reach count rises only for interactable targets.
- The World 1 dummy is reused unchanged as a target that does not implement the interface.

# Alternative

The prodder could Cast the target to IDojoF5Interactable and call Interact on the pointer. That works for classes that implement the interface in C++, but a Blueprint that implements it in its Class Settings has no C++ I part to cast to, so the cast returns null and the Blueprint is silently skipped. Execute_ checks for the interface through reflection and dispatches to either kind, which is why it is the habit to keep for native and implementable events.

# Parsons

```yaml
- id: prodder-prod
  prompt: Put Prod in order.
  lines:
    - "bool ADojoF5Prodder::Prod(AActor* Target)"
    - "{"
    - "	if (!IsValid(Target) || !Target->Implements<UDojoF5Interactable>()) return false;"
    - "	ReachedCount++;"
    - "	return IDojoF5Interactable::Execute_Interact(Target, this);"
    - "}"
  distractors:
    - line: "	return Cast<ADojoF5Crate>(Target)->Interact(this);"
      mistake: Casting to the crate ties the prodder to one class and skips every other interactable.
```
