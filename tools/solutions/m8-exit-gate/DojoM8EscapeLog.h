#pragma once

#include "CoreMinimal.h"
#include "GameFramework/Actor.h"
#include "DojoM8EscapeLog.generated.h"

class ADojoM8ExitGate;

/** A listener for tests and Blueprints: counts how often a gate announced an escape and remembers who escaped. */
UCLASS()
class ADojoM8EscapeLog : public AActor
{
	GENERATED_BODY()

public:
	/** Turns ticking off. */
	ADojoM8EscapeLog();

	/** Starts counting the gate's announcements, once however many times it is called. */
	UFUNCTION(BlueprintCallable, Category = "Escape Log")
	void Listen(ADojoM8ExitGate* Gate);

	/** How many times the gate announced an escape. */
	UFUNCTION(BlueprintPure, Category = "Escape Log")
	int32 GetEscapeCount() const;

	/** The pawn named in the last announcement, or null. */
	UFUNCTION(BlueprintPure, Category = "Escape Log")
	AActor* GetLastEscapee() const;

private:
	/** Adds one to the count and remembers the pawn. */
	UFUNCTION()
	void HandleEscaped(AActor* Escapee);

	int32 EscapeCount = 0;

	TWeakObjectPtr<AActor> LastEscapee;
};
