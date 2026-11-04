#include "DojoP14LapLog.h"

void UDojoP14LapLog::Record(FName Driver, float Seconds)
{
	FDojoP14Lap Lap;
	Lap.Driver = Driver;
	Lap.Seconds = Seconds;
	Laps.Add(Lap);
}

TArray<FDojoP14Lap> UDojoP14LapLog::GetLaps() const
{
	return Laps;
}

int32 UDojoP14LapLog::GetLapCountFor(FName Driver) const
{
	int32 Count = 0;
	for (const FDojoP14Lap& Lap : Laps)
	{
		if (Lap.Driver == Driver) Count++;
	}
	return Count;
}

float UDojoP14LapLog::GetBestFor(FName Driver) const
{
	float Best = 0.f;
	for (const FDojoP14Lap& Lap : Laps)
	{
		if (Lap.Driver != Driver) continue;
		if (Best == 0.f || Lap.Seconds < Best) Best = Lap.Seconds;
	}
	return Best;
}
