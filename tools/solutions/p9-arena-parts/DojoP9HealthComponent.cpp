#include "DojoP9HealthComponent.h"

UDojoP9HealthComponent::UDojoP9HealthComponent()
{
	PrimaryComponentTick.bCanEverTick = false;
}

void UDojoP9HealthComponent::BeginPlay()
{
	Super::BeginPlay();

	Health = MaxHealth;
}

void UDojoP9HealthComponent::ApplyDamage(float Amount)
{
	if (Amount <= 0.f || IsDepleted()) return;

	Health = FMath::Max(0.f, Health - Amount);
	if (Health <= 0.f) OnDepleted.Broadcast(this);
}

float UDojoP9HealthComponent::GetHealth() const
{
	return Health;
}

bool UDojoP9HealthComponent::IsDepleted() const
{
	return Health <= 0.f;
}
