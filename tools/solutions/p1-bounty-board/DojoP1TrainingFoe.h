#pragma once

#include "CoreMinimal.h"
#include "GameFramework/Actor.h"
#include "DojoP1TrainingFoe.generated.h"

class ADojoP1TrainingFoe;
class UTextRenderComponent;

/** Fired once when a foe falls; carries the foe so a listener watching several can tell them apart. */
DECLARE_MULTICAST_DELEGATE_OneParam(FDojoP1OnFoeDefeated, ADojoP1TrainingFoe*);

/** An arena foe that falls after enough hits and announces it to whoever listens (Observer: this is the subject). */
UCLASS()
class ADojoP1TrainingFoe : public AActor
{
	GENERATED_BODY()

public:
	/** Creates the label and turns ticking off. */
	ADojoP1TrainingFoe();

	/** Floating text that shows the hits left, or DOWN. */
	UPROPERTY(VisibleAnywhere, Category = "Foe")
	TObjectPtr<UTextRenderComponent> Label;

	/** Hits that knock this foe down. */
	UPROPERTY(EditAnywhere, BlueprintReadOnly, Category = "Foe", meta = (ClampMin = "1"))
	int32 HitsToDefeat = 1;

	/** Counts one hit; the hit that knocks the foe down also announces the defeat. A fallen foe ignores hits. */
	UFUNCTION(BlueprintCallable, Category = "Foe")
	void TakeHit();

	/** True once the foe has taken HitsToDefeat hits. */
	UFUNCTION(BlueprintPure, Category = "Foe")
	bool IsDefeated() const;

	/** Fired once, after the foe falls. C++ listeners bind with AddUObject. */
	FDojoP1OnFoeDefeated OnDefeated;

protected:
	/** Shows the starting hit count on the label. */
	virtual void BeginPlay() override;

private:
	/** Writes the hits left, or DOWN, into the label. */
	void RefreshLabel();

	int32 HitsTaken = 0;
};
