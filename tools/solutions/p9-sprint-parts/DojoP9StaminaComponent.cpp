#include "DojoP9StaminaComponent.h"

UDojoP9StaminaComponent::UDojoP9StaminaComponent()
{
	PrimaryComponentTick.bCanEverTick = true;
	bWantsInitializeComponent = true;
}

void UDojoP9StaminaComponent::InitializeComponent()
{
	Super::InitializeComponent();

	Stamina = MaxStamina;
}

bool UDojoP9StaminaComponent::TrySpend(float Amount)
{
	if (Amount < 0.f || Stamina < Amount) return false;

	const float Before = Stamina;
	Stamina -= Amount;
	AfterLoss(Before);
	return true;
}

void UDojoP9StaminaComponent::SetDrainPerSecond(float Rate)
{
	DrainPerSecond = FMath::Max(0.f, Rate);
}

void UDojoP9StaminaComponent::Refill()
{
	Stamina = MaxStamina;
}

float UDojoP9StaminaComponent::GetStamina() const
{
	return Stamina;
}

bool UDojoP9StaminaComponent::IsExhausted() const
{
	return Stamina <= 0.f;
}

void UDojoP9StaminaComponent::TickComponent(float DeltaTime, ELevelTick TickType, FActorComponentTickFunction* ThisTickFunction)
{
	Super::TickComponent(DeltaTime, TickType, ThisTickFunction);

	if (DrainPerSecond > 0.f)
	{
		const float Before = Stamina;
		Stamina = FMath::Max(0.f, Stamina - DrainPerSecond * DeltaTime);
		AfterLoss(Before);
		return;
	}

	Stamina = FMath::Min(MaxStamina, Stamina + RegenPerSecond * DeltaTime);
}

void UDojoP9StaminaComponent::AfterLoss(float Before)
{
	if (Before > 0.f && Stamina <= 0.f) OnExhausted.Broadcast();
}
