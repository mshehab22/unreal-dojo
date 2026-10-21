#pragma once

#include "CoreMinimal.h"
#include "GameFramework/Actor.h"
#include "DojoP5CoursePlanner.generated.h"

class UTextRenderComponent;

/** What can stand in one slot of the obstacle course. */
UENUM(BlueprintType)
enum class EDojoP5Obstacle : uint8
{
	EO_None UMETA(DisplayName = "Empty"),
	EO_Hurdle UMETA(DisplayName = "Hurdle"),
	EO_Wall UMETA(DisplayName = "Wall"),
	EO_Pit UMETA(DisplayName = "Pit")
};

/** One edit to the course: which slot, what was there, and what the edit put there, so it can be applied again or taken back. */
USTRUCT(BlueprintType)
struct FDojoP5CourseEdit
{
	GENERATED_BODY()

	/** The slot the edit changed. */
	UPROPERTY()
	int32 Slot = 0;

	/** What stood in the slot before the edit. */
	UPROPERTY()
	EDojoP5Obstacle Before = EDojoP5Obstacle::EO_None;

	/** What the edit put in the slot. */
	UPROPERTY()
	EDojoP5Obstacle After = EDojoP5Obstacle::EO_None;
};

/** The player's build-phase planner for their own obstacle run, with undo and redo through a history of edits (Command: each edit is a value that can be redone and taken back). */
UCLASS()
class ADojoP5CoursePlanner : public AActor
{
	GENERATED_BODY()

public:
	/** Creates the label, fills the course with empty slots, and turns ticking off. */
	ADojoP5CoursePlanner();

	/** Floating text that draws the course, one letter per slot. */
	UPROPERTY(VisibleAnywhere, Category = "Course")
	TObjectPtr<UTextRenderComponent> Label;

	/** Puts an obstacle in a slot as one undoable edit. Slots off the course, and edits that change nothing, are ignored. */
	UFUNCTION(BlueprintCallable, Category = "Course")
	void Place(int32 Slot, EDojoP5Obstacle Obstacle);

	/** Empties a slot as one undoable edit. */
	UFUNCTION(BlueprintCallable, Category = "Course")
	void Clear(int32 Slot);

	/** Takes back the most recent edit that has not been taken back; does nothing when there is none. */
	UFUNCTION(BlueprintCallable, Category = "Course")
	void Undo();

	/** Applies again the edit most recently taken back; does nothing when there is none. */
	UFUNCTION(BlueprintCallable, Category = "Course")
	void Redo();

	/** What stands in a slot; empty for slots off the course. */
	UFUNCTION(BlueprintPure, Category = "Course")
	EDojoP5Obstacle GetObstacle(int32 Slot) const;

	/** Edits kept in the history, including ones taken back that can still be redone. */
	UFUNCTION(BlueprintPure, Category = "Course")
	int32 GetHistoryLength() const;

	/** How many edits in the history are currently applied. */
	UFUNCTION(BlueprintPure, Category = "Course")
	int32 GetAppliedCount() const;

	/** Slots on the course. */
	static constexpr int32 SlotCount = 8;

private:
	/** Records a new edit and applies it. */
	void Perform(const FDojoP5CourseEdit& Edit);

	/** Writes the course into the label. */
	void RefreshLabel();

	/** What stands in each slot. */
	UPROPERTY(VisibleInstanceOnly, Category = "Course")
	TArray<EDojoP5Obstacle> Slots;

	/** Every edit made, oldest first; those at AppliedCount and after have been taken back. */
	UPROPERTY(VisibleInstanceOnly, Category = "Course")
	TArray<FDojoP5CourseEdit> History;

	/** How many edits from the front of History are applied. */
	int32 AppliedCount = 0;
};
