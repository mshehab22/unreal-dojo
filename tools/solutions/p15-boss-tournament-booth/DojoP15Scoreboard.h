#pragma once

#include "CoreMinimal.h"
#include "UObject/Interface.h"
#include "DojoP15Scoreboard.generated.h"

/** The reflected half of the scoreboard interface; it only exists so the engine can find the interface. */
UINTERFACE(MinimalAPI)
class UDojoP15Scoreboard : public UInterface
{
	GENERATED_BODY()
};

/** What anything that keeps the tournament's points must offer; the director knows this and nothing about the class behind it. */
class IDojoP15Scoreboard
{
	GENERATED_BODY()

public:
	/** Adds Points to Fighter's total. */
	virtual void AddPoints(FName Fighter, int32 Points) = 0;

	/** Fighter's total, or 0 for a fighter with no points. */
	virtual int32 GetPoints(FName Fighter) const = 0;
};
