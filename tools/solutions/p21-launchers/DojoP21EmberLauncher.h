#pragma once

#include "CoreMinimal.h"
#include "DojoP21Launcher.h"
#include "DojoP21EmberLauncher.generated.h"

/** A launcher whose bolts are always ember bolts. */
UCLASS()
class ADojoP21EmberLauncher : public ADojoP21Launcher
{
	GENERATED_BODY()

protected:
	/** Spawns an ember bolt at the muzzle and leaves it waiting for the launcher to finish it. */
	virtual ADojoP21Bolt* CreateBolt(const FTransform& Muzzle) override;
};
