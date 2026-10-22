#include "DojoP7PrizeKiosk.h"

#include "Components/TextRenderComponent.h"
#include "TimerManager.h"

ADojoP7PrizeKiosk::ADojoP7PrizeKiosk()
{
	PrimaryActorTick.bCanEverTick = false;

	Label = CreateDefaultSubobject<UTextRenderComponent>(TEXT("Label"));
	RootComponent = Label;
	Label->SetHorizontalAlignment(EHTA_Center);
}

void ADojoP7PrizeKiosk::BeginPlay()
{
	Super::BeginPlay();

	SetState(Stock > 0 ? EDojoP7KioskState::EKS_Idle : EDojoP7KioskState::EKS_OutOfStock);
}

void ADojoP7PrizeKiosk::InsertToken()
{
	switch (State)
	{
	case EDojoP7KioskState::EKS_Idle:
		SetState(EDojoP7KioskState::EKS_Selecting);
		break;
	default:
		break;
	}
}

void ADojoP7PrizeKiosk::Choose()
{
	switch (State)
	{
	case EDojoP7KioskState::EKS_Selecting:
		SetState(EDojoP7KioskState::EKS_Dispensing);
		break;
	default:
		break;
	}
}

void ADojoP7PrizeKiosk::Cancel()
{
	switch (State)
	{
	case EDojoP7KioskState::EKS_Selecting:
		TokensRefunded++;
		SetState(EDojoP7KioskState::EKS_Idle);
		break;
	default:
		break;
	}
}

void ADojoP7PrizeKiosk::FinishDispensing()
{
	switch (State)
	{
	case EDojoP7KioskState::EKS_Dispensing:
		Stock--;
		PrizesGiven++;
		SetState(Stock > 0 ? EDojoP7KioskState::EKS_Idle : EDojoP7KioskState::EKS_OutOfStock);
		break;
	default:
		break;
	}
}

void ADojoP7PrizeKiosk::Restock(int32 Amount)
{
	if (Amount <= 0) return;

	Stock += Amount;

	if (State == EDojoP7KioskState::EKS_OutOfStock) SetState(EDojoP7KioskState::EKS_Idle);
	else RefreshLabel();
}

EDojoP7KioskState ADojoP7PrizeKiosk::GetState() const
{
	return State;
}

int32 ADojoP7PrizeKiosk::GetPrizesGiven() const
{
	return PrizesGiven;
}

int32 ADojoP7PrizeKiosk::GetTokensRefunded() const
{
	return TokensRefunded;
}

void ADojoP7PrizeKiosk::SetState(EDojoP7KioskState NewState)
{
	State = NewState;

	// Entry action: dispensing always starts the drop timer, whichever input led here.
	if (State == EDojoP7KioskState::EKS_Dispensing)
	{
		GetWorldTimerManager().SetTimer(DispenseTimer, this, &ADojoP7PrizeKiosk::FinishDispensing, DispenseSeconds, false);
	}

	RefreshLabel();
}

void ADojoP7PrizeKiosk::RefreshLabel()
{
	const FText ModeName = StaticEnum<EDojoP7KioskState>()->GetDisplayNameTextByValue(static_cast<int64>(State));
	Label->SetText(FText::FromString(FString::Printf(TEXT("%s (%d left)"), *ModeName.ToString(), Stock)));
}
