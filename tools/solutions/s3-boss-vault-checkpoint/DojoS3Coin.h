#pragma once

#include "CoreMinimal.h"
#include "GameFramework/Actor.h"
#include "DojoS3Coin.generated.h"

class UDojoS3SaveableComponent;

/** A coin lying in the vault; taking it removes it from the world, and a save remembers that it is gone. */
UCLASS()
class ADojoS3Coin : public AActor
{
	GENERATED_BODY()

public:
	/** Creates the root and the saveable part and turns ticking off. */
	ADojoS3Coin();

	/** The part that saves this coin under its id. */
	UPROPERTY(VisibleAnywhere, Category = "Coin")
	TObjectPtr<UDojoS3SaveableComponent> Saveable;

	/** Removes the coin from the world and returns how many coins it was worth. */
	UFUNCTION(BlueprintCallable, Category = "Coin")
	int32 Take();
};
