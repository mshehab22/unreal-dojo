#pragma once

#include "CoreMinimal.h"
#include "GameFramework/Actor.h"
#include "DojoM7PlateGate.generated.h"

class ADojoM7SignalPlate;
class UBoxComponent;
class USceneComponent;

/** Broadcast when a gate's panel arrives fully open or fully closed. */
DECLARE_DYNAMIC_MULTICAST_DELEGATE(FDojoM7OnGateMoved);

/** A gate whose panel rises at a steady speed while every plate it is given is pressed and sinks back otherwise; it listens to its plates, which never know it exists. */
UCLASS()
class ADojoM7PlateGate : public AActor
{
	GENERATED_BODY()

public:
	/** Creates the frame as the root and the blocking panel inside it. */
	ADojoM7PlateGate();

	/** The gate's fixed frame; the panel moves inside it. */
	UPROPERTY(VisibleAnywhere, BlueprintReadOnly, Category = "Gate")
	TObjectPtr<USceneComponent> Frame;

	/** The solid panel that blocks the way and rises to open. */
	UPROPERTY(VisibleAnywhere, BlueprintReadOnly, Category = "Gate")
	TObjectPtr<UBoxComponent> Panel;

	/** The plates this gate needs. */
	UPROPERTY(EditAnywhere, Category = "Gate")
	TArray<TObjectPtr<ADojoM7SignalPlate>> Plates;

	/** How far the panel rises to open. */
	UPROPERTY(EditAnywhere, Category = "Gate", meta = (ClampMin = "0", Units = "cm"))
	float OpenHeight = 300.f;

	/** How long a full trip up or down takes. */
	UPROPERTY(EditAnywhere, Category = "Gate", meta = (ClampMin = "0.05", Units = "s"))
	float OpenSeconds = 0.8f;

	/** Fires once each time the panel arrives fully open. */
	UPROPERTY(BlueprintAssignable, Category = "Gate")
	FDojoM7OnGateMoved OnOpened;

	/** Fires once each time the panel arrives fully closed after having been fully open. */
	UPROPERTY(BlueprintAssignable, Category = "Gate")
	FDojoM7OnGateMoved OnClosed;

	/** Listens to every valid plate in Plates, never twice, and decides whether the gate wants to be open now; safe to call again after adding plates. */
	UFUNCTION(BlueprintCallable, Category = "Gate")
	void BindPlates();

	/** True while the panel is heading for, or standing at, fully open. */
	UFUNCTION(BlueprintPure, Category = "Gate")
	bool WantsOpen() const;

	/** How far open the panel is, from 0 closed to 1 fully open. */
	UFUNCTION(BlueprintPure, Category = "Gate")
	float GetOpenFraction() const;

	/** True while the panel stands fully open. */
	UFUNCTION(BlueprintPure, Category = "Gate")
	bool IsOpen() const;

	/** Moves the panel toward open or closed at a steady speed and announces each arrival. */
	virtual void Tick(float DeltaSeconds) override;

protected:
	/** Listens to the plates placed in Details. */
	virtual void BeginPlay() override;

private:
	/** Runs when one of the gate's plates is pressed or released, and once for each plate when the plates are bound; decides whether the gate wants to be open. */
	UFUNCTION()
	void HandlePlateChanged(ADojoM7SignalPlate* Plate);

	/** The panel's height one frame later: a steady OpenHeight / OpenSeconds cm per second toward TargetHeight, landing exactly on it. */
	float StepHeight(float Height, float TargetHeight, float DeltaSeconds) const;

	/** Whether the panel is heading for fully open. */
	bool bWantsOpen = false;

	/** Set on arriving fully open and cleared on arriving closed, so OnClosed follows only a real opening. */
	bool bHasOpened = false;
};
