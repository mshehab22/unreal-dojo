#pragma once

#include "CoreMinimal.h"
#include "GameFramework/Actor.h"
#include "DojoS6ShiftDirector.generated.h"

class ADojoS6Guard;
class ADojoS6GuardController;
class APawn;
class UDojoS6SenseMemoryComponent;
class UPrimitiveComponent;
class USphereComponent;
class UTextRenderComponent;

/** Runs the night shift: spawns the guard at its post, gives the thief a pebble to throw, writes the board from the guard's memory, and ends the round on a catch or at the vault; it owns no rule about seeing, hearing, or deciding. */
UCLASS()
class ADojoS6ShiftDirector : public AActor
{
	GENERATED_BODY()

public:
	/** Makes the board and the vault zone. */
	ADojoS6ShiftDirector();

	/** The player's pawn; the player's own pawn when left empty. */
	UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "Shift")
	TObjectPtr<APawn> Thief;

	/** Where the guard starts each round. */
	UPROPERTY(EditAnywhere, Category = "Shift")
	FVector GuardPost = FVector::ZeroVector;

	/** The guard's beat, in world space. */
	UPROPERTY(EditAnywhere, Category = "Shift")
	TArray<FVector> GuardBeat;

	/** Where the thief starts each round. */
	UPROPERTY(EditAnywhere, Category = "Shift")
	FVector ThiefStart = FVector(-1500.f, 0.f, 0.f);

	/** Where the vault is. */
	UPROPERTY(EditAnywhere, Category = "Shift")
	FVector VaultLocation = FVector(1600.f, 400.f, 0.f);

	/** Throws a pebble that lands 400 units in front of the thief and makes a noise there; only during a round. */
	UFUNCTION(BlueprintCallable, Category = "Shift")
	void ThrowPebble();

	/** Starts the next round, only after the last one ended. */
	UFUNCTION(BlueprintCallable, Category = "Shift")
	void PressRestart();

	/** The board's text. */
	UFUNCTION(BlueprintPure, Category = "Shift")
	FString GetBoardText() const;

	/** The guard of the current round. */
	UFUNCTION(BlueprintPure, Category = "Shift")
	ADojoS6Guard* GetGuard() const;

	/** True while a round runs. */
	UFUNCTION(BlueprintPure, Category = "Shift")
	bool IsRunning() const;

protected:
	/** Finds the thief, binds the keys, and starts round 1. */
	virtual void BeginPlay() override;

	/** Unbinds from the guard. */
	virtual void EndPlay(const EEndPlayReason::Type EndPlayReason) override;

private:
	/** Removes the old guard, spawns a fresh one, puts the thief back, and clears the board. */
	void StartRound();

	/** Unbinds from the guard and removes it and its controller. */
	void RemoveGuard();

	/** Unbinds from the guard controller and its memory. */
	void StopListening();

	/** The world's time in seconds. */
	double Now() const;

	/** Ends the round with a line such as CAUGHT in 8.3 s, and stops the guard. */
	void FinishRound(const TCHAR* Label);

	/** Rewrites the board from the guard's memory and the round's result. */
	void RewriteBoard();

	/** Rewrites the board when the guard's memory changes. */
	UFUNCTION()
	void HandleMemoryChanged(UDojoS6SenseMemoryComponent* Memory);

	/** Ends the round when the guard catches the thief. */
	UFUNCTION()
	void HandleCaught(AActor* Caught);

	/** Ends the round when the thief reaches the vault. */
	UFUNCTION()
	void HandleVaultOverlap(UPrimitiveComponent* OverlappedComponent, AActor* OtherActor, UPrimitiveComponent* OtherComponent, int32 OtherBodyIndex, bool bFromSweep, const FHitResult& SweepResult);

	UPROPERTY(VisibleAnywhere, Category = "Shift")
	TObjectPtr<UTextRenderComponent> Board;

	UPROPERTY(VisibleAnywhere, Category = "Shift")
	TObjectPtr<USphereComponent> VaultZone;

	UPROPERTY()
	TObjectPtr<ADojoS6Guard> CurrentGuard;

	UPROPERTY()
	TObjectPtr<ADojoS6GuardController> CurrentController;

	bool bRunning = false;
	double RoundStartTime = 0.0;
	FString ResultLine;
	FString BoardText;
};
