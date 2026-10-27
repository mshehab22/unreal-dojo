#pragma once

#include "CoreMinimal.h"
#include "Engine/DataAsset.h"
#include "DojoS1ItemData.generated.h"

/** Where an item can be worn; None means it cannot be equipped. */
UENUM(BlueprintType)
enum class EDojoS1EquipSlot : uint8
{
	EES_None UMETA(DisplayName = "None"),
	EES_Head UMETA(DisplayName = "Head"),
	EES_Hand UMETA(DisplayName = "Hand")
};

/** One kind of item, kept in an asset so designers add kinds without code; every stack and world item points at one (the Type Object pattern). */
UCLASS(BlueprintType)
class UDojoS1ItemData : public UDataAsset
{
	GENERATED_BODY()

public:
	/** The name shown to the player. */
	UPROPERTY(EditAnywhere, BlueprintReadOnly, Category = "Item")
	FText DisplayName;

	/** How many of this item fit in one bag slot; 1 means the item never stacks. */
	UPROPERTY(EditAnywhere, BlueprintReadOnly, Category = "Item", meta = (ClampMin = "1"))
	int32 MaxStack = 1;

	/** Weight of one item; the bag has a weight limit. */
	UPROPERTY(EditAnywhere, BlueprintReadOnly, Category = "Item", meta = (ClampMin = "0"))
	int32 Weight = 1;

	/** Where the item is worn; None for items that are not equipment. */
	UPROPERTY(EditAnywhere, BlueprintReadOnly, Category = "Item")
	EDojoS1EquipSlot EquipSlot = EDojoS1EquipSlot::EES_None;

	/** Power added to the wearer while the item is equipped. */
	UPROPERTY(EditAnywhere, BlueprintReadOnly, Category = "Item")
	int32 PowerBonus = 0;

	/** Health restored when the item is used; 0 means it cannot be used. */
	UPROPERTY(EditAnywhere, BlueprintReadOnly, Category = "Item", meta = (ClampMin = "0"))
	int32 HealAmount = 0;

	/** How many fit in one slot: MaxStack, but never below 1, even when an old asset or code leaves it at 0 or less. */
	UFUNCTION(BlueprintPure, Category = "Item")
	int32 GetStackLimit() const;

	/** True when the item has a slot to be worn in. */
	UFUNCTION(BlueprintPure, Category = "Item")
	bool IsEquippable() const;

	/** True when using the item restores health. */
	UFUNCTION(BlueprintPure, Category = "Item")
	bool IsConsumable() const;
};
