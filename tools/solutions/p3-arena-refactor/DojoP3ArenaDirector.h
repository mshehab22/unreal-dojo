#pragma once

#include "CoreMinimal.h"
#include "GameFramework/Actor.h"
#include "DojoP3ArenaDirector.generated.h"

class ADojoP3ArenaBrazier;
class ADojoP3ArenaSweeper;

/** The arena's roster for the level: which braziers and sweepers belong to it. It runs nobody's per-frame behavior; each thing updates itself. */
UCLASS()
class ADojoP3ArenaDirector : public AActor
{
	GENERATED_BODY()

public:
	/** Turns ticking off; the director has no per-frame work. */
	ADojoP3ArenaDirector();

	/** The arena's braziers, picked in the level. */
	UPROPERTY(EditAnywhere, Category = "Arena")
	TArray<TObjectPtr<ADojoP3ArenaBrazier>> Braziers;

	/** The arena's sweepers, picked in the level. */
	UPROPERTY(EditAnywhere, Category = "Arena")
	TArray<TObjectPtr<ADojoP3ArenaSweeper>> Sweepers;
};
