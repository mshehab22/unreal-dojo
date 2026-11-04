#pragma once

#include "CoreMinimal.h"
#include "GameFramework/Actor.h"
#include "DojoM5Feeler.generated.h"

/** Checks whether a ball of a given size can roll straight ahead for a distance, and where it would stop if something is in the way. */
UCLASS()
class ADojoM5Feeler : public AActor
{
	GENERATED_BODY()

public:
	/** Creates a scene root and an arrow that shows the way the ball would roll. */
	ADojoM5Feeler();

	/** The radius of the ball that has to fit, in units. */
	UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "Feeler", meta = (ClampMin = "1"))
	float Radius = 40.f;

	/** How far ahead the ball has to roll, in units. */
	UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "Feeler", meta = (ClampMin = "1"))
	float TravelDistance = 600.f;

	/** Sweeps the ball along the path once and draws it. True when the whole path is clear. */
	UFUNCTION(BlueprintCallable, Category = "Feeler")
	bool Probe();

	/** How far the ball's centre can travel before it touches something, or the whole travel distance when the path is clear. */
	UFUNCTION(BlueprintPure, Category = "Feeler")
	float GetClearDistance() const;

	/** Where the ball's centre would stop. At the end of the path when it is clear. */
	UFUNCTION(BlueprintPure, Category = "Feeler")
	FVector GetStopLocation() const;

	/** The point on the blocking surface that the ball touched. At the end of the path when it is clear. */
	UFUNCTION(BlueprintPure, Category = "Feeler")
	FVector GetImpactPoint() const;

	/** The actor the ball would touch, or nullptr when the path is clear. */
	UFUNCTION(BlueprintPure, Category = "Feeler")
	AActor* GetBlocker() const;

private:
	float ClearDistance = 0.f;

	FVector StopLocation = FVector::ZeroVector;

	FVector ImpactPoint = FVector::ZeroVector;

	TWeakObjectPtr<AActor> Blocker;
};
