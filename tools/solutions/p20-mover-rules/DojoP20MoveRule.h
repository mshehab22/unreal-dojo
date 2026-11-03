#pragma once

#include "CoreMinimal.h"
#include "UObject/Object.h"
#include "DojoP20MoveRule.generated.h"

/** The shape every movement rule shares: given where a dummy is, where it started, and how long the step lasts, say where it goes next. A rule may remember things between steps, so each mover needs a rule object of its own. Strategy pattern. */
UCLASS(Abstract, Blueprintable, EditInlineNew)
class UDojoP20MoveRule : public UObject
{
	GENERATED_BODY()

public:
	/** Where the dummy goes after DeltaSeconds; the base rule leaves it where it is. */
	virtual FVector NextLocation(const FVector& Current, const FVector& Anchor, float DeltaSeconds);
};
