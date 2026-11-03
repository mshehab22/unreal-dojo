#pragma once

#include "CoreMinimal.h"
#include "GameFramework/Actor.h"
#include "DojoP19Firefly.h"
#include "DojoP19Swarm.generated.h"

/** A whole swarm of fireflies in one actor: the fireflies are records in one array, moved by one loop each frame. */
UCLASS()
class ADojoP19Swarm : public AActor
{
	GENERATED_BODY()

public:
	/** Creates the scene root and lets the swarm tick. */
	ADojoP19Swarm();

	/** How many fireflies the swarm adds when play begins. */
	UPROPERTY(EditAnywhere, Category = "Swarm", meta = (ClampMin = "0"))
	int32 StartingFireflies = 0;

	/** The seed that scatters the starting fireflies, so every play starts the same. */
	UPROPERTY(EditAnywhere, Category = "Swarm")
	int32 Seed = 19;

	/** Half the width of the square the starting fireflies are scattered over. */
	UPROPERTY(EditAnywhere, Category = "Swarm", meta = (ClampMin = "0.0"))
	float Extent = 500.f;

	/** The top of the meadow; fireflies turn back between 0 and here. */
	UPROPERTY(EditAnywhere, Category = "Swarm", meta = (ClampMin = "1.0"))
	float Ceiling = 300.f;

	/** Draws every firefly as a debug point while playing. */
	UPROPERTY(EditAnywhere, Category = "Swarm")
	bool bDrawDebug = false;

	/** Adds one firefly. */
	UFUNCTION(BlueprintCallable, Category = "Swarm")
	void AddFirefly(FVector Position, FVector Velocity, float Glow, float GlowRate);

	/** How many fireflies the swarm holds. */
	UFUNCTION(BlueprintPure, Category = "Swarm")
	int32 GetFireflyCount() const;

	/** Where the firefly at Index is, or zero for an index the swarm does not hold. */
	UFUNCTION(BlueprintPure, Category = "Swarm")
	FVector GetFireflyPosition(int32 Index) const;

	/** How bright the firefly at Index is, or zero for an index the swarm does not hold. */
	UFUNCTION(BlueprintPure, Category = "Swarm")
	float GetFireflyGlow(int32 Index) const;

	/** Moves every firefly and changes its glow by DeltaSeconds, in one loop over the array. */
	void Step(float DeltaSeconds);

	/** Steps the swarm by the frame's length and draws it when asked. */
	virtual void Tick(float DeltaSeconds) override;

protected:
	/** Adds the starting fireflies. */
	virtual void BeginPlay() override;

private:
	/** Every firefly, by value, side by side. */
	UPROPERTY()
	TArray<FDojoP19Firefly> Fireflies;
};
