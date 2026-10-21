#include "DojoF3LeagueDirector.h"

#include "Components/InputComponent.h"
#include "Components/SceneComponent.h"
#include "Engine/World.h"
#include "GameFramework/PlayerController.h"
#include "InputCoreTypes.h"
#include "Quests/f1-popup-target/DojoF1PopupTarget.h"
#include "Quests/f2-target-rack/DojoF2TargetRack.h"
#include "Quests/f3-announcer/DojoF3Announcer.h"
#include "Quests/f3-roster/DojoF3Roster.h"
#include "Quests/f3-score-board/DojoF3ScoreBoard.h"
#include "Quests/f3-sentry/DojoF3Sentry.h"
#include "TimerManager.h"

ADojoF3LeagueDirector::ADojoF3LeagueDirector()
{
	PrimaryActorTick.bCanEverTick = false;

	RootComponent = CreateDefaultSubobject<USceneComponent>(TEXT("Root"));

	Players = { TEXT("Ana"), TEXT("Bo"), TEXT("Cy") };
}

void ADojoF3LeagueDirector::BeginPlay()
{
	Super::BeginPlay();

	if (APlayerController* Player = GetWorld()->GetFirstPlayerController())
	{
		EnableInput(Player);
		InputComponent->BindKey(EKeys::SpaceBar, IE_Pressed, this, &ADojoF3LeagueDirector::HandleKey);
		InputComponent->BindKey(EKeys::R, IE_Pressed, this, &ADojoF3LeagueDirector::HandleKey);
	}

	StartLeague();
}

void ADojoF3LeagueDirector::EndPlay(const EEndPlayReason::Type EndPlayReason)
{
	GetWorldTimerManager().ClearAllTimersForObject(this);

	Super::EndPlay(EndPlayReason);
}

void ADojoF3LeagueDirector::StartLeague()
{
	if (bLeagueRunning || Players.Num() == 0) return;

	if (IsValid(Board)) Board->Clear();
	if (IsValid(Roster)) Roster->Clear();

	TurnsStarted = 0;
	bLeagueRunning = true;

	StartTurn();
}

void ADojoF3LeagueDirector::StartTurn()
{
	TurnsStarted++;
	TurnScore = 0;
	bTurnRunning = true;

	FTimerManager& Timers = GetWorldTimerManager();
	Timers.SetTimer(TurnTimer, this, &ADojoF3LeagueDirector::EndTurn, TurnSeconds, false);
	Timers.SetTimer(LendTimer, this, &ADojoF3LeagueDirector::LendStep, LendInterval, true, 0.f);
	Timers.SetTimer(CheckTimer, this, &ADojoF3LeagueDirector::CheckStep, CheckInterval, true);
}

void ADojoF3LeagueDirector::EndTurn()
{
	FTimerManager& Timers = GetWorldTimerManager();
	Timers.ClearTimer(TurnTimer);
	Timers.ClearTimer(LendTimer);
	Timers.ClearTimer(CheckTimer);

	bTurnRunning = false;

	TArray<TObjectPtr<ADojoF1PopupTarget>> StillLent;
	LentAt.GetKeys(StillLent);
	for (ADojoF1PopupTarget* Target : StillLent) ReturnTarget(Target);

	const FName Player = GetCurrentPlayer();
	if (IsValid(Board)) Board->AddScore(TurnScore);
	if (IsValid(Roster)) Roster->RecordScore(Player, TurnScore);
	if (IsValid(Announcer)) Announcer->AnnounceTurn(Player, TurnScore, IsValid(Roster) ? Roster->GetBestFor(Player) : TurnScore);

	Timers.SetTimer(BreakTimer, this, &ADojoF3LeagueDirector::EndBreak, BreakSeconds, false);
}

void ADojoF3LeagueDirector::EndBreak()
{
	if (TurnsStarted < Players.Num() * TurnsPerPlayer)
	{
		StartTurn();
		return;
	}

	bLeagueRunning = false;

	if (IsValid(Announcer) && IsValid(Roster))
	{
		const FName Leader = Roster->GetLeader();
		Announcer->AnnounceLeader(Leader, Roster->GetBestFor(Leader));
	}
}

void ADojoF3LeagueDirector::ShootAimed()
{
	if (!bTurnRunning || !IsValid(Sentry)) return;

	ADojoF1PopupTarget* Target = Sentry->AimAtNearestRaised();
	if (!Target || !Target->Hit()) return;

	TurnScore += PointsPerHit;

	if (Target->GetState() == EDojoF1TargetState::ETS_Broken)
	{
		ReturnTarget(Target);
		return;
	}

	// A hit that did not break it drops it, so the league raises it again for the next shot.
	Target->Raise();
}

void ADojoF3LeagueDirector::RestartLeague()
{
	if (bLeagueRunning) return;

	StartLeague();
}

bool ADojoF3LeagueDirector::IsLeagueRunning() const
{
	return bLeagueRunning;
}

bool ADojoF3LeagueDirector::IsTurnRunning() const
{
	return bTurnRunning;
}

FName ADojoF3LeagueDirector::GetCurrentPlayer() const
{
	if (Players.Num() == 0 || TurnsStarted == 0) return NAME_None;

	return Players[(TurnsStarted - 1) % Players.Num()];
}

int32 ADojoF3LeagueDirector::GetTurnsStarted() const
{
	return TurnsStarted;
}

int32 ADojoF3LeagueDirector::GetTurnScore() const
{
	return TurnScore;
}

int32 ADojoF3LeagueDirector::CountLent() const
{
	return LentAt.Num();
}

void ADojoF3LeagueDirector::LendStep()
{
	if (!IsValid(Rack)) return;

	ADojoF1PopupTarget* Target = Rack->Deploy();
	if (!Target) return;

	LentAt.Add(Target, GetWorld()->GetTimeSeconds());
	if (IsValid(Sentry)) Sentry->Targets.AddUnique(Target);
}

void ADojoF3LeagueDirector::CheckStep()
{
	const float Now = GetWorld()->GetTimeSeconds();

	TArray<ADojoF1PopupTarget*> Expired;
	for (const TPair<TObjectPtr<ADojoF1PopupTarget>, float>& Entry : LentAt)
	{
		if (Now - Entry.Value >= LendSeconds) Expired.Add(Entry.Key);
	}

	for (ADojoF1PopupTarget* Target : Expired) ReturnTarget(Target);
}

void ADojoF3LeagueDirector::ReturnTarget(ADojoF1PopupTarget* Target)
{
	LentAt.Remove(Target);
	if (IsValid(Sentry)) Sentry->Targets.Remove(Target);
	if (IsValid(Rack)) Rack->Recall(Target);
}

void ADojoF3LeagueDirector::HandleKey(FKey Key)
{
	if (Key == EKeys::SpaceBar) ShootAimed();
	if (Key == EKeys::R) RestartLeague();
}
