#include "DojoP14FinishLine.h"

#include "Components/SceneComponent.h"
#include "DojoP14LapLog.h"

ADojoP14FinishLine::ADojoP14FinishLine()
{
	PrimaryActorTick.bCanEverTick = false;

	RootComponent = CreateDefaultSubobject<USceneComponent>(TEXT("Root"));
}

void ADojoP14FinishLine::UseLog(UDojoP14LapLog* NewLog)
{
	Log = NewLog;
}

UDojoP14LapLog* ADojoP14FinishLine::GetLog() const
{
	return Log;
}

bool ADojoP14FinishLine::CrossLine(FName Driver, float Now)
{
	if (!IsValid(Log)) return false;

	if (const float* LapStart = LapStarts.Find(Driver))
	{
		Log->Record(Driver, Now - *LapStart);
	}

	LapStarts.Add(Driver, Now);
	return true;
}
