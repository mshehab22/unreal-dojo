#pragma once

#include "CoreMinimal.h"
#include "GameFramework/Pawn.h"
#include "DojoS6Guard.generated.h"

/** A guard's body: a pawn with a beat of points to walk in order and a walking speed; the pawn owns where it is on its beat, and an AI controller decides what it does. */
UCLASS()
class ADojoS6Guard : public APawn
{
	GENERATED_BODY()

public:
	/** Gives the guard a root and has an AI controller possess it as soon as it is placed or spawned. */
	ADojoS6Guard();

	/** The points of the beat, in world space, walked in order and then from the start again. */
	UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "Guard")
	TArray<FVector> Beat;

	/** How fast the guard walks, in units per second. */
	UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "Guard", meta = (ClampMin = "0"))
	float WalkSpeed = 300.f;

	/** Writes the next point of the beat into OutPoint; false when the beat is empty. */
	UFUNCTION(BlueprintCallable, Category = "Guard")
	bool GetNextPoint(FVector& OutPoint) const;

	/** Moves on to the point after the next one, going back to the first after the last. */
	UFUNCTION(BlueprintCallable, Category = "Guard")
	void AdvancePoint();

	/** Which point of the beat comes next, counted from 0. */
	UFUNCTION(BlueprintPure, Category = "Guard")
	int32 GetNextPointIndex() const;

private:
	int32 NextPointIndex = 0;
};
