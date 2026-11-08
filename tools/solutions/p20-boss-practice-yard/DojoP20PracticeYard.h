#pragma once

#include "CoreMinimal.h"
#include "DojoP20DummyPlan.h"
#include "GameFramework/Actor.h"
#include "InputCoreTypes.h"
#include "Quests/p20-target-rules/DojoP20TargetRule.h"
#include "DojoP20PracticeYard.generated.h"

class ADojoP20Launcher;
class ADojoP20Mover;
class UTextRenderComponent;

/** Runs the practice yard: a launcher fires at the dummies in turn, each dummy walks by its own movement rule, and the launcher's targeting rule can be swapped while a round runs. It names no rule class; the rules come from slots in Details. Strategy pattern. */
UCLASS()
class ADojoP20PracticeYard : public AActor
{
	GENERATED_BODY()

public:
	/** Creates the label and turns ticking off. */
	ADojoP20PracticeYard();

	/** Shows the round, the targeting rule, the hits, the dummies still standing, and after the round the result. */
	UPROPERTY(VisibleAnywhere, Category = "Yard")
	TObjectPtr<UTextRenderComponent> Label;

	/** The dummies, in the order they are listed to the launcher. */
	UPROPERTY(EditAnywhere, Category = "Yard")
	TArray<FDojoP20DummyPlan> Dummies;

	/** The targeting rule classes the T key cycles through; the first is used at the start, and none means the launcher has no rule. */
	UPROPERTY(EditAnywhere, Category = "Yard")
	TArray<TSubclassOf<UDojoP20TargetRule>> RuleClasses;

	/** Length of a round. */
	UPROPERTY(EditAnywhere, Category = "Yard", meta = (ClampMin = "1.0"))
	float RoundSeconds = 29.f;

	/** Seconds between shots; the first shot comes after one interval. */
	UPROPERTY(EditAnywhere, Category = "Yard", meta = (ClampMin = "0.5"))
	float FireInterval = 2.f;

	/** Health a hit takes from a dummy. */
	UPROPERTY(EditAnywhere, Category = "Yard", meta = (ClampMin = "1"))
	int32 HitDamage = 10;

	/** T: replaces the launcher's rule with a new object of the next rule class in the list, at any time. */
	UFUNCTION(BlueprintCallable, Category = "Yard")
	void PressCycleRule();

	/** R: starts the next round, only after one has ended. */
	UFUNCTION(BlueprintCallable, Category = "Yard")
	void PressNextRound();

	/** True from the start of a round until its time is up. */
	UFUNCTION(BlueprintPure, Category = "Yard")
	bool IsRunning() const;

	/** The number of the current or last round, from 1. */
	UFUNCTION(BlueprintPure, Category = "Yard")
	int32 GetRoundNumber() const;

	/** Shots this round that hit a dummy. */
	UFUNCTION(BlueprintPure, Category = "Yard")
	int32 GetHits() const;

	/** Dummies with health left. */
	UFUNCTION(BlueprintPure, Category = "Yard")
	int32 GetStandingCount() const;

	/** CLEARED when every dummy is down at the end of a round, ESCAPED otherwise, and empty before a round has ended. */
	UFUNCTION(BlueprintPure, Category = "Yard")
	FString GetResult() const;

	/** The target of each shot this round, in order, with NAME_None for a shot at nothing. */
	const TArray<FName>& GetShotLog() const;

	/** The mover of dummy Index, or nullptr. */
	UFUNCTION(BlueprintPure, Category = "Yard")
	ADojoP20Mover* GetMover(int32 Index) const;

	/** The launcher. */
	UFUNCTION(BlueprintPure, Category = "Yard")
	ADojoP20Launcher* GetLauncher() const;

protected:
	/** Makes the launcher and the movers, gives the launcher its first rule, binds the keys, and starts round 1. */
	virtual void BeginPlay() override;

	/** Clears the timers. */
	virtual void EndPlay(const EEndPlayReason::Type EndPlayReason) override;

private:
	/** Puts every dummy back, clears the log and the hits, and starts the three timers. */
	void StartRound();

	/** Stops the timers and works out the result. */
	void EndRound();

	/** Gives the launcher a new rule object of the class at RuleIndex, or no rule when there are no classes. */
	void ApplyRuleClass();

	/** Writes the round, the rule, the hits, the standing dummies, and the result on the label. */
	void UpdateLabel();

	/** Every mover takes one step. */
	void HandleStep();

	/** The launcher takes one shot and the dummy it picked loses health. */
	void HandleFire();

	/** The round timer ran out. */
	void HandleTimeUp();

	/** T and R from the player. */
	void HandleKey(FKey Key);

	/** The launcher. */
	UPROPERTY()
	TObjectPtr<ADojoP20Launcher> Launcher;

	/** One mover for each dummy, in the order of Dummies. */
	UPROPERTY()
	TArray<TObjectPtr<ADojoP20Mover>> Movers;

	/** The health each dummy has left, in the order of Dummies. */
	TArray<int32> Health;

	/** The target of each shot this round. */
	TArray<FName> ShotLog;

	/** Which rule class is in use. */
	int32 RuleIndex = 0;

	/** Number of the current or last round. */
	int32 RoundNumber = 0;

	/** Hits this round. */
	int32 Hits = 0;

	/** True while a round runs. */
	bool bRunning = false;

	/** CLEARED or ESCAPED, set when a round ends. */
	FString Result;

	/** Ends the round. */
	FTimerHandle RoundTimer;

	/** Moves the dummies. */
	FTimerHandle StepTimer;

	/** Fires the launcher. */
	FTimerHandle FireTimer;
};
