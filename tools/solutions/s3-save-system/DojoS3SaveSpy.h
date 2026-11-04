#pragma once

#include "CoreMinimal.h"
#include "UObject/Object.h"
#include "DojoS3SaveSpy.generated.h"

class ADojoS3Lantern;
class UDojoS3SaveSystem;

/** A listener that counts a save system's notices, remembers the last slot and result of each kind, and reads one lantern when a load is announced; it only subscribes. */
UCLASS()
class UDojoS3SaveSpy : public UObject
{
	GENERATED_BODY()

public:
	/** Starts listening to the system's saves and loads, once however many times it is called. */
	UFUNCTION(BlueprintCallable, Category = "Save Spy")
	void Watch(UDojoS3SaveSystem* System);

	/** The lantern whose oil is read when a load is announced. */
	UPROPERTY()
	TObjectPtr<ADojoS3Lantern> Lantern;

	/** How many save notices arrived. */
	int32 Saves = 0;

	/** How many load notices arrived. */
	int32 Loads = 0;

	/** The slot and result of the last save notice. */
	FString LastSaveSlot;
	bool bLastSaveSucceeded = false;

	/** The slot and result of the last load notice. */
	FString LastLoadSlot;
	bool bLastLoadSucceeded = false;

	/** The watched lantern's oil when the last load notice arrived, or -1. */
	int32 OilAtLastLoad = -1;

private:
	/** Counts the save and keeps its slot and result. */
	UFUNCTION()
	void HandleSaved(const FString& SlotName, bool bSucceeded);

	/** Counts the load, keeps its slot and result, and reads the lantern. */
	UFUNCTION()
	void HandleLoaded(const FString& SlotName, bool bSucceeded);
};
