#pragma once

#include "CoreMinimal.h"
#include "Components/ActorComponent.h"
#include "DojoF6LevelComponent.generated.h"

class UCurveFloat;

/** Turns XP into levels using a designer-drawn curve of how much XP each level needs, so the pace is tuned without code. */
UCLASS(ClassGroup = (Dojo), meta = (BlueprintSpawnableComponent))
class UDojoF6LevelComponent : public UActorComponent
{
	GENERATED_BODY()

public:
	/** Turns ticking off; levels only change when XP is added. */
	UDojoF6LevelComponent();

	/** XP needed to leave each level: X is the current level, Y the XP. */
	UPROPERTY(EditAnywhere, BlueprintReadOnly, Category = "Level")
	TObjectPtr<UCurveFloat> XPCurve;

	/** The top level; XP stops counting there. */
	UPROPERTY(EditAnywhere, BlueprintReadOnly, Category = "Level", meta = (ClampMin = "1"))
	int32 MaxLevel = 5;

	/** Adds XP, levels up when the XP covers the next level, and returns how many levels were gained. */
	UFUNCTION(BlueprintCallable, Category = "Level")
	int32 AddXP(float Amount);

	/** Back to level 1 with no XP. */
	UFUNCTION(BlueprintCallable, Category = "Level")
	void ResetProgress();

	/** The current level, starting at 1. */
	UFUNCTION(BlueprintPure, Category = "Level")
	int32 GetLevel() const;

	/** XP gathered toward the next level. */
	UFUNCTION(BlueprintPure, Category = "Level")
	float GetXP() const;

	/** XP needed to leave the current level, read from the curve; 0 at the top level or with no curve. */
	UFUNCTION(BlueprintPure, Category = "Level")
	float GetXPToNext() const;

private:
	/** The current level, shown read-only in Details so the editor step can check it. */
	UPROPERTY(VisibleAnywhere, Category = "Level")
	int32 Level = 1;

	/** XP gathered toward the next level, shown read-only in Details. */
	UPROPERTY(VisibleAnywhere, Category = "Level")
	float XP = 0.f;
};
