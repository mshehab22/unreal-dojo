#include "DojoF4HitCounterComponent.h"

UDojoF4HitCounterComponent::UDojoF4HitCounterComponent()
{
	PrimaryComponentTick.bCanEverTick = false;
}

void UDojoF4HitCounterComponent::RegisterHit()
{
	if (IsDown()) return;

	Hits++;
}

void UDojoF4HitCounterComponent::ResetHits()
{
	Hits = 0;
}

int32 UDojoF4HitCounterComponent::GetHits() const
{
	return Hits;
}

bool UDojoF4HitCounterComponent::IsDown() const
{
	return Hits >= HitsToDown;
}
