#pragma once

#include "CoreMinimal.h"
#include "GameFramework/Actor.h"
#include "DojoP2RollingBoulder.generated.h"

class UTextRenderComponent;

/** A boulder trap that is pushed down a corridor and rolls to a stop under drag, simulated in fixed steps so it rolls the same at any frame rate (Game Loop: a fixed-step simulation). */
UCLASS()
class ADojoP2RollingBoulder : public AActor
{
	GENERATED_BODY()

public:
	/** Creates the label and turns ticking on. */
	ADojoP2RollingBoulder();

	/** Floating text that shows the distance rolled. */
	UPROPERTY(VisibleAnywhere, Category = "Boulder")
	TObjectPtr<UTextRenderComponent> Label;

	/** Share of its speed the boulder keeps each step. */
	UPROPERTY(EditAnywhere, Category = "Boulder", meta = (ClampMin = "0", ClampMax = "1"))
	float Drag = 0.98f;

	/** Below this speed, in centimeters per second, the boulder stops. */
	UPROPERTY(EditAnywhere, Category = "Boulder", meta = (ClampMin = "0"))
	float MinSpeed = 5.f;

	/** Speed a push gives the boulder, in centimeters per second. */
	UPROPERTY(EditAnywhere, Category = "Boulder", meta = (ClampMin = "0"))
	float PushSpeed = 600.f;

	/** Length of one simulation step, in seconds; 1/60 keeps the feel the drag was tuned for. */
	UPROPERTY(EditAnywhere, Category = "Boulder", meta = (ClampMin = "0.001"))
	float StepSeconds = 1.f / 60.f;

	/** The most steps one frame may run; a longer hitch is dropped instead of caught up. */
	UPROPERTY(EditAnywhere, Category = "Boulder", meta = (ClampMin = "1"))
	int32 MaxStepsPerTick = 8;

	/** Sets the boulder rolling at PushSpeed. */
	UFUNCTION(BlueprintCallable, Category = "Boulder")
	void Push();

	/** Distance rolled since play started, in centimeters. */
	UFUNCTION(BlueprintPure, Category = "Boulder")
	float GetDistance() const;

	/** True while the boulder still moves. */
	UFUNCTION(BlueprintPure, Category = "Boulder")
	bool IsRolling() const;

	/** Runs the fixed steps this frame owes and moves the boulder along the corridor. */
	virtual void Tick(float DeltaSeconds) override;

protected:
	/** Remembers the start location. */
	virtual void BeginPlay() override;

private:
	/** One fixed step: drag, the stop check, and the roll. */
	void SimulateStep();

	/** Writes the distance rolled into the label. */
	void RefreshLabel();

	FVector StartLocation = FVector::ZeroVector;
	float Speed = 0.f;
	float Distance = 0.f;
	float Lag = 0.f;
};
