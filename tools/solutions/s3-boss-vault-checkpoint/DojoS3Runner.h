#pragma once

#include "CoreMinimal.h"
#include "GameFramework/Actor.h"
#include "Quests/s3-saveable/DojoS3Restorable.h"
#include "DojoS3Runner.generated.h"

class UDojoS3SaveableComponent;

/** The vault runner: its spot along the vault and its coin count are SaveGame properties, and a restore moves it back to the saved spot. */
UCLASS()
class ADojoS3Runner : public AActor, public IDojoS3Restorable
{
	GENERATED_BODY()

public:
	/** Creates the root and the saveable part and turns ticking off. */
	ADojoS3Runner();

	/** The part that saves the runner. */
	UPROPERTY(VisibleAnywhere, Category = "Runner")
	TObjectPtr<UDojoS3SaveableComponent> Saveable;

	/** Puts the runner at this distance along the vault. */
	UFUNCTION(BlueprintCallable, Category = "Runner")
	void MoveTo(float NewSpot);

	/** Adds taken coins to the count. */
	UFUNCTION(BlueprintCallable, Category = "Runner")
	void AddCoins(int32 Amount);

	/** Back to the start with no coins. */
	UFUNCTION(BlueprintCallable, Category = "Runner")
	void ResetRun();

	/** How far along the vault the runner stands. */
	UFUNCTION(BlueprintPure, Category = "Runner")
	float GetSpot() const;

	/** How many coins the runner carries. */
	UFUNCTION(BlueprintPure, Category = "Runner")
	int32 GetCoins() const;

	/** Moves the actor to the restored spot. */
	virtual void OnRestoredFromSave_Implementation() override;

private:
	/** Distance along the vault; saved. */
	UPROPERTY(SaveGame)
	float Spot = 0.f;

	/** Coins carried; saved. */
	UPROPERTY(SaveGame)
	int32 Coins = 0;
};
