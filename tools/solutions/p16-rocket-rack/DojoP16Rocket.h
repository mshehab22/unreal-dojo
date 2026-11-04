#pragma once

#include "CoreMinimal.h"
#include "GameFramework/Actor.h"
#include "DojoP16Rocket.generated.h"

class USphereComponent;

/** A festival rocket: it flies on its launch velocity, slows under gravity, and bursts when its fuse runs out. It knows nothing about the rack it comes from. */
UCLASS()
class ADojoP16Rocket : public AActor
{
	GENERATED_BODY()

public:
	/** Creates the body sphere; the rocket can tick but starts with ticking off. */
	ADojoP16Rocket();

	/** Sends the rocket off at LaunchVelocity; it bursts after FuseSeconds of flight. */
	UFUNCTION(BlueprintCallable, Category = "Rocket")
	void Launch(const FVector& LaunchVelocity, float FuseSeconds);

	/** Puts every field back to how a freshly spawned rocket starts. */
	UFUNCTION(BlueprintCallable, Category = "Rocket")
	void ResetForLaunch();

	/** True from Launch until the burst. */
	UFUNCTION(BlueprintPure, Category = "Rocket")
	bool IsFlying() const;

	/** True once the fuse has run out, until the next reset. */
	UFUNCTION(BlueprintPure, Category = "Rocket")
	bool HasBurst() const;

	/** Moves the rocket along its flight and burns its fuse. */
	virtual void Tick(float DeltaSeconds) override;

	/** How fast gravity slows the climb, in units per second per second. */
	UPROPERTY(EditAnywhere, Category = "Rocket")
	float Gravity = 980.f;

protected:
	/** The rocket's body, which collides. */
	UPROPERTY(VisibleAnywhere, Category = "Rocket")
	TObjectPtr<USphereComponent> Body;

private:
	/** How fast and which way the rocket moves now. */
	FVector Velocity = FVector::ZeroVector;

	/** Seconds of flight left before the burst. */
	float FuseLeft = 0.f;

	/** True from Launch until the burst. */
	bool bFlying = false;

	/** True once the fuse has run out. */
	bool bBurst = false;
};
