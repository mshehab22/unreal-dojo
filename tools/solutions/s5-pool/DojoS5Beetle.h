#pragma once

#include "CoreMinimal.h"
#include "GameFramework/Actor.h"
#include "DojoS5Beetle.generated.h"

class ADojoS5Beetle;
class UTextRenderComponent;

/** Broadcast when an awake beetle is swatted, with the beetle itself so one handler can serve every beetle. */
DECLARE_DYNAMIC_MULTICAST_DELEGATE_OneParam(FDojoS5OnBeetleDefeated, ADojoS5Beetle*, Beetle);

/** A clockwork beetle that sleeps out of sight until it is woken at a spot, and announces when it is swatted; it never destroys itself. */
UCLASS()
class ADojoS5Beetle : public AActor
{
	GENERATED_BODY()

public:
	/** Creates the body and turns ticking off. */
	ADojoS5Beetle();

	/** What the player sees of the beetle. */
	UPROPERTY(VisibleAnywhere, Category = "Beetle")
	TObjectPtr<UTextRenderComponent> Body;

	/** Fires when an awake beetle is swatted; whoever woke it decides what happens next. */
	UPROPERTY(BlueprintAssignable, Category = "Beetle")
	FDojoS5OnBeetleDefeated OnDefeated;

	/** Moves the beetle to a spot and shows it, with collision on. */
	UFUNCTION(BlueprintCallable, Category = "Beetle")
	void Wake(const FVector& Location);

	/** Hides the beetle and turns its collision off, so it costs nothing while it waits. */
	UFUNCTION(BlueprintCallable, Category = "Beetle")
	void Sleep();

	/** Swats the beetle: an awake beetle announces it, a sleeping one ignores it. */
	UFUNCTION(BlueprintCallable, Category = "Beetle")
	void Defeat();

	/** True between Wake and Sleep. */
	UFUNCTION(BlueprintPure, Category = "Beetle")
	bool IsAwake() const;

private:
	bool bAwake = false;
};
