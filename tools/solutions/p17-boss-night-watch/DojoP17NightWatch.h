#pragma once

#include "CoreMinimal.h"
#include "GameFramework/Actor.h"
#include "InputCoreTypes.h"
#include "DojoP17NightWatch.generated.h"

class ADojoP17TowerRig;
class UDojoP17GuardStats;
class UTextRenderComponent;

/** Runs the night watch: a guard on a swaying tower who must stay steady for a round, with the guard rating and the lantern height read every half second but worked out only when something changed. Dirty Flag pattern. */
UCLASS()
class ADojoP17NightWatch : public AActor
{
	GENERATED_BODY()

public:
	/** Creates the label and the guard stats, and turns ticking off. */
	ADojoP17NightWatch();

	/** Shows the round, the guard, the lantern, and the shaky checks, then the result. */
	UPROPERTY(VisibleAnywhere, Category = "Watch")
	TObjectPtr<UTextRenderComponent> Label;

	/** The watchman's guard rating; the earlier quest's component. */
	UPROPERTY(VisibleAnywhere, Category = "Watch")
	TObjectPtr<UDojoP17GuardStats> Guard;

	/** The tower rig; when empty, a rig of Base, Platform, and Lantern is made when play begins. */
	UPROPERTY(EditAnywhere, Category = "Watch")
	TObjectPtr<ADojoP17TowerRig> Rig;

	/** The guard at the start of every round. */
	UPROPERTY(EditAnywhere, Category = "Watch")
	int32 StartingGuard = 30;

	/** The name armour is worn under. */
	UPROPERTY(EditAnywhere, Category = "Watch")
	FName ArmourName = TEXT("Armour");

	/** The guard armour adds. */
	UPROPERTY(EditAnywhere, Category = "Watch")
	int32 ArmourBonus = 15;

	/** The guard a drink of lantern oil adds. */
	UPROPERTY(EditAnywhere, Category = "Watch")
	int32 OilBonus = 10;

	/** How long a drink of oil lasts. */
	UPROPERTY(EditAnywhere, Category = "Watch", meta = (ClampMin = "0.5"))
	float OilSeconds = 12.f;

	/** A check finds the watch steady when the guard is at least this. */
	UPROPERTY(EditAnywhere, Category = "Watch")
	int32 SteadyGuard = 40;

	/** The round is held with at most this many shaky checks. */
	UPROPERTY(EditAnywhere, Category = "Watch", meta = (ClampMin = "0"))
	int32 MostShakyChecks = 3;

	/** Length of a round. */
	UPROPERTY(EditAnywhere, Category = "Watch", meta = (ClampMin = "1.0"))
	float RoundSeconds = 36.f;

	/** Seconds between gusts. */
	UPROPERTY(EditAnywhere, Category = "Watch", meta = (ClampMin = "0.5"))
	float GustInterval = 5.f;

	/** Seconds from the start of a round to the first gust. */
	UPROPERTY(EditAnywhere, Category = "Watch", meta = (ClampMin = "0.5"))
	float FirstGustSeconds = 2.f;

	/** How far a gust pushes the tower's base. */
	UPROPERTY(EditAnywhere, Category = "Watch")
	FVector GustPush = FVector(20.f, 0.f, 0.f);

	/** The joint of the rig whose position the label shows. */
	UPROPERTY(EditAnywhere, Category = "Watch")
	int32 LanternJoint = 2;

	/** B: drinks lantern oil for a while, only while a round runs. */
	UFUNCTION(BlueprintCallable, Category = "Watch")
	void PressOil();

	/** E: puts armour on, or takes it off if it is on, only while a round runs. */
	UFUNCTION(BlueprintCallable, Category = "Watch")
	void PressArmour();

	/** R: starts the next round, only after one has ended. */
	UFUNCTION(BlueprintCallable, Category = "Watch")
	void PressNextRound();

	/** True from the start of a round until its time is up. */
	UFUNCTION(BlueprintPure, Category = "Watch")
	bool IsRunning() const;

	/** The number of the current or last round, from 1. */
	UFUNCTION(BlueprintPure, Category = "Watch")
	int32 GetRoundNumber() const;

	/** Checks this round that found the watch shaky. */
	UFUNCTION(BlueprintPure, Category = "Watch")
	int32 GetShakyChecks() const;

	/** HELD or FELL once a round has ended, and empty before. */
	UFUNCTION(BlueprintPure, Category = "Watch")
	FString GetResult() const;

protected:
	/** Makes the rig if there is none, binds the keys, and starts round 1. */
	virtual void BeginPlay() override;

	/** Clears the timers. */
	virtual void EndPlay(const EEndPlayReason::Type EndPlayReason) override;

private:
	/** Makes a rig of Base, Platform, and Lantern for a watch that was not given one. */
	ADojoP17TowerRig* MakeDefaultRig();

	/** Resets the watchman and the tower, starts the timers, and counts the round. */
	void StartRound();

	/** Stops the timers and works out the result. */
	void EndRound();

	/** Writes the round, the guard, the lantern, and the shaky checks, then the result, on the label. */
	void UpdateLabel();

	/** Once per check: removes drinks that have worn off, reads the guard, and counts a shaky check. */
	void HandleCheck();

	/** A gust pushes the tower's base. */
	void HandleGust();

	/** The round timer ran out. */
	void HandleTimeUp();

	/** B, E, and R from the player. */
	void HandleKey(FKey Key);

	/** The ids of the oil buffs still active, parallel to ActiveBuffExpiry. */
	TArray<int32> ActiveBuffIds;

	/** The world time each active oil buff wears off. */
	TArray<float> ActiveBuffExpiry;

	/** Number of the current or last round. */
	int32 RoundNumber = 0;

	/** Shaky checks this round. */
	int32 ShakyChecks = 0;

	/** True while a round runs. */
	bool bRunning = false;

	/** HELD or FELL, set when a round ends. */
	FString Result;

	/** Where the tower's base stands at the start of every round. */
	FVector BaseStart = FVector::ZeroVector;

	/** Ends the round. */
	FTimerHandle RoundTimer;

	/** Fires the checks. */
	FTimerHandle CheckTimer;

	/** Fires the gusts. */
	FTimerHandle GustTimer;
};
