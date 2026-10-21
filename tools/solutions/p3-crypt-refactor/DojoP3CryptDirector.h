#pragma once

#include "CoreMinimal.h"
#include "GameFramework/Actor.h"
#include "DojoP3CryptDirector.generated.h"

class ADojoP3CryptBrazier;
class ADojoP3CryptSweeper;

/** The crypt's roster for the level: which braziers and sweepers belong to it. It runs nobody's per-frame behavior; each thing updates itself. */
UCLASS()
class ADojoP3CryptDirector : public AActor
{
	GENERATED_BODY()

public:
	/** Turns ticking off; the director has no per-frame work. */
	ADojoP3CryptDirector();

	/** The crypt's braziers, picked in the level. */
	UPROPERTY(EditAnywhere, Category = "Crypt")
	TArray<TObjectPtr<ADojoP3CryptBrazier>> Braziers;

	/** The crypt's sweepers, picked in the level. */
	UPROPERTY(EditAnywhere, Category = "Crypt")
	TArray<TObjectPtr<ADojoP3CryptSweeper>> Sweepers;
};
