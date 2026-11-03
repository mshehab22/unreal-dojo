#pragma once

#include "CoreMinimal.h"
#include "GameFramework/Actor.h"
#include "TimerManager.h"
#include "DojoM8AlertMeter.generated.h"

class ADojoM8Searchlight;

/** Broadcast once, when the meter fills. */
DECLARE_DYNAMIC_MULTICAST_DELEGATE(FDojoM8OnCaught);

/** Fills while a searchlight sees its target and drains while it does not; when it fills the target is caught. It listens to the light and counts on a timer, not every frame. */
UCLASS()
class ADojoM8AlertMeter : public AActor
{
	GENERATED_BODY()

public:
	/** Turns ticking off. */
	ADojoM8AlertMeter();

	/** How often the meter updates, in seconds. */
	UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "Alert Meter", meta = (ClampMin = "0.05"))
	float PulseSeconds = 0.25f;

	/** How much time in sight fills the meter. */
	UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "Alert Meter")
	float CaughtAfterSeconds = 2.f;

	/** How much of a second's sight the meter loses each second out of sight. */
	UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "Alert Meter")
	float CalmDownPerSecond = 0.5f;

	/** Fires once, when the level first reaches CaughtAfterSeconds. */
	UPROPERTY(BlueprintAssignable, Category = "Alert Meter")
	FDojoM8OnCaught OnCaught;

	/** Starts listening to the light's sight changes, binding only once however many times it is called. */
	UFUNCTION(BlueprintCallable, Category = "Alert Meter")
	void Watch(ADojoM8Searchlight* Light);

	/** Empties the meter and clears the caught state, ready for another round. */
	UFUNCTION(BlueprintCallable, Category = "Alert Meter")
	void StartOver();

	/** Seconds of sight the meter is holding. */
	UFUNCTION(BlueprintPure, Category = "Alert Meter")
	float GetAlertLevel() const;

	/** True once the meter has filled. */
	UFUNCTION(BlueprintPure, Category = "Alert Meter")
	bool IsCaught() const;

protected:
	/** Starts the repeating pulse. */
	virtual void BeginPlay() override;

private:
	/** Remembers whether the light can see its target right now. */
	UFUNCTION()
	void HandleSightChanged(ADojoM8Searchlight* Light, bool bSeen);

	/** Runs every pulse: fills or drains the meter, and announces the catch once. */
	void Pulse();

	FTimerHandle PulseHandle;

	float AlertLevel = 0.f;

	bool bSeenNow = false;

	bool bCaught = false;
};
