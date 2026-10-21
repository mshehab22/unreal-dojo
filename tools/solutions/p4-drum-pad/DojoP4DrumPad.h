#pragma once

#include "CoreMinimal.h"
#include "GameFramework/Actor.h"
#include "DojoP4DrumPad.generated.h"

class UTextRenderComponent;

/** A drum pad for the arena's rhythm round: hits may arrive at any moment in a frame, but scoring reads one finished snapshot per frame (Double Buffer: hits collect in the back copy and the frame start swaps it to the front). */
UCLASS()
class ADojoP4DrumPad : public AActor
{
	GENERATED_BODY()

public:
	/** Creates the label and turns ticking on. */
	ADojoP4DrumPad();

	/** Floating text that shows the score. */
	UPROPERTY(VisibleAnywhere, Category = "Drum")
	TObjectPtr<UTextRenderComponent> Label;

	/** How many lanes the pad has. */
	UPROPERTY(EditAnywhere, Category = "Drum", meta = (ClampMin = "1"))
	int32 LaneCount = 4;

	/** Points for each hit scored. */
	UPROPERTY(EditAnywhere, Category = "Drum", meta = (ClampMin = "0"))
	int32 PointsPerHit = 10;

	/** Records one hit on a lane; it counts from the next frame on. Lanes outside the pad are ignored. */
	UFUNCTION(BlueprintCallable, Category = "Drum")
	void Hit(int32 Lane);

	/** Starts a frame: the hits collected since the last frame become this frame's snapshot, and collecting starts again from zero. */
	UFUNCTION(BlueprintCallable, Category = "Drum")
	void BeginFrame();

	/** Hits on a lane in this frame's snapshot; 0 for lanes outside the pad. */
	UFUNCTION(BlueprintPure, Category = "Drum")
	int32 GetHitsThisFrame(int32 Lane) const;

	/** Points scored so far. */
	UFUNCTION(BlueprintPure, Category = "Drum")
	int32 GetScore() const;

	/** Begins the frame, then scores this frame's snapshot. */
	virtual void Tick(float DeltaSeconds) override;

protected:
	/** Sizes both copies to the lane count. */
	virtual void BeginPlay() override;

private:
	/** Adds this frame's hits to the score and shows it. */
	void ScoreFrame();

	/** The finished snapshot that scoring reads this frame. */
	TArray<int32> FrameHits;

	/** Hits arriving now, for the next frame. */
	TArray<int32> IncomingHits;

	int32 Score = 0;
};
