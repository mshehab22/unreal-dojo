#pragma once

#include "CoreMinimal.h"
#include "GameFramework/Actor.h"
#include "DojoP3PatrolDrone.generated.h"

class UTextRenderComponent;

/** A drone that patrols back and forth along a corridor, updating itself every frame and remembering its heading between frames (Update Method: the drone owns its per-frame behavior). */
UCLASS()
class ADojoP3PatrolDrone : public AActor
{
	GENERATED_BODY()

public:
	/** Creates the label and turns ticking on. */
	ADojoP3PatrolDrone();

	/** Floating text that shows which way the drone is heading. */
	UPROPERTY(VisibleAnywhere, Category = "Drone")
	TObjectPtr<UTextRenderComponent> Label;

	/** Length of the corridor from where the drone starts, in centimeters. */
	UPROPERTY(EditAnywhere, Category = "Drone", meta = (ClampMin = "1"))
	float PatrolLength = 400.f;

	/** Patrol speed, in centimeters per second. */
	UPROPERTY(EditAnywhere, Category = "Drone", meta = (ClampMin = "0"))
	float Speed = 300.f;

	/** Moves the drone along its patrol for one frame of DeltaSeconds, turning at either end. */
	virtual void Tick(float DeltaSeconds) override;

	/** Distance from the start of the corridor, in centimeters. */
	UFUNCTION(BlueprintPure, Category = "Drone")
	float GetOffset() const;

	/** 1 while heading away from the start, -1 while heading back. */
	UFUNCTION(BlueprintPure, Category = "Drone")
	float GetHeading() const;

protected:
	/** Remembers where the corridor starts. */
	virtual void BeginPlay() override;

private:
	/** Writes the heading into the label. */
	void RefreshLabel();

	FVector StartLocation = FVector::ZeroVector;
	float Offset = 0.f;
	float Heading = 1.f;
};
