#pragma once

#include "CoreMinimal.h"
#include "Components/ActorComponent.h"
#include "DojoF4RegistryEntryComponent.generated.h"

/** Added to any actor, registers that actor with the world's target registry for exactly as long as it is in play. */
UCLASS(ClassGroup = (Dojo), meta = (BlueprintSpawnableComponent))
class UDojoF4RegistryEntryComponent : public UActorComponent
{
	GENERATED_BODY()

public:
	/** Turns ticking off. */
	UDojoF4RegistryEntryComponent();

protected:
	/** Registers the owner. */
	virtual void BeginPlay() override;

	/** Unregisters the owner, for every reason play can end. */
	virtual void EndPlay(const EEndPlayReason::Type EndPlayReason) override;
};
