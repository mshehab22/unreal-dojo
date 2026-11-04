#pragma once

#include "CoreMinimal.h"
#include "DojoP15NullScoreboard.h"
#include "DojoP15Scoreboard.h"
#include "Subsystems/WorldSubsystem.h"
#include "DojoP15ScoreboardDesk.generated.h"

/** One per world: holds the scoreboard that is currently provided and passes every call to it, so callers never hold a scoreboard of their own. */
UCLASS()
class UDojoP15ScoreboardDesk : public UWorldSubsystem
{
	GENERATED_BODY()

public:
	/** Makes the do-nothing scoreboard and provides it, so the desk is never empty. */
	virtual void Initialize(FSubsystemCollectionBase& Collection) override;

	/** The desk of LevelWorld, or nullptr when there is no world. */
	static UDojoP15ScoreboardDesk* Locate(const UWorld* LevelWorld);

	/** Makes Provider the scoreboard; nullptr puts the do-nothing scoreboard back. Returns false, changing nothing, when Provider does not implement the scoreboard interface. */
	UFUNCTION(BlueprintCallable, Category = "Scoreboard")
	bool Install(UObject* Provider);

	/** Adds Points to Fighter's total on the scoreboard now in place. */
	UFUNCTION(BlueprintCallable, Category = "Scoreboard")
	void AddPoints(FName Fighter, int32 Points);

	/** Fighter's total on the scoreboard now in place. */
	UFUNCTION(BlueprintPure, Category = "Scoreboard")
	int32 GetPoints(FName Fighter) const;

	/** The object now in place. */
	UObject* GetProvider() const;

	/** The do-nothing scoreboard this desk owns. */
	UDojoP15NullScoreboard* GetNullScoreboard() const;

private:
	/** The scoreboard in place; any object that implements the interface. */
	UPROPERTY()
	TObjectPtr<UObject> Current;

	/** The do-nothing scoreboard, made once. */
	UPROPERTY()
	TObjectPtr<UDojoP15NullScoreboard> Silent;
};
