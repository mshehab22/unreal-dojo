#pragma once

#include "CoreMinimal.h"
#include "Quests/p20-mover-rules/DojoP20MoveRule.h"
#include "DojoP20DummyPlan.generated.h"

/** One practice dummy of the yard, as the designer sets it up: its name, where it starts, how much health it has, and the movement rule class that moves it. */
USTRUCT(BlueprintType)
struct FDojoP20DummyPlan
{
	GENERATED_BODY()

	/** The dummy's name. */
	UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "Dummy")
	FName DummyName = NAME_None;

	/** Where the dummy starts every round. */
	UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "Dummy")
	FVector StartLocation = FVector::ZeroVector;

	/** The health the dummy starts every round with. */
	UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "Dummy", meta = (ClampMin = "1"))
	int32 StartHealth = 30;

	/** The class of the rule that moves the dummy; empty means it stands still. */
	UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "Dummy")
	TSubclassOf<UDojoP20MoveRule> MoveRuleClass;
};
