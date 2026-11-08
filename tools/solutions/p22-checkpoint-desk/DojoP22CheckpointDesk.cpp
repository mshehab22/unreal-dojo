#include "DojoP22CheckpointDesk.h"

#include "DojoP22CheckpointSave.h"
#include "Kismet/GameplayStatics.h"

void UDojoP22CheckpointDesk::Initialize(FSubsystemCollectionBase& Collection)
{
	Super::Initialize(Collection);

	Slots.SetNum(SlotCount);
}

const TArray<uint8>& UDojoP22CheckpointDesk::BytesIn(int32 Slot) const
{
	static const TArray<uint8> NoBytes;
	return Slots.IsValidIndex(Slot) ? Slots[Slot] : NoBytes;
}

void UDojoP22CheckpointDesk::SaveCheckpoint(FName Gate, FVector Where, int32 Health)
{
	UDojoP22CheckpointSave* Save = Cast<UDojoP22CheckpointSave>(UGameplayStatics::CreateSaveGameObject(UDojoP22CheckpointSave::StaticClass()));
	if (!Save) return;

	Save->Gate = Gate;
	Save->Where = Where;
	Save->Health = Health;

	Slots[NextSlot].Reset();
	UGameplayStatics::SaveGameToMemory(Save, Slots[NextSlot]);
	NextSlot = (NextSlot + 1) % SlotCount;
	++SavedCount;
}

bool UDojoP22CheckpointDesk::LoadLatest(FName& OutGate, FVector& OutWhere, int32& OutHealth) const
{
	return LoadBack(0, OutGate, OutWhere, OutHealth);
}

bool UDojoP22CheckpointDesk::LoadBack(int32 StepsBack, FName& OutGate, FVector& OutWhere, int32& OutHealth) const
{
	if (StepsBack < 0 || StepsBack >= GetCheckpointCount()) return false;

	const int32 Slot = (NextSlot - 1 - StepsBack + SlotCount * 2) % SlotCount;
	const UDojoP22CheckpointSave* Save = Cast<UDojoP22CheckpointSave>(UGameplayStatics::LoadGameFromMemory(BytesIn(Slot)));
	if (!Save) return false;

	OutGate = Save->Gate;
	OutWhere = Save->Where;
	OutHealth = Save->Health;
	return true;
}

int32 UDojoP22CheckpointDesk::GetCheckpointCount() const
{
	return FMath::Min(SavedCount, SlotCount);
}

void UDojoP22CheckpointDesk::ClearCheckpoints()
{
	for (TArray<uint8>& Bytes : Slots)
	{
		Bytes.Reset();
	}

	NextSlot = 0;
	SavedCount = 0;
}
