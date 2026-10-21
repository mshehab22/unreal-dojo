#pragma once

#include "CoreMinimal.h"
#include "GameFramework/Actor.h"
#include "DojoP2ReplayGhost.generated.h"

class UTextRenderComponent;

/** A ghost runner that replays a recorded run one fixed step at a time, at any playback speed and any frame rate (Game Loop: a fixed-step playback clock). */
UCLASS()
class ADojoP2ReplayGhost : public AActor
{
	GENERATED_BODY()

public:
	/** Creates the label, fills a sample recording, and turns ticking on. */
	ADojoP2ReplayGhost();

	/** Floating text that shows the step being played, or DONE. */
	UPROPERTY(VisibleAnywhere, Category = "Replay")
	TObjectPtr<UTextRenderComponent> Label;

	/** The recorded run: the runner's speed during each fixed step, in centimeters per second. */
	UPROPERTY(EditAnywhere, Category = "Replay")
	TArray<float> RecordedSpeeds;

	/** Length of one recorded step, in seconds; must match the rate the run was recorded at. */
	UPROPERTY(EditAnywhere, Category = "Replay", meta = (ClampMin = "0.001"))
	float StepSeconds = 1.f / 16.f;

	/** The most steps one Advance may run. */
	UPROPERTY(EditAnywhere, Category = "Replay", meta = (ClampMin = "1"))
	int32 MaxStepsPerAdvance = 4;

	/** Sets how fast the replay plays: 1 is real time, 2 is double speed, 0 pauses. */
	UFUNCTION(BlueprintCallable, Category = "Replay")
	void SetPlaybackRate(float NewRate);

	/** Plays the recording forward by the real time that passed, scaled by the playback rate, in whole recorded steps. */
	UFUNCTION(BlueprintCallable, Category = "Replay")
	void Advance(float DeltaSeconds);

	/** Distance the ghost has covered after the last step, in centimeters. */
	UFUNCTION(BlueprintPure, Category = "Replay")
	float GetDistance() const;

	/** The next recorded step to play; equals the recording's length once finished. */
	UFUNCTION(BlueprintPure, Category = "Replay")
	int32 GetStepIndex() const;

	/** True once every recorded step has been played. */
	UFUNCTION(BlueprintPure, Category = "Replay")
	bool IsFinished() const;

	/** How far the leftover time is toward the next step, from 0 up to but not including 1. */
	UFUNCTION(BlueprintPure, Category = "Replay")
	float GetAlpha() const;

	/** The distance to draw this frame, between the last two steps by the alpha. */
	UFUNCTION(BlueprintPure, Category = "Replay")
	float GetDisplayDistance() const;

	/** Advances the replay and moves the ghost to its display distance from where it started. */
	virtual void Tick(float DeltaSeconds) override;

protected:
	/** Remembers the start location and shows the first step. */
	virtual void BeginPlay() override;

private:
	/** Plays one recorded step. */
	void PlayStep();

	/** Writes the step being played, or DONE, into the label. */
	void RefreshLabel();

	FVector StartLocation = FVector::ZeroVector;
	float PlaybackRate = 1.f;
	float Distance = 0.f;
	float PreviousDistance = 0.f;
	float Lag = 0.f;
	int32 StepIndex = 0;
};
