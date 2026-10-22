#pragma once

#include "CoreMinimal.h"
#include "DojoP7BallistaState.h"
#include "DojoP7BallistaIdle.generated.h"

/** The ballista at rest, waiting for something to aim at. */
UCLASS()
class UDojoP7BallistaIdle : public UDojoP7BallistaState
{
	GENERATED_BODY()

public:
	/** A target in view starts the aim. */
	virtual void OnTargetSpotted(ADojoP7Ballista* Ballista) override;

	/** Shows "Idle". */
	virtual FString GetLabelText() const override;
};
