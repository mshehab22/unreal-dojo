#pragma once

#include "CoreMinimal.h"
#include "GameFramework/Actor.h"
#include "DojoP1PracticeLever.generated.h"

class ADojoP1PracticeLever;
class UTextRenderComponent;

/** Fired after every pull; carries the lever and its new pull count, so listeners need not read the lever back. */
DECLARE_DYNAMIC_MULTICAST_DELEGATE_TwoParams(FDojoP1OnLeverPulled, ADojoP1PracticeLever*, Lever, int32, PullCount);

/** A lever the player pulls; it announces every pull and never learns who reacts (Observer: the subject). */
UCLASS()
class ADojoP1PracticeLever : public AActor
{
	GENERATED_BODY()

public:
	/** Creates the label and turns ticking off. */
	ADojoP1PracticeLever();

	/** Floating text that shows how many times the lever was pulled. */
	UPROPERTY(VisibleAnywhere, Category = "Lever")
	TObjectPtr<UTextRenderComponent> Label;

	/** Fired after every pull. Blueprint binds to it like an event dispatcher. */
	UPROPERTY(BlueprintAssignable, Category = "Lever")
	FDojoP1OnLeverPulled OnPulled;

	/** Counts one pull, refreshes the label, then announces the pull. */
	UFUNCTION(BlueprintCallable, Category = "Lever")
	void Pull();

	/** Pulls counted so far. */
	UFUNCTION(BlueprintPure, Category = "Lever")
	int32 GetPullCount() const;

protected:
	/** Shows the starting count on the label. */
	virtual void BeginPlay() override;

private:
	/** Writes the pull count into the label. */
	void RefreshLabel();

	int32 PullCount = 0;
};
