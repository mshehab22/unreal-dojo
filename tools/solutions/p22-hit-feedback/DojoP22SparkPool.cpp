#include "DojoP22SparkPool.h"

int32 UDojoP22SparkPool::Reserve(int32 Count)
{
	if (Count < 1 || Count > Free) return INDEX_NONE;

	const int32 Ticket = NextTicket++;
	Held.Add(Ticket, Count);
	Free -= Count;
	return Ticket;
}

bool UDojoP22SparkPool::Fire(int32 Ticket, FVector Where, FVector Normal)
{
	int32 Count = 0;
	if (!Held.RemoveAndCopyValue(Ticket, Count)) return false;

	FDojoP22SparkBurst Burst;
	Burst.Count = Count;
	Burst.Where = Where;
	Burst.Normal = Normal;
	Bursts.Add(Burst);
	Free += Count;
	return true;
}

void UDojoP22SparkPool::Cancel(int32 Ticket)
{
	int32 Count = 0;
	if (Held.RemoveAndCopyValue(Ticket, Count)) Free += Count;
}

int32 UDojoP22SparkPool::GetFree() const
{
	return Free;
}

TArray<FDojoP22SparkBurst> UDojoP22SparkPool::GetBursts() const
{
	return Bursts;
}
