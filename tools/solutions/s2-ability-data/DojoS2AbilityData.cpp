#include "DojoS2AbilityData.h"

float UDojoS2AbilityData::GetCooldownSeconds() const
{
	return FMath::Max(0.f, Cooldown);
}

float UDojoS2AbilityData::GetDurationSeconds() const
{
	return FMath::Max(0.f, Duration);
}

bool UDojoS2AbilityData::IsBlockedBy(const FGameplayTagContainer& UserTags) const
{
	return UserTags.HasAny(BlockedByTags);
}
