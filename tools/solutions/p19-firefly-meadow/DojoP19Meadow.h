#pragma once

#include "CoreMinimal.h"
#include "GameFramework/Actor.h"
#include "DojoP19MeadowFly.h"
#include "DojoP19Meadow.generated.h"

/** A meadow of catchable fireflies: records in one packed array, named from outside by handles. */
UCLASS()
class ADojoP19Meadow : public AActor
{
	GENERATED_BODY()

public:
	/** Creates the scene root and lets the meadow tick. */
	ADojoP19Meadow();

	/** Draws every firefly as a debug point while playing. */
	UPROPERTY(EditAnywhere, Category = "Meadow")
	bool bDrawDebug = false;

	/** Puts a firefly in the meadow and returns the handle that names it. */
	UFUNCTION(BlueprintCallable, Category = "Meadow")
	FDojoP19FlyHandle AddFirefly(FVector Where, FVector Velocity, float LifeSeconds);

	/** Removes the firefly Handle names; false when the meadow does not hold it. */
	UFUNCTION(BlueprintCallable, Category = "Meadow")
	bool Catch(FDojoP19FlyHandle Handle);

	/** True while the firefly Handle names is in the meadow. */
	UFUNCTION(BlueprintPure, Category = "Meadow")
	bool IsAlive(FDojoP19FlyHandle Handle) const;

	/** Where the firefly Handle names is, or zero when the meadow does not hold it. */
	UFUNCTION(BlueprintPure, Category = "Meadow")
	FVector GetPosition(FDojoP19FlyHandle Handle) const;

	/** How many fireflies are in the meadow. */
	UFUNCTION(BlueprintPure, Category = "Meadow")
	int32 GetFireflyCount() const;

	/** Moves every firefly, burns its life, and removes the ones that faded. */
	void Step(float DeltaSeconds);

	/** Steps the meadow by the frame's length and draws it when asked. */
	virtual void Tick(float DeltaSeconds) override;

private:
	/** Where in the array the firefly Handle names is now, or INDEX_NONE. */
	int32 FindIndex(FDojoP19FlyHandle Handle) const;

	/** Removes the firefly at Index, keeping the array packed. */
	void RemoveFirefly(int32 Index);

	/** Every firefly in the meadow, by value, with no gaps. */
	UPROPERTY()
	TArray<FDojoP19MeadowFly> Flies;

	/** For every ID ever handed out, where its firefly is in Flies now, or INDEX_NONE once it has left. IDs are never reused. */
	UPROPERTY()
	TArray<int32> IndexOfId;
};
