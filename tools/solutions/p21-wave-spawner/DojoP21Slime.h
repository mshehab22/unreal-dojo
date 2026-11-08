#pragma once

#include "CoreMinimal.h"
#include "DojoP21Critter.h"
#include "DojoP21Slime.generated.h"

/** A soft critter with 10 health per level. */
UCLASS()
class ADojoP21Slime : public ADojoP21Critter
{
	GENERATED_BODY()

public:
	/** Sets the slime's health per level. */
	ADojoP21Slime();
};
