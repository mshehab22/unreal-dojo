#include "DojoS2AbilitySpy.h"

#include "DojoS2AbilityComponent.h"

void UDojoS2AbilitySpy::Watch(UDojoS2AbilityComponent* Abilities)
{
	if (Abilities == nullptr)
	{
		return;
	}

	Abilities->OnAbilityActivated.AddUniqueDynamic(this, &UDojoS2AbilitySpy::HandleStarted);
	Abilities->OnCooldownChanged.AddUniqueDynamic(this, &UDojoS2AbilitySpy::HandleCooldown);
}

int32 UDojoS2AbilitySpy::GetStartCount() const
{
	return StartCount;
}

int32 UDojoS2AbilitySpy::GetCooldownNoticeCount() const
{
	return CooldownNoticeCount;
}

UDojoS2AbilityData* UDojoS2AbilitySpy::GetLastStarted() const
{
	return LastStarted;
}

bool UDojoS2AbilitySpy::WasCoolingAtLastStart() const
{
	return bWasCoolingAtLastStart;
}

FGameplayTagContainer UDojoS2AbilitySpy::GetTagsAtLastStart() const
{
	return TagsAtLastStart;
}

bool UDojoS2AbilitySpy::WasCoolingAtLastCooldownNotice() const
{
	return bWasCoolingAtLastCooldownNotice;
}

void UDojoS2AbilitySpy::HandleStarted(UDojoS2AbilityComponent* Abilities, UDojoS2AbilityData* Ability)
{
	++StartCount;
	LastStarted = Ability;
	bWasCoolingAtLastStart = Abilities->IsOnCooldown(Ability);
	TagsAtLastStart = Abilities->GetActiveTags();
}

void UDojoS2AbilitySpy::HandleCooldown(UDojoS2AbilityComponent* Abilities, UDojoS2AbilityData* Ability)
{
	++CooldownNoticeCount;
	bWasCoolingAtLastCooldownNotice = Abilities->IsOnCooldown(Ability);
}
