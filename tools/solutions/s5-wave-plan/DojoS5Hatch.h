#pragma once

#include "CoreMinimal.h"
#include "GameFramework/Actor.h"
#include "DojoS5Hatch.generated.h"

class USceneComponent;

/** A hatch in the pit wall that beetles crawl out of; it only answers whether a viewer could see it open. */
UCLASS()
class ADojoS5Hatch : public AActor
{
	GENERATED_BODY()

public:
	/** Creates the root and turns ticking off. */
	ADojoS5Hatch();

	/** Where the hatch sits; beetles appear here. */
	UPROPERTY(VisibleAnywhere, Category = "Hatch")
	TObjectPtr<USceneComponent> Root;

	/** A viewer closer than this would see a beetle appear next to them. */
	UPROPERTY(EditAnywhere, BlueprintReadOnly, Category = "Hatch", meta = (ClampMin = "0.0"))
	float MinDistance = 600.f;

	/** Half the width of the viewer's view, in degrees, measured from where they face. */
	UPROPERTY(EditAnywhere, BlueprintReadOnly, Category = "Hatch", meta = (ClampMin = "0.0", ClampMax = "180.0"))
	float ViewHalfAngle = 45.f;

	/** True when a beetle may come out here: nobody is watching, or the viewer is far enough away and facing elsewhere. */
	UFUNCTION(BlueprintPure, Category = "Hatch")
	bool IsOutOfSight(const AActor* Viewer) const;
};
