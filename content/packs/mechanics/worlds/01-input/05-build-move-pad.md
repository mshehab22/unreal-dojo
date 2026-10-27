---
id: m1-move-pad
title: WASD on one two-dimensional action
order: 5
kind: build
scaffold: faded
difficulty: 2
patterns: []
skills: [input]
terms: [input-action, input-modifier, finputactionvalue, enhanced-input-component, input-mapping-context]
prerequisites: [m1-turntable]
xp: 70
estimatedMinutes: 20
concepts:
  - A two-dimensional action carries a pair of numbers, and modifiers move each key onto the right slot
  - Four keys feed one action with no key-specific code in the handler
---

# Brief

When you possess the walker and hold W for one second it is 300 units ahead of where it started; hold S and it comes back, hold D and it is 300 units to the right, hold A and it comes back.

Most of `ADojoM1Walker` is written for you. Fill the two gaps:

1. `ADojoM1Walker::PreInitializeComponents`: three of the four keys need modifiers on their mappings so that all four arrive at the one Move action as the right pair of numbers. D is done for you.
2. `ADojoM1Walker::Move`: read the pair of numbers and move the pawn by it, scaled by `Speed` and by the time the frame took. In Unreal the world's X axis points forward and Y points right.

Dependency direction: the walker holds its own action and context, exactly like the turntable, and reaches the local player's subsystem only when a controller arrives or leaves.

Compiles against earlier quests: m1-turntable (`Quests/m1-turntable/DojoM1InputRig.h`, the test rig, which is not repeated here).

This walker is the second piece of the drone handoff boss.

## See it in the editor

Place a `DojoM1Walker` in the sandbox map, set Auto Possess Player to Player 0, and press Play. Walk with W, A, S, D. Type `ShowDebug EnhancedInput` in the console: the Move action shows a pair of numbers, for example (0, 1) while W is held.

# Files

## DojoM1Walker.h

```cpp
#pragma once

#include "CoreMinimal.h"
#include "GameFramework/Pawn.h"
#include "DojoM1Walker.generated.h"

class UInputAction;
class UInputMappingContext;
struct FInputActionValue;

/** A pawn that walks on the floor plane while it is controlled: W and S go forward and back, D and A go right and left. */
UCLASS()
class ADojoM1Walker : public APawn
{
	GENERATED_BODY()

public:
	/** Creates the scene root a pawn needs to have a place in the world, and turns ticking off. */
	ADojoM1Walker();

	/** How far a full push moves the pawn in one second, in units. */
	UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "Walker")
	float Speed = 300.f;

	/** The two-dimensional Move action; filled in with a default if a designer has not assigned one. */
	UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "Walker|Input")
	TObjectPtr<UInputAction> MoveAction;

	/** The context that maps W, A, S, D to the Move action; filled in with a default if a designer has not assigned one. */
	UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "Walker|Input")
	TObjectPtr<UInputMappingContext> MoveContext;

protected:
	/** Builds the default action and context when none were assigned, before the pawn can be possessed. */
	virtual void PreInitializeComponents() override;

	/** Takes this pawn's context off the old player and puts it on the new one. */
	virtual void NotifyControllerChanged() override;

	/** Binds the Move action to the Move function. */
	virtual void SetupPlayerInputComponent(UInputComponent* PlayerInputComponent) override;

private:
	/** Moves the pawn by the pushed direction for this frame. */
	void Move(const FInputActionValue& Value);
};
```

## DojoM1Walker.cpp

