#pragma once

#include "CoreMinimal.h"
#include "GameFramework/Actor.h"
#include "Quests/s3-saveable/DojoS3Restorable.h"
#include "DojoS3Door.generated.h"

class UDojoS3SaveableComponent;

/** A door whose open state survives a save: the state is a SaveGame property, and the swinging panel is brought back in line whenever that state is restored. */
UCLASS()
class ADojoS3Door : public AActor, public IDojoS3Restorable
{
	GENERATED_BODY()

public:
	/** Creates the frame, the panel, and the saveable part, and turns ticking off. */
	ADojoS3Door();

	/** The part that swings: a yaw of 90 when open and 0 when closed. */
	UPROPERTY(VisibleAnywhere, Category = "Door")
	TObjectPtr<USceneComponent> Panel;

	/** The part that saves this door. */
	UPROPERTY(VisibleAnywhere, Category = "Door")
	TObjectPtr<UDojoS3SaveableComponent> Saveable;

	/** Opens the door. */
	UFUNCTION(BlueprintCallable, Category = "Door")
	void Open();

	/** Closes the door. */
	UFUNCTION(BlueprintCallable, Category = "Door")
	void Close();

	/** Opens a closed door and closes an open one. */
	UFUNCTION(BlueprintCallable, Category = "Door")
	void Toggle();

	/** True while the door is open. */
	UFUNCTION(BlueprintPure, Category = "Door")
	bool IsOpen() const;

	/** The panel's yaw relative to the frame, in degrees. */
	UFUNCTION(BlueprintPure, Category = "Door")
	float GetPanelYaw() const;

	/** Swings the panel to match the restored state. */
	virtual void OnRestoredFromSave_Implementation() override;

protected:
	/** Shows the state the door was placed with. */
	virtual void BeginPlay() override;

private:
	/** Sets the state and swings the panel to match. */
	void SetOpen(bool bNewOpen);

	/** Turns the panel to the yaw the state calls for. */
	void ApplyPanel();

	/** Whether the door is open; saved. */
	UPROPERTY(EditAnywhere, SaveGame, Category = "Door")
	bool bOpen = false;
};
