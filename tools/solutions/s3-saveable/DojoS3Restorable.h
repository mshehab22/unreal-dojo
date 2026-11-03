#pragma once

#include "CoreMinimal.h"
#include "UObject/Interface.h"
#include "DojoS3Restorable.generated.h"

/** The reflected half of the restorable interface; it only exists so the engine can find the interface. */
UINTERFACE(Blueprintable)
class UDojoS3Restorable : public UInterface
{
	GENERATED_BODY()
};

/** An actor that wants to hear when its saved state has just been put back. */
class IDojoS3Restorable
{
	GENERATED_BODY()

public:
	/** Called after the actor's SaveGame properties were read back from a save. */
	UFUNCTION(BlueprintNativeEvent, BlueprintCallable, Category = "Save")
	void OnRestoredFromSave();
};
