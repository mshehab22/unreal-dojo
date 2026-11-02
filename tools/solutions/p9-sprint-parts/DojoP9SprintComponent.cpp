#include "DojoP9SprintComponent.h"

#include "DojoP9StaminaComponent.h"
#include "GameFramework/Actor.h"
#include "GameFramework/CharacterMovementComponent.h"

UDojoP9SprintComponent::UDojoP9SprintComponent()
{
	PrimaryComponentTick.bCanEverTick = false;
}

bool UDojoP9SprintComponent::StartSprint()
{
	if (bSprinting) return true;

	// Look the sibling up now, not in BeginPlay: a part added at runtime may arrive before or after this one.
	if (!IsValid(Stamina)) Stamina = GetOwner()->FindComponentByClass<UDojoP9StaminaComponent>();
	if (!IsValid(Stamina) || Stamina->IsExhausted()) return false;

	Stamina->OnExhausted.AddUniqueDynamic(this, &UDojoP9SprintComponent::HandleExhausted);
	Stamina->SetDrainPerSecond(CostPerSecond);

	if (UCharacterMovementComponent* Movement = GetOwner()->FindComponentByClass<UCharacterMovementComponent>())
	{
		NormalWalkSpeed = Movement->MaxWalkSpeed;
		Movement->MaxWalkSpeed = NormalWalkSpeed * SpeedMultiplier;
	}

	bSprinting = true;
	return true;
}

void UDojoP9SprintComponent::StopSprint()
{
	if (!bSprinting) return;

	bSprinting = false;
	if (IsValid(Stamina)) Stamina->SetDrainPerSecond(0.f);

	if (UCharacterMovementComponent* Movement = GetOwner()->FindComponentByClass<UCharacterMovementComponent>()) Movement->MaxWalkSpeed = NormalWalkSpeed;
}

bool UDojoP9SprintComponent::IsSprinting() const
{
	return bSprinting;
}

void UDojoP9SprintComponent::BeginPlay()
{
	Super::BeginPlay();

	// Nothing to look up here: the stamina part may not be on the actor yet, so StartSprint finds it when needed.
}

void UDojoP9SprintComponent::EndPlay(const EEndPlayReason::Type EndPlayReason)
{
	if (IsValid(Stamina)) Stamina->OnExhausted.RemoveDynamic(this, &UDojoP9SprintComponent::HandleExhausted);

	Super::EndPlay(EndPlayReason);
}

void UDojoP9SprintComponent::HandleExhausted()
{
	StopSprint();
}
