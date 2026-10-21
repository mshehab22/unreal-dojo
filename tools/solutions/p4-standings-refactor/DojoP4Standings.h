#pragma once

#include "CoreMinimal.h"
#include "GameFramework/Actor.h"
#include "DojoP4Standings.generated.h"

class UTextRenderComponent;

/** The arena's team standings: each round adds every team's hits, plus a catch-up bonus for any team far behind the leader, decided from the standings as they were when the round began (Double Buffer: read the finished standings, write the next ones, then swap). */
UCLASS()
class ADojoP4Standings : public AActor
{
	GENERATED_BODY()

public:
	/** Creates the label and turns ticking off. */
	ADojoP4Standings();

	/** Floating text that shows every team's score. */
	UPROPERTY(VisibleAnywhere, Category = "Standings")
	TObjectPtr<UTextRenderComponent> Label;

	/** Each team's score, in team order. */
	UPROPERTY(EditAnywhere, Category = "Standings")
	TArray<int32> Scores = { 0, 0, 0 };

	/** Each team's hits in the round being scored, in team order. */
	UPROPERTY(EditAnywhere, Category = "Standings")
	TArray<int32> RoundHits = { 0, 0, 0 };

	/** Points for each hit. */
	UPROPERTY(EditAnywhere, Category = "Standings", meta = (ClampMin = "0"))
	int32 PointsPerHit = 2;

	/** How far behind the round's leader a team must start the round to earn the catch-up bonus. */
	UPROPERTY(EditAnywhere, Category = "Standings", meta = (ClampMin = "1"))
	int32 CatchUpGap = 17;

	/** Bonus points for a team that started the round at least CatchUpGap behind the leader. */
	UPROPERTY(EditAnywhere, Category = "Standings", meta = (ClampMin = "0"))
	int32 CatchUpBonus = 5;

	/** Which way ScoreRound walks the teams; scoring should not depend on it. */
	UPROPERTY(EditAnywhere, Category = "Standings")
	bool bScoreInReverse = false;

	/** Scores the round: every team gets its hits, and teams far behind the leader get the catch-up bonus. */
	UFUNCTION(BlueprintCallable, Category = "Standings")
	void ScoreRound();

	/** One team's score; 0 for a team that does not exist. */
	UFUNCTION(BlueprintPure, Category = "Standings")
	int32 GetScore(int32 Team) const;

protected:
	/** Shows the starting standings. */
	virtual void BeginPlay() override;

private:
	/** The highest score among all teams in the finished standings. */
	int32 HighestScore() const;

	/** Writes every team's score into the label. */
	void RefreshLabel();

	/** The standings being built by the round in progress. */
	TArray<int32> NextScores;
};
