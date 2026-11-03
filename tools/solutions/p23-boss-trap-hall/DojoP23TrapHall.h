#pragma once

#include "CoreMinimal.h"
#include "DojoP23HallFighterPlan.h"
#include "DojoP23TrapPlan.h"
#include "GameFramework/Actor.h"
#include "InputCoreTypes.h"
#include "DojoP23TrapHall.generated.h"

class ADojoP7Ballista;
class ADojoP8Fighter;
class ADojoP8TrapBase;
class UTextRenderComponent;

/** Runs a trap hall: it builds a ballista, the traps its plans name, and the fighters, then springs the traps, shows the ballista a target, and orders it to fire on timers, and turns each bolt the ballista reports into a hit on a fighter. It decides no trap's effect and no ballista mode. Subclass Sandbox and State patterns. */
UCLASS()
class ADojoP23TrapHall : public AActor
{
	GENERATED_BODY()

public:
	/** Creates the label and turns ticking off. */
	ADojoP23TrapHall();

	/** Shows the round, the bolts shot, the fighters standing, and after the round the result. */
	UPROPERTY(VisibleAnywhere, Category = "Hall")
	TObjectPtr<UTextRenderComponent> Label;

	/** The traps, built again at the start of every round. */
	UPROPERTY(EditAnywhere, Category = "Hall")
	TArray<FDojoP23TrapPlan> Traps;

	/** The fighters, built again at the start of every round. */
	UPROPERTY(EditAnywhere, Category = "Hall")
	TArray<FDojoP23HallFighterPlan> Roster;

	/** Where the ballista stands, relative to the hall. */
	UPROPERTY(EditAnywhere, Category = "Hall")
	FVector BallistaOffset = FVector(0.f, 0.f, 200.f);

	/** How far from the ballista a fighter can be and still be a target. */
	UPROPERTY(EditAnywhere, Category = "Hall", meta = (ClampMin = "1.0"))
	float BallistaReach = 600.f;

	/** Health a bolt takes from the fighter it hits. */
	UPROPERTY(EditAnywhere, Category = "Hall", meta = (ClampMin = "1.0"))
	float BoltDamage = 25.f;

	/** Seconds a full aim takes, given to the ballista. */
	UPROPERTY(EditAnywhere, Category = "Hall", meta = (ClampMin = "0.1"))
	float AimSeconds = 1.f;

	/** Seconds a reload takes, given to the ballista. */
	UPROPERTY(EditAnywhere, Category = "Hall", meta = (ClampMin = "0.1"))
	float ReloadSeconds = 1.5f;

	/** Length of a round. */
	UPROPERTY(EditAnywhere, Category = "Hall", meta = (ClampMin = "1.0"))
	float RoundSeconds = 12.f;

	/** R: starts the next round, only after one has ended. */
	UFUNCTION(BlueprintCallable, Category = "Hall")
	void PressNextRound();

	/** True from the start of a round until its time is up. */
	UFUNCTION(BlueprintPure, Category = "Hall")
	bool IsRunning() const;

	/** The number of the current or last round, from 1. */
	UFUNCTION(BlueprintPure, Category = "Hall")
	int32 GetRoundNumber() const;

	/** Bolts the ballista has shot this round. */
	UFUNCTION(BlueprintPure, Category = "Hall")
	int32 GetBolts() const;

	/** Fighters that are not down. */
	UFUNCTION(BlueprintPure, Category = "Hall")
	int32 GetStandingCount() const;

	/** CLEARED when every fighter is down at the end of a round, HELD otherwise, and empty before a round has ended. */
	UFUNCTION(BlueprintPure, Category = "Hall")
	FString GetResult() const;

	/** The ballista. */
	UFUNCTION(BlueprintPure, Category = "Hall")
	ADojoP7Ballista* GetBallista() const;

	/** The trap built from plan Index, or nullptr. */
	UFUNCTION(BlueprintPure, Category = "Hall")
	ADojoP8TrapBase* GetTrap(int32 Index) const;

	/** The fighter built from plan Index, or nullptr. */
	UFUNCTION(BlueprintPure, Category = "Hall")
	ADojoP8Fighter* GetFighter(int32 Index) const;

protected:
	/** Binds the key and starts round 1. */
	virtual void BeginPlay() override;

	/** Clears the timers. */
	virtual void EndPlay(const EEndPlayReason::Type EndPlayReason) override;

private:
	/** Removes the last round's actors, builds new ones from the plans, and starts the timers. */
	void StartRound();

	/** Stops the timers and works out the result. */
	void EndRound();

	/** Removes the ballista, the traps, and the fighters. */
	void ClearActors();

	/** Shows the ballista a target when a fighter is in reach and takes it away when none is. */
	void HandleWatch();

	/** Orders the ballista to fire, and turns a bolt it shot into a hit on the nearest fighter in reach. */
	void HandleFire();

	/** Springs every trap once. */
	void HandleTraps();

	/** The round timer ran out. */
	void HandleTimeUp();

	/** R from the player. */
	void HandleKey(FKey Key);

	/** Writes the round, the bolts, the fighters standing, and the result on the label. */
	void UpdateLabel();

	/** The standing fighter nearest the ballista within its reach, the earlier one on a tie, or nullptr. */
	ADojoP8Fighter* NearestFighterInReach() const;

	/** The ballista. */
	UPROPERTY()
	TObjectPtr<ADojoP7Ballista> Ballista;

	/** The traps, in the order of the plans. */
	UPROPERTY()
	TArray<TObjectPtr<ADojoP8TrapBase>> BuiltTraps;

	/** The fighters, in the order of the plans. */
	UPROPERTY()
	TArray<TObjectPtr<ADojoP8Fighter>> BuiltFighters;

	/** Number of the current or last round. */
	int32 RoundNumber = 0;

	/** True while a round runs. */
	bool bRunning = false;

	/** CLEARED or HELD, set when a round ends. */
	FString Result;

	/** Shows the ballista its target. */
	FTimerHandle WatchTimer;

	/** Orders the ballista to fire. */
	FTimerHandle FireTimer;

	/** Springs the traps. */
	FTimerHandle TrapTimer;

	/** Ends the round. */
	FTimerHandle RoundTimer;
};
