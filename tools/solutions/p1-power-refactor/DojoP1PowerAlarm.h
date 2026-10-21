#pragma once

#include "CoreMinimal.h"
#include "GameFramework/Actor.h"
#include "DojoP1PowerAlarm.generated.h"

class ADojoP1Generator;
class UTextRenderComponent;

/** An alarm that sounds whenever its generator stops; it listens to the generator, which never knows it (Observer: a listener). */
UCLASS()
class ADojoP1PowerAlarm : public AActor
{
	GENERATED_BODY()

public:
	/** Creates the label and turns ticking off. */
	ADojoP1PowerAlarm();

	/** Floating text that shows how often the alarm sounded. */
	UPROPERTY(VisibleAnywhere, Category = "Alarm")
	TObjectPtr<UTextRenderComponent> Label;

	/** The generator this alarm connects to when play starts, picked in the level. May be empty. */
	UPROPERTY(EditAnywhere, Category = "Alarm")
	TObjectPtr<ADojoP1Generator> Generator;

	/** Listens to a generator, dropping any earlier one. */
	UFUNCTION(BlueprintCallable, Category = "Alarm")
	void ConnectTo(ADojoP1Generator* NewGenerator);

	/** Sounds the alarm once. */
	UFUNCTION(BlueprintCallable, Category = "Alarm")
	void Sound();

	/** How many times the alarm has sounded. */
	UFUNCTION(BlueprintPure, Category = "Alarm")
	int32 GetTimesSounded() const;

protected:
	/** Connects to the generator picked in the level, if any, and shows the starting state. */
	virtual void BeginPlay() override;

	/** Stops listening, since the generator may outlive this device. */
	virtual void EndPlay(const EEndPlayReason::Type EndPlayReason) override;

private:
	/** Sounds the alarm when the generator stops. A UFUNCTION, because the delegate binds by name. */
	UFUNCTION()
	void HandlePowerChanged(bool bRunning);

	/** Removes this device's binding from the connected generator, if there is one. */
	void Disconnect();

	/** Writes Quiet, or ALARM and the count, into the label. */
	void RefreshLabel();

	/** The generator this device is bound to right now. */
	UPROPERTY(Transient)
	TObjectPtr<ADojoP1Generator> ConnectedGenerator;

	int32 TimesSounded = 0;
};
