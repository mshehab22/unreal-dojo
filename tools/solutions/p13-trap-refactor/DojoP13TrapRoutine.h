#pragma once

#include "CoreMinimal.h"
#include "DojoP13TrapStep.h"
#include "Engine/DataAsset.h"
#include "DojoP13TrapRoutine.generated.h"

/** A dart trap's routine as an asset: a list of steps that any number of traps can run at once. Bytecode pattern. */
UCLASS(BlueprintType)
class UDojoP13TrapRoutine : public UDataAsset
{
	GENERATED_BODY()

public:
	/** The steps, in order. */
	UPROPERTY(EditAnywhere, BlueprintReadOnly, Category = "Routine")
	TArray<FDojoP13TrapStep> Steps;

	/** Adds a step that shoots one dart. */
	UFUNCTION(BlueprintCallable, Category = "Routine")
	void AddFire();

	/** Adds a step that waits Seconds. */
	UFUNCTION(BlueprintCallable, Category = "Routine")
	void AddWait(float Seconds);

	/** Adds a step that goes on from the step numbered Target. */
	UFUNCTION(BlueprintCallable, Category = "Routine")
	void AddJump(int32 Target);
};
