#pragma once

#include "CoreMinimal.h"
#include "GameFramework/Actor.h"
#include "DojoP5RefereeDesk.generated.h"

class UTextRenderComponent;

/** One referee correction: which team, and how many points it added. Enough to take back exactly what it did. */
USTRUCT()
struct FDojoP5ScoreAdjustment
{
	GENERATED_BODY()

	/** The team the correction changed. */
	UPROPERTY()
	int32 Team = 0;

	/** The points it added; negative when it removed points. */
	UPROPERTY()
	int32 Points = 0;
};

/** The referees' desk: live play scores goals, and referees can correct a team's score and take the correction back without touching anything else (Command: each correction is a value that knows how to undo itself). */
UCLASS()
class ADojoP5RefereeDesk : public AActor
{
	GENERATED_BODY()

public:
	/** Creates the label and turns ticking off. */
	ADojoP5RefereeDesk();

	/** Floating text that shows both teams' scores. */
	UPROPERTY(VisibleAnywhere, Category = "Referee")
	TObjectPtr<UTextRenderComponent> Label;

	/** Each team's score, in team order. */
	UPROPERTY(VisibleInstanceOnly, Category = "Referee")
	TArray<int32> Scores = { 0, 0 };

	/** Points a goal is worth. */
	UPROPERTY(EditAnywhere, Category = "Referee", meta = (ClampMin = "1"))
	int32 GoalPoints = 3;

	/** Live play: a team scores a goal. Not something a referee can take back. */
	UFUNCTION(BlueprintCallable, Category = "Referee")
	void RecordGoal(int32 Team);

	/** A referee's correction: adds Points (negative to remove) to a team's score; it can be taken back. */
	UFUNCTION(BlueprintCallable, Category = "Referee")
	void AdjustScore(int32 Team, int32 Points);

	/** Takes back the most recent correction that has not been taken back; does nothing when there is none. */
	UFUNCTION(BlueprintCallable, Category = "Referee")
	void UndoAdjustment();

	/** One team's score; 0 for a team that does not exist. */
	UFUNCTION(BlueprintPure, Category = "Referee")
	int32 GetScore(int32 Team) const;

protected:
	/** Shows the starting scores. */
	virtual void BeginPlay() override;

private:
	/** Writes both scores into the label. */
	void RefreshLabel();

	/** Every correction not yet taken back, newest last. */
	UPROPERTY(VisibleInstanceOnly, Category = "Referee")
	TArray<FDojoP5ScoreAdjustment> Adjustments;
};
