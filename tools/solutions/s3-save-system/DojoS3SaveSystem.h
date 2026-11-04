#pragma once

#include "CoreMinimal.h"
#include "Subsystems/WorldSubsystem.h"
#include "DojoS3SaveSystem.generated.h"

class AActor;
class UDojoS3SaveableComponent;

/** Broadcast after a save to a slot was written or failed. */
DECLARE_DYNAMIC_MULTICAST_DELEGATE_TwoParams(FDojoS3OnSaved, const FString&, SlotName, bool, bSucceeded);

/** Broadcast after a load from a slot finished or failed. */
DECLARE_DYNAMIC_MULTICAST_DELEGATE_TwoParams(FDojoS3OnLoaded, const FString&, SlotName, bool, bSucceeded);

/** Saves and loads every saveable actor in its world through slots: it gathers each actor's state by its save id, remembers which saveables the world has lost, and announces each save and load like the sender in the Observer pattern. */
UCLASS()
class UDojoS3SaveSystem : public UWorldSubsystem
{
	GENERATED_BODY()

public:
	/** Starts listening for actors leaving the world. */
	virtual void Initialize(FSubsystemCollectionBase& Collection) override;

	/** Stops listening. */
	virtual void Deinitialize() override;

	/** Fires once per SaveToSlot, after the slot was written or the write failed. */
	UPROPERTY(BlueprintAssignable, Category = "Save")
	FDojoS3OnSaved OnSaved;

	/** Fires once per LoadFromSlot, after every saveable was restored or the load failed. */
	UPROPERTY(BlueprintAssignable, Category = "Save")
	FDojoS3OnLoaded OnLoaded;

	/** Writes the state of every saveable in the world, and the ids the world has lost, to the slot. */
	UFUNCTION(BlueprintCallable, Category = "Save")
	bool SaveToSlot(const FString& SlotName);

	/** Reads the slot and applies it: lost saveables are removed, the others get their saved state back. */
	UFUNCTION(BlueprintCallable, Category = "Save")
	bool LoadFromSlot(const FString& SlotName);

	/** Every saveable component in the world whose save id is set. */
	UFUNCTION(BlueprintPure, Category = "Save")
	TArray<UDojoS3SaveableComponent*> FindSaveables() const;

private:
	/** Remembers the save id of a saveable actor that is leaving the world. */
	void HandleActorDestroyed(AActor* Actor);

	/** Ids of saveables this world has lost, or that a loaded save said were lost. */
	TSet<FName> LostIds;

	/** The world's handle for the destroyed-actor listener, kept to remove it. */
	FDelegateHandle DestroyedHandle;
};
