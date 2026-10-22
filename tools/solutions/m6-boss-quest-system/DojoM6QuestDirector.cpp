#include "DojoM6QuestDirector.h"

#include "Components/InputComponent.h"
#include "Components/TextRenderComponent.h"
#include "Engine/World.h"
#include "GameFramework/PlayerController.h"
#include "InputCoreTypes.h"
#include "Kismet/GameplayStatics.h"
#include "Quests/m6-checkpoints/DojoM6Checkpoint.h"
#include "Quests/m6-checkpoints/DojoM6Course.h"
#include "Quests/m6-quest-giver/DojoM6QuestGiver.h"
#include "Quests/m6-quest-item/DojoM6QuestItem.h"
#include "Quests/m6-quest-tracker/DojoM6QuestTracker.h"
#include "TimerManager.h"

ADojoM6QuestDirector::ADojoM6QuestDirector()
{
	PrimaryActorTick.bCanEverTick = false;

	Board = CreateDefaultSubobject<UTextRenderComponent>(TEXT("Board"));
	RootComponent = Board;
	Board->SetHorizontalAlignment(EHTA_Left);

	ItemClass = ADojoM6QuestItem::StaticClass();
}

void ADojoM6QuestDirector::BeginPlay()
{
	Super::BeginPlay();

	Tracker = GetWorld()->GetSubsystem<UDojoM6QuestTracker>();
	if (!Tracker) return;

	Tracker->OnQuestStateChanged.AddUniqueDynamic(this, &ADojoM6QuestDirector::HandleQuestStateChanged);
	Tracker->OnQuestProgress.AddUniqueDynamic(this, &ADojoM6QuestDirector::HandleQuestProgress);
	if (IsValid(Course)) Course->OnFinished.AddUniqueDynamic(this, &ADojoM6QuestDirector::HandleCourseFinished);

	for (UDojoM6QuestData* Quest : Quests)
	{
		Tracker->AddQuest(Quest);
	}

	if (APlayerController* Player = GetWorld()->GetFirstPlayerController())
	{
		EnableInput(Player);
		InputComponent->BindKey(EKeys::E, IE_Pressed, this, &ADojoM6QuestDirector::HandleKey);
		InputComponent->BindKey(EKeys::R, IE_Pressed, this, &ADojoM6QuestDirector::HandleKey);
	}

	GetWorldTimerManager().SetTimer(GateTimer, this, &ADojoM6QuestDirector::CheckGates, CheckInterval, true);
	StartRound();
}

void ADojoM6QuestDirector::EndPlay(const EEndPlayReason::Type EndPlayReason)
{
	if (Tracker)
	{
		Tracker->OnQuestStateChanged.RemoveDynamic(this, &ADojoM6QuestDirector::HandleQuestStateChanged);
		Tracker->OnQuestProgress.RemoveDynamic(this, &ADojoM6QuestDirector::HandleQuestProgress);
	}

	if (IsValid(Course)) Course->OnFinished.RemoveDynamic(this, &ADojoM6QuestDirector::HandleCourseFinished);
	GetWorldTimerManager().ClearTimer(GateTimer);

	Super::EndPlay(EndPlayReason);
}

void ADojoM6QuestDirector::HandleKey(FKey Key)
{
	if (Key == EKeys::E) PressInteract();
	if (Key == EKeys::R) RestartRound();
}

void ADojoM6QuestDirector::StartRound()
{
	for (ADojoM6QuestItem* Item : Items)
	{
		if (IsValid(Item)) Item->Destroy();
	}
	Items.Reset();

	// The round runs before the reset so the board it triggers is written for a live round.
	bRunning = true;
	StartedAt = GetWorld()->GetTimeSeconds();
	FinishSeconds = 0.f;

	Tracker->ResetQuests();
	if (IsValid(Course)) Course->ResetCourse();

	for (const FDojoM6ItemSpot& Spot : ItemSpots)
	{
		FActorSpawnParameters Parameters;
		Parameters.bDeferConstruction = true;
		ADojoM6QuestItem* Item = GetWorld()->SpawnActor<ADojoM6QuestItem>(ItemClass, FTransform(Spot.Location), Parameters);
		if (!Item) continue;

		Item->ItemTag = Spot.ItemTag;
		Item->FinishSpawning(FTransform(Spot.Location));
		Item->OnCollected.AddUniqueDynamic(this, &ADojoM6QuestDirector::HandleItemCollected);
		Items.Add(Item);
	}

	RefreshBoard();
}

