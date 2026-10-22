#pragma once

#include "CoreMinimal.h"
#include "GameFramework/Actor.h"
#include "Quests/m6-quest-tracker/DojoM6QuestData.h"
#include "DojoM6QuestGiver.generated.h"

class UDojoM6QuestTracker;
class UTextRenderComponent;

/** A character who offers one quest and shows its state over their head, kept current by listening to the quest tracker. */
UCLASS()
class ADojoM6QuestGiver : public AActor
{
	GENERATED_BODY()

public:
	/** Creates the label and turns ticking off. */
	ADojoM6QuestGiver();

	/** Shows LOCKED, QUEST, ACTIVE, DONE, or RETRY for the giver's quest. */
	UPROPERTY(VisibleAnywhere, Category = "Quest Giver")
	TObjectPtr<UTextRenderComponent> Label;

	/** The quest this giver offers. */
	UPROPERTY(EditAnywhere, BlueprintReadOnly, Category = "Quest Giver")
	TObjectPtr<UDojoM6QuestData> Quest;

	/** Starts the quest when it is on offer or failed; false otherwise. */
	UFUNCTION(BlueprintCallable, Category = "Quest Giver")
	bool Interact();

protected:
	/** Finds the tracker, listens to it, and shows the quest's current state. */
	virtual void BeginPlay() override;

	/** Stops listening to the tracker. */
	virtual void EndPlay(const EEndPlayReason::Type EndPlayReason) override;

private:
	/** Updates the label when this giver's quest changes; other quests are ignored. */
	UFUNCTION()
	void HandleQuestStateChanged(UDojoM6QuestData* ChangedQuest, EDojoM6QuestState NewState);

	/** Writes the word for a state on the label. */
	void ShowState(EDojoM6QuestState State);

	/** The label word for a state. */
	static FString WordFor(EDojoM6QuestState State);

	UPROPERTY()
	TObjectPtr<UDojoM6QuestTracker> Tracker;
};