```cpp
#include "DojoM1Walker.h"

#include "Components/SceneComponent.h"
#include "EnhancedInputComponent.h"
#include "EnhancedInputSubsystems.h"
#include "Engine/LocalPlayer.h"
#include "GameFramework/PlayerController.h"
#include "InputAction.h"
#include "InputMappingContext.h"
#include "InputModifiers.h"

ADojoM1Walker::ADojoM1Walker()
{
	PrimaryActorTick.bCanEverTick = false;

	RootComponent = CreateDefaultSubobject<USceneComponent>(TEXT("Root"));
}

void ADojoM1Walker::PreInitializeComponents()
{
	if (!MoveAction)
	{
		MoveAction = NewObject<UInputAction>(this, TEXT("MoveAction"));
		MoveAction->ValueType = EInputActionValueType::Axis2D;
	}

	if (!MoveContext)
	{
		MoveContext = NewObject<UInputMappingContext>(this, TEXT("MoveContext"));
		MoveContext->MapKey(MoveAction, EKeys::D);

		// Your code: map W so its 1 lands on the forward slot of the pair.
		// Your code: map A so it pushes the opposite way to D.
		// Your code: map S so it pushes the opposite way to W.
	}

	Super::PreInitializeComponents();
}

void ADojoM1Walker::NotifyControllerChanged()
{
	if (const APlayerController* LeavingPlayer = Cast<APlayerController>(PreviousController))
	{
		if (UEnhancedInputLocalPlayerSubsystem* LeavingSubsystem = ULocalPlayer::GetSubsystem<UEnhancedInputLocalPlayerSubsystem>(LeavingPlayer->GetLocalPlayer()))
		{
			LeavingSubsystem->RemoveMappingContext(MoveContext);
		}
	}

	Super::NotifyControllerChanged();

	if (const APlayerController* ArrivingPlayer = Cast<APlayerController>(Controller))
	{
		if (UEnhancedInputLocalPlayerSubsystem* ArrivingSubsystem = ULocalPlayer::GetSubsystem<UEnhancedInputLocalPlayerSubsystem>(ArrivingPlayer->GetLocalPlayer()))
		{
			ArrivingSubsystem->AddMappingContext(MoveContext, 0);
		}
	}
}

void ADojoM1Walker::SetupPlayerInputComponent(UInputComponent* PlayerInputComponent)
{
	Super::SetupPlayerInputComponent(PlayerInputComponent);

	UEnhancedInputComponent* EnhancedInput = Cast<UEnhancedInputComponent>(PlayerInputComponent);
	if (!EnhancedInput) return;

	EnhancedInput->BindAction(MoveAction, ETriggerEvent::Triggered, this, &ADojoM1Walker::Move);
}

void ADojoM1Walker::Move(const FInputActionValue& Value)
{
	// Your code: read the pair of numbers and move the pawn by it, scaled by Speed and the frame's time.
}
```

# Tests

