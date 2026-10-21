#pragma once

#include "CoreMinimal.h"
#include "GameFramework/Actor.h"
#include "DojoF1TrainingDummy.generated.h"

class UTextRenderComponent;

/** A practice dummy that counts strikes and tips over after a set number of them; this boss version adds ResetHits. */
UCLASS()
class ADojoF1TrainingDummy : public AActor
{
	GENERATED_BODY()

public:
	/** Creates the label and turns ticking off. */
	ADojoF1TrainingDummy();

	/** Floating text above the dummy that shows the strikes left. */
	UPROPERTY(VisibleAnywhere, Category = "Dummy")
	TObjectPtr<UTextRenderComponent> Label;

	/** How many strikes knock the dummy down. */
	UPROPERTY(EditAnywhere, BlueprintReadOnly, Category = "Dummy", meta = (ClampMin = "1"))
	int32 HitsToKnockDown = 3;

	/** Counts one strike, unless the dummy is already down. */
	UFUNCTION(BlueprintCallable, Category = "Dummy")
	void Strike();

	/** Strikes counted so far. */
	UFUNCTION(BlueprintPure, Category = "Dummy")
	int32 GetHitsTaken() const;

	/** True once the dummy has taken HitsToKnockDown strikes. */
	UFUNCTION(BlueprintPure, Category = "Dummy")
	bool IsKnockedDown() const;

	/** Boss addition: clears the strikes so the dummy stands up for a new round. */
	UFUNCTION(BlueprintCallable, Category = "Dummy")
	void ResetHits();

protected:
	/** Shows the starting count on the label. */
	virtual void BeginPlay() override;

private:
	/** Writes the strikes left, or DOWN, into the label. */
	void RefreshLabel();

	int32 HitsTaken = 0;
};
