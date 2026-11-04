#pragma once

#include "CoreMinimal.h"
#include "GameFramework/Actor.h"
#include "DojoM8Fuse.generated.h"

class ADojoM8Fuse;
class USphereComponent;

/** Broadcast when a fuse is picked up, with the fuse and whoever picked it up. */
DECLARE_DYNAMIC_MULTICAST_DELEGATE_TwoParams(FDojoM8OnFuseCollected, ADojoM8Fuse*, Fuse, AActor*, Collector);

/** A pickup that is collected when a pawn touches it: it announces the pickup while it still stands and then leaves the world. */
UCLASS()
class ADojoM8Fuse : public AActor
{
	GENERATED_BODY()

public:
	/** Creates the trigger sphere as the root and turns ticking off. */
	ADojoM8Fuse();

	/** The area that feels pawns: it overlaps the Pawn channel and ignores everything else. */
	UPROPERTY(VisibleAnywhere, BlueprintReadOnly, Category = "Fuse")
	TObjectPtr<USphereComponent> Zone;

	/** Fires once, when the fuse is collected, while it still stands. */
	UPROPERTY(BlueprintAssignable, Category = "Fuse")
	FDojoM8OnFuseCollected OnCollected;

	/** Announces the pickup to every listener, then destroys the fuse; false if it was already collected. */
	UFUNCTION(BlueprintCallable, Category = "Fuse")
	bool Collect(AActor* Collector);

	/** True once the fuse has been collected. */
	UFUNCTION(BlueprintPure, Category = "Fuse")
	bool IsCollected() const;

protected:
	/** Starts listening to the zone. */
	virtual void BeginPlay() override;

private:
	/** Runs when a shape starts overlapping the zone. */
	UFUNCTION()
	void HandleZoneBeginOverlap(UPrimitiveComponent* OverlappedComponent, AActor* OtherActor, UPrimitiveComponent* OtherComp, int32 OtherBodyIndex, bool bFromSweep, const FHitResult& SweepResult);

	bool bCollected = false;
};
