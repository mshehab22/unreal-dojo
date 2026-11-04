#pragma once

#include "CoreMinimal.h"
#include "GameFramework/Actor.h"
#include "DojoP14StartLights.generated.h"

/** A track's start lights. One set runs in each world; a second set placed in the same world by mistake hides itself and never counts down. */
UCLASS()
class ADojoP14StartLights : public AActor
{
	GENERATED_BODY()

public:
	/** Creates the scene root and lets the lights tick. */
	ADojoP14StartLights();

	/** How long the lights stay red after a countdown begins. */
	UPROPERTY(EditAnywhere, Category = "Lights", meta = (ClampMin = "0.0"))
	float CountdownSeconds = 3.f;

	/** Turns the lights red and starts the countdown from the beginning; false, doing nothing, on lights that do not run. */
	UFUNCTION(BlueprintCallable, Category = "Lights")
	bool BeginCountdown();

	/** True once a countdown has run its full time. */
	UFUNCTION(BlueprintPure, Category = "Lights")
	bool IsGreen() const;

	/** True for the one set of lights that runs in its world. */
	UFUNCTION(BlueprintPure, Category = "Lights")
	bool IsRunning() const;

	/** True for lights that found another set already running in their world when they began play. */
	UFUNCTION(BlueprintPure, Category = "Lights")
	bool IsDuplicate() const;

	/** Counts a running countdown down. */
	virtual void Tick(float DeltaSeconds) override;

protected:
	/** Runs, or stands down as a hidden duplicate when another set already runs in this world. */
	virtual void BeginPlay() override;

	/** Stops running, so a set that begins play later in this world can run. */
	virtual void EndPlay(const EEndPlayReason::Type EndPlayReason) override;

private:
	/** True for the one set that runs in its world. */
	bool bRunning = false;

	/** True when another set already ran in this world at BeginPlay. */
	bool bDuplicate = false;

	/** True while the lights are red and counting. */
	bool bCounting = false;

	/** True once a countdown has finished. */
	bool bGreen = false;

	/** Seconds the current countdown has run. */
	float CountedSeconds = 0.f;
};
