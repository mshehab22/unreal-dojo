// Quest: sample-health (template proof). Hand-written sample that shows the shape of a build quest; not part of any content pack.
#include "SampleHealthComponent.h"
#include "Dojo.h"
#include "GameFramework/Actor.h"

USampleHealthComponent::USampleHealthComponent()
{
	PrimaryComponentTick.bCanEverTick = false;
}

float USampleHealthComponent::GetHealth() const
{
	return CurrentHealth;
}

bool USampleHealthComponent::IsDead() const
{
	return CurrentHealth <= 0.f;
}

void USampleHealthComponent::BeginPlay()
{
	Super::BeginPlay();

	CurrentHealth = MaxHealth;

	if (AActor* Owner = GetOwner())
	{
		Owner->OnTakeAnyDamage.AddDynamic(this, &USampleHealthComponent::HandleTakeAnyDamage);
	}
}

void USampleHealthComponent::HandleTakeAnyDamage(AActor* DamagedActor, float Damage, const UDamageType* DamageType, AController* InstigatedBy, AActor* DamageCauser)
{
	if (Damage <= 0.f || IsDead()) return;

	const float OldHealth = CurrentHealth;
	CurrentHealth = FMath::Clamp(CurrentHealth - Damage, 0.f, MaxHealth);

	UE_LOG(LogDojo, Verbose, TEXT("%s took %.1f damage, health %.1f"), *GetNameSafe(DamagedActor), Damage, CurrentHealth);
	OnHealthChanged.Broadcast(CurrentHealth, CurrentHealth - OldHealth);
}
