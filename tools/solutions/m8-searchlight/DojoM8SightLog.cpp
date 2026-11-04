#include "DojoM8SightLog.h"

#include "DojoM8Searchlight.h"

ADojoM8SightLog::ADojoM8SightLog()
{
	PrimaryActorTick.bCanEverTick = false;
}

void ADojoM8SightLog::Listen(ADojoM8Searchlight* Light)
{
	if (!IsValid(Light)) return;

	Light->OnSightChanged.AddUniqueDynamic(this, &ADojoM8SightLog::HandleSightChanged);
}

int32 ADojoM8SightLog::GetSeenCount() const
{
	return SeenCount;
}

int32 ADojoM8SightLog::GetLostCount() const
{
	return LostCount;
}

void ADojoM8SightLog::HandleSightChanged(ADojoM8Searchlight* Light, bool bSeen)
{
	if (bSeen) SeenCount++;
	else LostCount++;
}
