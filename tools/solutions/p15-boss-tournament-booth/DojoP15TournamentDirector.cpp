#include "DojoP15TournamentDirector.h"

#include "Components/InputComponent.h"
#include "Components/TextRenderComponent.h"
#include "DojoP15ScoreboardDesk.h"
#include "Engine/World.h"
#include "GameFramework/PlayerController.h"
#include "Quests/p15-announcer-desk/DojoP15AnnouncerDesk.h"
#include "Quests/p15-crier-trace/DojoP15Crier.h"
#include "Quests/p15-crier-trace/DojoP15TracingAnnouncer.h"
#include "TimerManager.h"

ADojoP15TournamentDirector::ADojoP15TournamentDirector()
{
	PrimaryActorTick.bCanEverTick = false;

	Label = CreateDefaultSubobject<UTextRenderComponent>(TEXT("Label"));
	RootComponent = Label;
	Label->SetHorizontalAlignment(EHTA_Center);
}

void ADojoP15TournamentDirector::BeginPlay()
{
	Super::BeginPlay();

	Crier = GetWorld()->SpawnActor<ADojoP15Crier>();
	ProvideChosenServices();

	if (APlayerController* Player = GetWorld()->GetFirstPlayerController())
	{
		EnableInput(Player);
		InputComponent->BindKey(EKeys::H, IE_Pressed, this, &ADojoP15TournamentDirector::HandleKey);
		InputComponent->BindKey(EKeys::T, IE_Pressed, this, &ADojoP15TournamentDirector::HandleKey);
		InputComponent->BindKey(EKeys::R, IE_Pressed, this, &ADojoP15TournamentDirector::HandleKey);
	}

	StartRound();
}

void ADojoP15TournamentDirector::EndPlay(const EEndPlayReason::Type EndPlayReason)
{
	GetWorldTimerManager().ClearTimer(RoundTimer);
	GetWorldTimerManager().ClearTimer(RivalTimer);

	Super::EndPlay(EndPlayReason);
}

void ADojoP15TournamentDirector::PressHit()
{
	if (!bRunning) return;

	PlayerHits++;
	Say(FString::Printf(TEXT("%s hits (%d)"), *PlayerName.ToString(), PlayerHits));
	UpdateLabel();
}

void ADojoP15TournamentDirector::PressTrace()
{
	UDojoP15AnnouncerDesk* Desk = UDojoP15AnnouncerDesk::Locate(GetWorld());
	if (Desk == nullptr) return;

	if (Tracer == nullptr)
	{
		Wrapped = Desk->GetProvider();
		Tracer = NewObject<UDojoP15TracingAnnouncer>(this);
		Tracer->Wrap(Wrapped);
		Desk->Provide(Tracer);
	}
	else
	{
		Desk->Provide(Wrapped);
		Tracer = nullptr;
		Wrapped = nullptr;
	}
}

void ADojoP15TournamentDirector::PressNextRound()
{
	if (bRunning) return;

	StartRound();
}

bool ADojoP15TournamentDirector::IsRunning() const
{
	return bRunning;
}

int32 ADojoP15TournamentDirector::GetRoundNumber() const
{
	return RoundNumber;
}

int32 ADojoP15TournamentDirector::GetPlayerHits() const
{
	return PlayerHits;
}

int32 ADojoP15TournamentDirector::GetRivalHits() const
{
	return RivalHits;
}

bool ADojoP15TournamentDirector::IsTracing() const
{
	return Tracer != nullptr;
}

UDojoP15TracingAnnouncer* ADojoP15TournamentDirector::GetTracer() const
{
	return Tracer.Get();
}

void ADojoP15TournamentDirector::ProvideChosenServices()
{
	if (AnnouncerClass.Get() != nullptr)
	{
		UDojoP15AnnouncerDesk* Desk = UDojoP15AnnouncerDesk::Locate(GetWorld());
		if (Desk != nullptr) Desk->Provide(NewObject<UObject>(this, AnnouncerClass.Get()));
	}

	if (ScoreboardClass.Get() != nullptr)
	{
		UDojoP15ScoreboardDesk* Board = UDojoP15ScoreboardDesk::Locate(GetWorld());
		if (Board != nullptr) Board->Provide(NewObject<UObject>(this, ScoreboardClass.Get()));
	}
}

void ADojoP15TournamentDirector::StartRound()
{
	RoundNumber++;
	PlayerHits = 0;
	RivalHits = 0;
	Result.Reset();
	bRunning = true;

	GetWorldTimerManager().SetTimer(RoundTimer, this, &ADojoP15TournamentDirector::HandleTimeUp, RoundSeconds, false);
	GetWorldTimerManager().SetTimer(RivalTimer, this, &ADojoP15TournamentDirector::HandleRivalHit, RivalInterval, true);

	Say(FString::Printf(TEXT("Round %d begins"), RoundNumber));
	UpdateLabel();
}

void ADojoP15TournamentDirector::EndRound()
{
	bRunning = false;
	GetWorldTimerManager().ClearTimer(RoundTimer);
	GetWorldTimerManager().ClearTimer(RivalTimer);

	Say(TEXT("Time"));

	UDojoP15ScoreboardDesk* Board = UDojoP15ScoreboardDesk::Locate(GetWorld());
	if (PlayerHits == RivalHits)
	{
		if (Board != nullptr)
		{
			Board->AddPoints(PlayerName, DrawPoints);
			Board->AddPoints(RivalName, DrawPoints);
		}
		Result = TEXT("Draw");
	}
	else
	{
		const FName Winner = PlayerHits > RivalHits ? PlayerName : RivalName;
		if (Board != nullptr) Board->AddPoints(Winner, WinPoints);
		Result = FString::Printf(TEXT("Winner: %s"), *Winner.ToString());
	}

	Say(Result);
	UpdateLabel();
}

void ADojoP15TournamentDirector::Say(const FString& Line)
{
	if (IsValid(Crier)) Crier->CallOut(Line);
}

void ADojoP15TournamentDirector::UpdateLabel()
{
	FString Text = FString::Printf(TEXT("Round %d  %s %d  %s %d"), RoundNumber, *PlayerName.ToString(), PlayerHits, *RivalName.ToString(), RivalHits);

	if (!bRunning && !Result.IsEmpty())
	{
		const UDojoP15ScoreboardDesk* Board = UDojoP15ScoreboardDesk::Locate(GetWorld());
		const int32 PlayerPoints = Board != nullptr ? Board->GetPoints(PlayerName) : 0;
		const int32 RivalPoints = Board != nullptr ? Board->GetPoints(RivalName) : 0;
		Text += FString::Printf(TEXT("  %s  Points %s %d  %s %d"), *Result, *PlayerName.ToString(), PlayerPoints, *RivalName.ToString(), RivalPoints);
	}

	Label->SetText(FText::FromString(Text));
}

void ADojoP15TournamentDirector::HandleTimeUp()
{
	if (bRunning) EndRound();
}

void ADojoP15TournamentDirector::HandleRivalHit()
{
	if (!bRunning) return;

	RivalHits++;
	Say(FString::Printf(TEXT("%s hits (%d)"), *RivalName.ToString(), RivalHits));
	UpdateLabel();
}

void ADojoP15TournamentDirector::HandleKey(FKey Key)
{
	if (Key == EKeys::H) PressHit();
	else if (Key == EKeys::T) PressTrace();
	else if (Key == EKeys::R) PressNextRound();
}
