---
id: m1-pause-context
title: A pause that swallows the keys
order: 7
kind: build
scaffold: stub
difficulty: 3
patterns: [state]
skills: [input]
terms: [input-mapping-context, local-player-subsystem, input-consumption]
prerequisites: [m1-priority-and-consume, m1-move-pad, m1-turntable]
xp: 90
estimatedMinutes: 25
concepts:
  - A high-priority context that maps keys to a do-nothing action hides them from the controls below
  - Reaching the local player's subsystem from a component, and adding and removing a context there
---

# Brief

When you add a pause switch to a walker, press W and the walker moves; open the switch and W, A, S, D and Space stop doing anything; close it and the walker walks again.

`UDojoM1PauseSwitch` has its header and its default key list written for you. Fill in its bodies:

1. `FindSubsystem`: reach the Enhanced Input subsystem of the first local player, or return null when the world has none.
2. `BuildContext`: make the do-nothing action (a yes or no action that hides its keys when `bConsumeKeys` says so) and a fresh context that maps every blocked key to it.
3. `Open`, `Close`, `Toggle`, and `IsOpen`: switch the context on at `PausePriority` and off again. Opening twice or closing twice does nothing the second time, and with no local player the switch stays closed.

Dependency direction: the switch knows the local player's subsystem and nothing about the pawn it sits on or the keys' real meaning; the walker knows nothing about the switch. The pause works on the walker only because it sits above the walker's context.

Compiles against earlier quests: m1-move-pad (`Quests/m1-move-pad/DojoM1Walker.h`) and m1-turntable (`Quests/m1-turntable/DojoM1InputRig.h`, the test rig). Tests give the player one frame after every change so the new mappings are in effect.

This switch is the third piece of the drone handoff boss.

## See it in the editor

Make a Blueprint subclass of `DojoM1Walker`, and in its Components panel add a `DojoM1PauseSwitch`. Place it with Auto Possess Player set to Player 0. In the Blueprint's Event Graph add an Input Key event for P that calls Toggle on the switch. Press Play and walk with W, A, S, D; press P and the walker stops answering; P still works because it is not in the blocked list. Press P again and walking resumes. Type `ShowDebug EnhancedInput` to see the pause context appear and disappear in the list of active contexts.

# Files

## DojoM1PauseSwitch.h

```cpp
#pragma once

#include "CoreMinimal.h"
#include "Components/ActorComponent.h"
#include "InputCoreTypes.h"
#include "DojoM1PauseSwitch.generated.h"

class UEnhancedInputLocalPlayerSubsystem;
class UInputAction;
class UInputMappingContext;

/** A switch that lays a high-priority context over the player's controls so chosen keys stop reaching the game, and takes it away again. */
UCLASS(ClassGroup = (Dojo), meta = (BlueprintSpawnableComponent))
class UDojoM1PauseSwitch : public UActorComponent
{
	GENERATED_BODY()

public:
	/** Turns ticking off and lists the default keys to swallow. */
	UDojoM1PauseSwitch();

	/** The keys that stop working while the switch is open. */
	UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "Pause")
	TArray<FKey> BlockedKeys;

	/** The priority of the pause context; a context with a higher number is offered a key first. */
	UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "Pause")
	int32 PausePriority = 10;

	/** True if the pause hides its keys from the contexts below it; false lets them through to both. */
	UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "Pause")
	bool bConsumeKeys = true;

	/** The action every blocked key is mapped to; nothing listens to it. Built the first time the switch opens. */
	UPROPERTY(VisibleAnywhere, BlueprintReadOnly, Category = "Pause")
	TObjectPtr<UInputAction> SwallowAction;

	/** The context that holds the blocked keys; rebuilt each time the switch opens. */
	UPROPERTY(VisibleAnywhere, BlueprintReadOnly, Category = "Pause")
	TObjectPtr<UInputMappingContext> PauseContext;

	/** Adds the pause context to the first local player; does nothing if already open or if there is no local player. */
	UFUNCTION(BlueprintCallable, Category = "Pause")
	void Open();

	/** Removes the pause context; does nothing if the switch is not open. */
	UFUNCTION(BlueprintCallable, Category = "Pause")
	void Close();

	/** Opens the switch if it is closed and closes it if it is open. */
	UFUNCTION(BlueprintCallable, Category = "Pause")
	void Toggle();

	/** True while the pause context is added. */
	UFUNCTION(BlueprintPure, Category = "Pause")
	bool IsOpen() const;

private:
	/** The Enhanced Input subsystem of the first local player, or null when there is none. */
	UEnhancedInputLocalPlayerSubsystem* FindSubsystem() const;

	/** Builds the swallow action and a fresh context mapping every blocked key to it. */
	void BuildContext();

	bool bOpen = false;
};
```

