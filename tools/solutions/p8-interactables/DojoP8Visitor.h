#pragma once

#include "CoreMinimal.h"
#include "GameFramework/Actor.h"
#include "DojoP8Visitor.generated.h"

class UTextRenderComponent;

/** A visitor walking the arena grounds, carrying items and collecting quest flags. */
UCLASS()
class ADojoP8Visitor : public AActor
{
	GENERATED_BODY()

public:
	/** Creates the label and turns ticking off. */
	ADojoP8Visitor();

	/** Floating text that lists what the visitor carries. */
	UPROPERTY(VisibleAnywhere, Category = "Visitor")
	TObjectPtr<UTextRenderComponent> Label;

	/** Items the visitor carries, one entry per item. */
	UPROPERTY(EditAnywhere, Category = "Visitor")
	TArray<FName> Items;

	/** Quest flags the visitor has earned. */
	UPROPERTY(VisibleInstanceOnly, Category = "Visitor")
	TArray<FName> QuestFlags;

	/** True when the visitor carries at least one Item. */
	UFUNCTION(BlueprintPure, Category = "Visitor")
	bool HasItem(FName Item) const;

	/** Adds one Item. */
	UFUNCTION(BlueprintCallable, Category = "Visitor")
	void AddItem(FName Item);

	/** Removes one Item; returns false, changing nothing, when the visitor has none. */
	UFUNCTION(BlueprintCallable, Category = "Visitor")
	bool RemoveItem(FName Item);

	/** True once the visitor has earned Flag. */
	UFUNCTION(BlueprintPure, Category = "Visitor")
	bool HasFlag(FName Flag) const;

	/** Records Flag once. */
	UFUNCTION(BlueprintCallable, Category = "Visitor")
	void SetFlag(FName Flag);

protected:
	/** Shows what the visitor carries. */
	virtual void BeginPlay() override;

private:
	/** Writes the item count into the label. */
	void RefreshLabel();
};
