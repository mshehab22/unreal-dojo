#pragma once

#include "CoreMinimal.h"
#include "Components/ActorComponent.h"
#include "Quests/s1-item-data/DojoS1ItemStack.h"
#include "DojoS1InventoryComponent.generated.h"

class UDojoS1InventoryComponent;
class UDojoS1ItemData;

/** Broadcast after the bag's contents changed, with the bag itself so one handler can serve many bags. */
DECLARE_DYNAMIC_MULTICAST_DELEGATE_OneParam(FDojoS1OnInventoryChanged, UDojoS1InventoryComponent*, Inventory);

/** A bag any actor can carry (the Component pattern): stacks of items in a limited number of slots under a weight limit, announcing every change like the sender in the Observer pattern and knowing nothing about who listens. */
UCLASS(ClassGroup = (Dojo), meta = (BlueprintSpawnableComponent))
class UDojoS1InventoryComponent : public UActorComponent
{
	GENERATED_BODY()

public:
	/** Turns ticking off; the bag only reacts to calls. */
	UDojoS1InventoryComponent();

	/** How many different piles the bag can hold. */
	UPROPERTY(EditAnywhere, BlueprintReadOnly, Category = "Inventory", meta = (ClampMin = "1"))
	int32 SlotCount = 4;

	/** The most the bag can weigh in total. */
	UPROPERTY(EditAnywhere, BlueprintReadOnly, Category = "Inventory", meta = (ClampMin = "0"))
	int32 MaxWeight = 20;

	/** Fires once per Add or Remove that changed the bag, after the bag holds its new contents. */
	UPROPERTY(BlueprintAssignable, Category = "Inventory")
	FDojoS1OnInventoryChanged OnInventoryChanged;

	/** How many of this item the bag could take right now, given free room in its piles, free slots, and the weight limit. */
	UFUNCTION(BlueprintPure, Category = "Inventory")
	int32 GetRoomFor(UDojoS1ItemData* Item) const;

	/** Adds up to Count items, topping up existing piles before opening new slots; returns how many went in. */
	UFUNCTION(BlueprintCallable, Category = "Inventory")
	int32 Add(UDojoS1ItemData* Item, int32 Count);

	/** Removes up to Count items, emptying the newest pile first and dropping piles that run out; returns how many came out. */
	UFUNCTION(BlueprintCallable, Category = "Inventory")
	int32 Remove(UDojoS1ItemData* Item, int32 Count);

	/** How many of this item the bag holds across all its piles. */
	UFUNCTION(BlueprintPure, Category = "Inventory")
	int32 CountOf(UDojoS1ItemData* Item) const;

	/** What everything in the bag weighs. */
	UFUNCTION(BlueprintPure, Category = "Inventory")
	int32 GetTotalWeight() const;

	/** The piles in slot order; empty slots are not listed. */
	UFUNCTION(BlueprintPure, Category = "Inventory")
	TArray<FDojoS1ItemStack> GetSlots() const;

private:
	UPROPERTY()
	TArray<FDojoS1ItemStack> Slots;
};
