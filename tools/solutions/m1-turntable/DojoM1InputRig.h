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
