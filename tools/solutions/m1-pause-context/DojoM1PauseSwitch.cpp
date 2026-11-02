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
	if (bOpen) return;

	UEnhancedInputLocalPlayerSubsystem* Subsystem = FindSubsystem();
	if (!Subsystem) return;

	BuildContext();
	Subsystem->AddMappingContext(PauseContext, PausePriority);
	bOpen = true;
}

void UDojoM1PauseSwitch::Close()
{
	if (!bOpen) return;

	if (UEnhancedInputLocalPlayerSubsystem* Subsystem = FindSubsystem()) Subsystem->RemoveMappingContext(PauseContext);
	bOpen = false;
}

void UDojoM1PauseSwitch::Toggle()
{
	if (bOpen) Close();
	else Open();
}

bool UDojoM1PauseSwitch::IsOpen() const
{
	return bOpen;
}

UEnhancedInputLocalPlayerSubsystem* UDojoM1PauseSwitch::FindSubsystem() const
{
	const APlayerController* Player = GetWorld() ? GetWorld()->GetFirstPlayerController() : nullptr;
	return Player ? ULocalPlayer::GetSubsystem<UEnhancedInputLocalPlayerSubsystem>(Player->GetLocalPlayer()) : nullptr;
}

void UDojoM1PauseSwitch::BuildContext()
{
	if (!SwallowAction)
	{
		SwallowAction = NewObject<UInputAction>(this, TEXT("SwallowAction"));
		SwallowAction->ValueType = EInputActionValueType::Boolean;
	}

	SwallowAction->bConsumeInput = bConsumeKeys;

	PauseContext = NewObject<UInputMappingContext>(this);
	for (const FKey& BlockedKey : BlockedKeys) PauseContext->MapKey(SwallowAction, BlockedKey);
}
