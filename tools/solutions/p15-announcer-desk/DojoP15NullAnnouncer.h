#pragma once

#include "CoreMinimal.h"
#include "DojoP15Announcer.h"
#include "UObject/Object.h"
#include "DojoP15NullAnnouncer.generated.h"

/** The announcer that stands in when nobody has been provided: it takes every line and only counts it, so callers never meet a missing announcer. */
UCLASS(BlueprintType)
class UDojoP15NullAnnouncer : public UObject, public IDojoP15Announcer
{
	GENERATED_BODY()

public:
	/** Counts Line and drops it. */
	virtual void Announce(const FString& Line) override;

	/** How many lines have been dropped. */
	int32 GetAbsorbedCount() const;

private:
	/** Lines dropped so far. */
	int32 AbsorbedCount = 0;
};
