#pragma once

#include "CoreMinimal.h"
#include "GameFramework/Actor.h"
#include "InputCoreTypes.h"
#include "Quests/p13-door-conditions/DojoP13CheckStep.h"
#include "Quests/p13-potion-recipes/DojoP13Instruction.h"
#include "Quests/p13-potion-recipes/DojoP13Stats.h"
#include "DojoP13VaultMaster.generated.h"

class UTextRenderComponent;

/** Which kind of station a mod entry builds. */
UENUM(BlueprintType)
enum class EDojoP13StationKind : uint8
{
	Potion,
	Door
};

/** One station of a vault mod: a potion with its recipe or a door with its condition, at a spot. */
USTRUCT(BlueprintType)
struct FDojoP13ModEntry
{
	GENERATED_BODY()

	/** The station's name, for the designer. */
	UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "Mod")
	FString Name = TEXT("Purse");

	/** Whether this entry builds a potion or a door. */
	UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "Mod")
	EDojoP13StationKind Kind = EDojoP13StationKind::Potion;

	/** Where the station stands. */
	UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "Mod")
	FVector Spot = FVector::ZeroVector;

	/** A potion's recipe. */
	UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "Mod", meta = (EditCondition = "Kind == EDojoP13StationKind::Potion", EditConditionHides))
	TArray<FDojoP13Instruction> Recipe;

	/** A door's condition. */
	UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "Mod", meta = (EditCondition = "Kind == EDojoP13StationKind::Door", EditConditionHides))
	TArray<FDojoP13CheckStep> Condition;
};

/** Runs the modded vault: builds potions and doors from a mod list, lets the champion use the nearest one with their stats, and starts clean rounds. Owns no rules of its own about what a script does. Bytecode pattern. */
UCLASS()
class ADojoP13VaultMaster : public AActor
{
	GENERATED_BODY()

public:
	/** Creates the label, sets the starting stats, and turns ticking off. */
	ADojoP13VaultMaster();

	/** Shows the round's progress, then WIN or TIME UP. */
	UPROPERTY(VisibleAnywhere, Category = "Vault")
	TObjectPtr<UTextRenderComponent> Label;

	/** The stations each round builds, in order. */
	UPROPERTY(EditAnywhere, Category = "Vault")
	TArray<FDojoP13ModEntry> Mod;

	/** The actor that walks the vault; when empty, the first player's pawn. */
	UPROPERTY(EditAnywhere, Category = "Vault")
	TObjectPtr<AActor> Champion;

	/** The champion's stats at the start of every round. */
	UPROPERTY(EditAnywhere, Category = "Vault")
	FDojoP13Stats StartingStats;

	/** A station this close to the champion can be used. */
	UPROPERTY(EditAnywhere, Category = "Vault", meta = (ClampMin = "0.0"))
	float UseRange = 150.f;

	/** Length of a round. */
	UPROPERTY(EditAnywhere, Category = "Vault", meta = (ClampMin = "1.0"))
	float RoundSeconds = 60.f;

	/** E: uses the nearest unused station in range, the earlier entry on a tie: drinks a potion, or tries a door. */
	UFUNCTION(BlueprintCallable, Category = "Vault")
	void PressUse();

	/** R: starts the next round, only after one has ended. */
	UFUNCTION(BlueprintCallable, Category = "Vault")
	void RestartRound();

	/** True from the start of a round until every door is open or time runs out. */
	UFUNCTION(BlueprintPure, Category = "Vault")
	bool IsRunning() const;

	/** This round's stations, in mod order. */
	UFUNCTION(BlueprintPure, Category = "Vault")
	TArray<AActor*> GetStations() const;

	/** The champion's stats now. */
	UFUNCTION(BlueprintPure, Category = "Vault")
	FDojoP13Stats GetChampionStats() const;

	/** Doors this round. */
	UFUNCTION(BlueprintPure, Category = "Vault")
	int32 GetDoorCount() const;

	/** Doors opened this round. */
	UFUNCTION(BlueprintPure, Category = "Vault")
	int32 GetOpenDoorCount() const;

	/** Potions this round whose recipe was broken. */
	UFUNCTION(BlueprintPure, Category = "Vault")
	int32 GetFizzleCount() const;

	/** Seconds the last won round took, or 0. */
	UFUNCTION(BlueprintPure, Category = "Vault")
	float GetWinSeconds() const;

protected:
	/** Finds the champion, binds the keys, and starts round 1. */
	virtual void BeginPlay() override;

	/** Clears the round timer. */
	virtual void EndPlay(const EEndPlayReason::Type EndPlayReason) override;

private:
	/** Removes the last round's stations, resets the stats and counts, builds fresh stations, and starts the clock. */
	void StartRound();

	/** Ends the round as won or timed out. */
	void EndRound(bool bWon);

	/** Spawns the station Entry describes and hands it its script. */
	AActor* BuildStation(const FDojoP13ModEntry& Entry);

	/** Destroys every station. */
	void ClearStations();

	/** Writes the counts and stats, or the result, on the label. */
	void UpdateLabel();

	/** Round timer ran out. */
	void HandleTimeUp();

	/** E and R from the player. */
	void HandleKey(FKey Key);

	/** This round's stations, in mod order. */
	UPROPERTY()
	TArray<TObjectPtr<AActor>> Stations;

	/** Whether each station has been used this round: a potion drunk, a door opened. */
	TArray<bool> Used;

	/** The champion's stats now. */
	FDojoP13Stats ChampionStats;

	/** Doors this round. */
	int32 DoorCount = 0;

	/** Doors opened this round. */
	int32 OpenDoorCount = 0;

	/** Broken potions drunk this round. */
	int32 FizzleCount = 0;

	/** True while a round runs. */
	bool bRunning = false;

	/** World time when the round started. */
	float RoundStartSeconds = 0.f;

	/** Seconds the last won round took. */
	float WinSeconds = 0.f;

	/** Ends the round as TIME UP. */
	FTimerHandle RoundTimer;
};
