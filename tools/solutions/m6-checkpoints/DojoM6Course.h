#pragma once

#include "CoreMinimal.h"
#include "GameFramework/Actor.h"
#include "DojoM6Course.generated.h"

class ADojoM6Checkpoint;

/** Broadcast each time the next gate in order is passed, with how many are passed. */
DECLARE_DYNAMIC_MULTICAST_DELEGATE_OneParam(FDojoM6OnCoursePassed, int32, PassedCount);

/** Broadcast when the last gate is passed. */
DECLARE_DYNAMIC_MULTICAST_DELEGATE(FDojoM6OnCourseFinished);

/** Turns gates reached in any order into a course run in one order, by listening to every gate's event. */
UCLASS()
class ADojoM6Course : public AActor
{
	GENERATED_BODY()

public:
	/** Creates the scene root and turns ticking off. */
	ADojoM6Course();

	/** The gates, in the order they must be passed. */
	UPROPERTY(EditAnywhere, Category = "Course")
	TArray<TObjectPtr<ADojoM6Checkpoint>> Checkpoints;

	/** Fires when the next gate in order is passed. */
	UPROPERTY(BlueprintAssignable, Category = "Course")
	FDojoM6OnCoursePassed OnPassed;

	/** Fires when the last gate is passed. */
	UPROPERTY(BlueprintAssignable, Category = "Course")
	FDojoM6OnCourseFinished OnFinished;

	/** Listens to every gate; safe to call again after gates are added, because each gate is bound only once. */
	UFUNCTION(BlueprintCallable, Category = "Course")
	void BindCheckpoints();

	/** Starts the course again from the first gate. */
	UFUNCTION(BlueprintCallable, Category = "Course")
	void ResetCourse();

	/** Gates passed in order so far. */
	UFUNCTION(BlueprintPure, Category = "Course")
	int32 GetPassedCount() const;

protected:
	/** Listens to the gates set in the editor. */
	virtual void BeginPlay() override;

	/** Stops listening to every gate. */
	virtual void EndPlay(const EEndPlayReason::Type EndPlayReason) override;

private:
	/** Counts the gate if it is the next one in order; any other gate is ignored. */
	UFUNCTION()
	void HandleReached(ADojoM6Checkpoint* Checkpoint, AActor* Racer);

	int32 PassedCount = 0;
};
