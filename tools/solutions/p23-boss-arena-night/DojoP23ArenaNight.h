#pragma once

#include "CoreMinimal.h"
#include "DojoP23Announcement.h"
#include "DojoP23Announcement.h"
#include "DojoP23FighterPlan.h"
#include "DojoP23ScriptedStrike.h"
#include "GameFramework/Actor.h"
#include "InputCoreTypes.h"
#include "Quests/p6-knockout-herald/DojoP6ArenaHerald.h"
#include "DojoP23ArenaNight.generated.h"

class ADojoP6Fighter;
class UTextRenderComponent;

/** Runs an arena night: it builds the fighters from parts, plays out a script of blows one turn at a time, and keeps the score, the loot, and the log from what the parts and the herald tell it. It works out no damage, no loot, and no announcement itself. Component, Observer, and Event Queue patterns. */
UCLASS()
class ADojoP23ArenaNight : public AActor
{
	GENERATED_BODY()

public:
	/** Creates the label and turns ticking off. */
	ADojoP23ArenaNight();

	/** Shows the night, each team's knockouts, the fighters standing, and after the night the result. */
	UPROPERTY(VisibleAnywhere, Category = "Night")
	TObjectPtr<UTextRenderComponent> Label;

	/** The fighters, built again at the start of every night. */
	UPROPERTY(EditAnywhere, Category = "Night")
	TArray<FDojoP23FighterPlan> Roster;

	/** The blows of the night; each lands on its turn. */
	UPROPERTY(EditAnywhere, Category = "Night")
	TArray<FDojoP23ScriptedStrike> Script;

	/** Seconds between turns; the first turn comes after one. */
	UPROPERTY(EditAnywhere, Category = "Night", meta = (ClampMin = "0.5"))
	float TurnSeconds = 1.f;

	/** How many turns a night has. */
	UPROPERTY(EditAnywhere, Category = "Night", meta = (ClampMin = "1"))
	int32 TurnCount = 6;

	/** R: starts the next night, only after one has ended. */
	UFUNCTION(BlueprintCallable, Category = "Night")
	void PressNextRound();

	/** True from the start of a night until its time is up. */
	UFUNCTION(BlueprintPure, Category = "Night")
	bool IsRunning() const;

	/** The number of the current or last night, from 1. */
	UFUNCTION(BlueprintPure, Category = "Night")
	int32 GetRoundNumber() const;

	/** Fighters that are still in the arena. */
	UFUNCTION(BlueprintPure, Category = "Night")
	int32 GetStandingCount() const;

	/** Knockouts credited to a team this night, counted when the herald announced them. */
	UFUNCTION(BlueprintPure, Category = "Night")
	int32 GetKnockoutsFor(int32 Team) const;

	/** How many of an item have dropped this night. */
	UFUNCTION(BlueprintPure, Category = "Night")
	int32 GetPurse(FName Item) const;

	/** TEAM 1 WINS, TEAM 2 WINS, or DRAW once the night is over, and empty before. */
	UFUNCTION(BlueprintPure, Category = "Night")
	FString GetResult() const;

	/** Every knockout the herald announced this night, in the order announced. */
	const TArray<FDojoP23Announcement>& GetAnnouncements() const;

	/** The herald that hears the fighters. */
	UFUNCTION(BlueprintPure, Category = "Night")
	ADojoP6ArenaHerald* GetHerald() const;

	/** The fighter with this name if it is still in the arena, or nullptr. */
	UFUNCTION(BlueprintPure, Category = "Night")
	ADojoP6Fighter* GetFighter(FName FighterName) const;

protected:
	/** Makes the herald, listens to it, binds the key, and starts night 1. */
	virtual void BeginPlay() override;

	/** Clears the timers. */
	virtual void EndPlay(const EEndPlayReason::Type EndPlayReason) override;

private:
	/** Clears the last night, builds the fighters from the roster, and starts the turn and night timers. */
	void StartRound();

	/** Stops the timers and works out the result. */
	void EndRound();

	/** Removes every fighter and forgets the last night's score, loot, and log. */
	void ClearArena();

	/** Builds one fighter from its plan: a fighter actor with a health part and a loot part that listens to it. */
	void BuildFighter(const FDojoP23FighterPlan& Plan);

	/** Plays every blow of the script that lands on the next turn. */
	void HandleTurn();

	/** Lands one blow, unless the striker or the target is already out, and sends the target out of the arena if the blow was the last of its health. */
	void ApplyStrike(const FDojoP23ScriptedStrike& Strike);

	/** Credits a knockout to the winner's team and logs it. */
	void HandleAnnounced(const FDojoP6KnockoutEvent& Event);

	/** Adds dropped loot to the night's purse. */
	UFUNCTION()
	void HandleLootDropped(FName Item, int32 Count);

	/** The night timer ran out. */
	void HandleTimeUp();

	/** R from the player. */
	void HandleKey(FKey Key);

	/** Writes the night, the knockouts, the fighters standing, and the result on the label. */
	void UpdateLabel();

	/** The team of a fighter of this night's roster, or 0 for a name that is not on it. */
	int32 TeamOf(FName FighterName) const;

	/** The herald every fighter posts to. */
	UPROPERTY()
	TObjectPtr<ADojoP6ArenaHerald> Herald;

	/** The fighters in the arena, by name. */
	UPROPERTY()
	TMap<FName, TObjectPtr<ADojoP6Fighter>> Fighters;

	/** The roster as it was when the night began. */
	TArray<FDojoP23FighterPlan> NightRoster;

	/** Knockouts credited to each team. */
	TMap<int32, int32> Knockouts;

	/** Loot dropped this night, by item. */
	TMap<FName, int32> Purse;

	/** Knockouts the herald announced, in order. */
	TArray<FDojoP23Announcement> Announcements;

	/** The turn that has been played, from 0. */
	int32 TurnIndex = 0;

	/** Number of the current or last night. */
	int32 RoundNumber = 0;

	/** True while a night runs. */
	bool bRunning = false;

	/** TEAM 1 WINS, TEAM 2 WINS, or DRAW, set when a night ends. */
	FString Result;

	/** Plays a turn. */
	FTimerHandle TurnTimer;

	/** Ends the night. */
	FTimerHandle RoundTimer;
};
