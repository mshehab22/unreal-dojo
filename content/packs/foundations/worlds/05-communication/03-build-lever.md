---
id: f5-lever
title: A lever that lamps listen to
order: 3
kind: build
scaffold: worked
difficulty: 2
patterns: [observer]
skills: [communication, delegates]
terms: [dynamic-multicast-delegate, adddynamic, broadcast, unbinding-delegates, blueprintassignable]
prerequisites: [f5-binding-and-unbinding]
xp: 50
estimatedMinutes: 15
concepts:
  - A broadcaster fires an event without knowing its listeners
  - Listeners bind in BeginPlay and unbind in EndPlay
---

# Brief

When you press Play and run `ke * Pull`, every lamp wired to the lever lights at once and the lever reads ON; pull again and they all go dark.

The lever and the lamp are mostly written. Explain the marked lines, then fill three gaps:

1. In `ADojoF5Lever::Pull`, announce the new position through `OnPulled`.
2. In `ADojoF5LeverLamp::BeginPlay`, start listening to the lever's `OnPulled` with `HandlePulled`.
3. In `ADojoF5LeverLamp::EndPlay`, stop listening.

Dependency direction: each lamp holds a reference to its lever and binds itself; the lever never knows any lamp exists, so you can add a tenth lamp without touching the lever.

## See it in the editor

Place one `DojoF5Lever` and three `DojoF5LeverLamp`s. In each lamp's Details panel, pick the lever with the eyedropper. Press Play and run `ke * Pull`: all three read LIT. In a Blueprint child of the lamp, or the level Blueprint, bind to the lever's On Pulled event and print the value: Blueprint hears the same event because it is BlueprintAssignable.

# Files

## DojoF5Lever.h

```cpp
#pragma once

#include "CoreMinimal.h"
#include "GameFramework/Actor.h"
#include "DojoF5Lever.generated.h"

class UTextRenderComponent;

/** Broadcast after every pull, with the lever's new position. */
DECLARE_DYNAMIC_MULTICAST_DELEGATE_OneParam(FDojoF5OnLeverPulled, bool, bIsOn); // @explain: Declares a reflected event type with one bool parameter, named bIsOn, that any number of listeners can bind to.

/** A lever that flips on and off and announces each pull to whoever listens; it never knows who that is. */
UCLASS()
class ADojoF5Lever : public AActor
{
	GENERATED_BODY()

public:
	/** Creates the label and turns ticking off. */
	ADojoF5Lever();

	/** Floating text that shows ON or OFF. */
	UPROPERTY(VisibleAnywhere, Category = "Lever")
	TObjectPtr<UTextRenderComponent> Label;

	/** Fires after every pull; C++ binds with AddDynamic, Blueprint with an event. */
	UPROPERTY(BlueprintAssignable, Category = "Lever") // @explain: BlueprintAssignable lets Blueprints bind to the event too, not only C++.
	FDojoF5OnLeverPulled OnPulled;

	/** Flips the lever and broadcasts its new position. */
	UFUNCTION(BlueprintCallable, Category = "Lever")
	void Pull();

	/** True while the lever is on. */
	UFUNCTION(BlueprintPure, Category = "Lever")
	bool IsOn() const;

protected:
	/** Shows the starting position. */
	virtual void BeginPlay() override;

private:
	/** Writes ON or OFF into the label. */
	void RefreshLabel();

	bool bIsOn = false;
};
```

## DojoF5Lever.cpp

```cpp
#include "DojoF5Lever.h"

#include "Components/TextRenderComponent.h"

ADojoF5Lever::ADojoF5Lever()
{
	PrimaryActorTick.bCanEverTick = false;

	Label = CreateDefaultSubobject<UTextRenderComponent>(TEXT("Label"));
	RootComponent = Label;
	Label->SetHorizontalAlignment(EHTA_Center);
}

void ADojoF5Lever::BeginPlay()
{
	Super::BeginPlay();

	RefreshLabel();
}

void ADojoF5Lever::Pull()
{
	bIsOn = !bIsOn;
	RefreshLabel();

	// Your code: announce the new position to every listener.
}

bool ADojoF5Lever::IsOn() const
{
	return bIsOn;
}

void ADojoF5Lever::RefreshLabel()
{
	Label->SetText(FText::FromString(bIsOn ? TEXT("ON") : TEXT("OFF")));
}
```

## DojoF5LeverLamp.h