```cpp
#include "Misc/AutomationTest.h"

#if WITH_AUTOMATION_TESTS

#include "Quests/m1-move-pad/DojoM1Walker.h"
#include "Quests/m1-turntable/DojoM1InputRig.h"
#include "Support/DojoTestWorld.h"
#include "UObject/UnrealType.h"

namespace DojoM1MovePadTest
{
	/** Holds the given keys for one second at 60 frames per second, then lets go and runs two more frames. */
	void HoldForOneSecond(FDojoTestWorld& TestWorld, FDojoM1InputRig& Rig, std::initializer_list<FKey> Keys)
	{
		for (const FKey& Key : Keys) Rig.Press(Key);
		Rig.Tick(60);
		for (const FKey& Key : Keys) Rig.Release(Key);
		Rig.Tick(2);
	}
}

IMPLEMENT_SIMPLE_AUTOMATION_TEST(FDojo_M1_MovePad_FourKeysFourDirections, "Dojo.M1.MovePad.FourKeysFourDirections", EAutomationTestFlags::EditorContext | EAutomationTestFlags::ProductFilter)

/** Walks forward, back, right, and left for one second each and checks where the walker is after each leg. */
bool FDojo_M1_MovePad_FourKeysFourDirections::RunTest(const FString& Parameters)
{
	using namespace DojoM1MovePadTest;

	FDojoTestWorld TestWorld;
	FDojoM1InputRig Rig(TestWorld);

	ADojoM1Walker* Walker = TestWorld.SpawnActor<ADojoM1Walker>();
	if (!TestNotNull(TEXT("Walker spawned"), Walker)) return false;

	Rig.Possess(Walker);

	HoldForOneSecond(TestWorld, Rig, { EKeys::W });
	TestNearlyEqual(TEXT("W for a second goes 300 forward"), Walker->GetActorLocation().X, 300.0, 8.0);
	TestNearlyEqual(TEXT("W does not drift sideways"), Walker->GetActorLocation().Y, 0.0, 1.0);

	HoldForOneSecond(TestWorld, Rig, { EKeys::S });
	TestNearlyEqual(TEXT("S for a second comes 300 back"), Walker->GetActorLocation().X, 0.0, 10.0);

	HoldForOneSecond(TestWorld, Rig, { EKeys::D });
	TestNearlyEqual(TEXT("D for a second goes 300 right"), Walker->GetActorLocation().Y, 300.0, 8.0);
	TestNearlyEqual(TEXT("D does not drift forward"), Walker->GetActorLocation().X, 0.0, 10.0);

	HoldForOneSecond(TestWorld, Rig, { EKeys::A });
	TestNearlyEqual(TEXT("A for a second comes 300 back left"), Walker->GetActorLocation().Y, 0.0, 10.0);

	return true;
}

IMPLEMENT_SIMPLE_AUTOMATION_TEST(FDojo_M1_MovePad_SameSpeedInEveryDirection, "Dojo.M1.MovePad.SameSpeedInEveryDirection", EAutomationTestFlags::EditorContext | EAutomationTestFlags::ProductFilter)

/** Holds W and D together for a second and compares the distance covered with a single key's. */
bool FDojo_M1_MovePad_SameSpeedInEveryDirection::RunTest(const FString& Parameters)
{
	using namespace DojoM1MovePadTest;

	FDojoTestWorld TestWorld;
	FDojoM1InputRig Rig(TestWorld);

	ADojoM1Walker* Walker = TestWorld.SpawnActor<ADojoM1Walker>();
	if (!TestNotNull(TEXT("Walker spawned"), Walker)) return false;

	Rig.Possess(Walker);
	HoldForOneSecond(TestWorld, Rig, { EKeys::W, EKeys::D });

	const double Distance = Walker->GetActorLocation().Size();
	TestNearlyEqual(*FString::Printf(TEXT("Two keys together should cover the same 300 units as one key; the walker covered %.0f"), Distance), Distance, 300.0, 10.0);
	TestTrue(TEXT("It went forward and right"), Walker->GetActorLocation().X > 100.0 && Walker->GetActorLocation().Y > 100.0);

	return true;
}

IMPLEMENT_SIMPLE_AUTOMATION_TEST(FDojo_M1_MovePad_SpeedIsADesignerSetting, "Dojo.M1.MovePad.SpeedIsADesignerSetting", EAutomationTestFlags::EditorContext | EAutomationTestFlags::ProductFilter)

/** Sets Speed to 100 and checks two seconds of W cover 200 units. */
bool FDojo_M1_MovePad_SpeedIsADesignerSetting::RunTest(const FString& Parameters)
{
	FDojoTestWorld TestWorld;
	FDojoM1InputRig Rig(TestWorld);

	ADojoM1Walker* Walker = TestWorld.SpawnActor<ADojoM1Walker>();
	if (!TestNotNull(TEXT("Walker spawned"), Walker)) return false;

	Walker->Speed = 100.f;
	Rig.Possess(Walker);
	Rig.Press(EKeys::W);
	Rig.Tick(120);
	Rig.Release(EKeys::W);
	Rig.Tick(2);

	TestNearlyEqual(TEXT("100 units a second for two seconds is 200 units"), Walker->GetActorLocation().X, 200.0, 5.0);

	return true;
}

IMPLEMENT_SIMPLE_AUTOMATION_TEST(FDojo_M1_MovePad_ControlsFollowTheController, "Dojo.M1.MovePad.ControlsFollowTheController", EAutomationTestFlags::EditorContext | EAutomationTestFlags::ProductFilter)

/** Checks the keys work only while the walker is possessed. */
bool FDojo_M1_MovePad_ControlsFollowTheController::RunTest(const FString& Parameters)
{
	using namespace DojoM1MovePadTest;

	FDojoTestWorld TestWorld;
	FDojoM1InputRig Rig(TestWorld);

	ADojoM1Walker* Walker = TestWorld.SpawnActor<ADojoM1Walker>();
	if (!TestNotNull(TEXT("Walker spawned"), Walker) || !TestNotNull(TEXT("Context built"), Walker->MoveContext.Get())) return false;

	Rig.Possess(Walker);
	TestTrue(TEXT("While possessed the context is active"), Rig.GetSubsystem()->HasMappingContext(Walker->MoveContext));

	Rig.GetController()->UnPossess();
	Rig.Tick(1);
	TestFalse(TEXT("After the walker is let go the context is gone"), Rig.GetSubsystem()->HasMappingContext(Walker->MoveContext));

	HoldForOneSecond(TestWorld, Rig, { EKeys::W });
	TestNearlyEqual(TEXT("A walker nobody controls stays put"), Walker->GetActorLocation().Size(), 0.0, 0.01);

	return true;
}

IMPLEMENT_SIMPLE_AUTOMATION_TEST(FDojo_M1_MovePad_DesignersCanAssignAssets, "Dojo.M1.MovePad.DesignersCanAssignAssets", EAutomationTestFlags::EditorContext | EAutomationTestFlags::ProductFilter)

/** Checks through reflection that the speed, the action, and the context are editable in Details. */
bool FDojo_M1_MovePad_DesignersCanAssignAssets::RunTest(const FString& Parameters)
{
	const UClass* WalkerClass = ADojoM1Walker::StaticClass();

	for (const TCHAR* Name : { TEXT("Speed"), TEXT("MoveAction"), TEXT("MoveContext") })
	{
		const FProperty* Property = WalkerClass->FindPropertyByName(Name);

		if (!TestNotNull(FString::Printf(TEXT("%s is a UPROPERTY"), Name), Property)) continue;
		TestTrue(FString::Printf(TEXT("%s is editable in Details"), Name), Property->HasAnyPropertyFlags(CPF_Edit));
	}

	return true;
}

#endif
```

