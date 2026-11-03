#pragma once

#include "CoreMinimal.h"
#include "GameFramework/Actor.h"
#include "DojoM3Pit.generated.h"

class UBoxComponent;

/** A pit that sends a fallen runner to its respawn point and a fallen crate back home, and leaves everything else where it fell. */
UCLASS()
class ADojoM3Pit : public AActor
{
	GENERATED_BODY()

public:
	/** Creates the trigger zone as the root. */
	ADojoM3Pit();

	/** The space inside the pit; it overlaps everything and stops nothing. */
	UPROPERTY(VisibleAnywhere, BlueprintReadOnly, Category = "Pit")
	TObjectPtr<UBoxComponent> Zone;

	/** How many runners and crates the pit has sent back. */
	UFUNCTION(BlueprintPure, Category = "Pit")
	int32 GetCatches() const;

protected:
	/** Starts listening to the zone. */
	virtual void BeginPlay() override;

private:
	/** Runs when a shape starts overlapping the zone: sends runners and crates back and counts them. */
	UFUNCTION()
	void HandleZoneBeginOverlap(UPrimitiveComponent* OverlappedComponent, AActor* OtherActor, UPrimitiveComponent* OtherComp, int32 OtherBodyIndex, bool bFromSweep, const FHitResult& SweepResult);

	int32 Catches = 0;
};