```cpp
#pragma once

#include "CoreMinimal.h"
#include "GameFramework/Actor.h"
#include "DojoF5LeverLamp.generated.h"

class ADojoF5Lever;
class UTextRenderComponent;

/** A lamp that follows a lever by listening to its pull event: it knows the lever, the lever never knows the lamp. */
UCLASS()
class ADojoF5LeverLamp : public AActor
{
	GENERATED_BODY()

public:
	/** Creates the label and turns ticking off. */
	ADojoF5LeverLamp();

	/** Floating text that shows LIT or DARK. */
	UPROPERTY(VisibleAnywhere, Category = "Lamp")
	TObjectPtr<UTextRenderComponent> Label;

	/** The lever this lamp listens to, picked in the Details panel. */
	UPROPERTY(EditAnywhere, Category = "Lamp")
	TObjectPtr<ADojoF5Lever> Lever;

	/** True while the lamp is lit. */
	UFUNCTION(BlueprintPure, Category = "Lamp")
	bool IsLit() const;

protected:
	/** Starts listening to the lever. */
	virtual void BeginPlay() override;

	/** Stops listening, so the lever never calls a lamp that has left play. */
	virtual void EndPlay(const EEndPlayReason::Type EndPlayReason) override;

private:
	/** Lights or darkens the lamp to match the lever. */
	UFUNCTION() // @explain: A dynamic delegate finds its handler by reflected name, so the handler must be a UFUNCTION even with no specifiers.
	void HandlePulled(bool bIsOn);

	bool bLit = false;
};
```

## DojoF5LeverLamp.cpp

```cpp
#include "DojoF5LeverLamp.h"

#include "Components/TextRenderComponent.h"
#include "DojoF5Lever.h" // @explain: The header only forward declared the lever; binding to its event needs the full class.

ADojoF5LeverLamp::ADojoF5LeverLamp()
{
	PrimaryActorTick.bCanEverTick = false;

	Label = CreateDefaultSubobject<UTextRenderComponent>(TEXT("Label"));
	RootComponent = Label;
	Label->SetHorizontalAlignment(EHTA_Center);
	Label->SetText(FText::FromString(TEXT("DARK")));
}

void ADojoF5LeverLamp::BeginPlay()
{
	Super::BeginPlay();

	// Your code: when a lever is set, bind HandlePulled to its OnPulled event.
}

void ADojoF5LeverLamp::EndPlay(const EEndPlayReason::Type EndPlayReason)
{
	// Your code: when a lever is set, unbind HandlePulled from its OnPulled event.

	Super::EndPlay(EndPlayReason);
}

bool ADojoF5LeverLamp::IsLit() const
{
	return bLit;
}

void ADojoF5LeverLamp::HandlePulled(bool bIsOn)
{
	bLit = bIsOn;
	Label->SetText(FText::FromString(bLit ? TEXT("LIT") : TEXT("DARK")));
}
```

# Tests

