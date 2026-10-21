#pragma once

#include "CoreMinimal.h"
#include "GameFramework/Actor.h"
#include "DojoP3CryptSweeper.generated.h"

class UTextRenderComponent;

/** A sweeping blade that turns steadily around its post, updating itself every frame (Update Method: each object owns its per-frame behavior). */
UCLASS()
class ADojoP3CryptSweeper : public AActor
{
	GENERATED_BODY()

public:
	/** Creates the label and turns ticking on. */
	ADojoP3CryptSweeper();

	/** Floating text that is turned with the blade. */
	UPROPERTY(VisibleAnywhere, Category = "Sweeper")
	TObjectPtr<UTextRenderComponent> Label;

	/** Turn rate, in degrees per second. */
	UPROPERTY(EditAnywhere, Category = "Sweeper")
	float DegreesPerSecond = 90.f;

	/** Turns the blade by one frame's worth. */
	virtual void Tick(float DeltaSeconds) override;

	/** Sets the blade's angle and turns the actor to it. */
	void SetAngle(float NewAngle);

	/** The blade's angle, from 0 up to 360 degrees. */
	UFUNCTION(BlueprintPure, Category = "Sweeper")
	float GetAngle() const;

private:
	float Angle = 0.f;
};
