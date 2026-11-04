#pragma once

#include "CoreMinimal.h"
#include "DojoP20MoveRule.h"
#include "DojoP20PatrolRule.generated.h"

/** The dummy walks along X from where it started out to a set distance and back again, turning at each end. It remembers which way it is heading. */
UCLASS(Blueprintable, EditInlineNew)
class UDojoP20PatrolRule : public UDojoP20MoveRule
{
	GENERATED_BODY()

public:
	/** Moves Current along X by the distance covered in DeltaSeconds, stopping at an end and turning round there. */
	virtual FVector NextLocation(const FVector& Current, const FVector& Anchor, float DeltaSeconds) override;

	/** How far out from the start the dummy walks. */
	UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "Patrol")
	float Distance = 200.f;

	/** How fast the dummy walks. */
	UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "Patrol")
	float Speed = 100.f;

private:
	/** True while the dummy is walking away from its start. */
	bool bHeadingOut = true;
};
