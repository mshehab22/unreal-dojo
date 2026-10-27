---
id: m1-turntable
title: Two keys, one axis
order: 4
kind: build
scaffold: worked
difficulty: 1
patterns: []
skills: [input]
terms: [enhanced-input-component, setup-player-input-component, etriggerevent, finputactionvalue, input-action, input-mapping-context, input-modifier, local-player-subsystem]
prerequisites: [m1-binding-input]
xp: 50
estimatedMinutes: 15
concepts:
  - One action with a one-dimensional value can be driven by two keys with opposite signs
  - A pawn binds its actions in SetupPlayerInputComponent and brings its mapping context when it is possessed
---

# Brief

When you possess the turntable and hold D for one second it has turned 90 degrees to the right; hold A for two seconds and it has turned back past its start to 90 degrees to the left.

Most of `ADojoM1Turntable` is written for you. Explain the marked lines, then fill the two gaps:

1. `ADojoM1Turntable::SetupPlayerInputComponent`: bind the Turn action to `Turn` for the moment the pushed value is not zero.
2. `ADojoM1Turntable::Turn`: read the pushed value and turn the pawn by it, scaled by `DegreesPerSecond` and by the time the frame took, so the speed does not depend on the frame rate.

Dependency direction: the pawn holds its own action and its own context and reaches the local player's subsystem only at the moment a controller arrives or leaves. The controller and the engine hold no pointer to this class.

`DojoM1InputRig.h` is provided for the tests. It builds a pretend local player so a test can possess a pawn and press keys; do not change it.

This turntable is the first piece of the Yard Handoff boss.

## See it in the editor

Place a `DojoM1Turntable` in the sandbox map, set Auto Possess Player to Player 0 in its Details panel, and press Play. Hold D: the turntable turns right at 90 degrees per second. Hold A: it turns left. Open the console with the tilde key and type `ShowDebug EnhancedInput` to see the Turn action's live value: 1 while D is down, -1 while A is down, 0 otherwise.

# Files

## DojoM1Turntable.h

```cpp
#pragma once

#include "CoreMinimal.h"
#include "GameFramework/Pawn.h"
#include "DojoM1Turntable.generated.h"

class UInputAction;
class UInputMappingContext;
struct FInputActionValue;

/** A pawn that spins on the spot while it is controlled: D turns it right, A turns it left, and it brings its own controls with it. */
UCLASS()
class ADojoM1Turntable : public APawn
{
	GENERATED_BODY()

public:
	/** Turns ticking off. */
	ADojoM1Turntable();

	/** How fast a full push turns the pawn, in degrees per second. */
	UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "Turntable")
	float DegreesPerSecond = 90.f;

	/** The one-dimensional Turn action; filled in with a default if a designer has not assigned one. */
	UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "Turntable|Input")
	TObjectPtr<UInputAction> TurnAction;

	/** The context that maps D and A to the Turn action; filled in with a default if a designer has not assigned one. */
	UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "Turntable|Input")
	TObjectPtr<UInputMappingContext> TurnContext;

protected:
	/** Builds the default action and context when none were assigned. */
	virtual void PostInitializeComponents() override;

	/** Takes this pawn's context off the old player and puts it on the new one. */
	virtual void NotifyControllerChanged() override;

	/** Binds the Turn action to the Turn function. */
	virtual void SetupPlayerInputComponent(UInputComponent* PlayerInputComponent) override;

private:
	/** Turns the pawn by the pushed amount for this frame. */
	void Turn(const FInputActionValue& Value);
};
```

## DojoM1Turntable.cpp

