#pragma once

#include "CoreMinimal.h"
#include "GameFramework/Actor.h"
#include "DojoP21Critter.generated.h"

/** A creature of the Ember Range: its health comes from its level and its kind. */
UCLASS()
class ADojoP21Critter : public AActor
{
	GENERATED_BODY()

public:
	/** Creates the scene root and turns ticking off. */
	ADojoP21Critter();

	/** How strong this critter is; its health is worked out from it. */
	UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "Critter", meta = (ExposeOnSpawn = true))
	int32 Level = 1;

	/** Health gained per level. */
	UPROPERTY(EditAnywhere, BlueprintReadOnly, Category = "Critter")
	int32 HealthPerLevel = 10;

	/** Hit points: the level times the health per level. */
	UPROPERTY(BlueprintReadOnly, Category = "Critter")
	int32 Health = 0;

	/** The level recorded when this critter starts; zero until then. */
	UPROPERTY(BlueprintReadOnly, Category = "Critter")
	int32 LevelAtBeginPlay = 0;

protected:
	/** Works out health from the level. */
	virtual void BeginPlay() override;
};
