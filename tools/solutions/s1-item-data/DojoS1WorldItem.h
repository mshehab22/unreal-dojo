#pragma once

#include "CoreMinimal.h"
#include "GameFramework/Actor.h"
#include "DojoS1WorldItem.generated.h"

class UDojoS1ItemData;
class UTextRenderComponent;

/** A pile of loose items lying in the world; it knows what it holds and how many, and nothing about bags. */
UCLASS()
class ADojoS1WorldItem : public AActor
{
	GENERATED_BODY()

public:
	/** Creates the label and turns ticking off. */
	ADojoS1WorldItem();

	/** Floating text that shows the item's name and count. */
	UPROPERTY(VisibleAnywhere, Category = "World Item")
	TObjectPtr<UTextRenderComponent> Label;

	/** Sets what the pile holds and how many, and updates the label. */
	UFUNCTION(BlueprintCallable, Category = "World Item")
	void Setup(UDojoS1ItemData* NewItem, int32 NewCount);

	/** Hands out up to Amount items, returning how many were given; the pile removes itself when it runs out. */
	UFUNCTION(BlueprintCallable, Category = "World Item")
	int32 Take(int32 Amount);

	/** The kind of item in the pile. */
	UFUNCTION(BlueprintPure, Category = "World Item")
	UDojoS1ItemData* GetItem() const;

	/** How many are still in the pile. */
	UFUNCTION(BlueprintPure, Category = "World Item")
	int32 GetCount() const;

protected:
	/** Shows the starting contents on the label. */
	virtual void BeginPlay() override;

private:
	/** Rewrites the label as the item's name and the count, such as "Potion x3". */
	void RefreshLabel();

	UPROPERTY()
	TObjectPtr<UDojoS1ItemData> Item = nullptr;

	int32 Count = 0;
};
