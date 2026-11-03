#include "DojoP15TracingAnnouncer.h"

void UDojoP15TracingAnnouncer::Wrap(UObject* Announcer)
{
	Wrapped = IsValid(Announcer) && Announcer != this && Announcer->Implements<UDojoP15Announcer>() ? Announcer : nullptr;
}

void UDojoP15TracingAnnouncer::Announce(const FString& Line)
{
	ForwardedCount++;

	IDojoP15Announcer* Behind = Cast<IDojoP15Announcer>(Wrapped.Get());
	if (Behind != nullptr) Behind->Announce(Line);
}

UObject* UDojoP15TracingAnnouncer::GetWrapped() const
{
	return Wrapped.Get();
}

int32 UDojoP15TracingAnnouncer::GetForwardedCount() const
{
	return ForwardedCount;
}
