#pragma once

#include "CoreMinimal.h"
#include "DojoP19MeadowFly.generated.h"

/** One catchable firefly: where it is, where it is going, and how long it has left. */
USTRUCT()
struct FDojoP19MeadowFly
{
	GENERATED_BODY()

	/** Where the firefly is. */
	UPROPERTY()
	FVector3f Position = FVector3f::ZeroVector;

	/** Where it is going, in units per second. */
	UPROPERTY()
	FVector3f Velocity = FVector3f::ZeroVector;

	/** Seconds left before it fades. */
	UPROPERTY()
	float Life = 0.f;

	/** The meadow's name for this firefly, which stays the same wherever the record moves. */
	UPROPERTY()
	int32 Id = INDEX_NONE;
};

/** Names one firefly in a meadow for code outside the meadow. */
USTRUCT(BlueprintType)
struct FDojoP19FlyHandle
{
	GENERATED_BODY()

	/** The meadow's name for the firefly; INDEX_NONE names none. */
	UPROPERTY(BlueprintReadOnly, Category = "Meadow")
	int32 Id = INDEX_NONE;
};