```cpp
#include "Misc/AutomationTest.h"

#if WITH_AUTOMATION_TESTS

#include "Components/TextRenderComponent.h"
#include "Engine/World.h"
#include "Quests/f5-lever/DojoF5Lever.h"
#include "Quests/f5-lever/DojoF5LeverLamp.h"
#include "Support/DojoTestWorld.h"

namespace DojoF5LeverTest
{
	/** Spawns a lamp wired to Lever before its BeginPlay, as a designer would wire it in Details. */
	ADojoF5LeverLamp* SpawnLamp(FDojoTestWorld& TestWorld, ADojoF5Lever* Lever)
	{
		ADojoF5LeverLamp* Lamp = TestWorld.GetWorld()->SpawnActorDeferred<ADojoF5LeverLamp>(ADojoF5LeverLamp::StaticClass(), FTransform::Identity);
		Lamp->Lever = Lever;
		Lamp->FinishSpawning(FTransform::Identity);
		return Lamp;
	}
}

IMPLEMENT_SIMPLE_AUTOMATION_TEST(FDojo_F5_Lever_LampsFollowEveryPull, "Dojo.F5.Lever.LampsFollowEveryPull", EAutomationTestFlags::EditorContext | EAutomationTestFlags::ProductFilter)

/** Wires two lamps to one lever, pulls twice, and checks both lamps follow through the event. */
bool FDojo_F5_Lever_LampsFollowEveryPull::RunTest(const FString& Parameters)
{
	using namespace DojoF5LeverTest;

	FDojoTestWorld TestWorld;

	ADojoF5Lever* Lever = TestWorld.SpawnActor<ADojoF5Lever>();
	if (!TestNotNull(TEXT("Lever spawned"), Lever)) return false;
	ADojoF5LeverLamp* First = SpawnLamp(TestWorld, Lever);
	ADojoF5LeverLamp* Second = SpawnLamp(TestWorld, Lever);

	TestTrue(TEXT("Both lamps are listening"), Lever->OnPulled.Contains(First, TEXT("HandlePulled")) && Lever->OnPulled.Contains(Second, TEXT("HandlePulled")));
	TestFalse(TEXT("Dark before any pull"), First->IsLit());

	Lever->Pull();
	TestTrue(TEXT("The lever is on"), Lever->IsOn());
	TestTrue(TEXT("The first lamp lit through the event"), First->IsLit());
	TestTrue(TEXT("The second lamp lit through the event"), Second->IsLit());
	TestEqual(TEXT("The lever's label reads ON"), Lever->Label->Text.ToString(), FString(TEXT("ON")));
	TestEqual(TEXT("A lamp's label reads LIT"), First->Label->Text.ToString(), FString(TEXT("LIT")));

	Lever->Pull();
	TestFalse(TEXT("Off again after the second pull"), Second->IsLit());

	return true;
}

IMPLEMENT_SIMPLE_AUTOMATION_TEST(FDojo_F5_Lever_LampStopsListeningOnEndPlay, "Dojo.F5.Lever.LampStopsListeningOnEndPlay", EAutomationTestFlags::EditorContext | EAutomationTestFlags::ProductFilter)

/** Destroys one lamp and checks it has unbound itself, while the other lamp still follows. */
bool FDojo_F5_Lever_LampStopsListeningOnEndPlay::RunTest(const FString& Parameters)
{
	using namespace DojoF5LeverTest;

	FDojoTestWorld TestWorld;

	ADojoF5Lever* Lever = TestWorld.SpawnActor<ADojoF5Lever>();
	if (!TestNotNull(TEXT("Lever spawned"), Lever)) return false;
	ADojoF5LeverLamp* Staying = SpawnLamp(TestWorld, Lever);
	ADojoF5LeverLamp* Leaving = SpawnLamp(TestWorld, Lever);

	Leaving->Destroy();
	TestFalse(TEXT("A destroyed lamp is no longer bound"), Lever->OnPulled.Contains(Leaving, TEXT("HandlePulled")));
	TestTrue(TEXT("The other lamp still is"), Lever->OnPulled.Contains(Staying, TEXT("HandlePulled")));

	Lever->Pull();
	TestTrue(TEXT("The remaining lamp still follows"), Staying->IsLit());

	return true;
}

#endif
```

# Hints

- Each gap is one line: the lever fires its event, the lamp binds, the lamp unbinds; check the lever pointer before the last two.
- The event's own function sends the value to every listener; the binding macros take the listening object and the address of its handler, and come in an add and a remove form.
- `Broadcast`, `AddDynamic`, and `RemoveDynamic` are described with the delegate macros in `Delegates/DelegateCombinations.h`.

# Rubric

- Pull broadcasts OnPulled with the new position after changing it.
- Each lamp binds its UFUNCTION handler in BeginPlay and unbinds it in EndPlay, guarded by an IsValid check on the lever.
- The lever holds no reference to any lamp.
- OnPulled is a BlueprintAssignable dynamic multicast delegate, so Blueprints can listen too.
- Nothing ticks or polls the lever.

# Alternative

The lever could hold an array of lamps and call each one's SetLit in Pull. That works for lamps, but the lever then knows the lamp class, and a door, a sound, or a quest step that should also react needs another array and another loop. With the event, the lever stays the same whatever listens. You have just built the Observer pattern in its Unreal form: a broadcaster with an event, and listeners that bind and unbind themselves.

# Parsons

```yaml
- id: lamp-begin-play
  prompt: Put the lamp's BeginPlay in order.
  lines:
    - "void ADojoF5LeverLamp::BeginPlay()"
    - "{"
    - "	Super::BeginPlay();"
    - "	if (IsValid(Lever)) Lever->OnPulled.AddDynamic(this, &ADojoF5LeverLamp::HandlePulled);"
    - "}"
  distractors:
    - line: "	Lever->OnPulled.Broadcast(true);"
      mistake: The lamp listens; firing the lever's event is the lever's job, and would light every lamp before anyone pulled.
- id: lamp-end-play
  prompt: Put the lamp's EndPlay in order.
  lines:
    - "void ADojoF5LeverLamp::EndPlay(const EEndPlayReason::Type EndPlayReason)"
    - "{"
    - "	if (IsValid(Lever)) Lever->OnPulled.RemoveDynamic(this, &ADojoF5LeverLamp::HandlePulled);"
    - "	Super::EndPlay(EndPlayReason);"
    - "}"
  distractors:
    - line: "	Lever->OnPulled.Clear();"
      mistake: Clear removes every listener, including other lamps; a listener removes only itself.
```
