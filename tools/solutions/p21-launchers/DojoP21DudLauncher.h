#pragma once

#include "CoreMinimal.h"
#include "DojoP21Launcher.h"
#include "DojoP21DudLauncher.generated.h"

/** A launcher that is out of bolts and can never make one. */
UCLASS()
class ADojoP21DudLauncher : public ADojoP21Launcher
{
	GENERATED_BODY()

protected:
	/** Makes nothing. */
	virtual ADojoP21Bolt* CreateBolt(const FTransform& Muzzle) override;
};
