#pragma once

#include "CoreMinimal.h"
#include "DojoP23FighterPlan.generated.h"

/** One fighter of the night as the designer sets it up: its name, team, health, loot, and where it stands. */
USTRUCT(BlueprintType)
struct FDojoP23FighterPlan
{
	GENERATED_BODY()

	/** The fighter's name, which the herald announces. */
	UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "Fighter")
	FName FighterName = NAME_None;

	/** The fighter's team, 1 or 2. */
	UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "Fighter", meta = (ClampMin = "1"))
	int32 Team = 1;

	/** The health the fighter starts every night with. */
	UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "Fighter", meta = (ClampMin = "1.0"))
	float MaxHealth = 40.f;

	/** The item the fighter drops when it goes down. */
	UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "Fighter")
	FName LootItem = TEXT("Coin");

	/** How many of the item drop. */
	UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "Fighter", meta = (ClampMin = "1"))
	int32 LootCount = 1;

	/** Where the fighter stands. */
	UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "Fighter")
	FVector StartLocation = FVector::ZeroVector;
};
