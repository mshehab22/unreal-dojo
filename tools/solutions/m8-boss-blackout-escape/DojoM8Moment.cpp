#include "DojoM8Moment.h"

#include "Components/SphereComponent.h"
#include "EnhancedInputComponent.h"
#include "EnhancedInputSubsystems.h"
#include "Engine/LocalPlayer.h"
#include "Engine/World.h"
#include "GameFramework/PlayerController.h"
#include "InputAction.h"
#include "InputMappingContext.h"
#include "Quests/m1-move-pad/DojoM1Walker.h"
#include "Quests/m8-alert-meter/DojoM8AlertMeter.h"
#include "Quests/m8-exit-gate/DojoM8ExitGate.h"
#include "Quests/m8-fuse-box/DojoM8Fuse.h"
#include "Quests/m8-fuse-box/DojoM8FuseBox.h"
#include "Quests/m8-moment-clock/DojoM8MomentClock.h"
#include "Quests/m8-searchlight/DojoM8Searchlight.h"

ADojoM8Moment::ADojoM8Moment()
{
	PrimaryActorTick.bCanEverTick = false;
}

void ADojoM8Moment::BeginPlay()
{
	Super::BeginPlay();

	APlayerController* Player = FindPlayer();
	if (!Player) return;

	RestartAction = NewObject<UInputAction>(this, TEXT("RestartAction"));

	DirectorContext = NewObject<UInputMappingContext>(this, TEXT("DirectorContext"));
	DirectorContext->MapKey(RestartAction, EKeys::R);

	// A director is not a pawn, so it receives keys only after it enables its own input for the player.
	EnableInput(Player);

	if (UEnhancedInputComponent* EnhancedInput = Cast<UEnhancedInputComponent>(InputComponent))
	{
		EnhancedInput->BindAction(RestartAction, ETriggerEvent::Started, this, &ADojoM8Moment::PressRestart);
	}

	if (UEnhancedInputLocalPlayerSubsystem* Subsystem = ULocalPlayer::GetSubsystem<UEnhancedInputLocalPlayerSubsystem>(Player->GetLocalPlayer()))
	{
		Subsystem->AddMappingContext(DirectorContext, 5);
	}

	StartRound();
}

void ADojoM8Moment::EndPlay(const EEndPlayReason::Type EndPlayReason)
{
	if (APlayerController* Player = FindPlayer())
	{
		if (UEnhancedInputLocalPlayerSubsystem* Subsystem = ULocalPlayer::GetSubsystem<UEnhancedInputLocalPlayerSubsystem>(Player->GetLocalPlayer()))
		{
			Subsystem->RemoveMappingContext(DirectorContext);
		}

		DisableInput(Player);
	}

	Super::EndPlay(EndPlayReason);
}

void ADojoM8Moment::StartRound()
{
	// Let go first: a controller whose pawn is destroyed under it can be destroyed with it, so the hero is released before it goes.
	if (APlayerController* Player = FindPlayer()) Player->UnPossess();

	TArray<AActor*> OldActors = { Hero, Light, FuseBox, ExitGate, AlertMeter, Clock };
	for (const TObjectPtr<ADojoM8Fuse>& OldFuse : Fuses) OldActors.Add(OldFuse);
	for (AActor* OldActor : OldActors)
	{
		if (IsValid(OldActor)) OldActor->Destroy();
	}
	Fuses.Reset();

	UWorld* World = GetWorld();
	Hero = World->SpawnActor<ADojoM1Walker>(FVector::ZeroVector, FRotator::ZeroRotator);
	Light = World->SpawnActor<ADojoM8Searchlight>(FVector(300.0, 300.0, 0.0), FRotator::ZeroRotator);
	FuseBox = World->SpawnActor<ADojoM8FuseBox>(FVector(0.0, -300.0, 0.0), FRotator::ZeroRotator);
	ExitGate = World->SpawnActor<ADojoM8ExitGate>(FVector(0.0, 1200.0, 0.0), FRotator::ZeroRotator);
	AlertMeter = World->SpawnActor<ADojoM8AlertMeter>(FVector(0.0, -300.0, 0.0), FRotator::ZeroRotator);
	Clock = World->SpawnActor<ADojoM8MomentClock>(FVector(0.0, -300.0, 0.0), FRotator::ZeroRotator);

	GiveHeroABody();

	for (const FVector& FuseSpot : { FVector(600.0, 0.0, 0.0), FVector(600.0, 600.0, 0.0), FVector(0.0, 600.0, 0.0) })
	{
		ADojoM8Fuse* NewFuse = World->SpawnActor<ADojoM8Fuse>(FuseSpot, FRotator::ZeroRotator);
		FuseBox->Watch(NewFuse);
		Fuses.Add(NewFuse);
	}

	FuseBox->OnPowered.AddUniqueDynamic(this, &ADojoM8Moment::HandlePowered);
	Light->Watch(Hero);
	AlertMeter->Watch(Light);
	Clock->WatchExit(ExitGate);
	Clock->WatchAlert(AlertMeter);
	Clock->TimeLimitSeconds = TimeLimitSeconds;
	Clock->Start();

	if (APlayerController* Player = FindPlayer()) Player->Possess(Hero);
}

FString ADojoM8Moment::GetStatusLine() const
{
	if (!Clock || !FuseBox || !AlertMeter) return TEXT("NO ROUND");

	return FString::Printf(TEXT("%s | fuses %d/%d | alert %.1f"), *Clock->GetLabel(), FuseBox->GetCollected(), FuseBox->RequiredFuses, AlertMeter->GetAlertLevel());
}

void ADojoM8Moment::PressRestart()
{
	if (!Clock) return;

	const EDojoM8Outcome Outcome = Clock->GetOutcome();
	if (Outcome == EDojoM8Outcome::EMO_Running || Outcome == EDojoM8Outcome::EMO_Waiting) return;

	StartRound();
}

void ADojoM8Moment::HandlePowered()
{
	if (IsValid(ExitGate)) ExitGate->SetPowered(true);
}

void ADojoM8Moment::GiveHeroABody()
{
	USphereComponent* Body = NewObject<USphereComponent>(Hero, TEXT("HeroBody"));
	Body->SetupAttachment(Hero->GetRootComponent());
	Body->InitSphereRadius(40.f);
	Body->SetCollisionProfileName(TEXT("Pawn"));
	Hero->AddInstanceComponent(Body);
	Body->RegisterComponent();
}

APlayerController* ADojoM8Moment::FindPlayer() const
{
	return GetWorld() ? GetWorld()->GetFirstPlayerController() : nullptr;
}
