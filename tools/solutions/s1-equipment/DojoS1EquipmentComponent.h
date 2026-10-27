#pragma once

#include "CoreMinimal.h"
#include "Components/ActorComponent.h"
#include "Quests/s1-item-data/DojoS1ItemData.h"
#include "DojoS1EquipmentComponent.generated.h"

class UDojoS1EquipmentComponent;
class UDojoS1InventoryComponent;

/** Broadcast after the worn items changed, with the component itself so one handler can serve many wearers. */
DECLARE_DYNAMIC_MULTICAST_DELEGATE_OneParam(FDojoS1OnEquipmentChanged, UDojoS1EquipmentComponent*, Equipment);

/** The slots an actor wears items in (the Component pattern); it moves items between its bag and its slots and announces each change like the sender in the Observer pattern, while the bag knows nothing about it. */
UCLASS(ClassGroup = (Dojo), meta = (BlueprintSpawnableComponent))
class UDojoS1EquipmentComponent : public UActorComponent
{
	GENERATED_BODY()

public:
	/** Turns ticking off; equipment only reacts to calls. */
	UDojoS1EquipmentComponent();

	/** Fires once per successful Equip or Unequip, after both the bag and the slots hold their new contents. */
	UPROPERTY(BlueprintAssignable, Category = "Equipment")
	FDojoS1OnEquipmentChanged OnEquipmentChanged;

	/** Chooses the bag that items are taken from and returned to. */
	UFUNCTION(BlueprintCallable, Category = "Equipment")
	void UseBag(UDojoS1InventoryComponent* NewBag);

	/** Wears one of this item from the bag, putting back whatever was in its slot; false if the item cannot be worn. */
	UFUNCTION(BlueprintCallable, Category = "Equipment")
	bool Equip(UDojoS1ItemData* Item);

	/** Moves the item worn in this slot back into the bag; false if the slot is empty. */
	UFUNCTION(BlueprintCallable, Category = "Equipment")
	bool Unequip(EDojoS1EquipSlot Slot);

	/** The item worn in this slot, or null. */
	UFUNCTION(BlueprintPure, Category = "Equipment")
	UDojoS1ItemData* GetEquipped(EDojoS1EquipSlot Slot) const;

	/** The power bonuses of everything worn, added up. */
	UFUNCTION(BlueprintPure, Category = "Equipment")
	int32 GetTotalPower() const;

private:
	UPROPERTY()
	TObjectPtr<UDojoS1InventoryComponent> Bag;

	UPROPERTY()
	TMap<EDojoS1EquipSlot, TObjectPtr<UDojoS1ItemData>> Worn;
};
