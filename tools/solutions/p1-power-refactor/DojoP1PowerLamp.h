#pragma once

#include "CoreMinimal.h"
#include "GameFramework/Actor.h"
#include "DojoP1PowerLamp.generated.h"

class ADojoP1Generator;
class UTextRenderComponent;

/** A lamp that is lit while its generator runs; it listens to the generator, which never knows it (Observer: a listener). */
UCLASS()
class ADojoP1PowerLamp : public AActor
{
	GENERATED_BODY()

public:
	/** Creates the label and turns ticking off. */
	ADojoP1PowerLamp();

	/** Floating text that shows ON or OFF. */
	UPROPERTY(VisibleAnywhere, Category = "Lamp")
	TObjectPtr<UTextRenderComponent> Label;

	/** The generator this lamp connects to when play starts, picked in the level. May be empty. */
	UPROPERTY(EditAnywhere, Category = "Lamp")
	TObjectPtr<ADojoP1Generator> Generator;

	/** Listens to a generator, dropping any earlier one, and matches its current state. */
	UFUNCTION(BlueprintCallable, Category = "Lamp")
	void ConnectTo(ADojoP1Generator* NewGenerator);

	/** Turns the lamp on or off. */
	UFUNCTION(BlueprintCallable, Category = "Lamp")
	void SetLit(bool bNewLit);

	/** True while the lamp is on. */
	UFUNCTION(BlueprintPure, Category = "Lamp")
	bool IsLit() const;

protected:
	/** Connects to the generator picked in the level, if any, and shows the starting state. */
	virtual void BeginPlay() override;

	/** Stops listening, since the generator may outlive this device. */
	virtual void EndPlay(const EEndPlayReason::Type EndPlayReason) override;

private:
	/** Matches the lamp to the new state. A UFUNCTION, because the delegate binds by name. */
	UFUNCTION()
	void HandlePowerChanged(bool bRunning);

	/** Removes this device's binding from the connected generator, if there is one. */
	void Disconnect();

	/** Writes ON or OFF into the label. */
	void RefreshLabel();

	/** The generator this device is bound to right now. */
	UPROPERTY(Transient)
	TObjectPtr<ADojoP1Generator> ConnectedGenerator;

	bool bLit = false;
};
