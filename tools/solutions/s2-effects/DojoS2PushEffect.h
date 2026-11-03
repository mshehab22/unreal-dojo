#pragma once

#include "CoreMinimal.h"
#include "DojoS2Effect.h"
#include "DojoS2PushEffect.generated.h"

/** Shoves every target near the user straight away from it. */
UCLASS()
class UDojoS2PushEffect : public UDojoS2Effect
{
	GENERATED_BODY()

public:
	/** Targets this close to the user are pushed. */
	UPROPERTY(EditAnywhere, BlueprintReadOnly, Category = "Effect")
	float Radius = 400.f;

	/** How far each target is pushed. */
	UPROPERTY(EditAnywhere, BlueprintReadOnly, Category = "Effect")
	float Distance = 300.f;

protected:
	/** Moves each target within Radius Distance away from the user, flat along the ground. */
	virtual void OnApply(AActor* User) override;
};
