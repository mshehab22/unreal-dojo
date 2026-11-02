#pragma once

#include "CoreMinimal.h"
#include "GameFramework/Actor.h"
#include "DojoM2Bumper.generated.h"

class USphereComponent;

/** A ball that rolls along a heading and bounces off whatever blocks it. */
UCLASS()
class ADojoM2Bumper : public AActor
{
	GENERATED_BODY()

public:
	/** Creates the solid ball as the root and turns ticking on. */
	ADojoM2Bumper();

	/** The solid shape that sweeps through the world. */
	UPROPERTY(VisibleAnywhere, BlueprintReadOnly, Category = "Bumper")
	TObjectPtr<USphereComponent> Ball;

	/** The direction the ball rolls in the world; it changes at every bounce. */
	UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "Bumper")
	FVector Heading = FVector::RightVector;

	/** Units per second. */
	UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "Bumper", meta = (ClampMin = "0"))
	float Speed = 400.f;

	/** How many times the ball has bounced. */
	UFUNCTION(BlueprintPure, Category = "Bumper")
	int32 GetBounces() const;

	/** Rolls by this frame's share of the speed, stopping at a blocker and bouncing off it. */
	virtual void Tick(float DeltaSeconds) override;

protected:
	/** Turns the heading into a direction of length one. */
	virtual void BeginPlay() override;

private:
	int32 Bounces = 0;
};