## DojoM1PauseSwitch.cpp

```cpp
#include "DojoM1PauseSwitch.h"

#include "EnhancedInputSubsystems.h"
#include "Engine/LocalPlayer.h"
#include "Engine/World.h"
#include "GameFramework/PlayerController.h"
#include "InputAction.h"
#include "InputMappingContext.h"

UDojoM1PauseSwitch::UDojoM1PauseSwitch()
{
	PrimaryComponentTick.bCanEverTick = false;

	BlockedKeys = { EKeys::W, EKeys::A, EKeys::S, EKeys::D, EKeys::SpaceBar };
}

void UDojoM1PauseSwitch::Open()
{
	// Your code: do nothing if already open or if there is no subsystem; otherwise build the context, add it at PausePriority, and remember it is open.
}

void UDojoM1PauseSwitch::Close()
{
	// Your code: do nothing if not open; otherwise take the context off the player and remember it is closed.
}

void UDojoM1PauseSwitch::Toggle()
{
	// Your code: open if closed, close if open.
}

bool UDojoM1PauseSwitch::IsOpen() const
{
	return false;
}

UEnhancedInputLocalPlayerSubsystem* UDojoM1PauseSwitch::FindSubsystem() const
{
	return nullptr;
}

void UDojoM1PauseSwitch::BuildContext()
{
	// Your code: make SwallowAction once as a yes or no action, set whether it consumes input from bConsumeKeys, then make a fresh PauseContext that maps every blocked key to it.
}
```

# Tests

