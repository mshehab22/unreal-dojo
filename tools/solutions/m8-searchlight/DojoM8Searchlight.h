#pragma once

#include "CoreMinimal.h"
#include "GameFramework/Actor.h"
#include "DojoM8Searchlight.generated.h"

class ADojoM8Searchlight;

/** Broadcast when the light starts or stops seeing the actor it watches. */
DECLARE_DYNAMIC_MULTICAST_DELEGATE_TwoParams(FDojoM8OnSightChanged, ADojoM8Searchlight*, Light, bool, bSeen);

/** A tower light that turns on the spot and reports when it can see the one actor it watches: inside its cone, within range, and with nothing solid in the way. */
UCLASS()
class ADojoM8Searchlight : public AActor
{
	GENERATED_BODY()

public:
	/** Creates the scene root and turns ticking on. */
	ADojoM8Searchlight();

	/** How fast the beam turns, in degrees per second; zero holds it still. */
	UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "Searchlight")
	float SweepDegreesPerSecond = 45.f;

	/** How far the beam reaches, in units. */
	UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "Searchlight")
	float ViewRange = 800.f;

	/** Half the width of the beam, in degrees: an actor this far off the beam's middle is still lit. */
	UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "Searchlight")
	float ViewHalfAngleDegrees = 20.f;

	/** Fires when the watched actor goes in or out of sight, and only then. */
	UPROPERTY(BlueprintAssignable, Category = "Searchlight")
	FDojoM8OnSightChanged OnSightChanged;

	/** Chooses the one actor this light looks for. */
	UFUNCTION(BlueprintCallable, Category = "Searchlight")
	void Watch(AActor* NewTarget);

	/** True while the watched actor is in sight. */
	UFUNCTION(BlueprintPure, Category = "Searchlight")
	bool IsSeeing() const;

	/** True when the candidate is inside the cone and range and no solid shape is between it and the light. */
	bool CanSee(const AActor* Candidate) const;

	/** Turns the beam, then checks the watched actor and announces a change. */
	virtual void Tick(float DeltaSeconds) override;

private:
	/** True when a point is within range and within the beam's half angle, measured on the floor plane. */
	bool IsInsideCone(const FVector& TargetLocation) const;

	/** True when a line from the light to the candidate hits nothing solid on the way. */
	bool HasClearLine(const AActor* Candidate) const;

	TWeakObjectPtr<AActor> Watched;

	bool bSeeing = false;
};