```cpp
#include "DojoM1Turntable.h"

#include "EnhancedInputComponent.h"
#include "EnhancedInputSubsystems.h"
#include "Engine/LocalPlayer.h"
#include "GameFramework/PlayerController.h"
#include "InputAction.h"
#include "InputMappingContext.h"
#include "InputModifiers.h"

ADojoM1Turntable::ADojoM1Turntable()
{
	PrimaryActorTick.bCanEverTick = false;
}

void ADojoM1Turntable::PostInitializeComponents()
{
	Super::PostInitializeComponents();

	if (!TurnAction)
	{
		TurnAction = NewObject<UInputAction>(this, TEXT("TurnAction"));
		TurnAction->ValueType = EInputActionValueType::Axis1D;
	}

	if (!TurnContext)
	{
		TurnContext = NewObject<UInputMappingContext>(this, TEXT("TurnContext"));
		TurnContext->MapKey(TurnAction, EKeys::D);

		FEnhancedActionKeyMapping& LeftMapping = TurnContext->MapKey(TurnAction, EKeys::A);
		LeftMapping.Modifiers.Add(NewObject<UInputModifierNegate>(TurnContext));
	}
}

void ADojoM1Turntable::NotifyControllerChanged()
{
	if (const APlayerController* LeavingPlayer = Cast<APlayerController>(PreviousController))
	{
		if (UEnhancedInputLocalPlayerSubsystem* LeavingSubsystem = ULocalPlayer::GetSubsystem<UEnhancedInputLocalPlayerSubsystem>(LeavingPlayer->GetLocalPlayer()))
		{
			LeavingSubsystem->RemoveMappingContext(TurnContext);
		}
	}

	Super::NotifyControllerChanged();

	if (const APlayerController* ArrivingPlayer = Cast<APlayerController>(Controller))
	{
		if (UEnhancedInputLocalPlayerSubsystem* ArrivingSubsystem = ULocalPlayer::GetSubsystem<UEnhancedInputLocalPlayerSubsystem>(ArrivingPlayer->GetLocalPlayer())) // @explain: The local player subsystem is how code reaches one player's Enhanced Input; it lives on the local player, not on the pawn.
		{
			ArrivingSubsystem->AddMappingContext(TurnContext, 0); // @explain: Priority 0 is the base layer; a context added later with a higher number wins when both map the same key.
		}
	}
}

void ADojoM1Turntable::SetupPlayerInputComponent(UInputComponent* PlayerInputComponent)
{
	Super::SetupPlayerInputComponent(PlayerInputComponent);

	UEnhancedInputComponent* EnhancedInput = Cast<UEnhancedInputComponent>(PlayerInputComponent); // @explain: The component arrives as the plain base type; the project's default input component class decides whether this cast succeeds.
	if (!EnhancedInput) return;

	// Your code: bind the Turn action to the Turn function for the Triggered event.
}

void ADojoM1Turntable::Turn(const FInputActionValue& Value)
{
	// Your code: read the pushed value as a float and turn the pawn about its up axis by that value times DegreesPerSecond times the frame's time.
}
```

## DojoM1InputRig.h

```cpp
#pragma once

#include "CoreMinimal.h"
#include "EnhancedInputSubsystems.h"
#include "Engine/Engine.h"
#include "Engine/GameInstance.h"
#include "Engine/LocalPlayer.h"
#include "GameFramework/Pawn.h"
#include "GameFramework/PlayerController.h"
#include "InputCoreTypes.h"
#include "InputKeyEventArgs.h"
#include "Tickable.h"
#include "Support/DojoTestWorld.h"
#include "UObject/StrongObjectPtr.h"

/** A pretend player for tests: a local player and its controller inside a test world, so a test can possess a pawn and press keys. Provided; not part of the quest. */
class FDojoM1InputRig
{
public:
	/** Creates the local player and a controller and links them, the way the engine does when a player joins. */
	explicit FDojoM1InputRig(FDojoTestWorld& InTestWorld)
		: TestWorld(InTestWorld)
	{
		// The engine's per-frame controller update asks the world's game instance how many local players there are, so the test world gets an empty one.
		GameInstance.Reset(NewObject<UGameInstance>(GEngine));
		TestWorld.GetWorld()->SetGameInstance(GameInstance.Get());

		ULocalPlayer* NewPlayer = NewObject<ULocalPlayer>(GEngine, GEngine->LocalPlayerClass);
		LocalPlayer.Reset(NewPlayer);
		NewPlayer->PlayerAdded(nullptr, 0);

		Controller = TestWorld.SpawnActor<APlayerController>();
		Controller->SetPlayer(NewPlayer);
	}

	/** Lets the pawn go and shuts the local player down. */
	~FDojoM1InputRig()
	{
		if (IsValid(Controller)) Controller->UnPossess();
		if (LocalPlayer.IsValid()) LocalPlayer->PlayerRemoved();
		TestWorld.GetWorld()->SetGameInstance(nullptr);
	}

	FDojoM1InputRig(const FDojoM1InputRig&) = delete;
	FDojoM1InputRig& operator=(const FDojoM1InputRig&) = delete;

	/** The player's controller. */
	APlayerController* GetController() const
	{
		return Controller;
	}

	/** The Enhanced Input subsystem of the local player. */
	UEnhancedInputLocalPlayerSubsystem* GetSubsystem() const
	{
		return LocalPlayer->GetSubsystem<UEnhancedInputLocalPlayerSubsystem>();
	}

	/** Makes the controller possess a pawn, then runs one frame so the pawn's contexts are in effect before any key goes down. */
	void Possess(APawn* Pawn)
	{
		Controller->Possess(Pawn);
		Tick(1);
	}

	/** Runs frames of the world, and after each one the engine's tickable objects, which is where Enhanced Input applies changed mapping contexts. */
	void Tick(int32 FrameCount, float DeltaSeconds = FDojoTestWorld::DefaultFrameSeconds)
	{
		for (int32 Frame = 0; Frame < FrameCount; ++Frame)
		{
			TestWorld.Tick(1, DeltaSeconds);
			FTickableGameObject::TickObjects(nullptr, LEVELTICK_All, false, DeltaSeconds);
		}
	}

	/** Presses a key and keeps it down until Release. */
	void Press(const FKey& Key)
	{
		Controller->InputKey(FInputKeyEventArgs::CreateSimulated(Key, IE_Pressed, 1.f));
	}

	/** Lets go of a key. */
	void Release(const FKey& Key)
	{
		Controller->InputKey(FInputKeyEventArgs::CreateSimulated(Key, IE_Released, 0.f));
	}

private:
	FDojoTestWorld& TestWorld;
	TStrongObjectPtr<UGameInstance> GameInstance;
	TStrongObjectPtr<ULocalPlayer> LocalPlayer;
	APlayerController* Controller = nullptr;
};
```

