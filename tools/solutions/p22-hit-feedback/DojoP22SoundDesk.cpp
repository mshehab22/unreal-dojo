#include "DojoP22SoundDesk.h"

const TArray<FName>& UDojoP22SoundDesk::KnownCues()
{
	static const TArray<FName> Cues = { TEXT("Hit"), TEXT("HeavyHit"), TEXT("Miss"), TEXT("Gate"), TEXT("Fall") };
	return Cues;
}

int32 UDojoP22SoundDesk::FindCue(FName Cue) const
{
	return KnownCues().IndexOfByKey(Cue);
}

void UDojoP22SoundDesk::SetBusVolume(float Volume)
{
	BusVolume = FMath::Clamp(Volume, 0.f, 1.f);
}

float UDojoP22SoundDesk::GetBusVolume() const
{
	return BusVolume;
}

bool UDojoP22SoundDesk::PlayCue(int32 CueId, FVector Where)
{
	if (!KnownCues().IsValidIndex(CueId)) return false;

	FDojoP22PlayedCue Entry;
	Entry.Cue = KnownCues()[CueId];
	Entry.Where = Where;
	Entry.Volume = BusVolume;
	Played.Add(Entry);
	return true;
}

TArray<FDojoP22PlayedCue> UDojoP22SoundDesk::GetPlayed() const
{
	return Played;
}
