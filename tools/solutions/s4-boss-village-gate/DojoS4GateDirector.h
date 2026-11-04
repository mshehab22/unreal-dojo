#pragma once

#include "CoreMinimal.h"
#include "GameFramework/Actor.h"
#include "InputCoreTypes.h"
#include "DojoS4GateDirector.generated.h"

class ADojoS4Door;
class ADojoS4Villager;
class UDojoS4DialogueData;
class UDojoS4DialogueRunner;
class UDojoS4FlagStore;
class UDojoS4Interactor;
class UTextRenderComponent;

/** What the keys mean right now. */
UENUM(BlueprintType)
enum class EDojoS4InputMode : uint8
{
	EIM_Exploring UMETA(DisplayName = "Exploring"),
	EIM_Talking UMETA(DisplayName = "Talking")
};

/** Runs the village gate: connects the hero's interactor, the villagers' shared conversation runner, and the flags to the gate and the board, and calls the finale. */
UCLASS()
class ADojoS4GateDirector : public AActor
{
	GENERATED_BODY()

public:
	/** Creates the board and turns ticking off. */
	ADojoS4GateDirector();

	/** The board: the prompt or the conversation, then the finale. */
	UPROPERTY(VisibleAnywhere, Category = "Village Gate")
	TObjectPtr<UTextRenderComponent> Board;

	/** The hero, who carries an interactor as a component. */
	UPROPERTY(EditAnywhere, Category = "Village Gate")
	TObjectPtr<AActor> Hero;

	/** The gate the round is about. */
	UPROPERTY(EditAnywhere, Category = "Village Gate")
	TObjectPtr<ADojoS4Door> Gate;

	/** The villagers; the director gives each the shared runner and flags. */
	UPROPERTY(EditAnywhere, Category = "Village Gate")
	TArray<TObjectPtr<ADojoS4Villager>> Villagers;

	/** The flag that unlocks the gate when a choice sets it. */
	UPROPERTY(EditAnywhere, Category = "Village Gate")
	FName PassFlag = TEXT("pass");

	/** Where the hero stands at the start of every round. */
	UPROPERTY(EditAnywhere, Category = "Village Gate")
	FVector StartLocation = FVector::ZeroVector;

	/** E: uses what the hero is facing, or moves a closing line on while talking; the gate opening ends the round. */
	UFUNCTION(BlueprintCallable, Category = "Village Gate")
	void PressInteract();

	/** 1 to 3: picks that numbered choice while talking and does nothing otherwise. */
	UFUNCTION(BlueprintCallable, Category = "Village Gate")
	void PressChoice(int32 Number);

	/** R: starts the next round, only after the finale. */
	UFUNCTION(BlueprintCallable, Category = "Village Gate")
	void RestartRound();

	/** True from the start of a round until the gate is opened. */
	UFUNCTION(BlueprintPure, Category = "Village Gate")
	bool IsRunning() const;

	/** Seconds the last finished round took, or 0. */
	UFUNCTION(BlueprintPure, Category = "Village Gate")
	float GetFinishSeconds() const;

	/** Exploring, or Talking while a conversation plays. */
	UFUNCTION(BlueprintPure, Category = "Village Gate")
	EDojoS4InputMode GetInputMode() const;

	/** The runner every villager shares. */
	UFUNCTION(BlueprintPure, Category = "Village Gate")
	UDojoS4DialogueRunner* GetRunner() const;

	/** The flags every conversation reads and sets. */
	UFUNCTION(BlueprintPure, Category = "Village Gate")
	UDojoS4FlagStore* GetFlags() const;

protected:
	/** Finds the interactor, creates the runner and flags, listens to all three, binds the keys, and starts round 1. */
	virtual void BeginPlay() override;

	/** Stops listening. */
	virtual void EndPlay(const EEndPlayReason::Type EndPlayReason) override;

private:
	/** The focus or its prompt changed. */
	UFUNCTION()
	void HandleFocusChanged(AActor* Focus, FText Prompt);

	/** A conversation started: the keys now mean choices and the hero stops walking. */
	UFUNCTION()
	void HandleStarted(UDojoS4DialogueData* Dialogue);

	/** A choice was made. */
	UFUNCTION()
	void HandleChoice(int32 Index, FText ChoiceText);

	/** The conversation ended: the keys mean exploring again and the hero may walk. */
	UFUNCTION()
	void HandleEnded();

	/** A flag was set; the pass flag unlocks the gate. */
	UFUNCTION()
	void HandleFlagSet(FName Flag);

	/** Routes one pressed key to its action. */
	void HandleKey(FKey Key);

	/** Resets the hero, the conversation, the flags, and the gate and starts the clock. */
	void StartRound();

	/** Stops or allows the hero's walking through the player controller, when there is one. */
	void SetWalkingAllowed(bool bAllowed);

	/** Rewrites the board from the interactor and the runner as they are now. */
	void RefreshBoard();

	UPROPERTY()
	TObjectPtr<UDojoS4Interactor> HeroInteractor;

	UPROPERTY()
	TObjectPtr<UDojoS4DialogueRunner> Runner;

	UPROPERTY()
	TObjectPtr<UDojoS4FlagStore> FlagStore;

	EDojoS4InputMode InputMode = EDojoS4InputMode::EIM_Exploring;
	bool bRunning = false;
	bool bFinished = false;
	float StartSeconds = 0.f;
	float FinishSeconds = 0.f;
};
