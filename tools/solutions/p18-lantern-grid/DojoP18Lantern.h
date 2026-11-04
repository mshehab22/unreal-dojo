#pragma once

#include "CoreMinimal.h"
#include "GameFramework/Actor.h"
#include "DojoP18Lantern.generated.h"

/** A paper lantern standing in the meadow: a spot and a flame, with no collision shape at all. */
UCLASS()
class ADojoP18Lantern : public AActor
{
	GENERATED_BODY()

public:
	/** Creates the scene root and turns ticking off. */
	ADojoP18Lantern();

	/** True while the lantern burns. */
	UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "Lantern")
	bool bLit = false;
};
