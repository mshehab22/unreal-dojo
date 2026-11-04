#pragma once

#include "CoreMinimal.h"
#include "Quests/p20-target-rules/DojoP20Candidate.h"
#include "Quests/p20-target-rules/DojoP20TargetRule.h"
#include "GameFramework/Actor.h"
#include "DojoP20Turret.generated.h"

/** The yard's turret: it fires at whichever dummy its targeting rule picks, and the rule is an object a designer chooses on each turret. Strategy pattern. */
UCLASS()
class ADojoP20Turret : public AActor
{
	GENERATED_BODY()

public:
	/** Creates the scene root and turns ticking off. */
	ADojoP20Turret();

	/** The dummies in the yard, in the order they were set up. */
	UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "Turret")
	TArray<FDojoP20Candidate> Candidates;

	/** The rule that picks the target. */
	UPROPERTY(EditAnywhere, BlueprintReadWrite, Instanced, Category = "Turret")
	TObjectPtr<UDojoP20TargetRule> Rule;

	/** The name of the dummy the rule picks from the turret's own place, or NAME_None when there is no rule or no dummy to pick. */
	UFUNCTION(BlueprintCallable, Category = "Turret")
	FName PickTarget() const;

	/** Picks a target, remembers it, counts the shot, and returns it. */
	UFUNCTION(BlueprintCallable, Category = "Turret")
	FName Fire();

	/** The target of the last shot, or NAME_None. */
	UFUNCTION(BlueprintPure, Category = "Turret")
	FName GetLastTarget() const;

	/** How many shots have been fired. */
	UFUNCTION(BlueprintPure, Category = "Turret")
	int32 GetShotCount() const;

private:
	/** The target of the last shot. */
	FName LastTarget = NAME_None;

	/** Shots fired. */
	int32 ShotCount = 0;
};
