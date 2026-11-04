#pragma once

#include "CoreMinimal.h"
#include "UObject/Object.h"
#include "DojoS2Effect.generated.h"

/** The base of every ability effect (the Subclass Sandbox pattern): one public entry that checks the user, one hook each kind fills in, and the protected tools the hooks are allowed to use. Effects live inside shared assets, so they keep no state between uses. */
UCLASS(Abstract, EditInlineNew, BlueprintType)
class UDojoS2Effect : public UObject
{
	GENERATED_BODY()

public:
	/** Only actors carrying this actor tag count as targets. */
	UPROPERTY(EditAnywhere, BlueprintReadOnly, Category = "Effect")
	FName TargetTag = TEXT("Target");

	/** Runs the effect for this user; does nothing and returns false when the user is not a live actor. */
	UFUNCTION(BlueprintCallable, Category = "Effect")
	bool Apply(AActor* User);

protected:
	/** The one hook each kind of effect fills in; the user is always a live actor here. */
	virtual void OnApply(AActor* User);

	/** Tool: moves an actor by an offset in world space. */
	void MoveActor(AActor* Target, const FVector& Offset) const;

	/** Tool: every live actor carrying the target tag within Radius of Center, leaving out Ignore. */
	TArray<AActor*> FindTargetsNear(const FVector& Center, float Radius, const AActor* Ignore) const;
};
