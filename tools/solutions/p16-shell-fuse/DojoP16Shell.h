#pragma once

#include "CoreMinimal.h"
#include "GameFramework/Actor.h"
#include "DojoP16Shell.generated.h"

class USphereComponent;

/** A firework shell: fired, it climbs until its fuse runs out and it bursts. It can be sent to rest out of play and woken again, and knows nothing about the pool that keeps it. */
UCLASS()
class ADojoP16Shell : public AActor
{
	GENERATED_BODY()

public:
	/** Creates the body sphere and lets the shell tick. */
	ADojoP16Shell();

	/** Lights the fuse: the shell climbs at RiseSpeed and bursts after FuseSeconds. Refused, returning false, while resting or already flying. */
	UFUNCTION(BlueprintCallable, Category = "Shell")
	bool Fire(float FuseSeconds);

	/** Takes the shell out of play, at any moment of its flight, ready to be woken again. */
	UFUNCTION(BlueprintCallable, Category = "Shell")
	void RestInPool();

	/** Brings a resting shell back into play at Where, as clean as a fresh one, waiting to be fired. */
	UFUNCTION(BlueprintCallable, Category = "Shell")
	void WakeFromPool(const FVector& Where);

	/** True while the shell is out of play. */
	UFUNCTION(BlueprintPure, Category = "Shell")
	bool IsResting() const;

	/** True from Fire until the burst. */
	UFUNCTION(BlueprintPure, Category = "Shell")
	bool IsFlying() const;

	/** True once the fuse has run out, until the shell is fired again or woken. */
	UFUNCTION(BlueprintPure, Category = "Shell")
	bool HasBurst() const;

	/** Climbs while the shell flies. */
	virtual void Tick(float DeltaSeconds) override;

	/** How fast a flying shell climbs, in units per second. */
	UPROPERTY(EditAnywhere, Category = "Shell")
	float RiseSpeed = 800.f;

protected:
	/** The shell's body, which collides. */
	UPROPERTY(VisibleAnywhere, Category = "Shell")
	TObjectPtr<USphereComponent> Body;

private:
	/** The end of the fuse: the shell stops climbing and has burst. */
	void Burst();

	/** The fuse lit by Fire. */
	FTimerHandle FuseTimer;

	/** True while the shell is out of play. */
	bool bResting = false;

	/** True from Fire until the burst. */
	bool bFlying = false;

	/** True once the fuse has run out. */
	bool bBurst = false;
};
