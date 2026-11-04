#include "DojoP15MemoryScoreboard.h"

void UDojoP15MemoryScoreboard::AddPoints(FName Fighter, int32 Points)
{
	Totals.FindOrAdd(Fighter) += Points;
}

int32 UDojoP15MemoryScoreboard::GetPoints(FName Fighter) const
{
	const int32* Total = Totals.Find(Fighter);
	return Total != nullptr ? *Total : 0;
}
