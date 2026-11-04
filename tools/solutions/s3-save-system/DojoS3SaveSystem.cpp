#include "DojoS3SaveSystem.h"

#include "Engine/World.h"
#include "EngineUtils.h"
#include "GameFramework/Actor.h"
#include "Kismet/GameplayStatics.h"
#include "Quests/s3-save-record/DojoS3SaveRecord.h"
#include "Quests/s3-saveable/DojoS3SaveableComponent.h"

void UDojoS3SaveSystem::Initialize(FSubsystemCollectionBase& Collection)
{
	Super::Initialize(Collection);

	DestroyedHandle = GetWorld()->AddOnActorDestroyedHandler(FOnActorDestroyed::FDelegate::CreateUObject(this, &UDojoS3SaveSystem::HandleActorDestroyed));
}

void UDojoS3SaveSystem::Deinitialize()
{
	if (UWorld* World = GetWorld())
	{
		World->RemoveOnActorDestroyedHandler(DestroyedHandle);
	}

	Super::Deinitialize();
}

bool UDojoS3SaveSystem::SaveToSlot(const FString& SlotName)
{
	UDojoS3SaveRecord* Record = Cast<UDojoS3SaveRecord>(UGameplayStatics::CreateSaveGameObject(UDojoS3SaveRecord::StaticClass()));
	TSet<FName> LiveIds;

	for (UDojoS3SaveableComponent* Saveable : FindSaveables())
	{
		LiveIds.Add(Saveable->SaveId);
		Record->StoreActor(Saveable->SaveId, Saveable->CaptureState());
	}

	// A lost id whose saveable is back in the world, such as a coin laid out again, is not lost any more.
	for (const FName& LostId : LostIds)
	{
		if (!LiveIds.Contains(LostId))
		{
			Record->MarkGone(LostId);
		}
	}

	const bool bSaved = !SlotName.IsEmpty() && UGameplayStatics::SaveGameToSlot(Record, SlotName, 0);
	OnSaved.Broadcast(SlotName, bSaved);
	return bSaved;
}

bool UDojoS3SaveSystem::LoadFromSlot(const FString& SlotName)
{
	UDojoS3SaveRecord* Record = nullptr;

	if (!SlotName.IsEmpty() && UGameplayStatics::DoesSaveGameExist(SlotName, 0))
	{
		Record = Cast<UDojoS3SaveRecord>(UGameplayStatics::LoadGameFromSlot(SlotName, 0));
	}

	if (Record == nullptr)
	{
		OnLoaded.Broadcast(SlotName, false);
		return false;
	}

	LostIds.Append(Record->GoneIds);

	for (UDojoS3SaveableComponent* Saveable : FindSaveables())
	{
		if (Record->IsGone(Saveable->SaveId))
		{
			Saveable->GetOwner()->Destroy();
		}
		else if (const FDojoS3ActorRecord* Saved = Record->FindActor(Saveable->SaveId))
		{
			Saveable->RestoreState(Saved->Bytes);
		}
	}

	OnLoaded.Broadcast(SlotName, true);
	return true;
}

TArray<UDojoS3SaveableComponent*> UDojoS3SaveSystem::FindSaveables() const
{
	TArray<UDojoS3SaveableComponent*> Found;

	for (TActorIterator<AActor> It(GetWorld()); It; ++It)
	{
		AActor* Actor = *It;

		if (!IsValid(Actor) || Actor->IsActorBeingDestroyed())
		{
			continue;
		}

		UDojoS3SaveableComponent* Saveable = Actor->FindComponentByClass<UDojoS3SaveableComponent>();

		if (Saveable != nullptr && !Saveable->SaveId.IsNone())
		{
			Found.Add(Saveable);
		}
	}

	return Found;
}

void UDojoS3SaveSystem::HandleActorDestroyed(AActor* Actor)
{
	const UDojoS3SaveableComponent* Saveable = Actor != nullptr ? Actor->FindComponentByClass<UDojoS3SaveableComponent>() : nullptr;

	if (Saveable != nullptr && !Saveable->SaveId.IsNone())
	{
		LostIds.Add(Saveable->SaveId);
	}
}
