#pragma once

#include "CoreMinimal.h"
#include "DojoP21Launcher.h"
#include "DojoP21FrostLauncher.generated.h"

/** A launcher whose bolts are always frost bolts. */
UCLASS()
class ADojoP21FrostLauncher : public ADojoP21Launcher
{
	GENERATED_BODY()

protected:
	/** Spawns a frost bolt at the muzzle and leaves it waiting for the launcher to finish it. */
	virtual ADojoP21Bolt* CreateBolt(const FTransform& Muzzle) override;
};
