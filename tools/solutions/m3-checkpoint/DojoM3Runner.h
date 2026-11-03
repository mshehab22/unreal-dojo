#pragma once

#include "CoreMinimal.h"
#include "GameFramework/Actor.h"
#include "DojoM3Runner.generated.h"

class USphereComponent;

/** The player's stand-in for this world: a solid ball whose object type is Pawn, with a place to come back to after a fall. */
UCLASS()
class ADojoM3Runner : public AActor
{
	GENERATED_BODY()

public:
	/** Creates the body as the root, with the Pawn profile. */
	ADojoM3Runner();

	/** The solid shape; its object type is Pawn, so anything that listens for pawns feels it. */
	UPROPERTY(VisibleAnywhere, BlueprintReadOnly, Category = "Runner")
	TObjectPtr<USphereComponent> Body;

	/** Changes where Respawn puts the runner. */
	UFUNCTION(BlueprintCallable, Category = "Runner")
	void SetRespawnPoint(const FVector& NewPoint);

	/** Where Respawn puts the runner; where it stood at BeginPlay until something changes it. */
	UFUNCTION(BlueprintPure, Category = "Runner")
	FVector GetRespawnPoint() const;

	/** Teleports the runner to its respawn point and counts it. */
	UFUNCTION(BlueprintCallable, Category = "Runner")
	void Respawn();

	/** How many times Respawn has run. */
	UFUNCTION(BlueprintPure, Category = "Runner")
	int32 GetRespawns() const;

protected:
	/** Makes the starting spot the first respawn point. */
	virtual void BeginPlay() override;

private:
	FVector RespawnPoint = FVector::ZeroVector;

	int32 Respawns = 0;
};
