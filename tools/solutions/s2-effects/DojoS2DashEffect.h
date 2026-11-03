#pragma once

#include "CoreMinimal.h"
#include "DojoS2Effect.h"
#include "DojoS2DashEffect.generated.h"

/** Moves the user straight ahead along the way it faces. */
UCLASS()
class UDojoS2DashEffect : public UDojoS2Effect
{
	GENERATED_BODY()

public:
	/** How far the user moves. */
	UPROPERTY(EditAnywhere, BlueprintReadOnly, Category = "Effect")
	float Distance = 300.f;

protected:
	/** Moves the user Distance along its forward vector. */
	virtual void OnApply(AActor* User) override;
};
