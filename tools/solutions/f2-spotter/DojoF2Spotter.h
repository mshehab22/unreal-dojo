#pragma once

#include "CoreMinimal.h"
#include "GameFramework/Actor.h"
#include "DojoF2Spotter.generated.h"

class UTextRenderComponent;

/** Watches one actor without keeping it alive and reports whether it is still there. */
UCLASS()
class ADojoF2Spotter : public AActor
{
	GENERATED_BODY()

public:
	/** Creates the label and turns ticking off. */
	ADojoF2Spotter();

	/** Floating text that shows what the spotter sees. */
	UPROPERTY(VisibleAnywhere, Category = "Spotter")
	TObjectPtr<UTextRenderComponent> Label;

	/** Starts watching Target; nullptr stops watching. */
	UFUNCTION(BlueprintCallable, Category = "Spotter")
	void Watch(AActor* Target);

	/** True while the watched actor exists and is not being destroyed. */
	UFUNCTION(BlueprintPure, Category = "Spotter")
	bool HasTarget() const;

	/** The watched actor, or nullptr once it is gone. */
	UFUNCTION(BlueprintPure, Category = "Spotter")
	AActor* GetTarget() const;

	/** Writes TRACKING and the target's name, or LOST, into the label. */
	UFUNCTION(BlueprintCallable, CallInEditor, Category = "Spotter")
	void Report();

private:
	/** A weak reference: it never keeps the target alive and turns invalid when the target is destroyed. */
	TWeakObjectPtr<AActor> Watched;
};
