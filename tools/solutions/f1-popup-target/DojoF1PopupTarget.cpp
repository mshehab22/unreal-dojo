#include "DojoF1PopupTarget.h"

#include "Components/TextRenderComponent.h"

ADojoF1PopupTarget::ADojoF1PopupTarget()
{
	PrimaryActorTick.bCanEverTick = false;

	Label = CreateDefaultSubobject<UTextRenderComponent>(TEXT("Label"));
	RootComponent = Label;
	Label->SetHorizontalAlignment(EHTA_Center);
}

void ADojoF1PopupTarget::BeginPlay()
{
	Super::BeginPlay();

	SetState(State);
}

void ADojoF1PopupTarget::Raise()
{
	if (State != EDojoF1TargetState::Lowered) return;

	SetState(EDojoF1TargetState::Raised);
}

bool ADojoF1PopupTarget::Hit()
{
	if (State != EDojoF1TargetState::Raised) return false;

	HitsTaken++;
	SetState(HitsTaken >= HitsToBreak ? EDojoF1TargetState::Broken : EDojoF1TargetState::Lowered);
	return true;
}

void ADojoF1PopupTarget::Repair()
{
	if (State != EDojoF1TargetState::Broken) return;

	HitsTaken = 0;
	SetState(EDojoF1TargetState::Lowered);
}

EDojoF1TargetState ADojoF1PopupTarget::GetState() const
{
	return State;
}

void ADojoF1PopupTarget::SetState(EDojoF1TargetState NewState)
{
	State = NewState;
	Label->SetText(UEnum::GetDisplayValueAsText(State));
}
