#include "DojoF2ClayRange.h"

#include "Components/InputComponent.h"
#include "Components/TextRenderComponent.h"
#include "Engine/World.h"
#include "GameFramework/PlayerController.h"
#include "InputCoreTypes.h"
#include "Quests/f1-popup-target/DojoF1PopupTarget.h"
#include "Quests/f1-training-dummy/DojoF1TrainingDummy.h"
#include "Quests/f2-clay-disc/DojoF2ClayDisc.h"
#include "Quests/f2-dummy-spawner/DojoF2DummySpawner.h"
#include "Quests/f2-spotter/DojoF2Spotter.h"
#include "Quests/f2-target-rack/DojoF2TargetRack.h"
#include "TimerManager.h"

ADojoF2ClayRange::ADojoF2ClayRange()
{
	PrimaryActorTick.bCanEverTick = false;

	Label = CreateDefaultSubobject<UTextRenderComponent>(TEXT("Label"));
	RootComponent = Label;
	Label->SetHorizontalAlignment(EHTA_Center);

	DiscClass = ADojoF2ClayDisc::StaticClass();
}

void ADojoF2ClayRange::BeginPlay()
{
	Super::BeginPlay();

	if (APlayerController* Player = GetWorld()->GetFirstPlayerController())
	{
		EnableInput(Player);

		const FKey Keys[] = { EKeys::SpaceBar, EKeys::F, EKeys::T, EKeys::R };
		for (const FKey& Key : Keys)
		{
			InputComponent->BindKey(Key, IE_Pressed, this, &ADojoF2ClayRange::HandleKey);
		}
	}

	StartRound();
}

void ADojoF2ClayRange::EndPlay(const EEndPlayReason::Type EndPlayReason)
{
	GetWorldTimerManager().ClearAllTimersForObject(this);

	Super::EndPlay(EndPlayReason);
}

void ADojoF2ClayRange::StartRound()
{
	if (bRoundRunning) return;

	Score = 0;
	Thrown = 0;
	Streak = 0;
	DiscsInPlay.Empty();
	Penalties.Empty();
	ShowScore();

	bRoundRunning = true;

	FTimerManager& Timers = GetWorldTimerManager();
	Timers.SetTimer(ThrowTimer, this, &ADojoF2ClayRange::ThrowStep, ThrowInterval, true, 0.f);
	Timers.SetTimer(CheckTimer, this, &ADojoF2ClayRange::CheckStep, CheckInterval, true);
}

void ADojoF2ClayRange::EndRound()
{
	if (!bRoundRunning) return;

	FTimerManager& Timers = GetWorldTimerManager();
	Timers.ClearTimer(ThrowTimer);
	Timers.ClearTimer(CheckTimer);

	bRoundRunning = false;

	EndBonus();

	if (IsValid(PenaltySpawner)) PenaltySpawner->DestroyAll();
	Penalties.Empty();

	if (IsValid(Spotter)) Spotter->Watch(nullptr);

	ShowScore();
}

void ADojoF2ClayRange::ShootSpotted()
{
	if (!bRoundRunning || !IsValid(Spotter)) return;

	ADojoF2ClayDisc* Disc = Cast<ADojoF2ClayDisc>(Spotter->GetTarget());
	if (!Disc) return;

	// The hit is recorded here, before the disc leaves play, so no code ever reads a destroyed disc.
	DiscsInPlay.Remove(Disc);
	Disc->Shatter();

	Score += PointsPerDisc;
	Streak++;

	if (Streak % BonusStreak == 0 && IsValid(BonusRack))
	{
		EndBonus();

		ActiveBonus = BonusRack->Deploy();
		bBonusScored = false;
		if (ActiveBonus) GetWorldTimerManager().SetTimer(BonusTimer, this, &ADojoF2ClayRange::EndBonus, BonusSeconds, false);
	}

	CheckStep();
}

