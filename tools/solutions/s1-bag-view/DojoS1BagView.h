#pragma once

#include "CoreMinimal.h"
#include "GameFramework/Actor.h"
#include "DojoS1BagView.generated.h"

class UDojoS1EquipmentComponent;
class UDojoS1InventoryComponent;
class UTextRenderComponent;

/** Shows a bag and its wearer's equipment as text and rewrites itself whenever either announces a change; it never checks on them. */
UCLASS()
class ADojoS1BagView : public AActor
{
	GENERATED_BODY()

public:
	/** Creates the text display and turns ticking off. */
	ADojoS1BagView();

	/** The text the view shows: the weight, one line per bag slot, then the worn items and the total power. */
	UPROPERTY(VisibleAnywhere, Category = "Bag View")
	TObjectPtr<UTextRenderComponent> Display;

	/** Starts showing this bag and equipment, and stops showing and listening to the ones shown before; either one missing leaves the display empty. */
	UFUNCTION(BlueprintCallable, Category = "Bag View")
	void Show(UDojoS1InventoryComponent* Bag, UDojoS1EquipmentComponent* Wearer);

protected:
	/** Stops listening when the view leaves play. */
	virtual void EndPlay(const EEndPlayReason::Type EndPlayReason) override;

private:
	/** The bag changed, so the text is rewritten. */
	UFUNCTION()
	void HandleBagChanged(UDojoS1InventoryComponent* Inventory);

	/** The equipment changed, so the text is rewritten. */
	UFUNCTION()
	void HandleEquipmentChanged(UDojoS1EquipmentComponent* Equipment);

	/** Writes the whole text from the bag and equipment as they are now. */
	void Refresh();

	/** Unbinds from the bag and equipment shown now, if any. */
	void StopListening();

	UPROPERTY()
	TObjectPtr<UDojoS1InventoryComponent> ShownBag;

	UPROPERTY()
	TObjectPtr<UDojoS1EquipmentComponent> ShownEquipment;
};
