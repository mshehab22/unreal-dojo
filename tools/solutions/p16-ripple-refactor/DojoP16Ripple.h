#pragma once

#include "CoreMinimal.h"
#include "GameFramework/Actor.h"
#include "DojoP16Ripple.generated.h"

/** A ring on the water where a burst's sparks came down. Shown, it counts its own time and then fades out of play, waiting to be shown again. It knows nothing about the water. */
UCLASS()
class ADojoP16Ripple : public AActor
{
	GENERATED_BODY()

public:
	/** Creates the scene root; the ripple can tick but starts with ticking off. */
	ADojoP16Ripple();

	/** Shows the ripple at Where for Seconds from now, whatever it was doing before. */
	void Show(const FVector& Where, float Seconds);

	/** True from Show until the ripple's time is up. */
	bool IsShowing() const;

	/** Counts the ripple's time down and fades it when the time is up. */
	virtual void Tick(float DeltaSeconds) override;

private:
	/** Takes the ripple out of play: hidden and not ticking. */
	void Fade();

	/** Seconds left before the ripple fades. */
	float SecondsLeft = 0.f;

	/** True from Show until the ripple fades. */
	bool bShowing = false;
};
