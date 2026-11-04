#pragma once

#include "CoreMinimal.h"
#include "DojoP19Firefly.generated.h"

/** One firefly: where it is, where it is going, and how bright it is. Small and plain, so thousands can sit side by side. */
USTRUCT()
struct FDojoP19Firefly
{
	GENERATED_BODY()

	/** Where the firefly is. */
	UPROPERTY()
	FVector3f Position = FVector3f::ZeroVector;

	/** Where it is going, in units per second. */
	UPROPERTY()
	FVector3f Velocity = FVector3f::ZeroVector;

	/** How bright it is, from 0 to 1. */
	UPROPERTY()
	float Glow = 0.f;

	/** How fast its glow changes per second; the sign says brightening or dimming. */
	UPROPERTY()
	float GlowRate = 0.f;
};

static_assert(sizeof(FDojoP19Firefly) == 32, "A firefly must stay 32 bytes, two to a cache line.");
