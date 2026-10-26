#pragma once

#include "CoreMinimal.h"
#include "GameFramework/Actor.h"
#include "DojoP10Lantern.generated.h"

class UDojoP10LanternKind;
class UTextRenderComponent;

/** One lantern on the arena wall: its own fuel and lit state, and every tuning number read from its kind. Type Object pattern. */
UCLASS()
class ADojoP10Lantern : public AActor
{
	GENERATED_BODY()

public:
	/** Creates the label and lets the lantern tick. */
	ADojoP10Lantern();

	/** Shows the kind's name, lit or out. */
	UPROPERTY(VisibleAnywhere, Category = "Lantern")
	TObjectPtr<UTextRenderComponent> Label;

	/** What kind of lantern this is; when empty, the kind class's own defaults. */
	UPROPERTY(EditAnywhere, BlueprintReadOnly, Category = "Lantern")
	TObjectPtr<const UDojoP10LanternKind> Kind;

	/** Lights the lantern if it has fuel; returns whether it is lit. */
	UFUNCTION(BlueprintCallable, Category = "Lantern")
	bool Light();

	/** Fills the fuel back to the kind's FuelSeconds. */
	UFUNCTION(BlueprintCallable, Category = "Lantern")
	void Refuel();

	/** True while burning. */
	UFUNCTION(BlueprintPure, Category = "Lantern")
	bool IsLit() const;

	/** Seconds of fuel left in this lantern. */
	UFUNCTION(BlueprintPure, Category = "Lantern")
	float GetFuelLeft() const;

	/** Burns fuel while lit and goes out when it runs dry. */
	virtual void Tick(float DeltaSeconds) override;

protected:
	/** Fills the lantern from its kind. */
	virtual void BeginPlay() override;

private:
	/** The kind in use: Kind, or the kind class's defaults when Kind is empty. */
	const UDojoP10LanternKind* GetKind() const;

	/** Shows the kind's name, in the kind's color while lit and gray while out. */
	void RefreshLabel();

	/** This lantern's own fuel. */
	float FuelLeft = 0.f;

	/** This lantern's own lit state. */
	bool bLit = false;
};
