#pragma once

#include "CoreMinimal.h"
#include "DojoS3Restorable.h"
#include "GameFramework/Actor.h"
#include "DojoS3Lantern.generated.h"

class UDojoS3SaveableComponent;

/** A lantern used to try saving: two properties are marked SaveGame and one is not, and it counts how often it was told it was restored. */
UCLASS()
class ADojoS3Lantern : public AActor, public IDojoS3Restorable
{
	GENERATED_BODY()

public:
	/** Creates the scene root and the saveable component and turns ticking off. */
	ADojoS3Lantern();

	/** The part that saves this lantern. */
	UPROPERTY(VisibleAnywhere, Category = "Lantern")
	TObjectPtr<UDojoS3SaveableComponent> Saveable;

	/** Whether the lantern is lit; saved. */
	UPROPERTY(EditAnywhere, SaveGame, Category = "Lantern")
	bool bLit = false;

	/** Oil left; saved. */
	UPROPERTY(EditAnywhere, SaveGame, Category = "Lantern")
	int32 Oil = 10;

	/** The glass color; a look, not progress, so not saved. */
	UPROPERTY(EditAnywhere, Category = "Lantern")
	FLinearColor Tint = FLinearColor::White;

	/** How many times the lantern heard it was restored. */
	int32 RestoreCount = 0;

	/** Counts the restore. */
	virtual void OnRestoredFromSave_Implementation() override;
};
