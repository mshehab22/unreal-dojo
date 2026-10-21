#pragma once

#include "CoreMinimal.h"
#include "GameFramework/Actor.h"
#include "DojoP1BountyBoard.generated.h"

class ADojoP1TrainingFoe;
class UTextRenderComponent;

/** Counts defeats among the foes a designer listed and shows the bounty's progress (Observer: this is a listener). */
UCLASS()
class ADojoP1BountyBoard : public AActor
{
	GENERATED_BODY()

public:
	/** Creates the label and turns ticking off. */
	ADojoP1BountyBoard();

	/** Floating text that shows defeats heard out of defeats needed. */
	UPROPERTY(VisibleAnywhere, Category = "Bounty")
	TObjectPtr<UTextRenderComponent> Label;

	/** The foes this board listens to, picked in the level. */
	UPROPERTY(EditAnywhere, Category = "Bounty")
	TArray<TObjectPtr<ADojoP1TrainingFoe>> Foes;

	/** Defeats that complete the bounty. */
	UPROPERTY(EditAnywhere, BlueprintReadOnly, Category = "Bounty", meta = (ClampMin = "1"))
	int32 DefeatsNeeded = 3;

	/** Defeats this board has heard so far. */
	UFUNCTION(BlueprintPure, Category = "Bounty")
	int32 GetDefeatsHeard() const;

	/** True once DefeatsNeeded defeats have been heard. */
	UFUNCTION(BlueprintPure, Category = "Bounty")
	bool IsBountyDone() const;

protected:
	/** Starts listening to every listed foe and shows the starting count. */
	virtual void BeginPlay() override;

	/** Stops listening to every listed foe, since the foes may outlive the board. */
	virtual void EndPlay(const EEndPlayReason::Type EndPlayReason) override;

private:
	/** Counts one defeat and refreshes the label. */
	void HandleFoeDefeated(ADojoP1TrainingFoe* Foe);

	/** Writes the progress, or BOUNTY DONE, into the label. */
	void RefreshLabel();

	int32 DefeatsHeard = 0;
};
