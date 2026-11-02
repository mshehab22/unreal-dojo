#pragma once

#include "CoreMinimal.h"
#include "GameFramework/Actor.h"
#include "DojoM2Dart.generated.h"

/** A dart that flies forward at a steady speed while turning toward its target, no faster than its turn rate allows. */
UCLASS()
class ADojoM2Dart : public AActor
{
	GENERATED_BODY()

public:
	/** Creates the root and an arrow that shows the nose, and turns ticking on. */
	ADojoM2Dart();

	/** Units per second along the nose. */
	UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "Dart", meta = (ClampMin = "0"))
	float Speed = 600.f;

	/** The most the nose can turn each second, in degrees. */
	UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "Dart", meta = (ClampMin = "0"))
	float TurnRate = 90.f;

	/** Starts chasing an actor; nullptr makes the dart fly straight on. */
	UFUNCTION(BlueprintCallable, Category = "Dart")
	void Launch(AActor* NewTarget);

	/** The actor being chased, or nullptr once it is gone. */
	UFUNCTION(BlueprintPure, Category = "Dart")
	AActor* GetTarget() const;

	/** Turns the nose toward the target by at most this frame's share of the turn rate, then flies forward. */
	virtual void Tick(float DeltaSeconds) override;

private:
	TWeakObjectPtr<AActor> Target;
};
