#include "DojoP7Drawbridge.h"

#include "Components/TextRenderComponent.h"

ADojoP7Drawbridge::ADojoP7Drawbridge()
{
	PrimaryActorTick.bCanEverTick = true;

	Label = CreateDefaultSubobject<UTextRenderComponent>(TEXT("Label"));
	RootComponent = Label;
	Label->SetHorizontalAlignment(EHTA_Center);
}

void ADojoP7Drawbridge::BeginPlay()
{
	Super::BeginPlay();

	RefreshLabel();
}

void ADojoP7Drawbridge::Raise()
{
	if (State == EDojoP7BridgeState::EBS_Down) SetState(EDojoP7BridgeState::EBS_Raising);
}

void ADojoP7Drawbridge::Lower()
{
	if (State == EDojoP7BridgeState::EBS_Up) SetState(EDojoP7BridgeState::EBS_Lowering);
}

void ADojoP7Drawbridge::Jam()
{
	SetState(EDojoP7BridgeState::EBS_Jammed);
}

void ADojoP7Drawbridge::Repair()
{
	if (State != EDojoP7BridgeState::EBS_Jammed) return;

	SetState(Height > 0.f ? EDojoP7BridgeState::EBS_Lowering : EDojoP7BridgeState::EBS_Down);
}

void ADojoP7Drawbridge::Tick(float DeltaSeconds)
{
	Super::Tick(DeltaSeconds);

	switch (State)
	{
	case EDojoP7BridgeState::EBS_Raising:
		Height = FMath::Min(1.f, Height + DeltaSeconds / TravelSeconds);
		if (Height >= 1.f) SetState(EDojoP7BridgeState::EBS_Up);
		break;
	case EDojoP7BridgeState::EBS_Lowering:
		Height = FMath::Max(0.f, Height - DeltaSeconds / TravelSeconds);
		if (Height <= 0.f) SetState(EDojoP7BridgeState::EBS_Down);
		break;
	default:
		return;
	}

	SetActorRotation(FRotator(Height * 80.f, 0.f, 0.f));
}

float ADojoP7Drawbridge::GetHeight() const
{
	return Height;
}

bool ADojoP7Drawbridge::IsMoving() const
{
	return State == EDojoP7BridgeState::EBS_Raising || State == EDojoP7BridgeState::EBS_Lowering;
}

bool ADojoP7Drawbridge::IsJammed() const
{
	return State == EDojoP7BridgeState::EBS_Jammed;
}

bool ADojoP7Drawbridge::IsUp() const
{
	return State == EDojoP7BridgeState::EBS_Up;
}

bool ADojoP7Drawbridge::IsDown() const
{
	return State == EDojoP7BridgeState::EBS_Down;
}

void ADojoP7Drawbridge::SetState(EDojoP7BridgeState NewState)
{
	State = NewState;
	RefreshLabel();
}

void ADojoP7Drawbridge::RefreshLabel()
{
	Label->SetText(StaticEnum<EDojoP7BridgeState>()->GetDisplayNameTextByValue(static_cast<int64>(State)));
}
