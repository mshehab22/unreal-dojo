#pragma once

#include "CoreMinimal.h"
#include "UObject/Object.h"
#include "DojoP7BallistaState.generated.h"

class ADojoP7Ballista;

/** One mode of the ballista, as an object: it owns that mode's data and decides what each input means while the mode is current (State: the base every mode derives from). Every input does nothing unless a mode overrides it. */
UCLASS(Abstract)
class UDojoP7BallistaState : public UObject
{
	GENERATED_BODY()

public:
	/** Runs each time the ballista enters this mode. */
	virtual void Enter(ADojoP7Ballista* Ballista);

	/** Runs each time the ballista leaves this mode. */
	virtual void Exit(ADojoP7Ballista* Ballista);

	/** One frame of this mode's behavior. */
	virtual void TickState(ADojoP7Ballista* Ballista, float DeltaSeconds);

	/** A target has come into view. */
	virtual void OnTargetSpotted(ADojoP7Ballista* Ballista);

	/** The target has gone out of view. */
	virtual void OnTargetLost(ADojoP7Ballista* Ballista);

	/** The crew gives the order to shoot. */
	virtual void OnFireOrder(ADojoP7Ballista* Ballista);

	/** Short text for the ballista's label. */
	virtual FString GetLabelText() const;
};
