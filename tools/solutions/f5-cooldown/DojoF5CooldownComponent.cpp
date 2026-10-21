#include "DojoF5CooldownComponent.h"

#include "Engine/World.h"
#include "TimerManager.h"

UDojoF5CooldownComponent::UDojoF5CooldownComponent()
{
	PrimaryComponentTick.bCanEverTick = false;
}

bool UDojoF5CooldownComponent::TryStart()
{
	if (!IsReady()) return false;

	GetWorld()->GetTimerManager().SetTimer(CooldownTimer, this, &UDojoF5CooldownComponent::HandleReady, CooldownSeconds, false);
	return true;
}

bool UDojoF5CooldownComponent::IsReady() const
{
	const UWorld* World = GetWorld();
	return !World || !World->GetTimerManager().IsTimerActive(CooldownTimer);
}

float UDojoF5CooldownComponent::GetRemaining() const
{
	const UWorld* World = GetWorld();
	return World ? FMath::Max(World->GetTimerManager().GetTimerRemaining(CooldownTimer), 0.f) : 0.f;
}

int32 UDojoF5CooldownComponent::GetReadyCount() const
{
	return ReadyCount;
}

void UDojoF5CooldownComponent::EndPlay(const EEndPlayReason::Type EndPlayReason)
{
	if (UWorld* World = GetWorld()) World->GetTimerManager().ClearTimer(CooldownTimer);

	Super::EndPlay(EndPlayReason);
}

void UDojoF5CooldownComponent::HandleReady()
{
	ReadyCount++;
	OnReady.Broadcast();
}
