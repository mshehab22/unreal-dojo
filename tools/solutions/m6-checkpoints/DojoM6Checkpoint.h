#pragma once

#include "CoreMinimal.h"
#include "GameFramework/Actor.h"
#include "DojoM6Checkpoint.generated.h"

class ADojoM6Checkpoint;
class UTextRenderComponent;

/** Broadcast when something reaches a checkpoint. */
DECLARE_DYNAMIC_MULTICAST_DELEGATE_TwoParams(FDojoM6OnCheckpointReached, ADojoM6Checkpoint*, Checkpoint, AActor*, Racer);

/** A gate that announces whoever reaches it; it does not know about courses, order, or quests. */
UCLASS()
class ADojoM6Checkpoint : public AActor
{
	GENERATED_BODY()

public:
	/** Creates the label and turns ticking off. */
	ADojoM6Checkpoint();

	/** Floating text over the gate. */
	UPROPERTY(VisibleAnywhere, Category = "Checkpoint")
	TObjectPtr<UTextRenderComponent> Label;

	/** Fires every time something reaches the gate. */
	UPROPERTY(BlueprintAssignable, Category = "Checkpoint")
	FDojoM6OnCheckpointReached OnReached;

	/** Announces that Racer reached the gate; an overlap or a distance check calls it. */
	UFUNCTION(BlueprintCallable, Category = "Checkpoint")
	void Touch(AActor* Racer);
};
