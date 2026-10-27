#pragma once

#include "CoreMinimal.h"
#include "DojoM6ItemSpot.h"
#include "GameFramework/Actor.h"
#include "Quests/m6-quest-tracker/DojoM6QuestData.h"
#include "DojoM6QuestDirector.generated.h"

class ADojoM6Course;
class ADojoM6QuestGiver;
class ADojoM6QuestItem;
class UDojoM6QuestTracker;
class UTextRenderComponent;

/** Runs the quest day: wires items, the course, and the givers to the quest tracker, keeps the quest board, and calls the finale. */
UCLASS()
class ADojoM6QuestDirector : public AActor
{
	GENERATED_BODY()

public:
	/** Creates the board label and turns ticking off. */
	ADojoM6QuestDirector();

	/** The quest board: one line per visible quest, then the finale. */
	UPROPERTY(VisibleAnywhere, Category = "Quest Day")
	TObjectPtr<UTextRenderComponent> Board;

	/** Every quest of the day, in board order. */
	UPROPERTY(EditAnywhere, Category = "Quest Day")
	TArray<TObjectPtr<UDojoM6QuestData>> Quests;

	/** The givers E can talk to. */
	UPROPERTY(EditAnywhere, Category = "Quest Day")
	TArray<TObjectPtr<ADojoM6QuestGiver>> Givers;

	/** Where items appear at the start of every round. */
	UPROPERTY(EditAnywhere, Category = "Quest Day")
	TArray<FDojoM6ItemSpot> ItemSpots;

	/** The item class spawned at each spot. */
	UPROPERTY(EditAnywhere, Category = "Quest Day")
	TSubclassOf<ADojoM6QuestItem> ItemClass;

	/** The courier course. */
	UPROPERTY(EditAnywhere, Category = "Quest Day")
	TObjectPtr<ADojoM6Course> Course;

	/** The goal quest the course completes. */
	UPROPERTY(EditAnywhere, Category = "Quest Day")
	TObjectPtr<UDojoM6QuestData> CourseQuest;

	/** The hero; when empty, the first player's pawn. */
	UPROPERTY(EditAnywhere, Category = "Quest Day")
	TObjectPtr<AActor> FollowTarget;

	/** E reaches a giver or a wanted item this close to the hero. */
	UPROPERTY(EditAnywhere, Category = "Quest Day", meta = (ClampMin = "0.0"))
	float InteractRange = 200.f;

	/** A course gate this close to the hero counts as reached. */
	UPROPERTY(EditAnywhere, Category = "Quest Day", meta = (ClampMin = "0.0"))
	float GateRange = 100.f;

	/** Seconds between checks for gates near the hero. */
	UPROPERTY(EditAnywhere, Category = "Quest Day", meta = (ClampMin = "0.01"))
	float CheckInterval = 0.1f;

	/** E: talks to the nearest giver or collects the nearest wanted item within range; givers win ties, then the earlier one. */
	UFUNCTION(BlueprintCallable, Category = "Quest Day")
	void PressInteract();

	/** R: starts the next round, only after the finale. */
	UFUNCTION(BlueprintCallable, Category = "Quest Day")
	void RestartRound();

	/** True from the start of a round until the finale. */
	UFUNCTION(BlueprintPure, Category = "Quest Day")
	bool IsRunning() const;

	/** Seconds the last finished round took, or 0. */
	UFUNCTION(BlueprintPure, Category = "Quest Day")
	float GetFinishSeconds() const;

	/** The items still waiting to be collected, in spot order. */
	UFUNCTION(BlueprintPure, Category = "Quest Day")
	TArray<ADojoM6QuestItem*> GetItems() const;

protected:
	/** Adds the quests, listens to the tracker and the course, binds the keys, and starts round 1. */
	virtual void BeginPlay() override;

	/** Stops listening and clears the gate check. */
	virtual void EndPlay(const EEndPlayReason::Type EndPlayReason) override;

private:
	/** Resets the quests and the course, puts fresh items on every spot, and starts the clock. */
	void StartRound();

	/** Touches every course gate near the hero while the course quest is active. */
	void CheckGates();

	/** Rewrites the board and calls the finale when every quest that is not secret is done. */
	void RefreshBoard();

	/** The board line for one quest, or empty when it is hidden. */
	FString LineFor(UDojoM6QuestData* Quest) const;

	/** The hero's actor. */
	AActor* GetHero() const;

	/** A quest changed state: restart the course when its quest starts, then refresh the board. */
	UFUNCTION()
	void HandleQuestStateChanged(UDojoM6QuestData* ChangedQuest, EDojoM6QuestState NewState);

	/** A quest counted an item. */
	UFUNCTION()
	void HandleQuestProgress(UDojoM6QuestData* ChangedQuest, int32 Current, int32 Target);

	/** An item was collected: tell the tracker its tag. */
	UFUNCTION()
	void HandleItemCollected(ADojoM6QuestItem* Item, AActor* Taker);

	/** The last course gate was passed: complete the course quest. */
	UFUNCTION()
	void HandleCourseFinished();

	/** Routes one pressed key to its action. */
	void HandleKey(FKey Key);

	UPROPERTY()
	TObjectPtr<UDojoM6QuestTracker> Tracker;

	UPROPERTY(Transient)
	TArray<TObjectPtr<ADojoM6QuestItem>> Items;

	FTimerHandle GateTimer;

	float StartedAt = 0.f;

	float FinishSeconds = 0.f;

	bool bRunning = false;
};
