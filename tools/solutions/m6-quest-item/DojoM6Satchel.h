#pragma once

#include "CoreMinimal.h"
#include "GameFramework/Actor.h"
#include "DojoM6Satchel.generated.h"

class ADojoM6QuestItem;

/** Counts collected items by tag by listening to each item it is told to watch; the items never know it exists. */
UCLASS()
class ADojoM6Satchel : public AActor
{
	GENERATED_BODY()

public:
	/** Turns ticking off. */
	ADojoM6Satchel();

	/** Starts listening to Item's collection. */
	UFUNCTION(BlueprintCallable, Category = "Satchel")
	void Watch(ADojoM6QuestItem* Item);

	/** Items of this tag heard so far. */
	UFUNCTION(BlueprintPure, Category = "Satchel")
	int32 GetCount(FName ItemTag) const;

	/** Notices that arrived after the item had already started leaving the world. */
	UFUNCTION(BlueprintPure, Category = "Satchel")
	int32 GetLateNotices() const;

private:
	/** Counts one item of the collected item's tag. */
	UFUNCTION()
	void HandleCollected(ADojoM6QuestItem* Item, AActor* Collector);

	TMap<FName, int32> Counts;

	int32 LateNotices = 0;
};
