#pragma once

#include "CoreMinimal.h"
#include "DojoP15Scoreboard.h"
#include "UObject/Object.h"
#include "DojoP15MemoryScoreboard.generated.h"

/** A scoreboard that keeps each fighter's total in memory for as long as it lives. */
UCLASS()
class UDojoP15MemoryScoreboard : public UObject, public IDojoP15Scoreboard
{
	GENERATED_BODY()

public:
	/** Adds Points to Fighter's total. */
	virtual void AddPoints(FName Fighter, int32 Points) override;

	/** Fighter's total, or 0 for a fighter with no points. */
	virtual int32 GetPoints(FName Fighter) const override;

private:
	/** Each fighter's total. */
	UPROPERTY()
	TMap<FName, int32> Totals;
};
