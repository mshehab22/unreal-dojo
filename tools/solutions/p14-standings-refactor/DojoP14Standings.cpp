#include "DojoP14Standings.h"

bool UDojoP14Standings::Pass(FName Driver, int32 Index)
{
	int32& Count = Passed.FindOrAdd(Driver);
	if (Index != Count) return false;

	Count++;
	if (Leader.IsNone() || Count > GetPassed(Leader)) Leader = Driver;
	return true;
}

int32 UDojoP14Standings::GetPassed(FName Driver) const
{
	const int32* Count = Passed.Find(Driver);
	return Count ? *Count : 0;
}

FName UDojoP14Standings::GetLeader() const
{
	return Leader;
}
