#pragma once

#include "CoreMinimal.h"
#include "DojoP21Critter.h"
#include "DojoP21Imp.generated.h"

/** A tougher critter with 15 health per level. */
UCLASS()
class ADojoP21Imp : public ADojoP21Critter
{
	GENERATED_BODY()

public:
	/** Sets the imp's health per level. */
	ADojoP21Imp();
};
