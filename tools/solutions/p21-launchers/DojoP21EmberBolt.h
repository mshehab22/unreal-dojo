#pragma once

#include "CoreMinimal.h"
#include "DojoP21Bolt.h"
#include "DojoP21EmberBolt.generated.h"

/** A heavy bolt of fire that hits for 12. */
UCLASS()
class ADojoP21EmberBolt : public ADojoP21Bolt
{
	GENERATED_BODY()

public:
	/** Sets the ember damage. */
	ADojoP21EmberBolt();
};