```cpp
#include "Misc/AutomationTest.h"

#if WITH_AUTOMATION_TESTS

#include "Quests/m1-move-pad/DojoM1Walker.h"
#include "Quests/m1-pause-context/DojoM1PauseSwitch.h"
#include "Quests/m1-turntable/DojoM1InputRig.h"
#include "Support/DojoTestActor.h"
#include "Support/DojoTestWorld.h"
#include "InputAction.h"
#include "InputMappingContext.h"

namespace DojoM1PauseTest
{
	/** Holds one key for a second at 60 frames per second, then lets go and runs two more frames. */
	void HoldForOneSecond(FDojoTestWorld& TestWorld, FDojoM1InputRig& Rig, const FKey& Key)
	{
		Rig.Press(Key);
		Rig.Tick(60);
		Rig.Release(Key);
		Rig.Tick(2);
	}
}

IMPLEMENT_SIMPLE_AUTOMATION_TEST(FDojo_M1_PauseContext_KeysStopWhileOpen, "Dojo.M1.PauseContext.KeysStopWhileOpen", EAutomationTestFlags::EditorContext | EAutomationTestFlags::ProductFilter)

/** Walks, opens the pause and tries to walk, closes it and walks again. */
bool FDojo_M1_PauseContext_KeysStopWhileOpen::RunTest(const FString& Parameters)
{
	using namespace DojoM1PauseTest;

	FDojoTestWorld TestWorld;
	FDojoM1InputRig Rig(TestWorld);

	ADojoM1Walker* Walker = TestWorld.SpawnActor<ADojoM1Walker>();
	UDojoM1PauseSwitch* Pause = TestWorld.AddComponent<UDojoM1PauseSwitch>(Walker);
	if (!TestNotNull(TEXT("Walker and switch exist"), Pause)) return false;

	Rig.Possess(Walker);
	HoldForOneSecond(TestWorld, Rig, EKeys::W);
	TestNearlyEqual(TEXT("Before the pause W walks"), Walker->GetActorLocation().X, 300.0, 8.0);

	Pause->Toggle();
	TestTrue(TEXT("The switch reports open"), Pause->IsOpen());
	Rig.Tick(1);

	HoldForOneSecond(TestWorld, Rig, EKeys::W);
	HoldForOneSecond(TestWorld, Rig, EKeys::D);
	TestNearlyEqual(TEXT("While open W does not walk"), Walker->GetActorLocation().X, 300.0, 8.0);
	TestNearlyEqual(TEXT("While open D does not walk"), Walker->GetActorLocation().Y, 0.0, 1.0);

	Pause->Toggle();
	TestFalse(TEXT("The switch reports closed"), Pause->IsOpen());
	Rig.Tick(1);

	HoldForOneSecond(TestWorld, Rig, EKeys::W);
	TestNearlyEqual(TEXT("After closing W walks again"), Walker->GetActorLocation().X, 600.0, 14.0);

	return true;
}

IMPLEMENT_SIMPLE_AUTOMATION_TEST(FDojo_M1_PauseContext_OnlyListedKeysAreBlocked, "Dojo.M1.PauseContext.OnlyListedKeysAreBlocked", EAutomationTestFlags::EditorContext | EAutomationTestFlags::ProductFilter)

/** Blocks only W and checks D still walks while the switch is open. */
bool FDojo_M1_PauseContext_OnlyListedKeysAreBlocked::RunTest(const FString& Parameters)
{
	using namespace DojoM1PauseTest;

	FDojoTestWorld TestWorld;
	FDojoM1InputRig Rig(TestWorld);

	ADojoM1Walker* Walker = TestWorld.SpawnActor<ADojoM1Walker>();
	UDojoM1PauseSwitch* Pause = TestWorld.AddComponent<UDojoM1PauseSwitch>(Walker);
	if (!TestNotNull(TEXT("Walker and switch exist"), Pause)) return false;

	Pause->BlockedKeys = { EKeys::W };
	Rig.Possess(Walker);
	Pause->Open();
	Rig.Tick(1);

	HoldForOneSecond(TestWorld, Rig, EKeys::W);
	HoldForOneSecond(TestWorld, Rig, EKeys::D);
	TestNearlyEqual(TEXT("W is blocked"), Walker->GetActorLocation().X, 0.0, 1.0);
	TestNearlyEqual(TEXT("D is not in the list, so it still walks"), Walker->GetActorLocation().Y, 300.0, 8.0);

	return true;
}

IMPLEMENT_SIMPLE_AUTOMATION_TEST(FDojo_M1_PauseContext_LettingKeysThrough, "Dojo.M1.PauseContext.LettingKeysThrough", EAutomationTestFlags::EditorContext | EAutomationTestFlags::ProductFilter)

/** Turns consumption off and checks the keys reach the walker even while the pause is open. */
bool FDojo_M1_PauseContext_LettingKeysThrough::RunTest(const FString& Parameters)
{
	using namespace DojoM1PauseTest;

	FDojoTestWorld TestWorld;
	FDojoM1InputRig Rig(TestWorld);

	ADojoM1Walker* Walker = TestWorld.SpawnActor<ADojoM1Walker>();
	UDojoM1PauseSwitch* Pause = TestWorld.AddComponent<UDojoM1PauseSwitch>(Walker);
	if (!TestNotNull(TEXT("Walker and switch exist"), Pause)) return false;

	Pause->bConsumeKeys = false;
	Rig.Possess(Walker);
	Pause->Open();
	Rig.Tick(1);

	TestTrue(TEXT("The swallow action does not consume"), Pause->SwallowAction != nullptr && !Pause->SwallowAction->bConsumeInput);

	HoldForOneSecond(TestWorld, Rig, EKeys::W);
	TestNearlyEqual(TEXT("A pause that does not consume lets W through"), Walker->GetActorLocation().X, 300.0, 8.0);

	return true;
}

IMPLEMENT_SIMPLE_AUTOMATION_TEST(FDojo_M1_PauseContext_LayerSitsAtItsPriority, "Dojo.M1.PauseContext.LayerSitsAtItsPriority", EAutomationTestFlags::EditorContext | EAutomationTestFlags::ProductFilter)

/** Checks the context is active at PausePriority while open and gone when closed, and that opening twice adds it once. */
bool FDojo_M1_PauseContext_LayerSitsAtItsPriority::RunTest(const FString& Parameters)
{
	FDojoTestWorld TestWorld;
	FDojoM1InputRig Rig(TestWorld);

	ADojoM1Walker* Walker = TestWorld.SpawnActor<ADojoM1Walker>();
	UDojoM1PauseSwitch* Pause = TestWorld.AddComponent<UDojoM1PauseSwitch>(Walker);
	if (!TestNotNull(TEXT("Walker and switch exist"), Pause)) return false;

	Pause->PausePriority = 50;
	Rig.Possess(Walker);

	Pause->Open();
	const UInputMappingContext* FirstContext = Pause->PauseContext;
	Pause->Open();
	Rig.Tick(1);
	TestTrue(TEXT("Opening twice keeps the first context and builds no second one"), FirstContext != nullptr && Pause->PauseContext == FirstContext);

	int32 FoundPriority = -1;
	TestTrue(TEXT("The pause context is active"), Pause->PauseContext != nullptr && Rig.GetSubsystem()->HasMappingContext(Pause->PauseContext, FoundPriority));
	TestEqual(TEXT("It sits at the priority the designer set"), FoundPriority, 50);
	TestTrue(TEXT("The walker's own context is still there underneath"), Rig.GetSubsystem()->HasMappingContext(Walker->MoveContext));

	Pause->Close();
	Pause->Close();
	Rig.Tick(1);
	TestFalse(TEXT("Closing removes the pause context"), Rig.GetSubsystem()->HasMappingContext(Pause->PauseContext));
	TestFalse(TEXT("The switch reports closed"), Pause->IsOpen());

	return true;
}

IMPLEMENT_SIMPLE_AUTOMATION_TEST(FDojo_M1_PauseContext_NoPlayerNoPause, "Dojo.M1.PauseContext.NoPlayerNoPause", EAutomationTestFlags::EditorContext | EAutomationTestFlags::ProductFilter)

/** Opens a switch in a world with no local player and checks nothing crashes and the switch stays closed. */
bool FDojo_M1_PauseContext_NoPlayerNoPause::RunTest(const FString& Parameters)
{
	FDojoTestWorld TestWorld;

	ADojoTestActor* Host = TestWorld.SpawnActor<ADojoTestActor>();
	UDojoM1PauseSwitch* Pause = TestWorld.AddComponent<UDojoM1PauseSwitch>(Host);
	if (!TestNotNull(TEXT("Host and switch exist"), Pause)) return false;

	Pause->Toggle();
	TestFalse(TEXT("With nobody to pause, the switch stays closed"), Pause->IsOpen());

	Pause->Close();
	TestFalse(TEXT("Closing a closed switch is harmless"), Pause->IsOpen());

	return true;
}

#endif
```

