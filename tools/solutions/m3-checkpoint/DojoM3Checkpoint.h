#pragma once

#include "CoreMinimal.h"
#include "GameFramework/Actor.h"
#include "DojoM3Checkpoint.generated.h"

class USphereComponent;
class UTextRenderComponent;

/** A flag that becomes a runner's respawn point when the runner touches it. */
UCLASS()
class ADojoM3Checkpoint : public AActor
{
	GENERATED_BODY()

public:
	/** Creates the trigger sphere as the root and the label above it. */
	ADojoM3Checkpoint();

	/** The area that feels runners: it overlaps pawns and ignores everything else. */
	UPROPERTY(VisibleAnywhere, BlueprintReadOnly, Category = "Checkpoint")
	TObjectPtr<USphereComponent> Zone;

	/** Floating text: FLAG until a runner touches it, then REACHED. */
	UPROPERTY(VisibleAnywhere, Category = "Checkpoint")
	TObjectPtr<UTextRenderComponent> Label;

	/** True once a runner has touched the flag. */
	UFUNCTION(BlueprintPure, Category = "Checkpoint")
	bool IsReached() const;

protected:
	/** Starts listening to the zone. */
	virtual void BeginPlay() override;

private:
	/** Runs when a shape starts overlapping the zone. */
	UFUNCTION()
	void HandleZoneBeginOverlap(UPrimitiveComponent* OverlappedComponent, AActor* OtherActor, UPrimitiveComponent* OtherComp, int32 OtherBodyIndex, bool bFromSweep, const FHitResult& SweepResult);

	bool bReached = false;
};
