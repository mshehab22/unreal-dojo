#pragma once

#include "CoreMinimal.h"
#include "GameFramework/Actor.h"
#include "DojoS3VaultDirector.generated.h"

class ADojoS3Coin;
class ADojoS3Door;
class ADojoS3Runner;
class UDojoS3SaveSystem;
class UTextRenderComponent;

/** Runs the vault: lays out the runner, coins, and doors, routes keys to them, saves and loads through the world's save system, keeps the board by listening, and calls the finale. It owns no saving rule. */
UCLASS()
class ADojoS3VaultDirector : public AActor
{
	GENERATED_BODY()

public:
	/** Creates the board and turns ticking off. */
	ADojoS3VaultDirector();

	/** The board: coins, open doors, the checkpoint, and the finale. */
	UPROPERTY(VisibleAnywhere, Category = "Vault")
	TObjectPtr<UTextRenderComponent> Board;

	/** Where the coins lie along the vault; coin N is saved as CoinN. */
	UPROPERTY(EditAnywhere, Category = "Vault")
	TArray<float> CoinSpots = { 100.f, 200.f, 400.f, 600.f, 800.f };

	/** Where the doors stand along the vault; door N is saved as DoorN. */
	UPROPERTY(EditAnywhere, Category = "Vault")
	TArray<float> DoorSpots = { 300.f, 700.f };

	/** How far one step moves the runner. */
	UPROPERTY(EditAnywhere, Category = "Vault", meta = (ClampMin = "1.0"))
	float StepLength = 100.f;

	/** The far end of the vault; the near end is 0. */
	UPROPERTY(EditAnywhere, Category = "Vault", meta = (ClampMin = "0.0"))
	float VaultLength = 900.f;

	/** A coin this close to the runner can be taken. */
	UPROPERTY(EditAnywhere, Category = "Vault", meta = (ClampMin = "0.0"))
	float CoinReach = 60.f;

	/** A door this close to the runner, and not where it stands, can be opened or closed. */
	UPROPERTY(EditAnywhere, Category = "Vault", meta = (ClampMin = "0.0"))
	float DoorReach = 110.f;

	/** The slot the checkpoint is saved in. */
	UPROPERTY(EditAnywhere, Category = "Vault")
	FString SlotName = TEXT("DojoS3Vault");

	/** Left and right arrows: one step back or ahead, refused at the ends and into a closed door. */
	UFUNCTION(BlueprintCallable, Category = "Vault")
	void PressStep(int32 Direction);

	/** E: takes the nearest coin within reach. */
	UFUNCTION(BlueprintCallable, Category = "Vault")
	void PressTake();

	/** Q: opens or closes the nearest door within reach. */
	UFUNCTION(BlueprintCallable, Category = "Vault")
	void PressDoor();

	/** F5: saves a checkpoint. */
	UFUNCTION(BlueprintCallable, Category = "Vault")
	void PressSave();

	/** F9: lays the vault out fresh and loads the checkpoint into it; does nothing when there is no checkpoint. */
	UFUNCTION(BlueprintCallable, Category = "Vault")
	void PressLoad();

	/** R: starts the next round, only after the finale, with no checkpoint. */
	UFUNCTION(BlueprintCallable, Category = "Vault")
	void RestartRound();

	/** True from the start of a round until the finale. */
	UFUNCTION(BlueprintPure, Category = "Vault")
	bool IsRunning() const;

	/** Seconds the last finished round took, or 0. */
	UFUNCTION(BlueprintPure, Category = "Vault")
	float GetFinishSeconds() const;

	/** The runner the director laid out. */
	UFUNCTION(BlueprintPure, Category = "Vault")
	ADojoS3Runner* GetRunner() const;

	/** The coins still lying in the vault. */
	UFUNCTION(BlueprintPure, Category = "Vault")
	TArray<ADojoS3Coin*> GetCoins() const;

	/** The doors, in vault order. */
	UFUNCTION(BlueprintPure, Category = "Vault")
	TArray<ADojoS3Door*> GetDoors() const;

protected:
	/** Finds the save system, listens to it, lays out the vault, and starts round 1. */
	virtual void BeginPlay() override;

	/** Stops listening to the save system. */
	virtual void EndPlay(const EEndPlayReason::Type EndPlayReason) override;

private:
	/** A save finished, so the checkpoint line changes. */
	UFUNCTION()
	void HandleSaved(const FString& SavedSlot, bool bSucceeded);

	/** A load finished, so the checkpoint line changes and the board is rewritten from the restored state. */
	UFUNCTION()
	void HandleLoaded(const FString& LoadedSlot, bool bSucceeded);

	/** Routes one pressed key to its action. */
	void HandleKey(FKey Key);

	/** Puts back every coin that is missing, closes every door, and sends the runner to the start with no coins. */
	void LayOut();

	/** Lays the vault out, clears the checkpoint line, and starts the clock. */
	void StartRound();

	/** Ends the round when every coin is carried, then rewrites the board. */
	void RefreshBoard();

	/** The world's save system, found at BeginPlay. */
	UPROPERTY()
	TObjectPtr<UDojoS3SaveSystem> SaveSystem;

	/** The runner the director spawned. */
	UPROPERTY()
	TObjectPtr<ADojoS3Runner> Runner;

	/** One entry per coin spot; an entry is gone or being destroyed once its coin is taken. */
	UPROPERTY()
	TArray<TObjectPtr<ADojoS3Coin>> Coins;

	/** One door per door spot. */
	UPROPERTY()
	TArray<TObjectPtr<ADojoS3Door>> Doors;

	/** The checkpoint line's last word: none, saved, loaded, or failed. */
	FString CheckpointText = TEXT("none");

	/** True from the start of a round until the finale. */
	bool bRunning = false;

	/** True after the finale, until R. */
	bool bFinished = false;

	/** World time when the round began. */
	float StartSeconds = 0.f;

	/** How long the last finished round took. */
	float FinishSeconds = 0.f;
};
