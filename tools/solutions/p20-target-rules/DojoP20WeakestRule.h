#pragma once

#include "CoreMinimal.h"
#include "DojoP20TargetRule.h"
#include "DojoP20WeakestRule.generated.h"

/** Aims at the standing dummy with the least health; on equal health the earlier one in the list wins. */
UCLASS(Blueprintable, EditInlineNew)
class UDojoP20WeakestRule : public UDojoP20TargetRule
{
	GENERATED_BODY()

public:
	/** The standing dummy with the lowest health, or INDEX_NONE when none is standing. */
	virtual int32 ChooseTarget(const FVector& From, const TArray<FDojoP20Candidate>& Candidates) const override;
};
