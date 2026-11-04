#pragma once

#include "CoreMinimal.h"
#include "GameFramework/Actor.h"
#include "DojoM5Rangefinder.generated.h"

/** A small block that measures the distance to whatever stands first in front of it and draws the line it measured along. */
UCLASS()
class ADojoM5Rangefinder : public AActor
{
	GENERATED_BODY()

public:
	/** Creates a solid box as the root, so the rangefinder has a shape of its own, and an arrow that shows where it looks. */
	ADojoM5Rangefinder();

	/** How far ahead it looks, in units. */
	UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "Rangefinder", meta = (ClampMin = "1"))
	float Reach = 1000.f;

	/** Looks straight ahead once, remembers what it found, and draws the line for one second. */
	UFUNCTION(BlueprintCallable, Category = "Rangefinder")
	void Measure();

	/** True when the last measurement found something in reach. */
	UFUNCTION(BlueprintPure, Category = "Rangefinder")
	bool HasTarget() const;

	/** The distance to what the last measurement found, or the full reach when it found nothing. */
	UFUNCTION(BlueprintPure, Category = "Rangefinder")
	float GetDistance() const;

	/** The actor the last measurement found, or nullptr. */
	UFUNCTION(BlueprintPure, Category = "Rangefinder")
	AActor* GetTargetActor() const;

private:
	bool bHasTarget = false;

	float MeasuredDistance = 0.f;

	TWeakObjectPtr<AActor> TargetActor;
};
