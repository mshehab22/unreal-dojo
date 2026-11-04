#pragma once

#include "CoreMinimal.h"
#include "UObject/Object.h"
#include "DojoP15LoudSpeaker.generated.h"

/** A speaker that shouts a line into the Output Log; it knows nothing about the announcer interface. */
UCLASS()
class UDojoP15LoudSpeaker : public UObject
{
	GENERATED_BODY()

public:
	/** Writes Line to the Output Log in capitals. */
	void Shout(const FString& Line);

	/** How many lines this speaker has shouted. */
	int32 GetShoutCount() const;

private:
	/** Lines shouted so far. */
	int32 ShoutCount = 0;
};
