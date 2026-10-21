#pragma once

#include "CoreMinimal.h"
#include "GameFramework/Actor.h"
#include "DojoF3Sentry.generated.h"

class ADojoF1PopupTarget;
class UTextRenderComponent;

/** Turns on the spot to face the nearest raised pop-up target within range; this boss version adds AddTarget and RemoveTarget. */
UCLASS()
class ADojoF3Sentry : public AActor
{
	GENERATED_BODY()

public:
	/** Creates the label and turns ticking off. */
	ADojoF3Sentry();

	/** Floating text that turns with the sentry and names its target. */
	UPROPERTY(VisibleAnywhere, Category = "Sentry")
	TObjectPtr<UTextRenderComponent> Label;

	/** The targets the sentry may aim at. */
	UPROPERTY(EditAnywhere, Category = "Sentry")
	TArray<TObjectPtr<ADojoF1PopupTarget>> Targets;

	/** Targets farther than this are ignored. */
	UPROPERTY(EditAnywhere, BlueprintReadOnly, Category = "Sentry", meta = (ClampMin = "0.0"))
	float MaxRange = 2000.f;

	/** Faces the nearest raised target in range, turning only around the vertical axis, and returns it; returns nullptr and keeps facing the same way when there is none. */
	UFUNCTION(BlueprintCallable, Category = "Sentry")
	ADojoF1PopupTarget* AimAtNearestRaised();

	/** Yaw in degrees, from -180 to 180, that faces from the sentry toward Target in the horizontal plane. */
	UFUNCTION(BlueprintPure, Category = "Sentry")
	float GetYawTo(const AActor* Target) const;

	/** Boss addition: lets the sentry aim at Target, once, from C++ or Blueprint. */
	UFUNCTION(BlueprintCallable, Category = "Sentry")
	void AddTarget(ADojoF1PopupTarget* Target);

	/** Boss addition: stops the sentry aiming at Target. */
	UFUNCTION(BlueprintCallable, Category = "Sentry")
	void RemoveTarget(ADojoF1PopupTarget* Target);

private:
	/** Shows AIM and the target's name, or IDLE. */
	void ShowAim(const AActor* Target);
};
