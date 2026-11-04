#include "DojoP17GuardStats.h"

UDojoP17GuardStats::UDojoP17GuardStats()
{
	PrimaryComponentTick.bCanEverTick = false;
}

void UDojoP17GuardStats::SetBaseGuard(int32 NewBase)
{
	if (NewBase == BaseGuard) return;

	BaseGuard = NewBase;
	bGuardDirty = true; // @explain: Every function that changes a part of the rating sets this flag; none works the rating out itself.
}

bool UDojoP17GuardStats::Equip(FName Item, int32 Bonus)
{
	const int32* Worn = Equipment.Find(Item);
	if (Worn != nullptr && *Worn == Bonus) return false;

	Equipment.Add(Item, Bonus);
	bGuardDirty = true;
	return true;
}

bool UDojoP17GuardStats::Unequip(FName Item)
{
	if (Equipment.Remove(Item) == 0) return false;

	bGuardDirty = true;
	return true;
}

int32 UDojoP17GuardStats::AddBuff(int32 Amount)
{
	FDojoP17GuardBuff Buff;
	Buff.BuffId = NextBuffId++;
	Buff.Amount = Amount;
	Buffs.Add(Buff);

	bGuardDirty = true;
	return Buff.BuffId;
}

bool UDojoP17GuardStats::RemoveBuff(int32 BuffId)
{
	const int32 Index = Buffs.IndexOfByPredicate([BuffId](const FDojoP17GuardBuff& Candidate) { return Candidate.BuffId == BuffId; });
	if (Index == INDEX_NONE) return false;

	Buffs.RemoveAt(Index);
	bGuardDirty = true;
	return true;
}

void UDojoP17GuardStats::ClearBuffs()
{
	if (Buffs.IsEmpty()) return;

	Buffs.Reset();
	bGuardDirty = true;
}

int32 UDojoP17GuardStats::GetGuard() const
{
	if (bGuardDirty)
	{
		int32 Total = BaseGuard;
		for (const TPair<FName, int32>& Worn : Equipment) Total += Worn.Value;
		for (const FDojoP17GuardBuff& Buff : Buffs) Total += Buff.Amount;

		CachedGuard = FMath::Max(Total, 0);
		RecomputeCount++;
		bGuardDirty = false;
	}

	return CachedGuard;
}

int32 UDojoP17GuardStats::GetBaseGuard() const
{
	return BaseGuard;
}

int32 UDojoP17GuardStats::GetRecomputeCount() const
{
	return RecomputeCount;
}
