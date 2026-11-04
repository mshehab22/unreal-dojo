#pragma once

#include "CoreMinimal.h"
#include "GameFramework/Actor.h"
#include "DojoM4Chain.generated.h"

class ADojoM4Bomb;

/** Watches bombs and, when one leaves play, lights every watched bomb within reach after a short spark. */
UCLASS()
class ADojoM4Chain : public AActor
{
	GENERATED_BODY()

public:
	/** Creates the scene root; the chain never ticks. */
	ADojoM4Chain();

	/** How far a blast reaches, in units. */
	UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "Chain", meta = (ClampMin = "0"))
	float Reach = 300.f;

	/** The fuse a blast lights its neighbors with, in seconds. */
	UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "Chain", meta = (ClampMin = "0.05"))
	float SparkDelay = 0.5f;

	/** Starts watching a bomb; nullptr and bombs already watched are ignored. */
	UFUNCTION(BlueprintCallable, Category = "Chain")
	void Watch(ADojoM4Bomb* Bomb);

	/** How many watched bombs are still in play. */
	UFUNCTION(BlueprintPure, Category = "Chain")
	int32 GetWatched() const;

	/** How many watched bombs have left play. */
	UFUNCTION(BlueprintPure, Category = "Chain")
	int32 GetBlasts() const;

protected:
	/** Stops listening to the bombs still watched. */
	virtual void EndPlay(const EEndPlayReason::Type EndPlayReason) override;

private:
	/** Runs when a watched bomb leaves play: counts the blast and sparks the bombs within reach. */
	UFUNCTION()
	void HandleBombDestroyed(AActor* DestroyedActor);

	UPROPERTY()
	TArray<TObjectPtr<ADojoM4Bomb>> Bombs;

	int32 Blasts = 0;
};
