#include "DojoP15LoudSpeaker.h"

void UDojoP15LoudSpeaker::Shout(const FString& Line)
{
	ShoutCount++;
	UE_LOG(LogTemp, Display, TEXT("LOUD: %s"), *Line.ToUpper());
}

int32 UDojoP15LoudSpeaker::GetShoutCount() const
{
	return ShoutCount;
}
