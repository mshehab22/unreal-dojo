#pragma once

#include "CoreMinimal.h"
#include "DojoP20MoveRule.h"
#include "DojoP20OrbitRule.generated.h"

/** The dummy circles a centre that sits a fixed offset from where it started, turning at a steady rate. */
UCLASS(Blueprintable, EditInlineNew)
class UDojoP20OrbitRule : public UDojoP20MoveRule
{
	GENERATED_BODY()

public:
	/** Turns Current around the centre by the angle covered in DeltaSeconds. */
	virtual FVector NextLocation(const FVector& Current, const FVector& Anchor, float DeltaSeconds) override;

	/** Where the centre of the circle is, relative to where the dummy started. */
	UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "Orbit")
	FVector CenterOffset = FVector(50.f, 0.f, 0.f);

	/** How fast the dummy turns, in degrees per second. */
	UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "Orbit")
	float DegreesPerSecond = 90.f;
};