# Tests

```cpp
#include "Misc/AutomationTest.h"

#if WITH_AUTOMATION_TESTS

#include "Quests/m1-turntable/DojoM1InputRig.h"
#include "Quests/m1-turntable/DojoM1Turntable.h"
#include "Support/DojoTestWorld.h"
#include "UObject/UnrealType.h"

IMPLEMENT_SIMPLE_AUTOMATION_TEST(FDojo_M1_Turntable_TwoKeysOneAxis, "Dojo.M1.Turntable.TwoKeysOneAxis", EAutomationTestFlags::EditorContext | EAutomationTestFlags::ProductFilter)

/** Holds D for one second and A for two and checks the yaw each time. */
bool FDojo_M1_Turntable_TwoKeysOneAxis::RunTest(const FString& Parameters)
{
	FDojoTestWorld TestWorld;
	FDojoM1InputRig Rig(TestWorld);

	ADojoM1Turntable* Table = TestWorld.SpawnActor<ADojoM1Turntable>();
	if (!TestNotNull(TEXT("Turntable spawned"), Table)) return false;

	Rig.Possess(Table);
	TestEqual(TEXT("Nothing is pressed, so it has not turned"), Table->GetActorRotation().Yaw, 0.0);

	Rig.Press(EKeys::D);
	Rig.Tick(60);
	Rig.Release(EKeys::D);
	Rig.Tick(2);
	TestNearlyEqual(TEXT("One second of D turns it 90 degrees right"), Table->GetActorRotation().Yaw, 90.0, 3.0);

	Rig.Press(EKeys::A);
	Rig.Tick(120);
	Rig.Release(EKeys::A);
	Rig.Tick(2);
	TestNearlyEqual(TEXT("Two seconds of A turn it 180 degrees back, to 90 left"), Table->GetActorRotation().Yaw, -90.0, 3.0);

	return true;
}

IMPLEMENT_SIMPLE_AUTOMATION_TEST(FDojo_M1_Turntable_SpeedIsFrameRateIndependent, "Dojo.M1.Turntable.SpeedIsFrameRateIndependent", EAutomationTestFlags::EditorContext | EAutomationTestFlags::ProductFilter)

/** Turns for one second at 30 frames per second and at 120, and checks the angle is the same. */
bool FDojo_M1_Turntable_SpeedIsFrameRateIndependent::RunTest(const FString& Parameters)
{
	FDojoTestWorld TestWorld;
	FDojoM1InputRig Rig(TestWorld);

	ADojoM1Turntable* Slow = TestWorld.SpawnActor<ADojoM1Turntable>();
	if (!TestNotNull(TEXT("Turntable spawned"), Slow)) return false;

	Rig.Possess(Slow);
	Rig.Press(EKeys::D);
	Rig.Tick(30, 1.f / 30.f);
	Rig.Release(EKeys::D);
	Rig.Tick(2, 1.f / 30.f);
	const float SlowYaw = Slow->GetActorRotation().Yaw;

	Rig.GetController()->UnPossess();
	ADojoM1Turntable* Fast = TestWorld.SpawnActor<ADojoM1Turntable>();
	Rig.Possess(Fast);
	Rig.Press(EKeys::D);
	Rig.Tick(120, 1.f / 120.f);
	Rig.Release(EKeys::D);
	Rig.Tick(2, 1.f / 120.f);
	const float FastYaw = Fast->GetActorRotation().Yaw;

	TestNearlyEqual(TEXT("30 frames per second still turns about 90 degrees in a second"), SlowYaw, 90.f, 4.f);
	TestNearlyEqual(TEXT("120 frames per second turns the same angle"), FastYaw, SlowYaw, 4.f);

	return true;
}

IMPLEMENT_SIMPLE_AUTOMATION_TEST(FDojo_M1_Turntable_SpeedIsADesignerSetting, "Dojo.M1.Turntable.SpeedIsADesignerSetting", EAutomationTestFlags::EditorContext | EAutomationTestFlags::ProductFilter)

/** Doubles DegreesPerSecond and checks one second turns twice as far. */
bool FDojo_M1_Turntable_SpeedIsADesignerSetting::RunTest(const FString& Parameters)
{
	FDojoTestWorld TestWorld;
	FDojoM1InputRig Rig(TestWorld);

	ADojoM1Turntable* Table = TestWorld.SpawnActor<ADojoM1Turntable>();
	if (!TestNotNull(TEXT("Turntable spawned"), Table)) return false;

	Table->DegreesPerSecond = 45.f;
	Rig.Possess(Table);
	Rig.Press(EKeys::D);
	Rig.Tick(60);
	Rig.Release(EKeys::D);
	Rig.Tick(2);

	TestNearlyEqual(TEXT("45 degrees per second for one second turns it 45 degrees"), Table->GetActorRotation().Yaw, 45.0, 2.0);

	return true;
}

IMPLEMENT_SIMPLE_AUTOMATION_TEST(FDojo_M1_Turntable_ControlsFollowTheController, "Dojo.M1.Turntable.ControlsFollowTheController", EAutomationTestFlags::EditorContext | EAutomationTestFlags::ProductFilter)

/** Checks the context is switched on while the pawn is possessed, switched off when it is let go, and that keys then do nothing. */
bool FDojo_M1_Turntable_ControlsFollowTheController::RunTest(const FString& Parameters)
{
	FDojoTestWorld TestWorld;
	FDojoM1InputRig Rig(TestWorld);

	ADojoM1Turntable* Table = TestWorld.SpawnActor<ADojoM1Turntable>();
	if (!TestNotNull(TEXT("Turntable spawned"), Table) || !TestNotNull(TEXT("Context built"), Table->TurnContext.Get())) return false;

	TestFalse(TEXT("Before possession the context is not active"), Rig.GetSubsystem()->HasMappingContext(Table->TurnContext));

	Rig.Possess(Table);
	TestTrue(TEXT("While possessed the context is active"), Rig.GetSubsystem()->HasMappingContext(Table->TurnContext));

	Rig.GetController()->UnPossess();
	Rig.Tick(1);
	TestFalse(TEXT("After the pawn is let go the context is gone"), Rig.GetSubsystem()->HasMappingContext(Table->TurnContext));

	Rig.Press(EKeys::D);
	Rig.Tick(60);
	Rig.Release(EKeys::D);
	TestNearlyEqual(TEXT("A pawn nobody controls does not turn"), Table->GetActorRotation().Yaw, 0.0, 0.01);

	return true;
}

IMPLEMENT_SIMPLE_AUTOMATION_TEST(FDojo_M1_Turntable_DesignersCanAssignAssets, "Dojo.M1.Turntable.DesignersCanAssignAssets", EAutomationTestFlags::EditorContext | EAutomationTestFlags::ProductFilter)

/** Checks through reflection that the action, the context, and the speed are editable and that Turn is not exposed. */
bool FDojo_M1_Turntable_DesignersCanAssignAssets::RunTest(const FString& Parameters)
{
	const UClass* TurntableClass = ADojoM1Turntable::StaticClass();

	for (const TCHAR* Name : { TEXT("DegreesPerSecond"), TEXT("TurnAction"), TEXT("TurnContext") })
	{
		const FProperty* Property = TurntableClass->FindPropertyByName(Name);

		if (!TestNotNull(FString::Printf(TEXT("%s is a UPROPERTY"), Name), Property)) continue;
		TestTrue(FString::Printf(TEXT("%s is editable in Details"), Name), Property->HasAnyPropertyFlags(CPF_Edit));
	}

	const FProperty* TurnAction = TurntableClass->FindPropertyByName(TEXT("TurnAction"));
	if (TestNotNull(TEXT("TurnAction is a property"), TurnAction)) TestTrue(TEXT("TurnAction holds an object, so an asset can be assigned"), TurnAction->IsA<FObjectProperty>());

	return true;
}

#endif
```

