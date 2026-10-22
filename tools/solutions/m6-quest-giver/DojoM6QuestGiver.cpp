#include "DojoM6QuestGiver.h"

#include "Components/TextRenderComponent.h"
#include "Engine/World.h"
#include "Quests/m6-quest-tracker/DojoM6QuestTracker.h"

ADojoM6QuestGiver::ADojoM6QuestGiver()
{
	PrimaryActorTick.bCanEverTick = false;

	Label = CreateDefaultSubobject<UTextRenderComponent>(TEXT("Label"));
	RootComponent = Label;
	Label->SetHorizontalAlignment(EHTA_Center);
}

void ADojoM6QuestGiver::BeginPlay()
{
	Super::BeginPlay();

	Tracker = GetWorld()->GetSubsystem<UDojoM6QuestTracker>();
	if (!Tracker) return;

	Tracker->OnQuestStateChanged.AddUniqueDynamic(this, &ADojoM6QuestGiver::HandleQuestStateChanged);
	ShowState(Tracker->GetState(Quest));
}

void ADojoM6QuestGiver::EndPlay(const EEndPlayReason::Type EndPlayReason)
{
	if (Tracker) Tracker->OnQuestStateChanged.RemoveDynamic(this, &ADojoM6QuestGiver::HandleQuestStateChanged);

	Super::EndPlay(EndPlayReason);
}

bool ADojoM6QuestGiver::Interact()
{
	return Tracker && Tracker->StartQuest(Quest);
}

void ADojoM6QuestGiver::HandleQuestStateChanged(UDojoM6QuestData* ChangedQuest, EDojoM6QuestState NewState)
{
	if (ChangedQuest != Quest) return;

	ShowState(NewState);
}

void ADojoM6QuestGiver::ShowState(EDojoM6QuestState State)
{
	Label->SetText(FText::FromString(WordFor(State)));
}

FString ADojoM6QuestGiver::WordFor(EDojoM6QuestState State)
{
	if (State == EDojoM6QuestState::EQS_Available) return TEXT("QUEST");
	if (State == EDojoM6QuestState::EQS_Active) return TEXT("ACTIVE");
	if (State == EDojoM6QuestState::EQS_Completed) return TEXT("DONE");
	if (State == EDojoM6QuestState::EQS_Failed) return TEXT("RETRY");
	return TEXT("LOCKED");
}
