#include "DojoP9PropKit.h"

#include "DojoP9HealthComponent.h"
#include "DojoP9LootComponent.h"
#include "GameFramework/Actor.h"

namespace DojoP9PropNumbers
{
	constexpr float StatueHealth = 250.f;
	constexpr float CrateHealth = 40.f;
	const FName CrateLoot = TEXT("Bandage");
}

void UDojoP9PropKit::MakeStatue(AActor* Prop)
{
	if (!IsValid(Prop)) return;

	UDojoP9HealthComponent* Health = CreatePart<UDojoP9HealthComponent>(Prop);
	Health->MaxHealth = DojoP9PropNumbers::StatueHealth;
	AttachPart(Prop, Health);
}

void UDojoP9PropKit::MakeCrate(AActor* Prop)
{
	if (!IsValid(Prop)) return;

	UDojoP9HealthComponent* Health = CreatePart<UDojoP9HealthComponent>(Prop);
	Health->MaxHealth = DojoP9PropNumbers::CrateHealth;
	AttachPart(Prop, Health);

	UDojoP9LootComponent* Loot = CreatePart<UDojoP9LootComponent>(Prop);
	Loot->LootItem = DojoP9PropNumbers::CrateLoot;
	AttachPart(Prop, Loot);

	Loot->ListenTo(Health);
}

void UDojoP9PropKit::AttachPart(AActor* Prop, UActorComponent* Part)
{
	Prop->AddInstanceComponent(Part);
	Part->RegisterComponent();
}
