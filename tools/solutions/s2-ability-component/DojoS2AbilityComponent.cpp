#include "DojoS2AbilityComponent.h"

#include "Engine/World.h"
#include "Quests/s2-ability-data/DojoS2AbilityData.h"
#include "Quests/s2-energy/DojoS2EnergyComponent.h"
#include "TimerManager.h"

UDojoS2AbilityComponent::UDojoS2AbilityComponent()
{
	PrimaryComponentTick.bCanEverTick = false;
}

void UDojoS2AbilityComponent::UseEnergy(UDojoS2EnergyComponent* NewEnergy)
{
	Energy = NewEnergy;
}

bool UDojoS2AbilityComponent::Grant(UDojoS2AbilityData* Ability)
{
	if (Ability == nullptr || Granted.Contains(Ability))
	{
		return false;
	}

	Granted.Add(Ability);
	return true;
}

bool UDojoS2AbilityComponent::HasAbility(UDojoS2AbilityData* Ability) const
{
	return Ability != nullptr && Granted.Contains(Ability);
}

bool UDojoS2AbilityComponent::CanActivate(UDojoS2AbilityData* Ability) const
{
	if (!HasAbility(Ability) || IsOnCooldown(Ability) || IsRunning(Ability))
	{
		return false;
	}

	if (Ability->IsBlockedBy(ActiveTags))
	{
		return false;
	}

	if (Ability->EnergyCost <= 0)
	{
		return true;
	}

	return Energy != nullptr && Energy->CanSpend(Ability->EnergyCost);
}

bool UDojoS2AbilityComponent::TryActivate(UDojoS2AbilityData* Ability)
{
	// Every check comes before the first change, so a refused start costs nothing.
	if (!CanActivate(Ability))
	{
		return false;
	}

	if (Ability->EnergyCost > 0)
	{
		Energy->Spend(Ability->EnergyCost);
	}

	FTimerManager& Timers = GetWorld()->GetTimerManager();
	const float CooldownSeconds = Ability->GetCooldownSeconds();
	const float RunSeconds = Ability->GetDurationSeconds();

	// A rate of 0 would clear the timer instead of setting it, so only a real wait starts one.
	if (CooldownSeconds > 0.f)
	{
		FTimerHandle& CooldownTimer = CooldownTimers.FindOrAdd(Ability);
		Timers.SetTimer(CooldownTimer, FTimerDelegate::CreateUObject(this, &UDojoS2AbilityComponent::EndCooldown, Ability), CooldownSeconds, false);
	}

	if (RunSeconds > 0.f)
	{
		FTimerHandle& RunTimer = RunTimers.FindOrAdd(Ability);
		Timers.SetTimer(RunTimer, FTimerDelegate::CreateUObject(this, &UDojoS2AbilityComponent::EndRun, Ability), RunSeconds, false);
		ActiveTags.AppendTags(Ability->GrantedTags);
	}

	if (CooldownSeconds > 0.f)
	{
		OnCooldownChanged.Broadcast(this, Ability);
	}

	OnAbilityActivated.Broadcast(this, Ability);
	return true;
}

bool UDojoS2AbilityComponent::IsOnCooldown(UDojoS2AbilityData* Ability) const
{
	const FTimerHandle* CooldownTimer = CooldownTimers.Find(Ability);
	return CooldownTimer != nullptr && GetWorld()->GetTimerManager().IsTimerActive(*CooldownTimer);
}

float UDojoS2AbilityComponent::GetCooldownRemaining(UDojoS2AbilityData* Ability) const
{
	if (!IsOnCooldown(Ability))
	{
		return 0.f;
	}

	return GetWorld()->GetTimerManager().GetTimerRemaining(CooldownTimers.FindChecked(Ability));
}

bool UDojoS2AbilityComponent::IsRunning(UDojoS2AbilityData* Ability) const
{
	const FTimerHandle* RunTimer = RunTimers.Find(Ability);
	return RunTimer != nullptr && GetWorld()->GetTimerManager().IsTimerActive(*RunTimer);
}

FGameplayTagContainer UDojoS2AbilityComponent::GetActiveTags() const
{
	return ActiveTags;
}

void UDojoS2AbilityComponent::ResetAll()
{
	FTimerManager& Timers = GetWorld()->GetTimerManager();

	for (TPair<TObjectPtr<UDojoS2AbilityData>, FTimerHandle>& Entry : RunTimers)
	{
		Timers.ClearTimer(Entry.Value);
	}

	RunTimers.Empty();
	ActiveTags.Reset();

	TArray<UDojoS2AbilityData*> Ended;

	for (TPair<TObjectPtr<UDojoS2AbilityData>, FTimerHandle>& Entry : CooldownTimers)
	{
		if (Timers.IsTimerActive(Entry.Value))
		{
			Ended.Add(Entry.Key);
		}

		Timers.ClearTimer(Entry.Value);
	}

	CooldownTimers.Empty();

	for (UDojoS2AbilityData* Ability : Ended)
	{
		OnCooldownChanged.Broadcast(this, Ability);
	}
}

void UDojoS2AbilityComponent::EndPlay(const EEndPlayReason::Type EndPlayReason)
{
	if (UWorld* World = GetWorld())
	{
		for (TPair<TObjectPtr<UDojoS2AbilityData>, FTimerHandle>& Entry : CooldownTimers)
		{
			World->GetTimerManager().ClearTimer(Entry.Value);
		}

		for (TPair<TObjectPtr<UDojoS2AbilityData>, FTimerHandle>& Entry : RunTimers)
		{
			World->GetTimerManager().ClearTimer(Entry.Value);
		}
	}

	Super::EndPlay(EndPlayReason);
}

void UDojoS2AbilityComponent::EndCooldown(UDojoS2AbilityData* Ability)
{
	CooldownTimers.Remove(Ability);
	OnCooldownChanged.Broadcast(this, Ability);
}

void UDojoS2AbilityComponent::EndRun(UDojoS2AbilityData* Ability)
{
	RunTimers.Remove(Ability);

	// Two runs can grant the same tag, so the tags are rebuilt from the runs still going instead of removed one by one.
	ActiveTags.Reset();

	for (const TPair<TObjectPtr<UDojoS2AbilityData>, FTimerHandle>& Entry : RunTimers)
	{
		if (Entry.Key != nullptr)
		{
			ActiveTags.AppendTags(Entry.Key->GrantedTags);
		}
	}
}
