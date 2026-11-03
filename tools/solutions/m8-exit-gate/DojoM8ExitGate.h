#pragma once

#include "CoreMinimal.h"
#include "GameFramework/Actor.h"
#include "DojoM8ExitGate.generated.h"

class UBoxComponent;

/** Broadcast once, when a pawn reaches the open exit. */
DECLARE_DYNAMIC_MULTICAST_DELEGATE_OneParam(FDojoM8OnEscaped, AActor*, Escapee);

/** The way out: a zone that lets a pawn escape only once the gate has power; a pawn already standing in it when the power comes on escapes at once. */
UCLASS()
class ADojoM8ExitGate : public AActor
{
	GENERATED_BODY()

public:
	/** Creates the zone as the root and turns ticking off. */
	ADojoM8ExitGate();

	/** The area that feels pawns: it overlaps the Pawn channel and ignores everything else. */
	UPROPERTY(VisibleAnywhere, BlueprintReadOnly, Category = "Exit Gate")
	TObjectPtr<UBoxComponent> Zone;

	/** Fires once, with the pawn that got out. */
	UPROPERTY(BlueprintAssignable, Category = "Exit Gate")
	FDojoM8OnEscaped OnEscaped;

	/** Turns the power on or off; turning it on lets out a pawn that is already inside the zone. */
	UFUNCTION(BlueprintCallable, Category = "Exit Gate")
	void SetPowered(bool bNewPowered);

	/** Powers the gate down and forgets that anyone escaped, ready for another round. */
	UFUNCTION(BlueprintCallable, Category = "Exit Gate")
	void Reset();

	/** True while the gate has power. */
	UFUNCTION(BlueprintPure, Category = "Exit Gate")
	bool IsPowered() const;

	/** True once a pawn has escaped through the gate. */
	UFUNCTION(BlueprintPure, Category = "Exit Gate")
	bool HasEscaped() const;

protected:
	/** Starts listening to the zone. */
	virtual void BeginPlay() override;

private:
	/** Runs when a shape starts overlapping the zone. */
	UFUNCTION()
	void HandleZoneBeginOverlap(UPrimitiveComponent* OverlappedComponent, AActor* OtherActor, UPrimitiveComponent* OtherComp, int32 OtherBodyIndex, bool bFromSweep, const FHitResult& SweepResult);

	/** Lets one pawn out if the gate has power and nobody has escaped yet. */
	void LetOut(AActor* Candidate);

	bool bPowered = false;

	bool bEscaped = false;
};
