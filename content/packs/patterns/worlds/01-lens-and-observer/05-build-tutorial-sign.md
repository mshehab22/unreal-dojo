---
id: p1-tutorial-sign
title: A tutorial sign that stops listening when it is done
order: 5
kind: build
scaffold: stub
difficulty: 3
patterns: [observer]
skills: [delegates, observer]
terms: [dynamic-multicast-delegate, blueprintassignable, adddynamic, unbinding-delegates, ufunction, endplay, broadcast]
prerequisites: [p1-observer-card]
xp: 100
estimatedMinutes: 25
concepts:
  - A dynamic multicast delegate in a BlueprintAssignable property lets C++ and Blueprint both listen
  - AddDynamic binds a UFUNCTION by name; RemoveDynamic is its exit, even from inside the handler
  - A listener that can be wired from two places must not end up bound twice
---

# Brief

When you press Play and run `ke * Pull` twice, the sign beside the lever goes from "Pull the lever: 2 left" to "1 left" to "Well done", and from then on the sign no longer listens to the lever at all.

This is Observer again, in a different mechanic and in the form Blueprint can join. The declarations are given; every body is yours.

- `ADojoP1PracticeLever` is the subject. `Pull` counts the pull, refreshes the lever's own label ("Pulled 2"), and then announces it through `OnPulled` with the lever and the new count. The delegate is dynamic and its property is `BlueprintAssignable`, so a level Blueprint can bind to it like any event dispatcher.
- `ADojoP1TutorialSign` is an observer. `Watch` binds the sign's `HandleLeverPulled` to a lever's `OnPulled` with `AddDynamic`. `BeginPlay` watches the lever a designer picked in the Details panel (it may be empty) and shows the instruction. `Watch` does nothing for an empty lever or once the step is finished, and if it is handed a different lever the sign drops its old binding first, so it never listens to two levers. Each heard pull counts toward `PullsToFinish`; once the step is finished the sign removes its own binding, right there inside the handler. `EndPlay` removes the binding too, in case the sign goes first.

Dependency direction: the sign depends on the lever. The sign's source file includes the lever's header and binds itself; the lever never mentions the sign, so a second tutorial step, a door, or a sound can listen to the same lever without touching it.

Change the state before you announce it: a listener reacting to `OnPulled` may read the lever's count, and it should see the new one.

Write the obvious version first and run the tests. One of them fails on purpose for most people. Read its name and message before you read the hints.

## See it in the editor

Place a `DojoP1PracticeLever` and a `DojoP1TutorialSign` in a map with no other levers (`ke *` would pull those too). In the sign's Details panel, pick the lever as its Lever. Press Play: the sign reads "Pull the lever: 2 left" and the lever "Pulled 0". Run `ke * Pull`: 1 left. Run it again: Well done. Run it a third time: the lever reads Pulled 3 and the sign stays put. Then stop, open the Level Blueprint, select the lever in the level, and add its On Pulled event (it is listed under the lever's events because the property is BlueprintAssignable); print the Pull Count from it. Play again: every pull prints, and the sign still behaves the same.

# Files

## DojoP1PracticeLever.h

```cpp
#pragma once

#include "CoreMinimal.h"
#include "GameFramework/Actor.h"
#include "DojoP1PracticeLever.generated.h"

class ADojoP1PracticeLever;
class UTextRenderComponent;

/** Fired after every pull; carries the lever and its new pull count, so listeners need not read the lever back. */
DECLARE_DYNAMIC_MULTICAST_DELEGATE_TwoParams(FDojoP1OnLeverPulled, ADojoP1PracticeLever*, Lever, int32, PullCount);

/** A lever the player pulls; it announces every pull and never learns who reacts (Observer: the subject). */
UCLASS()
class ADojoP1PracticeLever : public AActor
{
	GENERATED_BODY()

public:
	/** Creates the label and turns ticking off. */
	ADojoP1PracticeLever();

	/** Floating text that shows how many times the lever was pulled. */
	UPROPERTY(VisibleAnywhere, Category = "Lever")
	TObjectPtr<UTextRenderComponent> Label;

	/** Fired after every pull. Blueprint binds to it like an event dispatcher. */
	UPROPERTY(BlueprintAssignable, Category = "Lever")
	FDojoP1OnLeverPulled OnPulled;

	/** Counts one pull, refreshes the label, then announces the pull. */
	UFUNCTION(BlueprintCallable, Category = "Lever")
	void Pull();

	/** Pulls counted so far. */
	UFUNCTION(BlueprintPure, Category = "Lever")
	int32 GetPullCount() const;

protected:
	/** Shows the starting count on the label. */
	virtual void BeginPlay() override;

private:
	/** Writes the pull count into the label. */
	void RefreshLabel();

	int32 PullCount = 0;
};
```

## DojoP1PracticeLever.cpp

