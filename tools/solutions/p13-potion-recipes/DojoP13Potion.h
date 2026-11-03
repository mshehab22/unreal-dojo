#pragma once

#include "CoreMinimal.h"
#include "DojoP13Instruction.h"
#include "DojoP13Stats.h"
#include "GameFramework/Actor.h"
#include "DojoP13Potion.generated.h"

/** A potion on a vault shelf whose effect is a recipe of steps a designer writes in the Details panel. Bytecode pattern. */
UCLASS()
class ADojoP13Potion : public AActor
{
	GENERATED_BODY()

public:
	/** Creates the scene root and turns ticking off. */
	ADojoP13Potion();

	/** The steps the potion runs on whoever drinks it, in order. */
	UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "Potion")
	TArray<FDojoP13Instruction> Recipe;

	/** Runs the recipe on Stats; false, with Stats unchanged, when the recipe is broken. */
	UFUNCTION(BlueprintCallable, Category = "Potion")
	bool Drink(UPARAM(ref) FDojoP13Stats& Stats) const;
};
