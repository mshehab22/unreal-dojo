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
	if (State != EDojoF1TargetState::ETS_Lowered) return;

	SetState(EDojoF1TargetState::ETS_Raised);
}

bool ADojoF1PopupTarget::Hit()
{
	if (State != EDojoF1TargetState::ETS_Raised) return false;

	HitsTaken++;
	SetState(HitsTaken >= HitsToBreak ? EDojoF1TargetState::ETS_Broken : EDojoF1TargetState::ETS_Lowered);
	return true;
}

void ADojoF1PopupTarget::Repair()
{
	if (State != EDojoF1TargetState::ETS_Broken) return;

	HitsTaken = 0;
	SetState(EDojoF1TargetState::ETS_Lowered);
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
