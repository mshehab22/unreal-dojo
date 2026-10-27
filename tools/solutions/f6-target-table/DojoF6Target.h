#pragma once

#include "CoreMinimal.h"
#include "DojoF6TargetRow.h"
#include "GameFramework/Actor.h"
#include "DojoF6Target.generated.h"

class UTextRenderComponent;

/** A range target that takes its health and points from a table row and falls when its health runs out. */
UCLASS()
class ADojoF6Target : public AActor
{
	GENERATED_BODY()

public:
	/** Creates the health label and turns ticking off. */
	ADojoF6Target();

	/** Floating text that shows the health left. */
	UPROPERTY(VisibleAnywhere, Category = "Target")
	TObjectPtr<UTextRenderComponent> Label;

	/** Takes the kind's name, health, and points from a table row. */
	void ApplyRow(FName RowName, const FDojoF6TargetRow& Row);

	/** Takes Damage; returns true when that knocks the target down, and the target is then destroyed. */
	UFUNCTION(BlueprintCallable, Category = "Target")
	bool TakeShot(float Damage);

	/** The table row this target was made from. */
	UFUNCTION(BlueprintPure, Category = "Target")
	FName GetKind() const;

	/** Health left. */
	UFUNCTION(BlueprintPure, Category = "Target")
	float GetHealth() const;

	/** Points for knocking it down. */
	UFUNCTION(BlueprintPure, Category = "Target")
	int32 GetPoints() const;

private:
	/** Shows the health left on the label. */
	void ShowHealth();

	FName Kind;

	float Health = 1.f;

	int32 Points = 0;
};
