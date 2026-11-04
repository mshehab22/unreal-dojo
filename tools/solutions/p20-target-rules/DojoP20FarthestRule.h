#pragma once

#include "CoreMinimal.h"
#include "DojoP20TargetRule.h"
#include "DojoP20FarthestRule.generated.h"

/** Aims at the standing dummy farthest from the launcher; on equal distance the earlier one in the list wins. */
UCLASS(Blueprintable, EditInlineNew)
class UDojoP20FarthestRule : public UDojoP20TargetRule
{
	GENERATED_BODY()

public:
	/** The standing dummy farthest from From, or INDEX_NONE when none is standing. */
	virtual int32 ChooseTarget(const FVector& From, const TArray<FDojoP20Candidate>& Candidates) const override;
};
