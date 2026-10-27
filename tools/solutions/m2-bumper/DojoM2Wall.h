#pragma once

#include "CoreMinimal.h"
#include "GameFramework/Actor.h"
#include "DojoM2Wall.generated.h"

class UBoxComponent;

/** A solid box that blocks everything that moves into it with a sweep; size it through its Box in Details. */
UCLASS()
class ADojoM2Wall : public AActor
{
	GENERATED_BODY()

public:
	/** Creates the blocking box as the root. */
	ADojoM2Wall();

	/** The solid shape; its extent is half the wall's size on each axis. */
	UPROPERTY(VisibleAnywhere, BlueprintReadOnly, Category = "Wall")
	TObjectPtr<UBoxComponent> Box;
};
