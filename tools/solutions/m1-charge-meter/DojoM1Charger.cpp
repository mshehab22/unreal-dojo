#include "DojoM1Charger.h"

#include "Components/SceneComponent.h"
#include "EnhancedInputComponent.h"
#include "EnhancedInputSubsystems.h"
#include "Engine/LocalPlayer.h"
#include "GameFramework/PlayerController.h"
#include "InputAction.h"
#include "InputMappingContext.h"
#include "InputTriggers.h"

ADojoM1Charger::ADojoM1Charger()
{
	PrimaryActorTick.bCanEverTick = false;

	RootComponent = CreateDefaultSubobject<USceneComponent>(TEXT("Root"));
}

void ADojoM1Charger::PostInitializeComponents()
{
	Super::PostInitializeComponents();

	if (!ChargeAction)
	{
		ChargeAction = NewObject<UInputAction>(this, TEXT("ChargeAction"));
		ChargeAction->ValueType = EInputActionValueType::Boolean;
	}

	if (!ChargeContext)
	{
		ChargeContext = NewObject<UInputMappingContext>(this, TEXT("ChargeContext"));

		UInputTriggerHold* Hold = NewObject<UInputTriggerHold>(ChargeContext);
		Hold->HoldTimeThreshold = FullChargeSeconds;

		FEnhancedActionKeyMapping& SpaceMapping = ChargeContext->MapKey(ChargeAction, EKeys::SpaceBar);
		SpaceMapping.Triggers.Add(Hold);
	}
}

void ADojoM1Charger::NotifyControllerChanged()
{
	if (const APlayerController* LeavingPlayer = Cast<APlayerController>(PreviousController))
	{
		if (UEnhancedInputLocalPlayerSubsystem* LeavingSubsystem = ULocalPlayer::GetSubsystem<UEnhancedInputLocalPlayerSubsystem>(LeavingPlayer->GetLocalPlayer()))
		{
			LeavingSubsystem->RemoveMappingContext(ChargeContext);
		}
	}

	Super::NotifyControllerChanged();

	if (const APlayerController* ArrivingPlayer = Cast<APlayerController>(Controller))
	{
		if (UEnhancedInputLocalPlayerSubsystem* ArrivingSubsystem = ULocalPlayer::GetSubsystem<UEnhancedInputLocalPlayerSubsystem>(ArrivingPlayer->GetLocalPlayer()))
		{
			ArrivingSubsystem->AddMappingContext(ChargeContext, 0);
		}
	}
}

void ADojoM1Charger::SetupPlayerInputComponent(UInputComponent* PlayerInputComponent)
{
	Super::SetupPlayerInputComponent(PlayerInputComponent);

	UEnhancedInputComponent* EnhancedInput = Cast<UEnhancedInputComponent>(PlayerInputComponent);
	if (!EnhancedInput) return;

	EnhancedInput->BindAction(ChargeAction, ETriggerEvent::Started, this, &ADojoM1Charger::BeginCharge);
	EnhancedInput->BindAction(ChargeAction, ETriggerEvent::Ongoing, this, &ADojoM1Charger::ContinueCharge);
	EnhancedInput->BindAction(ChargeAction, ETriggerEvent::Triggered, this, &ADojoM1Charger::ReachFullCharge);
	EnhancedInput->BindAction(ChargeAction, ETriggerEvent::Canceled, this, &ADojoM1Charger::ReleaseEarly);
	EnhancedInput->BindAction(ChargeAction, ETriggerEvent::Completed, this, &ADojoM1Charger::ReleaseFull);
}

float ADojoM1Charger::GetMeter() const
{
	return Meter;
}

bool ADojoM1Charger::IsCharging() const
{
	return bCharging;
}

EDojoM1ShotTier ADojoM1Charger::GetLastShot() const
{
	return LastShot;
}

int32 ADojoM1Charger::GetShotsFired() const
{
	return ShotsFired;
}

EDojoM1ShotTier ADojoM1Charger::TierForMeter(float MeterValue)
{
	if (MeterValue >= 1.f) return EDojoM1ShotTier::Heavy;
	if (MeterValue >= 0.5f) return EDojoM1ShotTier::Medium;
	return EDojoM1ShotTier::Light;
}

void ADojoM1Charger::BeginCharge()
{
	Meter = 0.f;
	bCharging = true;
}

void ADojoM1Charger::ContinueCharge(const FInputActionInstance& Instance)
{
	Meter = FMath::Clamp(Instance.GetElapsedTime() / FullChargeSeconds, 0.f, 1.f);
}

void ADojoM1Charger::ReachFullCharge()
{
	Meter = 1.f;
}

void ADojoM1Charger::ReleaseEarly()
{
	Fire(TierForMeter(Meter));
}

void ADojoM1Charger::ReleaseFull()
{
	Fire(EDojoM1ShotTier::Heavy);
}

void ADojoM1Charger::Fire(EDojoM1ShotTier Tier)
{
	LastShot = Tier;
	++ShotsFired;
	Meter = 0.f;
	bCharging = false;
}
