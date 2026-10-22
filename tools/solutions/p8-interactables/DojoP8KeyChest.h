#pragma once

#include "CoreMinimal.h"
#include "DojoP8InteractableBase.h"
#include "DojoP8KeyChest.generated.h"

/** A prize chest that opens once, for a visitor who hands over the right key. */
UCLASS()
class ADojoP8KeyChest : public ADojoP8InteractableBase
{
	GENERATED_BODY()

public:
	/** The item that unlocks the chest. */
	UPROPERTY(EditAnywhere, Category = "Chest")
	FName KeyItem = TEXT("ArenaKey");

	/** The item the chest gives when opened. */
	UPROPERTY(EditAnywhere, Category = "Chest")
	FName RewardItem = TEXT("GoldMedal");

protected:
	/** Opens for a visitor with the key: the key is taken, the reward given, and the chest is used up; without the key it stays locked. */
	virtual void OnInteract_Implementation(ADojoP8Visitor* Visitor) override;
};