# Hints

- Turn is two steps: take the number the player pushed out of the argument, then rotate by it. SetupPlayerInputComponent needs one line that names the action, the moment, the object, and the function.
- The action was set up as a one-dimensional axis, so the value is read as a float. Rotating about the up axis is a change of yaw, and a speed in degrees per second becomes an angle by multiplying by the time the frame took.
- `BindAction` takes the action, an `ETriggerEvent`, the object, and the address of the function. The event for every frame the pushed value is not zero is `Triggered`. `GetWorld()->GetDeltaSeconds()` is the frame time and `AddActorLocalRotation` takes an `FRotator`; both are covered in `Engine/World.h` and `GameFramework/Actor.h`.

# Rubric

- Turn reads the value as a float and multiplies it by `DegreesPerSecond` and by the frame's delta time, so the speed does not depend on the frame rate.
- The Turn action is bound to `Turn` for `Triggered`, inside `SetupPlayerInputComponent`, after the cast to the Enhanced Input component.
- One action serves both keys: A reaches it through a Negate modifier, so the handler has no key-specific code.
- The mapping context is added to the local player's subsystem when the pawn gets a controller and removed from the old player when it loses it.
- The pawn holds its action and its context; neither the controller nor the engine holds a pointer to the pawn's input code.
- The action and the context are properties a designer can assign in Details, with a default built in code only when none is assigned.

