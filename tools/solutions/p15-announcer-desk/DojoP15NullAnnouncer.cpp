#include "DojoP15NullAnnouncer.h"

void UDojoP15NullAnnouncer::Announce(const FString& Line)
{
	AbsorbedCount++;
	UE_LOG(LogTemp, Verbose, TEXT("No announcer provided; dropped: %s"), *Line);
}

int32 UDojoP15NullAnnouncer::GetAbsorbedCount() const
{
	return AbsorbedCount;
}
