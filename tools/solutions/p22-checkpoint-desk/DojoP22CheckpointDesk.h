#pragma once

#include "CoreMinimal.h"
#include "Subsystems/WorldSubsystem.h"
#include "DojoP22CheckpointDesk.generated.h"

/**
 * One front for checkpoints: save one, load the newest, or step back, without knowing about save objects, bytes, or slots.
 * Keeps the three newest in memory, overwriting the oldest.
 * Callers depend on the desk; the save object knows nothing about it.
 */
UCLASS()
class UDojoP22CheckpointDesk : public UWorldSubsystem
{
	GENERATED_BODY()

public:
	/** How many checkpoints the desk keeps. */
	static constexpr int32 SlotCount = 3;

	/** Saves a checkpoint at Gate with the runner at Where and its Health, overwriting the oldest when all slots are full. */
	UFUNCTION(BlueprintCallable, Category = "Checkpoints")
	void SaveCheckpoint(FName Gate, FVector Where, int32 Health);

	/** The newest checkpoint kept; false, with the outputs untouched, when none is kept. */
	UFUNCTION(BlueprintCallable, BlueprintPure = false, Category = "Checkpoints")
	bool LoadLatest(FName& OutGate, FVector& OutWhere, int32& OutHealth) const;

	/** The checkpoint StepsBack before the newest (0 is the newest); false, with the outputs untouched, when it is not kept. */
	UFUNCTION(BlueprintCallable, BlueprintPure = false, Category = "Checkpoints")
	bool LoadBack(int32 StepsBack, FName& OutGate, FVector& OutWhere, int32& OutHealth) const;

	/** How many checkpoints are kept now, at most SlotCount. */
	UFUNCTION(BlueprintPure, Category = "Checkpoints")
	int32 GetCheckpointCount() const;

	/** Forgets every checkpoint. */
	UFUNCTION(BlueprintCallable, Category = "Checkpoints")
	void ClearCheckpoints();

	/** Sizes the slots when the world starts, so every slot exists from the first call. */
	virtual void Initialize(FSubsystemCollectionBase& Collection) override;

private:
	/** The bytes kept in a slot; empty for a slot that holds nothing or does not exist. */
	const TArray<uint8>& BytesIn(int32 Slot) const;

	/** Each kept checkpoint as the bytes UGameplayStatics::SaveGameToMemory wrote, by slot. */
	TArray<TArray<uint8>> Slots;

	/** The slot the next save writes. */
	int32 NextSlot = 0;

	/** Checkpoints saved since the last clear. */
	int32 SavedCount = 0;
};
