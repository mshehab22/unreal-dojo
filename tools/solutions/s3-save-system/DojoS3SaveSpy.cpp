#include "DojoS3SaveSpy.h"

#include "DojoS3SaveSystem.h"
#include "Quests/s3-saveable/DojoS3Lantern.h"

void UDojoS3SaveSpy::Watch(UDojoS3SaveSystem* System)
{
	if (System == nullptr)
	{
		return;
	}

	System->OnSaved.AddUniqueDynamic(this, &UDojoS3SaveSpy::HandleSaved);
	System->OnLoaded.AddUniqueDynamic(this, &UDojoS3SaveSpy::HandleLoaded);
}

void UDojoS3SaveSpy::HandleSaved(const FString& SlotName, bool bSucceeded)
{
	++Saves;
	LastSaveSlot = SlotName;
	bLastSaveSucceeded = bSucceeded;
}

void UDojoS3SaveSpy::HandleLoaded(const FString& SlotName, bool bSucceeded)
{
	++Loads;
	LastLoadSlot = SlotName;
	bLastLoadSucceeded = bSucceeded;
	OilAtLastLoad = IsValid(Lantern) ? Lantern->Oil : -1;
}
