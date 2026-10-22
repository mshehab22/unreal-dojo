#include "DojoM6QuestTracker.h"

#include "Engine/World.h"
#include "TimerManager.h"

void UDojoM6QuestTracker::AddQuest(UDojoM6QuestData* Quest)
{
	if (!IsValid(Quest) || Quests.Contains(Quest)) return;

	Quests.Add(Quest);
	Progress.Add(Quest, 0);
	SetState(Quest, FirstState(Quest));
}

bool UDojoM6QuestTracker::StartQuest(UDojoM6QuestData* Quest)
{
	const EDojoM6QuestState State = GetState(Quest);
	if (State != EDojoM6QuestState::EQS_Available && State != EDojoM6QuestState::EQS_Failed) return false;

	Progress.Add(Quest, 0);
	if (Quest->TimeLimitSeconds > 0.f)
	{
		const FTimerDelegate TimeUp = FTimerDelegate::CreateUObject(this, &UDojoM6QuestTracker::HandleTimeUp, Quest);
		GetWorld()->GetTimerManager().SetTimer(TimeLimits.FindOrAdd(Quest), TimeUp, Quest->TimeLimitSeconds, false);
	}

	SetState(Quest, EDojoM6QuestState::EQS_Active);
	return true;
}

void UDojoM6QuestTracker::ReportItem(FName ItemTag)
{
	// Copy the list: completing a quest can offer others, and listeners may react, so nothing iterates the live array.
	const TArray<TObjectPtr<UDojoM6QuestData>> Snapshot = Quests;
	for (UDojoM6QuestData* Quest : Snapshot)
	{
		if (Quest->Kind != EDojoM6QuestKind::EQK_Collect || Quest->ItemTag != ItemTag) continue;
		if (Quest->bSecret && GetState(Quest) == EDojoM6QuestState::EQS_Available) StartQuest(Quest);
		if (GetState(Quest) != EDojoM6QuestState::EQS_Active) continue;

		int32& Count = Progress.FindOrAdd(Quest);
		Count++;
		OnQuestProgress.Broadcast(Quest, Count, Quest->Count);
		if (Count >= Quest->Count) Complete(Quest);
	}
}

bool UDojoM6QuestTracker::CompleteGoal(UDojoM6QuestData* Quest)
{
	if (!IsValid(Quest) || Quest->Kind != EDojoM6QuestKind::EQK_Goal || GetState(Quest) != EDojoM6QuestState::EQS_Active) return false;

	Complete(Quest);
	return true;
}

bool UDojoM6QuestTracker::WantsItem(FName ItemTag) const
{
	for (UDojoM6QuestData* Quest : Quests)
	{
		if (Quest->Kind != EDojoM6QuestKind::EQK_Collect || Quest->ItemTag != ItemTag) continue;

		const EDojoM6QuestState State = GetState(Quest);
		if (State == EDojoM6QuestState::EQS_Active) return true;
		if (Quest->bSecret && State == EDojoM6QuestState::EQS_Available) return true;
	}
	return false;
}

EDojoM6QuestState UDojoM6QuestTracker::GetState(UDojoM6QuestData* Quest) const
{
	const EDojoM6QuestState* State = States.Find(Quest);
	return State ? *State : EDojoM6QuestState::EQS_Locked;
}

int32 UDojoM6QuestTracker::GetProgress(UDojoM6QuestData* Quest) const
{
	const int32* Count = Progress.Find(Quest);
	return Count ? *Count : 0;
}

TArray<UDojoM6QuestData*> UDojoM6QuestTracker::GetQuests() const
{
	return TArray<UDojoM6QuestData*>(Quests);
}

void UDojoM6QuestTracker::ResetQuests()
{
	for (TPair<TObjectPtr<UDojoM6QuestData>, FTimerHandle>& Pair : TimeLimits)
	{
		GetWorld()->GetTimerManager().ClearTimer(Pair.Value);
	}

	// Every quest goes back to Locked without an announcement first, so FirstState sees no required quest as finished.
	for (UDojoM6QuestData* Quest : Quests)
	{
		Progress.Add(Quest, 0);
		States.Add(Quest, EDojoM6QuestState::EQS_Locked);
	}

	for (UDojoM6QuestData* Quest : Quests)
	{
		SetState(Quest, FirstState(Quest));
	}
}

void UDojoM6QuestTracker::Deinitialize()
{
	if (UWorld* World = GetWorld()) World->GetTimerManager().ClearAllTimersForObject(this);

	Super::Deinitialize();
}

void UDojoM6QuestTracker::SetState(UDojoM6QuestData* Quest, EDojoM6QuestState NewState)
{
	States.Add(Quest, NewState);
	OnQuestStateChanged.Broadcast(Quest, NewState);
}

void UDojoM6QuestTracker::Complete(UDojoM6QuestData* Quest)
{
	if (FTimerHandle* Handle = TimeLimits.Find(Quest)) GetWorld()->GetTimerManager().ClearTimer(*Handle);

	SetState(Quest, EDojoM6QuestState::EQS_Completed);

	for (UDojoM6QuestData* Waiting : Quests)
	{
		if (Waiting->Requires == Quest && GetState(Waiting) == EDojoM6QuestState::EQS_Locked) SetState(Waiting, EDojoM6QuestState::EQS_Available);
	}
}

void UDojoM6QuestTracker::HandleTimeUp(UDojoM6QuestData* Quest)
{
	if (GetState(Quest) != EDojoM6QuestState::EQS_Active) return;

	SetState(Quest, EDojoM6QuestState::EQS_Failed);
}

EDojoM6QuestState UDojoM6QuestTracker::FirstState(const UDojoM6QuestData* Quest) const
{
	if (IsValid(Quest->Requires) && GetState(Quest->Requires) != EDojoM6QuestState::EQS_Completed) return EDojoM6QuestState::EQS_Locked;

	return EDojoM6QuestState::EQS_Available;
}