# Hints

- Open, Close, and Toggle share one rule, only change anything when the state would actually change, and the subsystem lookup is written once in `FindSubsystem`.
- The subsystem belongs to the first local player, which you reach through the world's first player controller.
- Make the action once and the context every time, and leave the context's name out because a fixed name cannot be reused for a second object.

# Rubric

- The context is added to the first local player's Enhanced Input subsystem at `PausePriority` and removed again on close; opening or closing twice does nothing the second time.
- Every key in `BlockedKeys` is mapped to one do-nothing action in the pause context, and no gameplay code is changed or called.
- Whether the keys are hidden from the layers below follows `bConsumeKeys`, set on the action.
- With no local player the switch does nothing and reports closed.
- The context is rebuilt on each open so a changed key list takes effect.
- The switch holds no pointer to any pawn; the pawn holds none to the switch.

# Alternative

Instead of a high layer that swallows keys, the pawn's handlers could check an `bPaused` flag at the top of every function and return early. That is simpler for one pawn, but every pawn, every handler, and every future action has to remember the check, and the keys still arrive and run code. A layer needs no cooperation from the code below it, which is why menus are made this way. This shape, an object that switches between sets of behavior without the behaviors knowing, is close to the State pattern, as in Pack 2's State world.

# Parsons

```yaml
- id: pause-open
  prompt: Put Open in order.
  lines:
    - "void UDojoM1PauseSwitch::Open()"
    - "{"
    - "	if (bOpen) return;"
    - "	UEnhancedInputLocalPlayerSubsystem* Subsystem = FindSubsystem();"
    - "	if (!Subsystem) return;"
    - "	BuildContext();"
    - "	Subsystem->AddMappingContext(PauseContext, PausePriority);"
    - "	bOpen = true;"
    - "}"
  distractors:
    - line: "	Subsystem->AddMappingContext(PauseContext, 0);"
      mistake: Priority 0 would put the pause on the same layer as the walker; it has to sit above it, at PausePriority.
- id: pause-find
  prompt: Put FindSubsystem in order.
  lines:
    - "UEnhancedInputLocalPlayerSubsystem* UDojoM1PauseSwitch::FindSubsystem() const"
    - "{"
    - "	const APlayerController* Player = GetWorld() ? GetWorld()->GetFirstPlayerController() : nullptr;"
    - "	return Player ? ULocalPlayer::GetSubsystem<UEnhancedInputLocalPlayerSubsystem>(Player->GetLocalPlayer()) : nullptr;"
    - "}"
  distractors:
    - line: "	return GetWorld()->GetSubsystem<UEnhancedInputLocalPlayerSubsystem>();"
      mistake: The Enhanced Input subsystem belongs to a local player, not to the world, so it cannot be fetched from the world.
```
