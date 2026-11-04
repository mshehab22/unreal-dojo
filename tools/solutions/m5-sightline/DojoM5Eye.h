#pragma once

#include "CoreMinimal.h"
#include "GameFramework/Actor.h"
#include "DojoM5Eye.generated.h"

/** A sentry's eye: says whether a candidate is inside its cone and range with nothing solid in the way. */
UCLASS()
class ADojoM5Eye : public AActor
{
	GENERATED_BODY()

public:
	/** Creates a solid body as the root, so the eye has a shape of its own, and an arrow that shows where it looks. */
	ADojoM5Eye();

	/** How far it can see, in units. */
	UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "Eye", meta = (ClampMin = "1"))
	float Range = 1500.f;

	/** Half the width of the cone it sees in, in degrees, measured from straight ahead. */
	UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "Eye", meta = (ClampMin = "1", ClampMax = "180"))
	float HalfAngleDegrees = 45.f;

	/** Looks at the candidate once and draws the line it looked along. True when the first thing in the way is the candidate itself. */
	UFUNCTION(BlueprintCallable, Category = "Eye")
	bool CanSee(const AActor* Candidate);

	/** What stood in the way at the last look, or nullptr when nothing did or the candidate was seen. */
	UFUNCTION(BlueprintPure, Category = "Eye")
	AActor* GetBlocker() const;

private:
	TWeakObjectPtr<AActor> Blocker;
};