```cpp
#include "DojoP1PracticeLever.h"

#include "Components/TextRenderComponent.h"

ADojoP1PracticeLever::ADojoP1PracticeLever()
{
	PrimaryActorTick.bCanEverTick = false;

	Label = CreateDefaultSubobject<UTextRenderComponent>(TEXT("Label"));
	RootComponent = Label;
	Label->SetHorizontalAlignment(EHTA_Center);
}

void ADojoP1PracticeLever::BeginPlay()
{
	Super::BeginPlay();
}

void ADojoP1PracticeLever::Pull()
{
}

int32 ADojoP1PracticeLever::GetPullCount() const
{
	return 0;
}

void ADojoP1PracticeLever::RefreshLabel()
{
}
```

## DojoP1TutorialSign.h

```cpp
#pragma once

#include "CoreMinimal.h"
#include "GameFramework/Actor.h"
#include "DojoP1TutorialSign.generated.h"

class ADojoP1PracticeLever;
class UTextRenderComponent;

/** A tutorial prompt that watches a lever, praises the player after enough pulls, then stops listening (Observer: a listener). */
UCLASS()
class ADojoP1TutorialSign : public AActor
{
	GENERATED_BODY()

public:
	/** Creates the label and turns ticking off. */
	ADojoP1TutorialSign();

	/** Floating text with the instruction, then the praise. */
	UPROPERTY(VisibleAnywhere, Category = "Tutorial")
	TObjectPtr<UTextRenderComponent> Label;

	/** The lever this sign watches from the start of play, picked in the level. May be empty. */
	UPROPERTY(EditAnywhere, Category = "Tutorial")
	TObjectPtr<ADojoP1PracticeLever> Lever;

	/** Pulls that finish this tutorial step. */
	UPROPERTY(EditAnywhere, BlueprintReadOnly, Category = "Tutorial", meta = (ClampMin = "1"))
	int32 PullsToFinish = 2;

	/** Starts listening to a lever's pulls; the level Blueprint may call it as well as BeginPlay. */
	UFUNCTION(BlueprintCallable, Category = "Tutorial")
	void Watch(ADojoP1PracticeLever* LeverToWatch);

	/** Pulls this sign has heard so far. */
	UFUNCTION(BlueprintPure, Category = "Tutorial")
	int32 GetPullsHeard() const;

	/** True once PullsToFinish pulls have been heard. */
	UFUNCTION(BlueprintPure, Category = "Tutorial")
	bool IsFinished() const;

protected:
	/** Watches the lever picked in the level, if any, and shows the instruction. */
	virtual void BeginPlay() override;

	/** Stops listening, since the lever may outlive the sign. */
	virtual void EndPlay(const EEndPlayReason::Type EndPlayReason) override;

private:
	/** Counts one pull, refreshes the label, and stops listening once the step is finished. A UFUNCTION, because the delegate binds by name. */
	UFUNCTION()
	void HandleLeverPulled(ADojoP1PracticeLever* PulledLever, int32 PullCount);

	/** Removes this sign's binding from the watched lever, if there is one. */
	void StopWatching();

	/** Writes the pulls left, or the praise, into the label. */
	void RefreshLabel();

	/** The lever this sign is bound to right now. */
	UPROPERTY(Transient)
	TObjectPtr<ADojoP1PracticeLever> WatchedLever;

	int32 PullsHeard = 0;
};
```

## DojoP1TutorialSign.cpp

```cpp
#include "DojoP1TutorialSign.h"

#include "Components/TextRenderComponent.h"
#include "DojoP1PracticeLever.h"

ADojoP1TutorialSign::ADojoP1TutorialSign()
{
	PrimaryActorTick.bCanEverTick = false;

	Label = CreateDefaultSubobject<UTextRenderComponent>(TEXT("Label"));
	RootComponent = Label;
	Label->SetHorizontalAlignment(EHTA_Center);
}

void ADojoP1TutorialSign::BeginPlay()
{
	Super::BeginPlay();
}

void ADojoP1TutorialSign::EndPlay(const EEndPlayReason::Type EndPlayReason)
{
	Super::EndPlay(EndPlayReason);
}

void ADojoP1TutorialSign::Watch(ADojoP1PracticeLever* LeverToWatch)
{
}

int32 ADojoP1TutorialSign::GetPullsHeard() const
{
	return 0;
}

bool ADojoP1TutorialSign::IsFinished() const
{
	return false;
}

void ADojoP1TutorialSign::HandleLeverPulled(ADojoP1PracticeLever* PulledLever, int32 PullCount)
{
}

void ADojoP1TutorialSign::StopWatching()
{
}

void ADojoP1TutorialSign::RefreshLabel()
{
}
```

# Tests

