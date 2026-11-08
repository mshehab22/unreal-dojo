#pragma once

#include "CoreMinimal.h"
#include "DojoP21Bolt.h"
#include "DojoP21FrostBolt.generated.h"

/** A light bolt of ice that hits for 7. */
UCLASS()
class ADojoP21FrostBolt : public ADojoP21Bolt
{
	GENERATED_BODY()

public:
	/** Sets the frost damage. */
	ADojoP21FrostBolt();
};
