#pragma once

#include "CoreMinimal.h"
#include "DojoS1LootSpot.h"
#include "GameFramework/Actor.h"
#include "DojoS1PackDirector.generated.h"

class ADojoS1BagView;
class ADojoS1WorldItem;
class UDojoS1EquipmentComponent;
class UDojoS1InventoryComponent;
class UDojoS1ItemData;
class UTextRenderComponent;

/** Runs the expedition pack: connects the hero's bag and equipment components to loose piles in the world, keeps the status board by listening, and calls the finale. */
UCLASS()
class ADojoS1PackDirector : public AActor
{
	GENERATED_BODY()

public:
	/** Creates the board and turns ticking off. */
	ADojoS1PackDirector();

	/** The status board: health, the selected slot, and the finale. */
	UPROPERTY(VisibleAnywhere, Category = "Expedition")
	TObjectPtr<UTextRenderComponent> Board;

	/** The hero, who carries a bag and equipment as components. */
	UPROPERTY(EditAnywhere, Category = "Expedition")
	TObjectPtr<AActor> Hero;

	/** Where loose piles lie at the start of every round. */
	UPROPERTY(EditAnywhere, Category = "Expedition")
	TArray<FDojoS1LootSpot> LootSpots;

	/** The weapon that must be in the hand for the pack to be ready. */
	UPROPERTY(EditAnywhere, Category = "Expedition")
	TObjectPtr<UDojoS1ItemData> ReadyWeapon;

	/** The helmet that must be on the head for the pack to be ready. */
	UPROPERTY(EditAnywhere, Category = "Expedition")
	TObjectPtr<UDojoS1ItemData> ReadyHelmet;

	/** The potion the pack needs, and the item a drink restores health from. */
	UPROPERTY(EditAnywhere, Category = "Expedition")
	TObjectPtr<UDojoS1ItemData> PotionItem;

	/** How many potions the bag must hold for the pack to be ready. */
	UPROPERTY(EditAnywhere, Category = "Expedition", meta = (ClampMin = "1"))
	int32 PotionsNeeded = 3;

	/** The most health the hero can have. */
	UPROPERTY(EditAnywhere, Category = "Expedition", meta = (ClampMin = "1"))
	int32 MaxHealth = 100;

	/** Health at the start of every round. */
	UPROPERTY(EditAnywhere, Category = "Expedition", meta = (ClampMin = "0"))
	int32 StartHealth = 50;

	/** A pile this close to the hero can be picked up. */
	UPROPERTY(EditAnywhere, Category = "Expedition", meta = (ClampMin = "0.0"))
	float PickUpRange = 200.f;

	/** Where the bag view appears, relative to the director. */
	UPROPERTY(EditAnywhere, Category = "Expedition")
	FVector ViewOffset = FVector(0.f, 0.f, 150.f);

	/** How far in front of the hero a dropped item lands. */
	UPROPERTY(EditAnywhere, Category = "Expedition", meta = (ClampMin = "0.0"))
	float DropDistance = 100.f;

	/** Chooses the bag slot (counted from 0) that drop, use, and equip act on. */
	UFUNCTION(BlueprintCallable, Category = "Expedition")
	void SelectSlot(int32 SlotIndex);

	/** E: moves as much of the nearest pile within range into the bag as fits and leaves the rest lying there. */
	UFUNCTION(BlueprintCallable, Category = "Expedition")
	void PressPickUp();

	/** G: drops one of the selected item in front of the hero. */
	UFUNCTION(BlueprintCallable, Category = "Expedition")
	void PressDrop();

	/** U: uses one of the selected item if it heals and the hero is hurt. */
	UFUNCTION(BlueprintCallable, Category = "Expedition")
	void PressUse();

	/** Q: equips the selected item if it can be worn. */
	UFUNCTION(BlueprintCallable, Category = "Expedition")
	void PressEquip();

	/** R: starts the next round, only after the finale. */
	UFUNCTION(BlueprintCallable, Category = "Expedition")
	void RestartRound();

	/** True from the start of a round until the finale. */
	UFUNCTION(BlueprintPure, Category = "Expedition")
	bool IsRunning() const;

	/** Seconds the last finished round took, or 0. */
	UFUNCTION(BlueprintPure, Category = "Expedition")
	float GetFinishSeconds() const;

	/** The hero's health. */
	UFUNCTION(BlueprintPure, Category = "Expedition")
	int32 GetHealth() const;

	/** The item in the selected bag slot, or null. */
	UFUNCTION(BlueprintPure, Category = "Expedition")
	UDojoS1ItemData* GetSelectedItem() const;

	/** The piles lying in the world now, in the order they appeared. */
	UFUNCTION(BlueprintPure, Category = "Expedition")
	TArray<ADojoS1WorldItem*> GetWorldItems() const;

	/** The view that shows the hero's bag and equipment. */
	UFUNCTION(BlueprintPure, Category = "Expedition")
	ADojoS1BagView* GetBagView() const;

protected:
	/** Finds the hero's bag and equipment, listens to both, spawns the view, and starts round 1. */
	virtual void BeginPlay() override;

	/** Stops listening to the bag and equipment. */
	virtual void EndPlay(const EEndPlayReason::Type EndPlayReason) override;

private:
	/** The bag changed, so the board is rewritten and the finale checked. */
	UFUNCTION()
	void HandleInventoryChanged(UDojoS1InventoryComponent* Inventory);

	/** The equipment changed, so the board is rewritten and the finale checked. */
	UFUNCTION()
	void HandleEquipmentChanged(UDojoS1EquipmentComponent* Equipment);

	/** Routes one pressed key to its action. */
	void HandleKey(FKey Key);

	/** Resets the hero and the world to the first state of a round and starts the clock. */
	void StartRound();

	/** Empties the bag and the equipment slots. */
	void ClearHero();

	/** Removes every pile from the bag. */
	void EmptyBag();

	/** Spawns one loose pile and remembers it. */
	void SpawnPile(UDojoS1ItemData* Item, int32 Count, const FVector& Where);

	/** Ends the round when the pack is ready, then rewrites the board. */
	void RefreshBoard();

	/** True when the weapon, the helmet, and enough potions are all in place. */
	bool IsPackReady() const;

	UPROPERTY()
	TObjectPtr<UDojoS1InventoryComponent> HeroBag;

	UPROPERTY()
	TObjectPtr<UDojoS1EquipmentComponent> HeroEquipment;

	UPROPERTY()
	TObjectPtr<ADojoS1BagView> BagView;

	UPROPERTY()
	TArray<TObjectPtr<ADojoS1WorldItem>> WorldItems;

	int32 CurrentHealth = 0;
	int32 SelectedSlot = 0;
	bool bRunning = false;
	bool bFinished = false;
	float StartSeconds = 0.f;
	float FinishSeconds = 0.f;
};