# Hints

- A key gives the action a 1 in the first slot of the pair. Decide for W, A, and S which slot or which sign has to change, and remember the world's X axis points forward while Y points right. In Move, read the pair, put its parts on the right world axes, and scale by Speed and the frame's time.
- The modifier classes are `UInputModifierSwizzleAxis` (it swaps the first two slots by default) and `UInputModifierNegate` (it flips every slot). They go into the `Modifiers` array of the mapping that `MapKey` returns, created with `NewObject` and the context as the outer. In Move, `Value.Get<FVector2D>()` gives the pair and `AddActorLocalOffset` takes an `FVector`.
- Each of A, W, and S needs its own mapping reference from `MapKey`; S needs two modifiers. When two keys are held at once the pair has a part from each, so look at how long the vector you move by can get and at the length-limiting helpers on `FVector2D`. Both are covered in `Math/Vector2D.h`.

# Rubric

- Move reads the action's value as a two-dimensional vector and uses both of its parts, with the second part driving forward and back motion.
- W, S, and A reach the single Move action through modifiers on their mappings, so the handler has no key-specific code.
- Motion is scaled by `Speed` and by the frame's delta time, so it does not depend on the frame rate.
- The binding is made in `SetupPlayerInputComponent`, and the context is added and removed as the controller arrives and leaves.
- The walker holds its action and its context; neither the controller nor the engine holds a pointer to the walker's input code.
- `Speed`, the action, and the context are properties a designer can set in Details.

# Alternative

A pawn with a `UFloatingPawnMovement` component could call `AddMovementInput(Direction, Scale)` from the handler and let the component move it, which also gives acceleration and collision sliding for free. Moving the actor directly, as here, keeps the quest about input and shows the numbers plainly, but it ignores collision and any movement rules; a real character would hand the pushed direction to its movement component.

# Parsons

```yaml
- id: walker-s-mapping
  prompt: Put the mapping for the S key in order.
  lines:
    - "FEnhancedActionKeyMapping& BackMapping = MoveContext->MapKey(MoveAction, EKeys::S);"
    - "BackMapping.Modifiers.Add(NewObject<UInputModifierSwizzleAxis>(MoveContext));"
    - "BackMapping.Modifiers.Add(NewObject<UInputModifierNegate>(MoveContext));"
  distractors:
    - line: "BackMapping.Modifiers.Add(NewObject<UInputModifierScalar>(MoveContext));"
      mistake: A scalar only multiplies the value, so it would not move the 1 onto the forward slot or flip its sign.
- id: walker-arrive
  prompt: Put the part of NotifyControllerChanged that runs when a controller arrives in order.
  lines:
    - "if (const APlayerController* ArrivingPlayer = Cast<APlayerController>(Controller))"
    - "{"
    - "	if (UEnhancedInputLocalPlayerSubsystem* ArrivingSubsystem = ULocalPlayer::GetSubsystem<UEnhancedInputLocalPlayerSubsystem>(ArrivingPlayer->GetLocalPlayer()))"
    - "	{"
    - "		ArrivingSubsystem->AddMappingContext(MoveContext, 0);"
    - "	}"
    - "}"
  distractors:
    - line: "		ArrivingSubsystem->RemoveMappingContext(MoveContext);"
      mistake: A controller that arrives needs the context added; removing is for the controller that leaves.
```
