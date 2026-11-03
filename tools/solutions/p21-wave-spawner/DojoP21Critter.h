#pragma once

#include "CoreMinimal.h"
#include "GameFramework/Actor.h"
#include "DojoP21Critter.generated.h"

/** A creature of the Ember Range: its level sets its health the moment it begins play. */
UCLASS()
class ADojoP21Critter : public AActor
{
	GENERATED_BODY()

public:
	/** Creates the scene root and turns ticking off. */
	ADojoP21Critter();

	/** How strong this critter is; its health is worked out from it when it begins play. */
	UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "Critter", meta = (ExposeOnSpawn = true)) // @explain: ExposeOnSpawn puts this on the Blueprint Spawn Actor node as a pin, which Blueprint sets before begin play, the same deferred route the C++ factory takes.
	int32 Level = 1;

	/** Health gained per level. */
	UPROPERTY(EditAnywhere, BlueprintReadOnly, Category = "Critter")
	int32 HealthPerLevel = 10;

	/** Hit points, filled in once when the critter begins play. */
	UPROPERTY(BlueprintReadOnly, Category = "Critter")
	int32 Health = 0;

	/** The level this critter saw at the moment it began play; zero until then. */
	UPROPERTY(BlueprintReadOnly, Category = "Critter")
	int32 LevelAtBeginPlay = 0;

protected:
	/** Works out health from the level as it is right now. */
	virtual void BeginPlay() override;
};
