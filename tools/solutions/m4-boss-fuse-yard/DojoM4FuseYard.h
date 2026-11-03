#pragma once

#include "CoreMinimal.h"
#include "GameFramework/Actor.h"
#include "TimerManager.h"
#include "DojoM4FuseYard.generated.h"

class ADojoM2Wall;
class ADojoM3Plate;
class ADojoM3Runner;
class ADojoM4Bomb;
class ADojoM4Chain;
class ADojoM4Scatter;
class UTextRenderComponent;

/** Runs the fuse yard: scatters bombs around two pillars each round, lights the nearest one when the runner steps on the plate, lets the chain spread, and calls the result when the last fuse is out. */
UCLASS()
class ADojoM4FuseYard : public AActor
{
	GENERATED_BODY()

public:
	/** Creates the root and the board; the yard never ticks. */
	ADojoM4FuseYard();

	/** Floating text: ARMED, BURNING, or the chain's result. */
	UPROPERTY(VisibleAnywhere, Category = "Fuse Yard")
	TObjectPtr<UTextRenderComponent> Board;

	/** The runner whose step on the plate sets the yard off, set in Details. */
	UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "Fuse Yard")
	TObjectPtr<ADojoM3Runner> Runner;

	/** The scatter seed; the same seed lays out the same yard every round. */
	UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "Fuse Yard")
	int32 Seed = 5;

	/** How many points the scatter tries. */
	UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "Fuse Yard", meta = (ClampMin = "1"))
	int32 BombCount = 14;

	/** How far a blast reaches, in units. */
	UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "Fuse Yard", meta = (ClampMin = "0"))
	float Reach = 350.f;

	/** The fuse a blast lights its neighbors with, in seconds. */
	UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "Fuse Yard", meta = (ClampMin = "0.05"))
	float SparkDelay = 0.4f;

	/** The fuse of the first bomb the plate lights, in seconds. */
	UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "Fuse Yard", meta = (ClampMin = "0.1"))
	float FirstFuse = 1.f;

	/** The R key: lays out a fresh yard, only once the last chain has ended; false before that. */
	UFUNCTION(BlueprintCallable, Category = "Fuse Yard")
	bool PressRestart();

	/** True from the plate's first step until the last fuse is out. */
	UFUNCTION(BlueprintPure, Category = "Fuse Yard")
	bool IsBurning() const;

	/** True once this round's chain has ended. */
	UFUNCTION(BlueprintPure, Category = "Fuse Yard")
	bool IsOver() const;

	/** Bombs blown this round. */
	UFUNCTION(BlueprintPure, Category = "Fuse Yard")
	int32 GetBlown() const;

	/** Bombs laid out this round. */
	UFUNCTION(BlueprintPure, Category = "Fuse Yard")
	int32 GetPlaced() const;

	/** This round's plate. */
	UFUNCTION(BlueprintPure, Category = "Fuse Yard")
	ADojoM3Plate* GetPlate() const;

	/** This round's bombs still in play. */
	UFUNCTION(BlueprintPure, Category = "Fuse Yard")
	TArray<ADojoM4Bomb*> GetBombs() const;

protected:
	/** Lays out the first yard. */
	virtual void BeginPlay() override;

	/** Stops the end check. */
	virtual void EndPlay(const EEndPlayReason::Type EndPlayReason) override;

private:
	/** Clears the last round and lays out the plate, the pillars, the bombs, and the chain. */
	void StartRound();

	/** Destroys everything the yard laid out. */
	void ClearYard();

	/** Lights the bomb nearest the plate when the runner steps on it in an armed round. */
	UFUNCTION()
	void HandlePlateBeginOverlap(UPrimitiveComponent* OverlappedComponent, AActor* OtherActor, UPrimitiveComponent* OtherComp, int32 OtherBodyIndex, bool bFromSweep, const FHitResult& SweepResult);

	/** Counts a blown bomb and checks for the end on the next frame, after every listener has heard it. */
	UFUNCTION()
	void HandleBombDestroyed(AActor* DestroyedActor);

	/** Ends the round once no bomb is still burning. */
	void CheckForEnd();

	/** Writes the board for the current state. */
	void RefreshBoard();

	UPROPERTY()
	TObjectPtr<ADojoM3Plate> Plate;

	UPROPERTY()
	TObjectPtr<ADojoM4Scatter> Scatter;

	UPROPERTY()
	TObjectPtr<ADojoM4Chain> Chain;

	UPROPERTY()
	TArray<TObjectPtr<ADojoM2Wall>> Pillars;

	UPROPERTY()
	TArray<TObjectPtr<ADojoM4Bomb>> Bombs;

	FTimerHandle EndCheckTimer;

	int32 Placed = 0;

	int32 Blown = 0;

	bool bBurning = false;

	bool bOver = false;
};