void ADojoM6QuestDirector::PressInteract()
{
	AActor* Hero = GetHero();
	if (!bRunning || !IsValid(Hero)) return;

	const FVector Here = Hero->GetActorLocation();
	const double RangeSquared = FMath::Square(InteractRange);

	ADojoM6QuestGiver* NearestGiver = nullptr;
	double GiverSquared = RangeSquared;
	for (ADojoM6QuestGiver* Giver : Givers)
	{
		if (!IsValid(Giver)) continue;

		const double DistanceSquared = FVector::DistSquared(Here, Giver->GetActorLocation());
		if (DistanceSquared <= GiverSquared && (NearestGiver == nullptr || DistanceSquared < GiverSquared))
		{
			NearestGiver = Giver;
			GiverSquared = DistanceSquared;
		}
	}

	ADojoM6QuestItem* NearestItem = nullptr;
	double ItemSquared = RangeSquared;
	for (ADojoM6QuestItem* Item : Items)
	{
		if (!IsValid(Item) || !Tracker->WantsItem(Item->ItemTag)) continue;

		const double DistanceSquared = FVector::DistSquared(Here, Item->GetActorLocation());
		if (DistanceSquared <= ItemSquared && (NearestItem == nullptr || DistanceSquared < ItemSquared))
		{
			NearestItem = Item;
			ItemSquared = DistanceSquared;
		}
	}

	// A giver wins a tie with an item.
	if (NearestGiver && (!NearestItem || GiverSquared <= ItemSquared))
	{
		NearestGiver->Interact();
		return;
	}

	if (NearestItem) NearestItem->Collect(Hero);
}

void ADojoM6QuestDirector::CheckGates()
{
	AActor* Hero = GetHero();
	if (!bRunning || !IsValid(Hero) || !IsValid(Course) || Tracker->GetState(CourseQuest) != EDojoM6QuestState::EQS_Active) return;

	for (ADojoM6Checkpoint* Gate : Course->Checkpoints)
	{
		if (IsValid(Gate) && FVector::Dist(Hero->GetActorLocation(), Gate->GetActorLocation()) <= GateRange) Gate->Touch(Hero);
	}
}

void ADojoM6QuestDirector::RestartRound()
{
	if (bRunning) return;

	StartRound();
}

void ADojoM6QuestDirector::HandleQuestStateChanged(UDojoM6QuestData* Quest, EDojoM6QuestState NewState)
{
	if (Quest == CourseQuest && NewState == EDojoM6QuestState::EQS_Active && IsValid(Course)) Course->ResetCourse();

	RefreshBoard();
}

void ADojoM6QuestDirector::HandleQuestProgress(UDojoM6QuestData* Quest, int32 Current, int32 Target)
{
	RefreshBoard();
}

void ADojoM6QuestDirector::HandleItemCollected(ADojoM6QuestItem* Item, AActor* Collector)
{
	Items.Remove(Item);
	Tracker->ReportItem(Item->ItemTag);
}

void ADojoM6QuestDirector::HandleCourseFinished()
{
	Tracker->CompleteGoal(CourseQuest);
}

void ADojoM6QuestDirector::RefreshBoard()
{
	if (!Tracker) return;

	TArray<FString> Lines;
	bool bAllDone = Quests.Num() > 0;
	for (UDojoM6QuestData* Quest : Quests)
	{
		const FString Line = LineFor(Quest);
		if (!Line.IsEmpty()) Lines.Add(Line);
		if (IsValid(Quest) && !Quest->bSecret && Tracker->GetState(Quest) != EDojoM6QuestState::EQS_Completed) bAllDone = false;
	}

	if (bRunning && bAllDone)
	{
		bRunning = false;
		FinishSeconds = GetWorld()->GetTimeSeconds() - StartedAt;
	}

	if (!bRunning && FinishSeconds > 0.f) Lines.Add(FString::Printf(TEXT("ALL QUESTS DONE in %.1f s"), FinishSeconds));
	Board->SetText(FText::FromString(FString::Join(Lines, TEXT("\n"))));
}

FString ADojoM6QuestDirector::LineFor(UDojoM6QuestData* Quest) const
{
	if (!IsValid(Quest)) return FString();

	const EDojoM6QuestState State = Tracker->GetState(Quest);
	const bool bHidden = Quest->bSecret && (State == EDojoM6QuestState::EQS_Locked || State == EDojoM6QuestState::EQS_Available);
	if (bHidden) return FString();

	FString Status = TEXT("LOCKED");
	if (State == EDojoM6QuestState::EQS_Available) Status = TEXT("NEW");
	if (State == EDojoM6QuestState::EQS_Completed) Status = TEXT("DONE");
	if (State == EDojoM6QuestState::EQS_Failed) Status = TEXT("FAILED");
	if (State == EDojoM6QuestState::EQS_Active)
	{
		const bool bCollect = Quest->Kind == EDojoM6QuestKind::EQK_Collect;
		Status = bCollect ? FString::Printf(TEXT("%d/%d"), Tracker->GetProgress(Quest), Quest->Count) : FString(TEXT("ACTIVE"));
	}

	return FString::Printf(TEXT("%s: %s"), *Quest->Title.ToString(), *Status);
}

AActor* ADojoM6QuestDirector::GetHero() const
{
	return IsValid(FollowTarget) ? FollowTarget.Get() : UGameplayStatics::GetPlayerPawn(this, 0);
}

bool ADojoM6QuestDirector::IsRunning() const
{
	return bRunning;
}

float ADojoM6QuestDirector::GetFinishSeconds() const
{
	return FinishSeconds;
}

TArray<ADojoM6QuestItem*> ADojoM6QuestDirector::GetItems() const
{
	TArray<ADojoM6QuestItem*> Waiting;
	for (ADojoM6QuestItem* Item : Items)
	{
		if (IsValid(Item)) Waiting.Add(Item);
	}
	return Waiting;
}