```cpp
#include "Misc/AutomationTest.h"

#if WITH_AUTOMATION_TESTS

#include "Components/TextRenderComponent.h"
#include "Quests/p1-tutorial-sign/DojoP1PracticeLever.h"
#include "Quests/p1-tutorial-sign/DojoP1TutorialSign.h"
#include "Support/DojoTestWorld.h"

namespace DojoP1TutorialSignTest
{
	/** Spawns a sign the way a level does: its lever is picked before BeginPlay runs. */
	ADojoP1TutorialSign* SpawnSign(FDojoTestWorld& TestWorld, ADojoP1PracticeLever* Lever)
	{
		ADojoP1TutorialSign* Sign = TestWorld.GetWorld()->SpawnActorDeferred<ADojoP1TutorialSign>(ADojoP1TutorialSign::StaticClass(), FTransform::Identity);
		if (!Sign) return nullptr;

		Sign->Lever = Lever;
		Sign->FinishSpawning(FTransform::Identity);
		return Sign;
	}
}

IMPLEMENT_SIMPLE_AUTOMATION_TEST(FDojo_P1_TutorialSign_BlueprintCanListen, "Dojo.P1.TutorialSign.BlueprintCanListen", EAutomationTestFlags::EditorContext | EAutomationTestFlags::ProductFilter)

/** Asks reflection whether Blueprint can bind to OnPulled and whether the handler can be bound by name. */
bool FDojo_P1_TutorialSign_BlueprintCanListen::RunTest(const FString& Parameters)
{
	const FMulticastDelegateProperty* PulledProperty = FindFProperty<FMulticastDelegateProperty>(ADojoP1PracticeLever::StaticClass(), TEXT("OnPulled"));
	if (!TestNotNull(TEXT("OnPulled is a reflected multicast delegate"), PulledProperty)) return false;
	TestTrue(TEXT("OnPulled is BlueprintAssignable"), PulledProperty->HasAnyPropertyFlags(CPF_BlueprintAssignable));

	TestNotNull(TEXT("HandleLeverPulled is a UFUNCTION"), ADojoP1TutorialSign::StaticClass()->FindFunctionByName(TEXT("HandleLeverPulled")));

	return true;
}

IMPLEMENT_SIMPLE_AUTOMATION_TEST(FDojo_P1_TutorialSign_FinishesThenStopsListening, "Dojo.P1.TutorialSign.FinishesThenStopsListening", EAutomationTestFlags::EditorContext | EAutomationTestFlags::ProductFilter)

/** Two pulls finish the step, the sign unbinds itself, and a third pull reaches nobody. */
bool FDojo_P1_TutorialSign_FinishesThenStopsListening::RunTest(const FString& Parameters)
{
	using namespace DojoP1TutorialSignTest;

	FDojoTestWorld TestWorld;

	ADojoP1PracticeLever* Lever = TestWorld.SpawnActor<ADojoP1PracticeLever>();
	if (!TestNotNull(TEXT("Lever spawned"), Lever)) return false;

	ADojoP1TutorialSign* Sign = SpawnSign(TestWorld, Lever);
	if (!TestNotNull(TEXT("Sign spawned"), Sign) || !TestNotNull(TEXT("Sign has a label"), Sign->Label.Get())) return false;

	TestEqual(TEXT("The sign starts with the instruction"), Sign->Label->Text.ToString(), FString(TEXT("Pull the lever: 2 left")));
	TestTrue(TEXT("The sign signed up for the lever in BeginPlay"), Lever->OnPulled.IsBound());

	Lever->Pull();
	TestEqual(TEXT("The lever counted the pull"), Lever->GetPullCount(), 1);
	TestEqual(TEXT("The lever label shows the count"), Lever->Label->Text.ToString(), FString(TEXT("Pulled 1")));
	TestEqual(TEXT("The sign heard one pull"), Sign->GetPullsHeard(), 1);
	TestEqual(TEXT("The sign shows one left"), Sign->Label->Text.ToString(), FString(TEXT("Pull the lever: 1 left")));

	Lever->Pull();
	TestTrue(TEXT("Two pulls finish the step"), Sign->IsFinished());
	TestEqual(TEXT("The sign praises the player"), Sign->Label->Text.ToString(), FString(TEXT("Well done")));
	TestFalse(TEXT("The finished sign removed its own binding"), Lever->OnPulled.IsBound());

	Lever->Pull();
	TestEqual(TEXT("The lever still counts"), Lever->GetPullCount(), 3);
	TestEqual(TEXT("The finished sign hears nothing more"), Sign->GetPullsHeard(), 2);

	return true;
}

IMPLEMENT_SIMPLE_AUTOMATION_TEST(FDojo_P1_TutorialSign_WiredTwiceHearsOnce, "Dojo.P1.TutorialSign.WiredTwiceHearsOnce", EAutomationTestFlags::EditorContext | EAutomationTestFlags::ProductFilter)

/** The designer picked the lever and the level Blueprint also calls Watch on it: one pull must still count once. */
bool FDojo_P1_TutorialSign_WiredTwiceHearsOnce::RunTest(const FString& Parameters)
{
	using namespace DojoP1TutorialSignTest;

	FDojoTestWorld TestWorld;

	ADojoP1PracticeLever* Lever = TestWorld.SpawnActor<ADojoP1PracticeLever>();
	if (!TestNotNull(TEXT("Lever spawned"), Lever)) return false;

	ADojoP1TutorialSign* Sign = SpawnSign(TestWorld, Lever);
	if (!TestNotNull(TEXT("Sign spawned"), Sign)) return false;

	Sign->Watch(Lever);
	Lever->Pull();

	TestEqual(TEXT("One pull is heard once, however many times the sign was wired"), Sign->GetPullsHeard(), 1);

	return true;
}

IMPLEMENT_SIMPLE_AUTOMATION_TEST(FDojo_P1_TutorialSign_LeavesOnEndPlay, "Dojo.P1.TutorialSign.LeavesOnEndPlay", EAutomationTestFlags::EditorContext | EAutomationTestFlags::ProductFilter)

/** A sign destroyed before it finishes leaves no binding on the lever, which keeps working. */
bool FDojo_P1_TutorialSign_LeavesOnEndPlay::RunTest(const FString& Parameters)
{
	using namespace DojoP1TutorialSignTest;

	FDojoTestWorld TestWorld;

	ADojoP1PracticeLever* Lever = TestWorld.SpawnActor<ADojoP1PracticeLever>();
	ADojoP1TutorialSign* Sign = SpawnSign(TestWorld, Lever);
	if (!TestNotNull(TEXT("Lever spawned"), Lever) || !TestNotNull(TEXT("Sign spawned"), Sign)) return false;

	TestTrue(TEXT("The sign is listening"), Lever->OnPulled.IsBound());

	Sign->Destroy();
	TestFalse(TEXT("No binding left on the lever"), Lever->OnPulled.IsBound());

	Lever->Pull();
	TestEqual(TEXT("The lever works with nobody listening"), Lever->GetPullCount(), 1);

	return true;
}

#endif
```

