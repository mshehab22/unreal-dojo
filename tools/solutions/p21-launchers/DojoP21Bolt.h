#pragma once

#include "CoreMinimal.h"
#include "GameFramework/Actor.h"
#include "DojoP21Bolt.generated.h"

/** A bolt on the Ember Range: it knows who shot it and how hard it hits, and notes whether it knew the shooter when it began play. */
UCLASS()
class ADojoP21Bolt : public AActor
{
	GENERATED_BODY()

public:
	/** Creates the scene root and turns ticking off. */
	ADojoP21Bolt();

	/** How much health a critter loses when this bolt hits it. */
	UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "Bolt")
	int32 Damage = 5;

	/** The launcher that made this bolt; set by the launcher before the bolt begins play. */
	UPROPERTY(BlueprintReadWrite, Category = "Bolt")
	TObjectPtr<AActor> Shooter;

	/** True when the shooter was already set at the moment this bolt began play. */
	UPROPERTY(BlueprintReadOnly, Category = "Bolt")
	bool bShooterKnownAtBeginPlay = false;

protected:
	/** Notes whether a shooter was set at this moment. */
	virtual void BeginPlay() override;
};
