#pragma once

#include "CoreMinimal.h"
#include "GameFramework/Actor.h"
#include "DojoP14FinishLine.generated.h"

class UDojoP14LapLog;

/** A finish line that times each driver's laps and writes them into the log it was handed. */
UCLASS()
class ADojoP14FinishLine : public AActor
{
	GENERATED_BODY()

public:
	/** Creates the scene root and turns ticking off. */
	ADojoP14FinishLine();

	/** From now on, finished laps go into NewLog; nullptr stops the line timing. */
	UFUNCTION(BlueprintCallable, Category = "Finish Line")
	void UseLog(UDojoP14LapLog* NewLog);

	/** The log finished laps go into, or nullptr. */
	UFUNCTION(BlueprintPure, Category = "Finish Line")
	UDojoP14LapLog* GetLog() const;

	/** Driver crosses the line at Now seconds: the first crossing starts a lap, each later one writes the finished lap into the log and starts the next. False, timing nothing, while the line has no log. */
	UFUNCTION(BlueprintCallable, Category = "Finish Line")
	bool CrossLine(FName Driver, float Now);

private:
	/** The log this line writes into. */
	UPROPERTY()
	TObjectPtr<UDojoP14LapLog> Log;

	/** When each driver's current lap started. */
	TMap<FName, float> LapStarts;
};
