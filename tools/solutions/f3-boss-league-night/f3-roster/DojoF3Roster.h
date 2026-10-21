#pragma once

#include "CoreMinimal.h"
#include "GameFramework/Actor.h"
#include "DojoF3Roster.generated.h"

/** Remembers each player's best score by name and answers who leads; this boss version adds Clear. */
UCLASS()
class ADojoF3Roster : public AActor
{
	GENERATED_BODY()

public:
	/** Creates the scene root and turns ticking off. */
	ADojoF3Roster();

	/** Keeps Score as the player's best if it beats their old one; NAME_None is ignored. */
	UFUNCTION(BlueprintCallable, Category = "Roster")
	void RecordScore(FName Player, int32 Score);

	/** The player's best score, or 0 for a player with no score yet. */
	UFUNCTION(BlueprintPure, Category = "Roster")
	int32 GetBestFor(FName Player) const;

	/** The player with the highest best score; ties go to the name that sorts first; NAME_None when empty. */
	UFUNCTION(BlueprintPure, Category = "Roster")
	FName GetLeader() const;

	/** How many players have a score. */
	UFUNCTION(BlueprintPure, Category = "Roster")
	int32 GetPlayerCount() const;

	/** Boss addition: forgets every player, for a new league. */
	UFUNCTION(BlueprintCallable, Category = "Roster")
	void Clear();

private:
	/** Best score per player name. */
	UPROPERTY(VisibleInstanceOnly, Category = "Roster")
	TMap<FName, int32> BestScores;
};
