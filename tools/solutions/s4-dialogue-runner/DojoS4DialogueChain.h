#pragma once

#include "CoreMinimal.h"
#include "UObject/Object.h"
#include "DojoS4DialogueChain.generated.h"

class UDojoS4DialogueData;
class UDojoS4DialogueRunner;
class UDojoS4FlagStore;

/** A listener that starts a follow-up conversation as soon as the current one ends, the way a story beat chains into the next; it only subscribes. */
UCLASS()
class UDojoS4DialogueChain : public UObject
{
	GENERATED_BODY()

public:
	/** Arms the chain: when the runner announces an end, the follow-up is started once. */
	UFUNCTION(BlueprintCallable, Category = "Dialogue Chain")
	void Arm(UDojoS4DialogueRunner* Runner, UDojoS4DialogueData* FollowUp, UDojoS4FlagStore* Store);

	/** True when the follow-up was started by the chain. */
	UFUNCTION(BlueprintPure, Category = "Dialogue Chain")
	bool DidStartFollowUp() const;

private:
	/** Starts the follow-up on the runner that just ended. */
	UFUNCTION()
	void HandleEnded();

	UPROPERTY()
	TObjectPtr<UDojoS4DialogueRunner> WatchedRunner;

	UPROPERTY()
	TObjectPtr<UDojoS4DialogueData> NextDialogue;

	UPROPERTY()
	TObjectPtr<UDojoS4FlagStore> NextFlags;

	bool bStartedFollowUp = false;
	bool bArmed = false;
};
