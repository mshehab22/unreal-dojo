#pragma once

#include "CoreMinimal.h"
#include "GameFramework/Actor.h"
#include "DojoTestActor.generated.h"

/** A bare actor with only a scene root. Quest tests spawn it as a host for components or as a target or dummy. */
UCLASS()
class DOJO_API ADojoTestActor : public AActor
{
	GENERATED_BODY()

public:
	/** Creates the scene root and turns ticking off; tests tick the world, not this actor. */
	ADojoTestActor();
};
