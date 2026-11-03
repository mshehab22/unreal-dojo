#pragma once

#include "CoreMinimal.h"
#include "GameFramework/Actor.h"
#include "DojoM3VaultRoom.generated.h"

class ADojoM3Checkpoint;
class ADojoM3Crate;
class ADojoM3Gate;
class ADojoM3Pit;
class ADojoM3Plate;
class ADojoM3Runner;
class UBoxComponent;
class UTextRenderComponent;

/** Runs the vault room: places the flag, plate, gate, and pit each round, opens the gate from the plate's count, counts the runner's falls, and ends the round at the vault. */
UCLASS()
class ADojoM3VaultRoom : public AActor
{
	GENERATED_BODY()

public:
	/** Creates the root, the vault trigger, and the board; the room never ticks. */
	ADojoM3VaultRoom();

	/** The trigger at the far end; a runner entering it ends the round. */
	UPROPERTY(VisibleAnywhere, BlueprintReadOnly, Category = "Vault Room")
	TObjectPtr<UBoxComponent> Vault;

	/** Floating text with the plate count and the falls, or the finish line. */
	UPROPERTY(VisibleAnywhere, Category = "Vault Room")
	TObjectPtr<UTextRenderComponent> Board;

	/** The runner the room plays with, set in Details. */
	UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "Vault Room")
	TObjectPtr<ADojoM3Runner> Runner;

	/** Where the runner starts each round. */
	UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "Vault Room")
	FVector Entrance = FVector::ZeroVector;

	/** Where crates appear, and where a fallen crate comes back to. */
	UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "Vault Room")
	FVector Chute = FVector(300.f, 500.f, 0.f);

	/** How many things the plate needs to hold the gate open. */
	UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "Vault Room", meta = (ClampMin = "1"))
	int32 PlateNeeds = 2;

	/** How many crates may be in the room at once. */
	UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "Vault Room", meta = (ClampMin = "1"))
	int32 MaxCrates = 2;

	/** The lever key: drops a crate at the chute; false when the round is over or the room already holds MaxCrates. */
	UFUNCTION(BlueprintCallable, Category = "Vault Room")
	bool PressDispense();

	/** The R key: starts a fresh round, only once the last one has ended; false while a round runs. */
	UFUNCTION(BlueprintCallable, Category = "Vault Room")
	bool PressRestart();

	/** True from the start of a round until the runner reaches the vault. */
	UFUNCTION(BlueprintPure, Category = "Vault Room")
	bool IsRunning() const;

	/** The runner's falls into the pit this round. */
	UFUNCTION(BlueprintPure, Category = "Vault Room")
	int32 GetFalls() const;

	/** Seconds since the round began, frozen at the vault. */
	UFUNCTION(BlueprintPure, Category = "Vault Room")
	float GetRoundSeconds() const;

	/** This round's flag. */
	UFUNCTION(BlueprintPure, Category = "Vault Room")
	ADojoM3Checkpoint* GetFlag() const;

	/** This round's plate. */
	UFUNCTION(BlueprintPure, Category = "Vault Room")
	ADojoM3Plate* GetPlate() const;

	/** This round's gate. */
	UFUNCTION(BlueprintPure, Category = "Vault Room")
	ADojoM3Gate* GetGate() const;

	/** This round's pit. */
	UFUNCTION(BlueprintPure, Category = "Vault Room")
	ADojoM3Pit* GetPit() const;

	/** The crates dropped this round, oldest first. */
	UFUNCTION(BlueprintPure, Category = "Vault Room")
	TArray<ADojoM3Crate*> GetCrates() const;

protected:
	/** Listens to the vault and starts the first round. */
	virtual void BeginPlay() override;

private:
	/** Clears the last round, puts the runner at the entrance, places every piece, and wires them. */
	void StartRound();

	/** Freezes the time and shows the finish line. */
	void EndRound();

	/** Destroys every piece and crate the room placed. */
	void ClearPieces();

	/** Opens the gate while the plate is pressed and closes it otherwise. */
	UFUNCTION()
	void HandlePlateCountChanged(int32 NewCount);

	/** A second listener on the pit's zone: counts the runner's falls. */
	UFUNCTION()
	void HandlePitBeginOverlap(UPrimitiveComponent* OverlappedComponent, AActor* OtherActor, UPrimitiveComponent* OtherComp, int32 OtherBodyIndex, bool bFromSweep, const FHitResult& SweepResult);

	/** Ends the round when the runner reaches the vault. */
	UFUNCTION()
	void HandleVaultBeginOverlap(UPrimitiveComponent* OverlappedComponent, AActor* OtherActor, UPrimitiveComponent* OtherComp, int32 OtherBodyIndex, bool bFromSweep, const FHitResult& SweepResult);

	/** Writes the board for the current state. */
	void RefreshBoard();

	UPROPERTY()
	TObjectPtr<ADojoM3Checkpoint> Flag;

	UPROPERTY()
	TObjectPtr<ADojoM3Plate> Plate;

	UPROPERTY()
	TObjectPtr<ADojoM3Gate> Gate;

	UPROPERTY()
	TObjectPtr<ADojoM3Pit> Pit;

	UPROPERTY()
	TArray<TObjectPtr<ADojoM3Crate>> Crates;

	int32 Falls = 0;

	bool bRunning = false;

	double RoundStartSeconds = 0.0;

	float FinishSeconds = 0.f;
};
