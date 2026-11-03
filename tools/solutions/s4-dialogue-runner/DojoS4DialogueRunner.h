#pragma once

#include "CoreMinimal.h"
#include "DojoS4DialogueChoice.h"
#include "UObject/Object.h"
#include "DojoS4DialogueRunner.generated.h"

class UDojoS4DialogueData;
class UDojoS4FlagStore;

/** Whether a conversation is being played. */
UENUM(BlueprintType)
enum class EDojoS4DialogueState : uint8
{
	EDS_Idle UMETA(DisplayName = "Idle"),
	EDS_Active UMETA(DisplayName = "Active")
};

/** Broadcast when a conversation starts. */
DECLARE_DYNAMIC_MULTICAST_DELEGATE_OneParam(FDojoS4OnDialogueStarted, UDojoS4DialogueData*, Dialogue);

/** Broadcast when a choice has been made: its number among the visible choices and its text. */
DECLARE_DYNAMIC_MULTICAST_DELEGATE_TwoParams(FDojoS4OnChoiceMade, int32, Index, FText, ChoiceText);

/** Broadcast when a conversation has ended. */
DECLARE_DYNAMIC_MULTICAST_DELEGATE(FDojoS4OnDialogueEnded);

/** Plays one conversation at a time from a dialogue asset: it is idle or active, shows the choices that are allowed, sets flags, and announces each step to listeners. */
UCLASS()
class UDojoS4DialogueRunner : public UObject
{
	GENERATED_BODY()

public:
	/** Fires once when a conversation starts. */
	UPROPERTY(BlueprintAssignable, Category = "Dialogue")
	FDojoS4OnDialogueStarted OnDialogueStarted;

	/** Fires for each choice made, after its flag is set and the runner has moved on. */
	UPROPERTY(BlueprintAssignable, Category = "Dialogue")
	FDojoS4OnChoiceMade OnChoiceMade;

	/** Fires once when a conversation ends. */
	UPROPERTY(BlueprintAssignable, Category = "Dialogue")
	FDojoS4OnDialogueEnded OnDialogueEnded;

	/** Starts a conversation on its start node; false when one is already playing or the asset, its start node, or the flag store is missing. */
	UFUNCTION(BlueprintCallable, Category = "Dialogue")
	bool Start(UDojoS4DialogueData* Data, UDojoS4FlagStore* FlagStore);

	/** Idle or Active. */
	UFUNCTION(BlueprintPure, Category = "Dialogue")
	EDojoS4DialogueState GetState() const;

	/** What the speaker says at the current node, or empty text when idle. */
	UFUNCTION(BlueprintPure, Category = "Dialogue")
	FText GetCurrentText() const;

	/** The choices the player may pick now, in order: those with no required flag or whose flag is set. Empty when idle. */
	UFUNCTION(BlueprintPure, Category = "Dialogue")
	TArray<FDojoS4DialogueChoice> GetVisibleChoices() const;

	/** Makes the choice at this position in the visible choices; false when idle or there is no such choice. */
	UFUNCTION(BlueprintCallable, Category = "Dialogue")
	bool Choose(int32 Index);

	/** Ends the conversation at a closing line, a node with nothing to choose; false when there is something to choose or nothing is playing. */
	UFUNCTION(BlueprintCallable, Category = "Dialogue")
	bool Advance();

	/** Ends the conversation now; nothing happens when it is idle. */
	UFUNCTION(BlueprintCallable, Category = "Dialogue")
	void End();

private:
	UPROPERTY()
	TObjectPtr<UDojoS4DialogueData> CurrentData;

	UPROPERTY()
	TObjectPtr<UDojoS4FlagStore> CurrentFlags;

	FName CurrentNode;
	EDojoS4DialogueState State = EDojoS4DialogueState::EDS_Idle;
};
