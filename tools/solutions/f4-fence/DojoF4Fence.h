#pragma once

#include "CoreMinimal.h"
#include "GameFramework/Actor.h"
#include "DojoF4Fence.generated.h"

class UTextRenderComponent;

/** Lays out a row of numbered posts from two editable numbers, rebuilt whenever the fence is constructed, so designers see the result while editing. */
UCLASS()
class ADojoF4Fence : public AActor
{
	GENERATED_BODY()

public:
	/** Creates the scene root and turns ticking off. */
	ADojoF4Fence();

	/** How many posts to lay out. */
	UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "Fence", meta = (ClampMin = "0", ClampMax = "20"))
	int32 PostCount = 4;

	/** Distance between neighboring posts, along the fence's forward axis. */
	UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "Fence", meta = (ClampMin = "10.0"))
	float Spacing = 200.f;

	/** Destroys the old posts and lays out PostCount new ones, the first at the fence's location. */
	UFUNCTION(BlueprintCallable, Category = "Fence")
	void Rebuild();

	/** How many posts exist now. */
	UFUNCTION(BlueprintPure, Category = "Fence")
	int32 GetBuiltPostCount() const;

	/** World location of the post at Index, or the fence's location for an index that does not exist. */
	UFUNCTION(BlueprintPure, Category = "Fence")
	FVector GetPostLocation(int32 Index) const;

	/** Rebuilds the posts whenever the actor is constructed: placed, moved, or edited in the editor, and spawned in play. */
	virtual void OnConstruction(const FTransform& Transform) override;

private:
	/** The posts made by the latest rebuild, first to last. */
	UPROPERTY(VisibleInstanceOnly, Category = "Fence")
	TArray<TObjectPtr<UTextRenderComponent>> Posts;
};