void ADojoF2ClayRange::StrikePenalty()
{
	if (!bRoundRunning) return;

	for (ADojoF1TrainingDummy* Dummy : Penalties)
	{
		if (IsValid(Dummy) && !Dummy->IsKnockedDown())
		{
			Dummy->Strike();
			return;
		}
	}
}

void ADojoF2ClayRange::HitBonus()
{
	if (!bRoundRunning || !IsValid(ActiveBonus) || bBonusScored) return;

	ActiveBonus->Hit();

	if (ActiveBonus->GetState() == EDojoF1TargetState::ETS_Broken)
	{
		Score += PointsPerBonus;
		bBonusScored = true;
		return;
	}

	// A hit that did not break it drops it, so the range raises it again for the next shot.
	ActiveBonus->Raise();
}

void ADojoF2ClayRange::RestartRound()
{
	if (bRoundRunning) return;

	StartRound();
}

bool ADojoF2ClayRange::IsRoundRunning() const
{
	return bRoundRunning;
}

int32 ADojoF2ClayRange::GetScore() const
{
	return Score;
}

int32 ADojoF2ClayRange::GetThrownCount() const
{
	return Thrown;
}

ADojoF1PopupTarget* ADojoF2ClayRange::GetActiveBonus() const
{
	return ActiveBonus;
}

int32 ADojoF2ClayRange::CountStandingPenalties() const
{
	int32 Standing = 0;

	for (const ADojoF1TrainingDummy* Dummy : Penalties)
	{
		if (IsValid(Dummy) && !Dummy->IsKnockedDown()) Standing++;
	}

	return Standing;
}

void ADojoF2ClayRange::ThrowStep()
{
	if (Thrown >= DiscsPerRound || CountStandingPenalties() > 0 || !DiscClass) return;

	ADojoF2ClayDisc* Disc = GetWorld()->SpawnActorDeferred<ADojoF2ClayDisc>(DiscClass, GetActorTransform());
	if (!Disc) return;

	Disc->FlightSeconds = DiscSeconds;
	Disc->FinishSpawning(GetActorTransform());

	Thrown++;
	DiscsInPlay.Add(Disc);

	if (IsValid(Spotter)) Spotter->Watch(Disc);
}

void ADojoF2ClayRange::CheckStep()
{
	// A tracked disc that is no longer valid left play without being shot, so it fell.
	for (int32 Index = DiscsInPlay.Num() - 1; Index >= 0; --Index)
	{
		if (IsValid(DiscsInPlay[Index])) continue;

		DiscsInPlay.RemoveAt(Index);
		Streak = 0;

		if (IsValid(PenaltySpawner))
		{
			if (ADojoF1TrainingDummy* Penalty = PenaltySpawner->SpawnDummy()) Penalties.Add(Penalty);
		}
	}

	if (IsValid(Spotter))
	{
		ADojoF2ClayDisc* Newest = DiscsInPlay.Num() > 0 ? DiscsInPlay.Last().Get() : nullptr;
		if (Spotter->GetTarget() != Newest) Spotter->Watch(Newest);
	}

	// The round ends once the last disc has ended and any bonus target has had its full time.
	if (Thrown >= DiscsPerRound && DiscsInPlay.Num() == 0 && !ActiveBonus) EndRound();
}

void ADojoF2ClayRange::EndBonus()
{
	GetWorldTimerManager().ClearTimer(BonusTimer);

	if (IsValid(ActiveBonus) && IsValid(BonusRack)) BonusRack->Recall(ActiveBonus);
	ActiveBonus = nullptr;
	bBonusScored = false;
}

void ADojoF2ClayRange::ShowScore()
{
	Label->SetText(FText::AsNumber(Score));
}

void ADojoF2ClayRange::HandleKey(FKey Key)
{
	if (Key == EKeys::SpaceBar) ShootSpotted();
	if (Key == EKeys::F) StrikePenalty();
	if (Key == EKeys::T) HitBonus();
	if (Key == EKeys::R) RestartRound();
}
