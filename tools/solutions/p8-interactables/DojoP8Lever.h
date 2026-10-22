#pragma once

#include "CoreMinimal.h"
#include "DojoP8InteractableBase.h"
#include "DojoP8Lever.generated.h"

/** A lever in the arena wall; pulling it records a quest flag on the visitor, as often as they like. */
UCLASS()
class ADojoP8Lever : public ADojoP8InteractableBase
{
	GENERATED_BODY()

public:
	/** The quest flag a pull records. */
	UPROPERTY(EditAnywhere, Category = "Lever")
	FName FlagName = TEXT("GateLeverPulled");

protected:
	/** Records the flag on the visitor and shows "Clunk". */
	virtual void OnInteract_Implementation(ADojoP8Visitor* Visitor) override;
};
