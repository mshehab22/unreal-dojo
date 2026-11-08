#pragma once

#include "CoreMinimal.h"
#include "DojoP20MoveRule.h"
#include "DojoP20StandRule.generated.h"

/** The dummy stands where it is. */
UCLASS(Blueprintable, EditInlineNew)
class UDojoP20StandRule : public UDojoP20MoveRule
{
	GENERATED_BODY()

public:
	/** Returns Current unchanged. */
	virtual FVector NextLocation(const FVector& Current, const FVector& Anchor, float DeltaSeconds) override;
};
