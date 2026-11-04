#pragma once

#include "CoreMinimal.h"
#include "UObject/Interface.h"
#include "DojoP15Announcer.generated.h"

/** The reflected half of the announcer interface; it only exists so the engine can find the interface. */
UINTERFACE(MinimalAPI)
class UDojoP15Announcer : public UInterface
{
	GENERATED_BODY()
};

/** What anything that speaks a line for the dojo must offer; callers know this and nothing about the class behind it. */
class IDojoP15Announcer
{
	GENERATED_BODY()

public:
	/** Speaks Line in whatever way this announcer does. */
	virtual void Announce(const FString& Line) = 0;
};
