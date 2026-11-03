#include "DojoS3SaveRecord.h"

void UDojoS3SaveRecord::StoreActor(FName SaveId, const TArray<uint8>& Bytes)
{
	if (SaveId.IsNone())
	{
		return;
	}

	Actors.FindOrAdd(SaveId).Bytes = Bytes;
}

const FDojoS3ActorRecord* UDojoS3SaveRecord::FindActor(FName SaveId) const
{
	if (SaveId.IsNone())
	{
		return nullptr;
	}

	return Actors.Find(SaveId);
}

void UDojoS3SaveRecord::MarkGone(FName SaveId)
{
	if (SaveId.IsNone())
	{
		return;
	}

	GoneIds.AddUnique(SaveId);
	Actors.Remove(SaveId);
}

bool UDojoS3SaveRecord::IsGone(FName SaveId) const
{
	return GoneIds.Contains(SaveId);
}
