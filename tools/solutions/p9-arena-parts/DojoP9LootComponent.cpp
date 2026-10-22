#include "DojoP9LootComponent.h"

#include "DojoP9HealthComponent.h"

UDojoP9LootComponent::UDojoP9LootComponent()
{
	PrimaryComponentTick.bCanEverTick = false;
}

void UDojoP9LootComponent::ListenTo(UDojoP9HealthComponent* Health)
{
	if (!IsValid(Health)) return;

	if (UDojoP9HealthComponent* Previous = Source.Get()) Previous->OnDepleted.RemoveDynamic(this, &UDojoP9LootComponent::HandleHealthDepleted);

	Source = Health;
	Health->OnDepleted.AddUniqueDynamic(this, &UDojoP9LootComponent::HandleHealthDepleted);
}

void UDojoP9LootComponent::Drop()
{
	if (bDropped) return;

	bDropped = true;
	OnLootDropped.Broadcast(LootItem, LootCount);
}

bool UDojoP9LootComponent::HasDropped() const
{
	return bDropped;
}

void UDojoP9LootComponent::EndPlay(const EEndPlayReason::Type EndPlayReason)
{
	if (UDojoP9HealthComponent* Health = Source.Get()) Health->OnDepleted.RemoveDynamic(this, &UDojoP9LootComponent::HandleHealthDepleted);

	Super::EndPlay(EndPlayReason);
}

void UDojoP9LootComponent::HandleHealthDepleted(UDojoP9HealthComponent* Health)
{
	Drop();
}
