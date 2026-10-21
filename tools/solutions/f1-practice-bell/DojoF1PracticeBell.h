#pragma once

#include "CoreMinimal.h"
#include "GameFramework/Actor.h"
#include "DojoF1PracticeBell.generated.h"

class UTextRenderComponent;

/** A bell that rings when struck hard enough; a Blueprint child can replace how it reacts. */
UCLASS()
class ADojoF1PracticeBell : public AActor
{
	GENERATED_BODY()

public:
	/** Creates the label and turns ticking off. */
	ADojoF1PracticeBell();

	/** Floating text the default reaction writes to. */
	UPROPERTY(VisibleAnywhere, Category = "Bell")
	TObjectPtr<UTextRenderComponent> Label;

	/** Strikes softer than this do nothing. */
	UPROPERTY(EditAnywhere, BlueprintReadOnly, Category = "Bell", meta = (ClampMin = "0.0"))
	float MinimumForce = 20.f;

	/** A strike this hard or harder rings at full volume. */
	UPROPERTY(EditAnywhere, BlueprintReadOnly, Category = "Bell", meta = (ClampMin = "1.0"))
	float FullVolumeForce = 100.f;

	/** Rings the bell if Force reaches MinimumForce, at a volume from 0 to 1. */
	UFUNCTION(BlueprintCallable, Category = "Bell")
	void Strike(float Force);

	/** Times the bell has rung. */
	UFUNCTION(BlueprintPure, Category = "Bell")
	int32 GetRingCount() const;

	/** Volume of the latest ring, from 0 to 1. */
	UFUNCTION(BlueprintPure, Category = "Bell")
	float GetLastVolume() const;

protected:
	/** The reaction to a ring; Blueprint children may override it. */
	UFUNCTION(BlueprintNativeEvent, Category = "Bell")
	void Ring(float Volume);

	/** Default reaction: shows the volume on the label and logs it. */
	virtual void Ring_Implementation(float Volume);

private:
	int32 RingCount = 0;

	float LastVolume = 0.f;
};
