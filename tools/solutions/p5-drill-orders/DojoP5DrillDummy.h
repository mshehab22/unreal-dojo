#pragma once

#include "CoreMinimal.h"
#include "GameFramework/Actor.h"
#include "DojoP5DrillDummy.generated.h"

class UTextRenderComponent;

/** A sparring dummy that steps between three lanes and raises its guard when told to. */
UCLASS()
class ADojoP5DrillDummy : public AActor
{
	GENERATED_BODY()

public:
	/** Creates the label and turns ticking off. */
	ADojoP5DrillDummy();

	/** Floating text that shows the lane and the blocks so far. */
	UPROPERTY(VisibleAnywhere, Category = "Dummy")
	TObjectPtr<UTextRenderComponent> Label;

	/** Steps one lane in Direction (negative for left, positive for right), never past the outer lanes. */
	UFUNCTION(BlueprintCallable, Category = "Dummy")
	void Step(int32 Direction);

	/** Raises the guard once. */
	UFUNCTION(BlueprintCallable, Category = "Dummy")
	void Block();

	/** The lane the dummy stands in: 0, 1, or 2. */
	UFUNCTION(BlueprintPure, Category = "Dummy")
	int32 GetLane() const;

	/** How many times the dummy has blocked. */
	UFUNCTION(BlueprintPure, Category = "Dummy")
	int32 GetBlocks() const;

protected:
	/** Remembers where the middle lane is and shows the starting lane. */
	virtual void BeginPlay() override;

private:
	/** Moves the actor to its lane and writes the label. */
	void Refresh();

	FVector MiddleLocation = FVector::ZeroVector;
	int32 Lane = 1;
	int32 Blocks = 0;
};
