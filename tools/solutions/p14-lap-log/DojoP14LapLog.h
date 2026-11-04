#pragma once

#include "CoreMinimal.h"
#include "UObject/Object.h"
#include "DojoP14LapLog.generated.h"

/** One timed lap: who drove it and how many seconds it took. */
USTRUCT(BlueprintType)
struct FDojoP14Lap
{
	GENERATED_BODY()

	/** Who drove the lap. */
	UPROPERTY(VisibleAnywhere, BlueprintReadOnly, Category = "Laps")
	FName Driver;

	/** How long the lap took. */
	UPROPERTY(VisibleAnywhere, BlueprintReadOnly, Category = "Laps")
	float Seconds = 0.f;
};

/** A book of lap times. Whoever makes one decides which finish lines write in it; it knows nothing about tracks. */
UCLASS(BlueprintType)
class UDojoP14LapLog : public UObject
{
	GENERATED_BODY()

public:
	/** Writes one finished lap. */
	UFUNCTION(BlueprintCallable, Category = "Laps")
	void Record(FName Driver, float Seconds);

	/** Every lap written so far, oldest first. */
	UFUNCTION(BlueprintPure, Category = "Laps")
	TArray<FDojoP14Lap> GetLaps() const;

	/** How many laps Driver has in this log. */
	UFUNCTION(BlueprintPure, Category = "Laps")
	int32 GetLapCountFor(FName Driver) const;

	/** Driver's fastest lap in this log, or 0 when they have none. */
	UFUNCTION(BlueprintPure, Category = "Laps")
	float GetBestFor(FName Driver) const;

private:
	/** Every lap written so far, oldest first. */
	UPROPERTY()
	TArray<FDojoP14Lap> Laps;
};
