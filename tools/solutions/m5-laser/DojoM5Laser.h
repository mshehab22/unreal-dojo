#pragma once

#include "CoreMinimal.h"
#include "GameFramework/Actor.h"
#include "DojoM5Laser.generated.h"

/** A beam that flies from its actor along its forward, bounces off surfaces tagged as mirrors, and ends on anything else. */
UCLASS()
class ADojoM5Laser : public AActor
{
	GENERATED_BODY()

public:
	/** Creates a scene root and an arrow that shows the way the beam leaves. */
	ADojoM5Laser();

	/** How many times the beam may bounce before it stops at the next surface. */
	UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "Laser", meta = (ClampMin = "0"))
	int32 MaxBounces = 5;

	/** How far one straight piece of the beam can fly, in units. */
	UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "Laser", meta = (ClampMin = "1"))
	float SegmentLength = 2000.f;

	/** The actor tag that makes a surface bounce the beam. */
	UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "Laser")
	FName MirrorTag = TEXT("Mirror");

	/** Fires the beam once, replacing the last path, and draws it for one second. */
	UFUNCTION(BlueprintCallable, Category = "Laser")
	void Fire();

	/** How many points the last beam has: its start, every point where it touched something, or its end in the air. */
	UFUNCTION(BlueprintPure, Category = "Laser")
	int32 GetPointCount() const;

	/** The Index-th point of the last beam, or the zero vector when there is none. */
	UFUNCTION(BlueprintPure, Category = "Laser")
	FVector GetPoint(int32 Index) const;

	/** How many times the last beam bounced. */
	UFUNCTION(BlueprintPure, Category = "Laser")
	int32 GetBounceCount() const;

private:
	TArray<FVector> Path;

	int32 Bounces = 0;
};
