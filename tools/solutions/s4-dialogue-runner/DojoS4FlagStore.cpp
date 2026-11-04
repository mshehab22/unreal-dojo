#include "DojoS4FlagStore.h"

void UDojoS4FlagStore::Set(FName Flag)
{
	if (Flag.IsNone() || RaisedFlags.Contains(Flag))
	{
		return;
	}

	RaisedFlags.Add(Flag);
	OnFlagSet.Broadcast(Flag);
}

bool UDojoS4FlagStore::Has(FName Flag) const
{
	return RaisedFlags.Contains(Flag);
}

void UDojoS4FlagStore::Reset()
{
	RaisedFlags.Reset();
}
