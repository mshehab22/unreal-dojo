#pragma once

#include "CoreMinimal.h"
#include "DojoP19Ember.generated.h"

/** What the brazier's step reads and writes for one ember every frame. Kept small: 28 bytes. */
USTRUCT()
struct FDojoP19EmberHot
{
	GENERATED_BODY()

	/** Where the ember is. */
	UPROPERTY()
	FVector3f Position = FVector3f::ZeroVector;

	/** Where it is going, in units per second. */
	UPROPERTY()
	FVector3f Velocity = FVector3f::ZeroVector;

	/** Seconds of heat left. */
	UPROPERTY()
	float Heat = 0.f;
};

static_assert(sizeof(FDojoP19EmberHot) <= 32, "A hot ember record must stay within 32 bytes.");

/** What only the readers look at for one ember, kept at the same index as its hot record. */
USTRUCT()
struct FDojoP19EmberCold
{
	GENERATED_BODY()

	/** What kind of ember it is, such as Spark or Ash. */
	UPROPERTY()
	FName Kind;

	/** When it was kindled, in world seconds. */
	UPROPERTY()
	double KindledAt = 0.0;
};
