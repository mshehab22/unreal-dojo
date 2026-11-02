#pragma once

#include "CoreMinimal.h"
#include "Components/ActorComponent.h"
#include "InputCoreTypes.h"
#include "DojoM1PauseSwitch.generated.h"

class UEnhancedInputLocalPlayerSubsystem;
class UInputAction;
class UInputMappingContext;

/** A switch that lays a high-priority context over the player's controls so chosen keys stop reaching the game, and takes it away again. */
UCLASS(ClassGroup = (Dojo), meta = (BlueprintSpawnableComponent))
class UDojoM1PauseSwitch : public UActorComponent
{
	GENERATED_BODY()

public:
	/** Turns ticking off and lists the default keys to swallow. */
	UDojoM1PauseSwitch();

	/** The keys that stop working while the switch is open. */
	UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "Pause")
	TArray<FKey> BlockedKeys;

	/** The priority of the pause context; a context with a higher number is offered a key first. */
	UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "Pause")
	int32 PausePriority = 10;

	/** True if the pause hides its keys from the contexts below it; false lets them through to both. */
	UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "Pause")
	bool bConsumeKeys = true;

	/** The action every blocked key is mapped to; nothing listens to it. Built the first time the switch opens. */
	UPROPERTY(VisibleAnywhere, BlueprintReadOnly, Category = "Pause")
	TObjectPtr<UInputAction> SwallowAction;

	/** The context that holds the blocked keys; rebuilt each time the switch opens. */
	UPROPERTY(VisibleAnywhere, BlueprintReadOnly, Category = "Pause")
	TObjectPtr<UInputMappingContext> PauseContext;

	/** Adds the pause context to the first local player; does nothing if already open or if there is no local player. */
	UFUNCTION(BlueprintCallable, Category = "Pause")
	void Open();

	/** Removes the pause context; does nothing if the switch is not open. */
	UFUNCTION(BlueprintCallable, Category = "Pause")
	void Close();

	/** Opens the switch if it is closed and closes it if it is open. */
	UFUNCTION(BlueprintCallable, Category = "Pause")
	void Toggle();

	/** True while the pause context is added. */
	UFUNCTION(BlueprintPure, Category = "Pause")
	bool IsOpen() const;

private:
	/** The Enhanced Input subsystem of the first local player, or null when there is none. */
	UEnhancedInputLocalPlayerSubsystem* FindSubsystem() const;

	/** Builds the swallow action and a fresh context mapping every blocked key to it. */
	void BuildContext();

	bool bOpen = false;
};
