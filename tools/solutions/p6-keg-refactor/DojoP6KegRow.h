#pragma once

#include "CoreMinimal.h"
#include "GameFramework/Actor.h"
#include "DojoP6KegRow.generated.h"

class UTextRenderComponent;

/** A row of powder kegs along the arena wall: a keg that blows sets off the kegs on either side of it on the next tick, one wave per tick (Event Queue: detonations are posted and handled later, never inside one another). */
UCLASS()
class ADojoP6KegRow : public AActor
{
	GENERATED_BODY()

public:
	/** Creates the label, fills the row, and turns ticking on. */
	ADojoP6KegRow();

	/** Floating text that draws the row: o for a keg, * for one that has blown. */
	UPROPERTY(VisibleAnywhere, Category = "Kegs")
	TObjectPtr<UTextRenderComponent> Label;

	/** Refills the row with Count fresh kegs. */
	UFUNCTION(BlueprintCallable, Category = "Kegs")
	void ResetRow(int32 Count);

	/** Asks for one keg to blow on the next tick; kegs off the row and kegs already blown are ignored. */
	UFUNCTION(BlueprintCallable, Category = "Kegs")
	void Detonate(int32 Keg);

	/** How many kegs have blown. */
	UFUNCTION(BlueprintPure, Category = "Kegs")
	int32 GetBlownCount() const;

	/** True once a keg has blown. */
	UFUNCTION(BlueprintPure, Category = "Kegs")
	bool IsBlown(int32 Keg) const;

	/** The most explosions that were ever running inside one another at the same moment. */
	UFUNCTION(BlueprintPure, Category = "Kegs")
	int32 GetDeepestChain() const;

	/** Blows this tick's wave of kegs; their neighbors are posted for the next wave. */
	virtual void Tick(float DeltaSeconds) override;

private:
	/** Blows one keg now and posts its neighbors. */
	void Blow(int32 Keg);

	/** Writes the row into the label. */
	void RefreshLabel();

	/** Kegs posted to blow on the next tick. */
	TArray<int32> PendingKegs;

	/** Which kegs have blown. */
	TArray<bool> Blown;

	int32 BlownCount = 0;
	int32 CurrentDepth = 0;
	int32 DeepestChain = 0;
};
