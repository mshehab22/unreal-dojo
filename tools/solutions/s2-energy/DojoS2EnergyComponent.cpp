#include "DojoS2EnergyComponent.h"

#include "Engine/World.h"
#include "TimerManager.h"

UDojoS2EnergyComponent::UDojoS2EnergyComponent()
{
	PrimaryComponentTick.bCanEverTick = false;
	bWantsInitializeComponent = true;
}

void UDojoS2EnergyComponent::InitializeComponent()
{
	Super::InitializeComponent();

	Energy = MaxEnergy;
}

void UDojoS2EnergyComponent::EndPlay(const EEndPlayReason::Type EndPlayReason)
{
	if (UWorld* World = GetWorld())
	{
		World->GetTimerManager().ClearTimer(RegenTimer);
	}

	Super::EndPlay(EndPlayReason);
}

int32 UDojoS2EnergyComponent::GetEnergy() const
{
	return Energy;
}

bool UDojoS2EnergyComponent::CanSpend(int32 Amount) const
{
	return Amount >= 0 && Amount <= Energy;
}

bool UDojoS2EnergyComponent::Spend(int32 Amount)
{
	if (!CanSpend(Amount))
	{
		return false;
	}

	if (Amount == 0)
	{
		return true;
	}

	Energy -= Amount;
	OnEnergyChanged.Broadcast(this);

	// Start the timer only when it is not already running, so spending again never pushes the next step later.
	UWorld* World = GetWorld();

	if (World != nullptr && RegenAmount > 0 && !World->GetTimerManager().IsTimerActive(RegenTimer))
	{
		World->GetTimerManager().SetTimer(RegenTimer, this, &UDojoS2EnergyComponent::RegenStep, RegenInterval, true);
	}

	return true;
}

void UDojoS2EnergyComponent::Refill()
{
	if (UWorld* World = GetWorld())
	{
		World->GetTimerManager().ClearTimer(RegenTimer);
	}

	if (Energy == MaxEnergy)
	{
		return;
	}

	Energy = MaxEnergy;
	OnEnergyChanged.Broadcast(this);
}

bool UDojoS2EnergyComponent::IsRegenerating() const
{
	const UWorld* World = GetWorld();
	return World != nullptr && World->GetTimerManager().IsTimerActive(RegenTimer);
}

void UDojoS2EnergyComponent::RegenStep()
{
	Energy = FMath::Min(MaxEnergy, Energy + RegenAmount);

	if (Energy >= MaxEnergy)
	{
		GetWorld()->GetTimerManager().ClearTimer(RegenTimer);
	}

	OnEnergyChanged.Broadcast(this);
}
