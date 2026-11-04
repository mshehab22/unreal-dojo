#include "DojoP15RecordingAnnouncer.h"

void UDojoP15RecordingAnnouncer::Announce(const FString& Line)
{
	Lines.Add(Line);
}

const TArray<FString>& UDojoP15RecordingAnnouncer::GetLines() const
{
	return Lines;
}
