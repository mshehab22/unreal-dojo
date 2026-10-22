#include "DojoP9Gladiator.h"

#include "Quests/p9-arena-parts/DojoP9HealthComponent.h"
#include "Quests/p9-sprint-parts/DojoP9SprintComponent.h"
#include "Quests/p9-sprint-parts/DojoP9StaminaComponent.h"

ADojoP9Gladiator::ADojoP9Gladiator()
{
	PrimaryActorTick.bCanEverTick = false;

	HealthComponent = CreateDefaultSubobject<UDojoP9HealthComponent>(TEXT("Health"));
	StaminaComponent = CreateDefaultSubobject<UDojoP9StaminaComponent>(TEXT("Stamina"));
	SprintComponent = CreateDefaultSubobject<UDojoP9SprintComponent>(TEXT("Sprint"));
}

void ADojoP9Gladiator::BeginPlay()
{
	Super::BeginPlay();

	HealthComponent->OnDepleted.AddDynamic(this, &ADojoP9Gladiator::HandleHealthDepleted);
}

void ADojoP9Gladiator::EndPlay(const EEndPlayReason::Type EndPlayReason)
{
	HealthComponent->OnDepleted.RemoveDynamic(this, &ADojoP9Gladiator::HandleHealthDepleted);

	Super::EndPlay(EndPlayReason);
}

void ADojoP9Gladiator::ApplyDamage(float Amount)
{
	HealthComponent->ApplyDamage(Amount);
}

float ADojoP9Gladiator::GetHealth() const
{
	return HealthComponent->GetHealth();
}

bool ADojoP9Gladiator::IsDown() const
{
	return HealthComponent->IsDepleted();
}

bool ADojoP9Gladiator::StartSprint()
{
	if (IsDown()) return false;

	return SprintComponent->StartSprint();
}

void ADojoP9Gladiator::StopSprint()
{
	SprintComponent->StopSprint();
}

bool ADojoP9Gladiator::IsSprinting() const
{
	return SprintComponent->IsSprinting();
}

float ADojoP9Gladiator::GetStamina() const
{
	return StaminaComponent->GetStamina();
}

void ADojoP9Gladiator::HandleHealthDepleted(UDojoP9HealthComponent* Health)
{
	StopSprint();
}
