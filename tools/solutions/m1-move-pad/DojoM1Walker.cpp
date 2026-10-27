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

void ADojoM1Walker::PostInitializeComponents()
{
	Super::PostInitializeComponents();

	if (!MoveAction)
	{
		MoveAction = NewObject<UInputAction>(this, TEXT("MoveAction"));
		MoveAction->ValueType = EInputActionValueType::Axis2D;
	}

	if (!MoveContext)
	{
		MoveContext = NewObject<UInputMappingContext>(this, TEXT("MoveContext"));
		MoveContext->MapKey(MoveAction, EKeys::D);

		FEnhancedActionKeyMapping& ForwardMapping = MoveContext->MapKey(MoveAction, EKeys::W);
		ForwardMapping.Modifiers.Add(NewObject<UInputModifierSwizzleAxis>(MoveContext));

		FEnhancedActionKeyMapping& LeftMapping = MoveContext->MapKey(MoveAction, EKeys::A);
		LeftMapping.Modifiers.Add(NewObject<UInputModifierNegate>(MoveContext));

		FEnhancedActionKeyMapping& BackMapping = MoveContext->MapKey(MoveAction, EKeys::S);
		BackMapping.Modifiers.Add(NewObject<UInputModifierSwizzleAxis>(MoveContext));
		BackMapping.Modifiers.Add(NewObject<UInputModifierNegate>(MoveContext));
	}
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
	const FVector2D Push = Value.Get<FVector2D>().GetClampedToMaxSize(1.0);
	AddActorLocalOffset(FVector(Push.Y, Push.X, 0.f) * Speed * GetWorld()->GetDeltaSeconds());
}
