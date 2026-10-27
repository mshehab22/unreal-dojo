#include "DojoM1DroneHandoff.h"

#include "DojoM1Charger.h"
#include "DojoM1PauseSwitch.h"
#include "DojoM1Turntable.h"
#include "DojoM1Walker.h"
#include "EnhancedInputComponent.h"
#include "EnhancedInputSubsystems.h"
#include "Engine/LocalPlayer.h"
#include "Engine/World.h"
#include "GameFramework/PlayerController.h"
#include "InputAction.h"
#include "InputMappingContext.h"

ADojoM1DroneHandoff::ADojoM1DroneHandoff()
{
	PrimaryActorTick.bCanEverTick = false;

	Pause = CreateDefaultSubobject<UDojoM1PauseSwitch>(TEXT("Pause"));
	Pause->BlockedKeys.AddUnique(EKeys::F);
}

void ADojoM1DroneHandoff::BeginPlay()
{
	Super::BeginPlay();

	APlayerController* Player = FindPlayer();
	if (!Player) return;

	HandoffAction = NewObject<UInputAction>(this, TEXT("HandoffAction"));
	PauseAction = NewObject<UInputAction>(this, TEXT("PauseAction"));
	RestartAction = NewObject<UInputAction>(this, TEXT("RestartAction"));

	DirectorContext = NewObject<UInputMappingContext>(this, TEXT("DirectorContext"));
	DirectorContext->MapKey(HandoffAction, EKeys::F);
	DirectorContext->MapKey(PauseAction, EKeys::Tab);
	DirectorContext->MapKey(RestartAction, EKeys::R);

	// A director is not a pawn, so it receives keys only after it enables its own input for the player.
	EnableInput(Player);

	if (UEnhancedInputComponent* EnhancedInput = Cast<UEnhancedInputComponent>(InputComponent))
	{
		EnhancedInput->BindAction(HandoffAction, ETriggerEvent::Started, this, &ADojoM1DroneHandoff::PressHandoff);
		EnhancedInput->BindAction(PauseAction, ETriggerEvent::Started, this, &ADojoM1DroneHandoff::PressPause);
		EnhancedInput->BindAction(RestartAction, ETriggerEvent::Started, this, &ADojoM1DroneHandoff::PressRestart);
	}

	if (UEnhancedInputLocalPlayerSubsystem* Subsystem = ULocalPlayer::GetSubsystem<UEnhancedInputLocalPlayerSubsystem>(Player->GetLocalPlayer()))
	{
		Subsystem->AddMappingContext(DirectorContext, 5);
	}

	StartRound();
}

void ADojoM1DroneHandoff::EndPlay(const EEndPlayReason::Type EndPlayReason)
{
	if (const APlayerController* Player = FindPlayer())
	{
		if (UEnhancedInputLocalPlayerSubsystem* Subsystem = ULocalPlayer::GetSubsystem<UEnhancedInputLocalPlayerSubsystem>(Player->GetLocalPlayer()))
		{
			Subsystem->RemoveMappingContext(DirectorContext);
		}
	}

	Super::EndPlay(EndPlayReason);
}

void ADojoM1DroneHandoff::StartRound()
{
	Pause->Close();

	for (AActor* OldPawn : { static_cast<AActor*>(Hero), static_cast<AActor*>(Scanner), static_cast<AActor*>(Cannon) })
	{
		if (IsValid(OldPawn)) OldPawn->Destroy();
	}

	UWorld* World = GetWorld();
	Hero = World->SpawnActor<ADojoM1Walker>(FVector::ZeroVector, FRotator::ZeroRotator);
	Scanner = World->SpawnActor<ADojoM1Turntable>(FVector(DroneDistance, 0.f, 0.f), FRotator::ZeroRotator);
	Cannon = World->SpawnActor<ADojoM1Charger>(FVector(-DroneDistance, 0.f, 0.f), FRotator::ZeroRotator);

	bRoundDone = false;
	RoundStartSeconds = World->GetTimeSeconds();
	RoundSeconds = 0.0;

	GiveControlTo(Hero);
}

FString ADojoM1DroneHandoff::GetModeLabel() const
{
	const APlayerController* Player = FindPlayer();
	const APawn* Controlled = Player ? Player->GetPawn() : nullptr;

	FString Label = TEXT("NOBODY");
	if (Controlled == Hero) Label = TEXT("HERO");
	else if (Controlled == Scanner) Label = TEXT("SCANNER");
	else if (Controlled == Cannon) Label = TEXT("CANNON");

	return Pause->IsOpen() ? Label + TEXT(" PAUSED") : Label;
}

FString ADojoM1DroneHandoff::GetStatusLine() const
{
	return bRoundDone ? FString::Printf(TEXT("DRILL DONE in %.1f s"), RoundSeconds) : GetModeLabel();
}

bool ADojoM1DroneHandoff::IsRoundDone() const
{
	return bRoundDone;
}

void ADojoM1DroneHandoff::PressHandoff()
{
	const APlayerController* Player = FindPlayer();
	if (!Player || bRoundDone) return;

	if (Player->GetPawn() == Hero)
	{
		if (APawn* Drone = FindDroneInReach()) GiveControlTo(Drone);
		return;
	}

	ReturnToHero();
}

void ADojoM1DroneHandoff::PressPause()
{
	Pause->Toggle();
}

void ADojoM1DroneHandoff::PressRestart()
{
	if (bRoundDone) StartRound();
}

APawn* ADojoM1DroneHandoff::FindDroneInReach() const
{
	if (!IsValid(Hero)) return nullptr;

	const double ScannerDistance = IsValid(Scanner) ? FVector::Dist(Hero->GetActorLocation(), Scanner->GetActorLocation()) : TNumericLimits<double>::Max();
	const double CannonDistance = IsValid(Cannon) ? FVector::Dist(Hero->GetActorLocation(), Cannon->GetActorLocation()) : TNumericLimits<double>::Max();

	if (ScannerDistance <= ReachDistance && ScannerDistance <= CannonDistance) return Scanner;
	if (CannonDistance <= ReachDistance) return Cannon;
	return nullptr;
}

void ADojoM1DroneHandoff::GiveControlTo(APawn* Target)
{
	if (APlayerController* Player = FindPlayer()) Player->Possess(Target);
}

void ADojoM1DroneHandoff::ReturnToHero()
{
	GiveControlTo(Hero);

	const bool bScannerTurned = FMath::Abs(Scanner->GetActorRotation().Yaw) >= TurnGoalDegrees;
	const bool bCannonFiredHeavy = Cannon->GetLastShot() == EDojoM1ShotTier::Heavy;
	if (!bScannerTurned || !bCannonFiredHeavy) return;

	bRoundDone = true;
	RoundSeconds = GetWorld()->GetTimeSeconds() - RoundStartSeconds;
}

APlayerController* ADojoM1DroneHandoff::FindPlayer() const
{
	return GetWorld() ? GetWorld()->GetFirstPlayerController() : nullptr;
}
