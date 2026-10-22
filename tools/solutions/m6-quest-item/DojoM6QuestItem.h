#pragma once

#include "CoreMinimal.h"
#include "GameFramework/Actor.h"
#include "DojoM6QuestItem.generated.h"

class ADojoM6QuestItem;
class UTextRenderComponent;

/** Broadcast when an item is collected, with the item and whoever collected it. */
DECLARE_DYNAMIC_MULTICAST_DELEGATE_TwoParams(FDojoM6OnItemCollected, ADojoM6QuestItem*, Item, AActor*, Collector);

/** A pickup that announces it was collected and then leaves the world; it knows nothing about quests or who listens. */
UCLASS()
class ADojoM6QuestItem : public AActor
{
	GENERATED_BODY()

public:
	/** Creates the label and turns ticking off. */
	ADojoM6QuestItem();

	/** Floating text that shows the item's tag. */
	UPROPERTY(VisibleAnywhere, Category = "Quest Item")
	TObjectPtr<UTextRenderComponent> Label;

	/** What kind of item this is, such as Tool or Gem; quests ask for items by tag. */
	UPROPERTY(EditAnywhere, BlueprintReadOnly, Category = "Quest Item")
	FName ItemTag = TEXT("Tool");

	/** Fires once, when the item is collected, while the item still stands. */
	UPROPERTY(BlueprintAssignable, Category = "Quest Item")
	FDojoM6OnItemCollected OnCollected;

	/** Announces the collection to every listener, then destroys the item; false if it was already collected. */
	UFUNCTION(BlueprintCallable, Category = "Quest Item")
	bool Collect(AActor* Collector);

	/** True once collected. */
	UFUNCTION(BlueprintPure, Category = "Quest Item")
	bool IsCollected() const;

protected:
	/** Shows the tag on the label. */
	virtual void BeginPlay() override;

private:
	bool bCollected = false;
};