# Alternative

The pawn could ask each key directly in `Tick` with `IsInputKeyDown(EKeys::D)` and `IsInputKeyDown(EKeys::A)` and add the two results. That is short, but every new device or rebinding means editing the code, and the pawn cannot be controlled differently by two players. The action keeps the pawn ignorant of keys: the handler only sees a number, and the mapping context decides which buttons produce it.

# Parsons

```yaml
- id: turntable-turn
  prompt: Put Turn in order.
  lines:
    - "void ADojoM1Turntable::Turn(const FInputActionValue& Value)"
    - "{"
    - "	const float Push = Value.Get<float>();"
    - "	const float Step = Push * DegreesPerSecond * GetWorld()->GetDeltaSeconds();"
    - "	AddActorLocalRotation(FRotator(0.f, Step, 0.f));"
    - "}"
  distractors:
    - line: "	const FVector2D Push = Value.Get<FVector2D>();"
      mistake: The Turn action is a one-dimensional axis, so its value is read as a float, not as a two-dimensional vector.
- id: turntable-bind
  prompt: Put the binding in order.
  lines:
    - "UEnhancedInputComponent* EnhancedInput = Cast<UEnhancedInputComponent>(PlayerInputComponent);"
    - "if (!EnhancedInput) return;"
    - "EnhancedInput->BindAction(TurnAction, ETriggerEvent::Triggered, this, &ADojoM1Turntable::Turn);"
  distractors:
    - line: "EnhancedInput->BindAxis(TEXT(\"Turn\"), this, &ADojoM1Turntable::Turn);"
      mistake: BindAxis belongs to the older input system and takes an axis name; Enhanced Input binds an action asset.
```
