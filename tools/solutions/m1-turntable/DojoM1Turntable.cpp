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
		if (UEnhancedInputLocalPlayerSubsystem* ArrivingSubsystem = ULocalPlayer::GetSubsystem<UEnhancedInputLocalPlayerSubsystem>(ArrivingPlayer->GetLocalPlayer()))
		{
			ArrivingSubsystem->AddMappingContext(TurnContext, 0);
		}
	}
}

void ADojoM1Turntable::SetupPlayerInputComponent(UInputComponent* PlayerInputComponent)
{
	Super::SetupPlayerInputComponent(PlayerInputComponent);

	UEnhancedInputComponent* EnhancedInput = Cast<UEnhancedInputComponent>(PlayerInputComponent);
	if (!EnhancedInput) return;

	EnhancedInput->BindAction(TurnAction, ETriggerEvent::Triggered, this, &ADojoM1Turntable::Turn);
}

void ADojoM1Turntable::Turn(const FInputActionValue& Value)
{
	const float Push = Value.Get<float>();
	AddActorLocalRotation(FRotator(0.f, Push * DegreesPerSecond * GetWorld()->GetDeltaSeconds(), 0.f));
}
