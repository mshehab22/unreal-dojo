#pragma once

#include "CoreMinimal.h"
#include "DojoP20Candidate.h"
#include "UObject/Object.h"
#include "DojoP20TargetRule.generated.h"

/** The shape every targeting rule shares: given where the launcher is and the dummies, say which one to aim at. The launcher knows only this class. Strategy pattern. */
UCLASS(Abstract, Blueprintable, EditInlineNew) // @explain: Abstract stops anyone making a bare base rule, and EditInlineNew lets the Details panel create rules of its subclasses inside the object that owns them.
class UDojoP20TargetRule : public UObject
{
	GENERATED_BODY()

public:
	/** The index in Candidates of the dummy to aim at, or INDEX_NONE when there is none; the base rule never picks one. */
	virtual int32 ChooseTarget(const FVector& From, const TArray<FDojoP20Candidate>& Candidates) const;
};
