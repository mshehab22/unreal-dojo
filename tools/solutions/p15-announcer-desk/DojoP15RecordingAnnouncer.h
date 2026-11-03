#pragma once

#include "CoreMinimal.h"
#include "DojoP15Announcer.h"
#include "UObject/Object.h"
#include "DojoP15RecordingAnnouncer.generated.h"

/** An announcer that writes every line down instead of speaking it, so a test can read what was announced. */
UCLASS()
class UDojoP15RecordingAnnouncer : public UObject, public IDojoP15Announcer
{
	GENERATED_BODY()

public:
	/** Adds Line to the record. */
	virtual void Announce(const FString& Line) override;

	/** Every line announced so far, oldest first. */
	UFUNCTION(BlueprintPure, Category = "Announcer")
	const TArray<FString>& GetLines() const;

private:
	/** The lines announced so far. */
	UPROPERTY()
	TArray<FString> Lines;
};
