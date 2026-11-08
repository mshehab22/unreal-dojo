#pragma once

#include "CoreMinimal.h"
#include "DojoP21Turret.h"
#include "DojoP21CountingTurret.generated.h"

/** A turret that notes every request for a bolt and can be told to refuse them, or to make bolts without counting them, to show where its bolts come from. */
UCLASS()
class ADojoP21CountingTurret : public ADojoP21Turret
{
	GENERATED_BODY()

public:
	/** How many times a bolt was asked for. */
	UPROPERTY(BlueprintReadOnly, Category = "Counting")
	int32 MakeCalls = 0;

	/** The class asked for each time, in order. */
	UPROPERTY(BlueprintReadOnly, Category = "Counting")
	TArray<TSubclassOf<ADojoP21Bolt>> AskedFor;

	/** When true, every request is answered with nothing. */
	UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "Counting")
	bool bRefuse = false;

	/** When true, a bolt is made and handed back without being counted in ShotsFired. */
	UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "Counting")
	bool bSkipCounting = false;

protected:
	/** Notes the request, then refuses it or lets the turret's own way of making a bolt answer. */
	virtual ADojoP21Bolt* MakeBolt(TSubclassOf<ADojoP21Bolt> BoltClass, const FTransform& Muzzle) override;
};
