#include "DojoM6Satchel.h"

#include "DojoM6QuestItem.h"

ADojoM6Satchel::ADojoM6Satchel()
{
	PrimaryActorTick.bCanEverTick = false;
}

void ADojoM6Satchel::Watch(ADojoM6QuestItem* Item)
{
	if (!IsValid(Item)) return;

	Item->OnCollected.AddUniqueDynamic(this, &ADojoM6Satchel::HandleCollected);
}

void ADojoM6Satchel::HandleCollected(ADojoM6QuestItem* Item, AActor* Taker)
{
	if (!Item || Item->IsActorBeingDestroyed()) LateNotices++;
	if (!Item) return;

	Counts.FindOrAdd(Item->ItemTag)++;
}

int32 ADojoM6Satchel::GetCount(FName ItemTag) const
{
	const int32* Count = Counts.Find(ItemTag);
	return Count ? *Count : 0;
}

int32 ADojoM6Satchel::GetLateNotices() const
{
	return LateNotices;
}
