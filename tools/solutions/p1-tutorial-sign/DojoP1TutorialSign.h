#pragma once

#include "CoreMinimal.h"
#include "GameFramework/Actor.h"
#include "DojoP1TutorialSign.generated.h"

class ADojoP1PracticeLever;
class UTextRenderComponent;

/** A tutorial prompt that watches a lever, praises the player after enough pulls, then stops listening (Observer: a listener). */
UCLASS()
class ADojoP1TutorialSign : public AActor
{
	GENERATED_BODY()

public:
	/** Creates the label and turns ticking off. */
	ADojoP1TutorialSign();

	/** Floating text with the instruction, then the praise. */
	UPROPERTY(VisibleAnywhere, Category = "Tutorial")
	TObjectPtr<UTextRenderComponent> Label;

	/** The lever this sign watches from the start of play, picked in the level. May be empty. */
	UPROPERTY(EditAnywhere, Category = "Tutorial")
	TObjectPtr<ADojoP1PracticeLever> Lever;

	/** Pulls that finish this tutorial step. */
	UPROPERTY(EditAnywhere, BlueprintReadOnly, Category = "Tutorial", meta = (ClampMin = "1"))
	int32 PullsToFinish = 2;

	/** Starts listening to a lever's pulls; the level Blueprint may call it as well as BeginPlay. */
	UFUNCTION(BlueprintCallable, Category = "Tutorial")
	void Watch(ADojoP1PracticeLever* LeverToWatch);

	/** Pulls this sign has heard so far. */
	UFUNCTION(BlueprintPure, Category = "Tutorial")
	int32 GetPullsHeard() const;

	/** True once PullsToFinish pulls have been heard. */
	UFUNCTION(BlueprintPure, Category = "Tutorial")
	bool IsFinished() const;

protected:
	/** Watches the lever picked in the level, if any, and shows the instruction. */
	virtual void BeginPlay() override;

	/** Stops listening, since the lever may outlive the sign. */
	virtual void EndPlay(const EEndPlayReason::Type EndPlayReason) override;

private:
	/** Counts one pull, refreshes the label, and stops listening once the step is finished. A UFUNCTION, because the delegate binds by name. */
	UFUNCTION()
	void HandleLeverPulled(ADojoP1PracticeLever* PulledLever, int32 PullCount);

	/** Removes this sign's binding from the watched lever, if there is one. */
	void StopWatching();

	/** Writes the pulls left, or the praise, into the label. */
	void RefreshLabel();

	/** The lever this sign is bound to right now. */
	UPROPERTY(Transient)
	TObjectPtr<ADojoP1PracticeLever> WatchedLever;

	int32 PullsHeard = 0;
};
