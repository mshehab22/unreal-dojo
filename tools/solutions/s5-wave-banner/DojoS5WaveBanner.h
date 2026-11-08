#pragma once

#include "CoreMinimal.h"
#include "GameFramework/Actor.h"
#include "DojoS5WaveBanner.generated.h"

class ADojoS5WaveDirector;
class UTextRenderComponent;

/** A banner over the pit that rewrites its line from a director's announcements; it only listens, and the director knows nothing about it. */
UCLASS()
class ADojoS5WaveBanner : public AActor
{
	GENERATED_BODY()

public:
	/** Creates the display and turns ticking off; the banner only reacts to events. */
	ADojoS5WaveBanner();

	/** The line of text over the pit. */
	UPROPERTY(VisibleAnywhere, Category = "Banner")
	TObjectPtr<UTextRenderComponent> Display;

	/** Starts following a director's announcements, stops following the one before, and clears the line; null follows nothing. */
	UFUNCTION(BlueprintCallable, Category = "Banner")
	void Watch(ADojoS5WaveDirector* Director);

protected:
	/** Stops following the director when the banner leaves play. */
	virtual void EndPlay(const EEndPlayReason::Type EndPlayReason) override;

private:
	/** Shows which wave began and how many beetles it brings. */
	UFUNCTION()
	void HandleWaveStarted(int32 Wave, int32 BeetleCount);

	/** Shows which wave was cleared. */
	UFUNCTION()
	void HandleWaveCleared(int32 Wave);

	/** Shows which wave comes next and in how many whole seconds. */
	UFUNCTION()
	void HandleRestStarted(int32 NextWave, float Seconds);

	/** Unbinds from the director being followed, if any. */
	void StopWatching();

	/** Replaces the banner's line. */
	void ShowLine(const FString& Line);

	UPROPERTY()
	TObjectPtr<ADojoS5WaveDirector> Watched;
};
