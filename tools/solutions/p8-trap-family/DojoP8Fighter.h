#pragma once

#include "CoreMinimal.h"
#include "GameFramework/Actor.h"
#include "DojoP8Fighter.generated.h"

class UTextRenderComponent;

/** A training fighter that traps can hurt; it goes down at zero health. */
UCLASS()
class ADojoP8Fighter : public AActor
{
	GENERATED_BODY()

public:
	/** Creates the label and turns ticking off. */
	ADojoP8Fighter();

	/** Floating text that shows the fighter's health. */
	UPROPERTY(VisibleAnywhere, Category = "Fighter")
	TObjectPtr<UTextRenderComponent> Label;

	/** Health at the start of play. */
	UPROPERTY(EditAnywhere, Category = "Fighter", meta = (ClampMin = "1"))
	float Health = 100.f;

	/** Loses Amount of health, never below zero. */
	UFUNCTION(BlueprintCallable, Category = "Fighter")
	void TakeHit(float Amount);

	/** Health left. */
	UFUNCTION(BlueprintPure, Category = "Fighter")
	float GetHealth() const;

	/** True at zero health. */
	UFUNCTION(BlueprintPure, Category = "Fighter")
	bool IsDown() const;

protected:
	/** Shows the starting health. */
	virtual void BeginPlay() override;

private:
	/** Writes the health into the label. */
	void RefreshLabel();
};
