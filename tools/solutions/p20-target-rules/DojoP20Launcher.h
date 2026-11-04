#pragma once

#include "CoreMinimal.h"
#include "DojoP20Candidate.h"
#include "DojoP20TargetRule.h"
#include "GameFramework/Actor.h"
#include "DojoP20Launcher.generated.h"

/** A practice launcher that fires at whichever dummy its targeting rule picks; the rule is an object a designer chooses and tunes on each launcher. Strategy pattern. */
UCLASS()
class ADojoP20Launcher : public AActor
{
	GENERATED_BODY()

public:
	/** Creates the scene root and turns ticking off. */
	ADojoP20Launcher();

	/** The dummies in the yard, in the order they were set up. */
	UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "Launcher")
	TArray<FDojoP20Candidate> Candidates;

	/** The rule that picks the target; a designer chooses its class in Details and tunes its settings there. */
	UPROPERTY(EditAnywhere, BlueprintReadWrite, Instanced, Category = "Launcher")
	TObjectPtr<UDojoP20TargetRule> Rule; // @explain: Instanced makes the Details panel offer a list of rule classes and create the rule inside this launcher, so each launcher owns and tunes its own rule.

	/** The name of the dummy the rule picks from the launcher's own place, or NAME_None when there is no rule or no dummy to pick. */
	UFUNCTION(BlueprintCallable, Category = "Launcher")
	FName PickTarget() const;

	/** Picks a target, remembers it as the last target, counts the shot, and returns it; NAME_None counts as a shot at nothing. */
	UFUNCTION(BlueprintCallable, Category = "Launcher")
	FName Fire();

	/** The target of the last shot, or NAME_None. */
	UFUNCTION(BlueprintPure, Category = "Launcher")
	FName GetLastTarget() const;

	/** How many shots have been fired. */
	UFUNCTION(BlueprintPure, Category = "Launcher")
	int32 GetShotCount() const;

private:
	/** The target of the last shot. */
	FName LastTarget = NAME_None;

	/** Shots fired. */
	int32 ShotCount = 0;
};
