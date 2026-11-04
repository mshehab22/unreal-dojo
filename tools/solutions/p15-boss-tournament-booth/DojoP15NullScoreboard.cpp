#include "DojoP15NullScoreboard.h"

void UDojoP15NullScoreboard::AddPoints(FName Fighter, int32 Points)
{
	AbsorbedCount++;
	UE_LOG(LogTemp, Verbose, TEXT("No scoreboard provided; dropped %d points for %s"), Points, *Fighter.ToString());
}

int32 UDojoP15NullScoreboard::GetPoints(FName Fighter) const
{
	return 0;
}

int32 UDojoP15NullScoreboard::GetAbsorbedCount() const
{
	return AbsorbedCount;
}