# Hints

- The failing test wires the same sign to the same lever twice. Ask what a delegate list does when the same object and function are added a second time; the engine may also log an ensure about it.
- The dynamic bind macro has a sibling that refuses a second copy of a binding that is already in the list; the remove macro takes the same two arguments as the bind, and removing from inside the handler is safe because the broadcast walks a copy.
- Both bind macros and the remove macro are defined in `Delegates/Delegate.h`, a few lines apart.

# Rubric

- OnPulled is a dynamic multicast delegate in a BlueprintAssignable property, broadcast after the pull is counted and the label refreshed.
- The sign binds a UFUNCTION handler with AddUniqueDynamic (or checks before AddDynamic), so wiring it twice still hears each pull once.
- The finished sign removes its own binding with RemoveDynamic, and EndPlay removes it too.
- Dependency direction: the sign includes the lever's header; the lever's files never mention the sign.
- Watch ignores an empty lever or a finished step, and handing it a different lever drops the old binding first.
- Pulls to finish come from the editable PullsToFinish property; nothing ticks.

# Alternative

The lever could use a native multicast delegate, the same as the bounty board's foe, and the sign could keep the `FDelegateHandle` that `AddUObject` returns and pass it to `Remove`. Native binding is faster per call and the handler needs no UFUNCTION. The price is that a level Blueprint can no longer bind to the lever, and the See it in the editor step stops working. Pick dynamic when designers need the event; pick native when only C++ listens and the event fires often.

# Parsons

```yaml
- id: lever-pull
  prompt: Put Pull in order so listeners read the new count.
  lines:
    - "void ADojoP1PracticeLever::Pull()"
    - "{"
    - "	PullCount++;"
    - "	RefreshLabel();"
    - "	OnPulled.Broadcast(this, PullCount);"
    - "}"
  distractors:
    - line: "	OnPulled.ExecuteIfBound(this, PullCount);"
      mistake: ExecuteIfBound belongs to single-cast delegates; a multicast delegate fires every listener with Broadcast.
- id: sign-stop-watching
  prompt: Put StopWatching in order.
  lines:
    - "void ADojoP1TutorialSign::StopWatching()"
    - "{"
    - "	if (IsValid(WatchedLever)) WatchedLever->OnPulled.RemoveDynamic(this, &ADojoP1TutorialSign::HandleLeverPulled);"
    - "	WatchedLever = nullptr;"
    - "}"
  distractors:
    - line: "	if (IsValid(WatchedLever)) WatchedLever->OnPulled.Clear();"
      mistake: Clear removes every listener on the lever, including the door and the Level Blueprint; a listener removes only its own binding.
```
