#pragma once

#include "CoreMinimal.h"
#include "GameFramework/Actor.h"
#include "DojoM5Pillar.generated.h"

class UBoxComponent;

/** A solid static pillar that sentries cannot see through. */
UCLASS()
class ADojoM5Pillar : public AActor
{
	GENERATED_BODY()

public:
	/** Creates the solid box as the root; it blocks every channel and counts as a static object. */
	ADojoM5Pillar();

private:
	UPROPERTY(VisibleAnywhere, Category = "Pillar")
	TObjectPtr<UBoxComponent> Box;
};
