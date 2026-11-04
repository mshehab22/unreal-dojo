#pragma once

#include "CoreMinimal.h"
#include "Components/ActorComponent.h"
#include "DojoS3SaveableComponent.generated.h"

/** Makes its owner saveable (the Component pattern): it names the owner with a save id and turns the owner's SaveGame properties into bytes and back, knowing nothing about slots or who saves. */
UCLASS(ClassGroup = (Dojo), meta = (BlueprintSpawnableComponent))
class UDojoS3SaveableComponent : public UActorComponent
{
	GENERATED_BODY()

public:
	/** Turns ticking off; the component only reacts to calls. */
	UDojoS3SaveableComponent();

	/** The name this actor is saved under; unique in the level, and the same every time the level loads. */
	UPROPERTY(EditAnywhere, BlueprintReadOnly, Category = "Save")
	FName SaveId;

	/** The owner's SaveGame properties, written into bytes; empty when there is no owner. */
	UFUNCTION(BlueprintCallable, Category = "Save")
	TArray<uint8> CaptureState() const;

	/** Reads bytes from CaptureState back into the owner's SaveGame properties, then tells a restorable owner; false for empty bytes or no owner. */
	UFUNCTION(BlueprintCallable, Category = "Save")
	bool RestoreState(const TArray<uint8>& Bytes);
};
