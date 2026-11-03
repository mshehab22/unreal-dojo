#pragma once

#include "CoreMinimal.h"
#include "DojoP15Scoreboard.h"
#include "UObject/Object.h"
#include "DojoP15NullScoreboard.generated.h"

/** The scoreboard that stands in when nobody has been provided: it takes every point and keeps none, so every total reads 0. */
UCLASS()
class UDojoP15NullScoreboard : public UObject, public IDojoP15Scoreboard
{
	GENERATED_BODY()

public:
	/** Counts the call and drops the points. */
	virtual void AddPoints(FName Fighter, int32 Points) override;

	/** Always 0. */
	virtual int32 GetPoints(FName Fighter) const override;

	/** How many AddPoints calls have been dropped. */
	int32 GetAbsorbedCount() const;

private:
	/** Calls dropped so far. */
	int32 AbsorbedCount = 0;
};
