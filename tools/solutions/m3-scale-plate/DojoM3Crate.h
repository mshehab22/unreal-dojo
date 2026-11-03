#pragma once

#include "CoreMinimal.h"
#include "GameFramework/Actor.h"
#include "DojoM3Crate.generated.h"

class UBoxComponent;
class USphereComponent;

/** A crate to stand on plates: a solid body, a grab handle on top that grabbers find with an overlap query, and a home to go back to. */
UCLASS()
class ADojoM3Crate : public AActor
{
	GENERATED_BODY()

public:
	/** Creates the solid body as the root and the handle on top of it. */
	ADojoM3Crate();

	/** The solid shape, 80 units on a side. */
	UPROPERTY(VisibleAnywhere, BlueprintReadOnly, Category = "Crate")
	TObjectPtr<UBoxComponent> Body;

	/** A small overlapping sphere on top, for anything that grabs crates. */
	UPROPERTY(VisibleAnywhere, BlueprintReadOnly, Category = "Crate")
	TObjectPtr<USphereComponent> Handle;

	/** Where the crate stood when play began. */
	UFUNCTION(BlueprintPure, Category = "Crate")
	FVector GetHome() const;

	/** Teleports the crate to its home and counts it. */
	UFUNCTION(BlueprintCallable, Category = "Crate")
	void ReturnHome();

	/** How many times ReturnHome has run. */
	UFUNCTION(BlueprintPure, Category = "Crate")
	int32 GetReturns() const;

protected:
	/** Remembers the starting spot as home. */
	virtual void BeginPlay() override;

private:
	FVector Home = FVector::ZeroVector;

	int32 Returns = 0;
};
