#pragma once

#include "CoreMinimal.h"
#include "DojoM6QuestData.h"
#include "Subsystems/WorldSubsystem.h"
#include "DojoM6QuestTracker.generated.h"

/** Broadcast whenever a quest changes state, including when it is first added. */
DECLARE_DYNAMIC_MULTICAST_DELEGATE_TwoParams(FDojoM6OnQuestStateChanged, UDojoM6QuestData*, Quest, EDojoM6QuestState, NewState);

/** Broadcast whenever a collect quest counts an item. */
DECLARE_DYNAMIC_MULTICAST_DELEGATE_ThreeParams(FDojoM6OnQuestProgress, UDojoM6QuestData*, Quest, int32, Current, int32, Target);

/** Owns every quest's state for one world and announces each change, so givers, boards, and finales only listen. */
UCLASS()
class UDojoM6QuestTracker : public UWorldSubsystem
{
	GENERATED_BODY()

public:
	/** Fires on every state change. */
	UPROPERTY(BlueprintAssignable, Category = "Quests")
	FDojoM6OnQuestStateChanged OnQuestStateChanged;

	/** Fires on every counted item. */
	UPROPERTY(BlueprintAssignable, Category = "Quests")
	FDojoM6OnQuestProgress OnQuestProgress;

	/** Adds a quest: Locked while its required quest is unfinished, otherwise Available. Adding it again does nothing. */
	UFUNCTION(BlueprintCallable, Category = "Quests")
	void AddQuest(UDojoM6QuestData* Quest);

	/** Starts an Available or Failed quest from zero and starts its time limit; false for any other state. */
	UFUNCTION(BlueprintCallable, Category = "Quests")
	bool StartQuest(UDojoM6QuestData* Quest);

	/** Counts one item for every Active collect quest that wants this tag, starting a waiting secret quest first. */
	UFUNCTION(BlueprintCallable, Category = "Quests")
	void ReportItem(FName ItemTag);

	/** Completes an Active goal quest; false otherwise. */
	UFUNCTION(BlueprintCallable, Category = "Quests")
	bool CompleteGoal(UDojoM6QuestData* Quest);

	/** True when ReportItem with this tag would count for some quest. */
	UFUNCTION(BlueprintPure, Category = "Quests")
	bool WantsItem(FName ItemTag) const;

	/** The quest's state; Locked for a quest never added. */
	UFUNCTION(BlueprintPure, Category = "Quests")
	EDojoM6QuestState GetState(UDojoM6QuestData* Quest) const;

	/** Items counted toward the quest this attempt. */
	UFUNCTION(BlueprintPure, Category = "Quests")
	int32 GetProgress(UDojoM6QuestData* Quest) const;

	/** Every added quest, in the order added. */
	UFUNCTION(BlueprintPure, Category = "Quests")
	TArray<UDojoM6QuestData*> GetQuests() const;

	/** Puts every quest back to its first state with no progress and no timers. */
	UFUNCTION(BlueprintCallable, Category = "Quests")
	void ResetQuests();

	/** Clears every time limit before the world goes away. */
	virtual void Deinitialize() override;

private:
	/** Stores and announces a new state. */
	void SetState(UDojoM6QuestData* Quest, EDojoM6QuestState NewState);

	/** Completes a quest and offers every quest that was waiting for it. */
	void Complete(UDojoM6QuestData* Quest);

	/** A time limit ran out; the payload says which quest. */
	void HandleTimeUp(UDojoM6QuestData* Quest);

	/** The state a quest starts in: Locked while its required quest is unfinished. */
	EDojoM6QuestState FirstState(const UDojoM6QuestData* Quest) const;

	UPROPERTY()
	TArray<TObjectPtr<UDojoM6QuestData>> Quests;

	UPROPERTY()
	TMap<TObjectPtr<UDojoM6QuestData>, EDojoM6QuestState> States;

	UPROPERTY()
	TMap<TObjectPtr<UDojoM6QuestData>, int32> Progress;

	TMap<TObjectPtr<UDojoM6QuestData>, FTimerHandle> TimeLimits;
};
