#pragma once

#include "CoreMinimal.h"
#include "DojoP21Bolt.h"
#include "GameFramework/Actor.h"
#include "DojoP21Launcher.generated.h"

/** The creator: it fires a bolt every time it is asked and leaves the choice of which kind of bolt to its subclasses. */
UCLASS(Abstract)
class ADojoP21Launcher : public AActor
{
	GENERATED_BODY()

public:
	/** Creates the scene root and turns ticking off. */
	ADojoP21Launcher();

	/** How far in front of the launcher a bolt appears. */
	UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "Launcher")
	float MuzzleDistance = 50.f;

	/** How many bolts this launcher has fired. */
	UPROPERTY(BlueprintReadOnly, Category = "Launcher")
	int32 ShotsFired = 0;

	/** Fires one bolt from the muzzle and returns it, or returns nullptr and counts nothing when no bolt could be made. */
	UFUNCTION(BlueprintCallable, Category = "Launcher")
	ADojoP21Bolt* Fire();

protected:
	/** Makes one bolt at the muzzle, spawned but not yet begun play, or nullptr when it cannot. */
	virtual ADojoP21Bolt* CreateBolt(const FTransform& Muzzle) PURE_VIRTUAL(ADojoP21Launcher::CreateBolt, return nullptr;); // @explain: The base says that a bolt must be made here but not which kind; every subclass answers, and Fire never needs to know the answer.
};
