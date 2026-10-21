#pragma once

#include "CoreMinimal.h"
#include "GameFramework/Actor.h"
#include "DojoF3LeagueDirector.generated.h"

class ADojoF1PopupTarget;
class ADojoF2TargetRack;
class ADojoF3Announcer;
class ADojoF3Roster;
class ADojoF3ScoreBoard;
class ADojoF3Sentry;

/** Runs a league night: players take timed turns shooting lent targets through the sentry, and each turn's result goes to the board, the roster, and the announcer. */
UCLASS()
class ADojoF3LeagueDirector : public AActor
{
	GENERATED_BODY()

public:
	/** Creates the scene root, the default players, and turns ticking off. */
	ADojoF3LeagueDirector();

	/** Players in turn order. */
	UPROPERTY(EditAnywhere, Category = "League")
	TArray<FName> Players;

	/** Turns each player takes in a league. */
	UPROPERTY(EditAnywhere, Category = "League", meta = (ClampMin = "1"))
	int32 TurnsPerPlayer = 2;

	/** Lends the targets for every turn. */
	UPROPERTY(EditAnywhere, Category = "League")
	TObjectPtr<ADojoF2TargetRack> Rack;

	/** Aims at the nearest raised lent target; Space shoots what it aims at. */
	UPROPERTY(EditAnywhere, Category = "League")
	TObjectPtr<ADojoF3Sentry> Sentry;

	/** Keeps the latest turn scores. */
	UPROPERTY(EditAnywhere, Category = "League")
	TObjectPtr<ADojoF3ScoreBoard> Board;

	/** Keeps each player's best turn. */
	UPROPERTY(EditAnywhere, Category = "League")
	TObjectPtr<ADojoF3Roster> Roster;

	/** Announces every turn and the leader at the end. */
	UPROPERTY(EditAnywhere, Category = "League")
	TObjectPtr<ADojoF3Announcer> Announcer;

	/** Length of a turn. */
	UPROPERTY(EditAnywhere, Category = "League|Timing", meta = (ClampMin = "1.0"))
	float TurnSeconds = 15.f;

	/** Pause between turns while the result is shown. */
	UPROPERTY(EditAnywhere, Category = "League|Timing", meta = (ClampMin = "0.1"))
	float BreakSeconds = 3.f;

	/** Seconds between lends. */
	UPROPERTY(EditAnywhere, Category = "League|Timing", meta = (ClampMin = "0.1"))
	float LendInterval = 2.f;

	/** Seconds an unbroken lent target stays out. */
	UPROPERTY(EditAnywhere, Category = "League|Timing", meta = (ClampMin = "0.1"))
	float LendSeconds = 4.f;

	/** Seconds between checks for targets that have been out too long. */
	UPROPERTY(EditAnywhere, Category = "League|Timing", meta = (ClampMin = "0.01"))
	float CheckInterval = 0.1f;

	/** Points for every hit that counts. */
	UPROPERTY(EditAnywhere, Category = "League", meta = (ClampMin = "0"))
	int32 PointsPerHit = 10;

	/** Clears the board and the roster and starts the first turn. Does nothing while a league runs. */
	UFUNCTION(BlueprintCallable, Category = "League")
	void StartLeague();

	/** Space: hits the target the sentry aims at, during a turn only. */
	UFUNCTION(BlueprintCallable, Category = "League")
	void ShootAimed();

	/** R: starts a new league, only after the last one has ended. */
	UFUNCTION(BlueprintCallable, Category = "League")
	void RestartLeague();

	/** True from StartLeague until the leader is announced. */
	UFUNCTION(BlueprintPure, Category = "League")
	bool IsLeagueRunning() const;

	/** True while a turn is being played, false during breaks and between leagues. */
	UFUNCTION(BlueprintPure, Category = "League")
	bool IsTurnRunning() const;

	/** The player whose turn it is, or was last. */
	UFUNCTION(BlueprintPure, Category = "League")
	FName GetCurrentPlayer() const;

	/** Turns started in this league, counting the current one. */
	UFUNCTION(BlueprintPure, Category = "League")
	int32 GetTurnsStarted() const;

	/** Points in the current or last turn. */
	UFUNCTION(BlueprintPure, Category = "League")
	int32 GetTurnScore() const;

	/** Targets lent out right now. */
	UFUNCTION(BlueprintPure, Category = "League")
	int32 CountLent() const;

protected:
	/** Binds the keys when a player controller exists, then starts the league. */
	virtual void BeginPlay() override;

	/** Clears every timer. */
	virtual void EndPlay(const EEndPlayReason::Type EndPlayReason) override;

private:
	/** Starts the turn for the next player in order. */
	void StartTurn();

	/** Recalls every lent target, records the turn, announces it, and starts the break. */
	void EndTurn();

	/** Starts the next turn, or announces the leader after the last one. */
	void EndBreak();

	/** Lends one target and gives it to the sentry. */
	void LendStep();

	/** Recalls every target that has been out for LendSeconds. */
	void CheckStep();

	/** Recalls one lent target and takes it away from the sentry. */
	void ReturnTarget(ADojoF1PopupTarget* Target);

	/** Routes one pressed key to its league action. */
	void HandleKey(FKey Key);

	/** When each lent target went out, in world seconds. */
	UPROPERTY()
	TMap<TObjectPtr<ADojoF1PopupTarget>, float> LentAt;

	FTimerHandle TurnTimer;

	FTimerHandle BreakTimer;

	FTimerHandle LendTimer;

	FTimerHandle CheckTimer;

	int32 TurnsStarted = 0;

	int32 TurnScore = 0;

	bool bLeagueRunning = false;

	bool bTurnRunning = false;
};
