#pragma once

#include "CoreMinimal.h"
#include "GameFramework/Actor.h"
#include "DojoP19Ember.h"
#include "DojoP19Brazier.generated.h"

/** A fire basket that throws up embers, which rise and cool until they go out. Embers are records in a hot and a cold array: the Data Locality pattern, with a hot and cold split. */
UCLASS()
class ADojoP19Brazier : public AActor
{
	GENERATED_BODY()

public:
	/** Creates the scene root and lets the brazier tick. */
	ADojoP19Brazier();

	/** How long each ember lives. */
	UPROPERTY(EditAnywhere, Category = "Brazier", meta = (ClampMin = "0.1"))
	float EmberSeconds = 3.f;

	/** Throws up one ember at Where with Velocity. */
	UFUNCTION(BlueprintCallable, Category = "Brazier")
	void Kindle(FVector Where, FVector Velocity, FName Kind);

	/** How many embers are up. */
	UFUNCTION(BlueprintPure, Category = "Brazier")
	int32 GetEmberCount() const;

	/** The height of the highest ember, or 0 when none is up. */
	UFUNCTION(BlueprintPure, Category = "Brazier")
	float GetHighestEmberZ() const;

	/** The heat left in all embers together. */
	UFUNCTION(BlueprintPure, Category = "Brazier")
	float GetTotalHeat() const;

	/** How many embers of Kind are up. */
	UFUNCTION(BlueprintPure, Category = "Brazier")
	int32 CountEmbersOfKind(FName Kind) const;

	/** The height of the highest ember of Kind, or 0 when none is up. */
	UFUNCTION(BlueprintPure, Category = "Brazier")
	float GetHighestZOfKind(FName Kind) const;

	/** Moves and cools every ember by DeltaSeconds and removes the ones with no heat left. */
	void Step(float DeltaSeconds);

	/** Steps the embers by the frame's length. */
	virtual void Tick(float DeltaSeconds) override;

private:
	/** What the step reads every frame, one record per ember, side by side. */
	UPROPERTY()
	TArray<FDojoP19EmberHot> Hot;

	/** What only the readers need, at the same index as each ember's hot record. */
	UPROPERTY()
	TArray<FDojoP19EmberCold> Cold;
};
