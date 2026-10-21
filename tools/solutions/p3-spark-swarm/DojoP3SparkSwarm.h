#pragma once

#include "CoreMinimal.h"
#include "GameFramework/Actor.h"
#include "DojoP3SparkSwarm.generated.h"

class UTextRenderComponent;

/** One spark of the swarm: plain data the swarm updates, not an actor. */
USTRUCT()
struct FDojoP3Spark
{
	GENERATED_BODY()

	/** Distance from the swarm along its X axis, in centimeters. */
	UPROPERTY()
	float Position = 0.f;

	/** Speed along the X axis, in centimeters per second; negative flies back. */
	UPROPERTY()
	float Velocity = 0.f;

	/** Seconds until the spark bursts. */
	UPROPERTY()
	float SecondsLeft = 1.f;

	/** 0 for a launched spark, one more for each burst it came from. */
	UPROPERTY()
	int32 Generation = 0;

	/** Set when the spark bursts; it is removed after the walk that set it. */
	UPROPERTY()
	bool bDead = false;
};

/** A firework swarm whose sparks are plain structs updated by one walk per frame; bursting sparks split into two that start next step (Update Method: one manager updates many light objects). */
UCLASS()
class ADojoP3SparkSwarm : public AActor
{
	GENERATED_BODY()

public:
	/** Creates the label and turns ticking on. */
	ADojoP3SparkSwarm();

	/** Floating text that shows how many sparks are alive. */
	UPROPERTY(VisibleAnywhere, Category = "Swarm")
	TObjectPtr<UTextRenderComponent> Label;

	/** Speed of a launched spark and of each child, in centimeters per second. */
	UPROPERTY(EditAnywhere, Category = "Swarm", meta = (ClampMin = "0"))
	float LaunchSpeed = 200.f;

	/** Seconds each spark lives before it bursts. */
	UPROPERTY(EditAnywhere, Category = "Swarm", meta = (ClampMin = "0.01"))
	float SparkLifetime = 1.f;

	/** Sparks of this generation burst without children. */
	UPROPERTY(EditAnywhere, Category = "Swarm", meta = (ClampMin = "0"))
	int32 MaxGeneration = 2;

	/** Adds one spark at the swarm, flying forward. */
	UFUNCTION(BlueprintCallable, Category = "Swarm")
	void Launch();

	/** One update walk: moves and ages every spark that was alive when the walk began, bursts the expired ones, then removes them. */
	UFUNCTION(BlueprintCallable, Category = "Swarm")
	void Step(float DeltaSeconds);

	/** Sparks alive right now. */
	UFUNCTION(BlueprintPure, Category = "Swarm")
	int32 GetSparkCount() const;

	/** How many sparks the last Step moved. */
	UFUNCTION(BlueprintPure, Category = "Swarm")
	int32 GetMovedLastStep() const;

	/** Adds a spark exactly as given; used by tests and by Launch. */
	void AddSpark(const FDojoP3Spark& Spark);

	/** The sparks alive right now, in walk order. */
	const TArray<FDojoP3Spark>& GetSparks() const;

	/** Steps the swarm and draws every spark as a point. */
	virtual void Tick(float DeltaSeconds) override;

protected:
	/** Shows the starting count. */
	virtual void BeginPlay() override;

private:
	/** Marks the spark at Index dead and, below MaxGeneration, adds its two children at its position. */
	void Burst(int32 Index);

	/** Writes the number of sparks alive into the label. */
	void RefreshLabel();

	/** Every spark, alive or marked dead during the current walk. */
	UPROPERTY(VisibleInstanceOnly, Category = "Swarm")
	TArray<FDojoP3Spark> Sparks;

	int32 MovedLastStep = 0;
};
