#pragma once

#include "CoreMinimal.h"
#include "Components/ActorComponent.h"
#include "DojoP9LootComponent.generated.h"

class UDojoP9HealthComponent;

DECLARE_DYNAMIC_MULTICAST_DELEGATE_TwoParams(FDojoP9LootDroppedSignature, FName, Item, int32, Count);

/** A loot part any actor can carry: it drops its items once, for example when a health part it listens to runs out. Component pattern. */
UCLASS(ClassGroup = "Dojo", meta = (BlueprintSpawnableComponent))
class UDojoP9LootComponent : public UActorComponent
{
	GENERATED_BODY()

public:
	/** Turns ticking off; loot only acts when told to drop. */
	UDojoP9LootComponent();

	/** The item this part drops. */
	UPROPERTY(EditAnywhere, Category = "Loot")
	FName LootItem = TEXT("Bandage");

	/** How many of LootItem drop. */
	UPROPERTY(EditAnywhere, Category = "Loot", meta = (ClampMin = "1"))
	int32 LootCount = 1;

	/** Broadcast once, when the loot drops. */
	UPROPERTY(BlueprintAssignable, Category = "Loot")
	FDojoP9LootDroppedSignature OnLootDropped;

	/** Drops the loot when Health runs out. */
	UFUNCTION(BlueprintCallable, Category = "Loot")
	void ListenTo(UDojoP9HealthComponent* Health);

	/** Drops the loot; later calls do nothing. */
	UFUNCTION(BlueprintCallable, Category = "Loot")
	void Drop();

	/** True once the loot has dropped. */
	UFUNCTION(BlueprintPure, Category = "Loot")
	bool HasDropped() const;

protected:
	/** Stops listening to the health part. */
	virtual void EndPlay(const EEndPlayReason::Type EndPlayReason) override;

private:
	/** Called by the health part it listens to. */
	UFUNCTION()
	void HandleHealthDepleted(UDojoP9HealthComponent* Health);

	/** The health part this loot listens to, if any. */
	TWeakObjectPtr<UDojoP9HealthComponent> Source;

	bool bDropped = false;
};
