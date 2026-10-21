#include "DojoF1YardDirector.h"

#include "Components/InputComponent.h"
#include "Components/SceneComponent.h"
#include "Engine/World.h"
#include "GameFramework/PlayerController.h"
#include "InputCoreTypes.h"
#include "Quests/f1-popup-target/DojoF1PopupTarget.h"
#include "Quests/f1-practice-bell/DojoF1PracticeBell.h"
#include "Quests/f1-score-keeper/DojoF1ScoreKeeper.h"
#include "Quests/f1-training-dummy/DojoF1TrainingDummy.h"
#include "TimerManager.h"

ADojoF1YardDirector::ADojoF1YardDirector()
{
	PrimaryActorTick.bCanEverTick = false;

	RootComponent = CreateDefaultSubobject<USceneComponent>(TEXT("Root"));
}

void ADojoF1YardDirector::BeginPlay()
{
	Super::BeginPlay();

	if (APlayerController* Player = GetWorld()->GetFirstPlayerController())
	{
		EnableInput(Player);

		const FKey Keys[] = { EKeys::One, EKeys::Two, EKeys::Three, EKeys::Four, EKeys::Five, EKeys::Six, EKeys::Q, EKeys::E, EKeys::R };
		for (const FKey& Key : Keys)
		{
			InputComponent->BindKey(Key, IE_Pressed, this, &ADojoF1YardDirector::HandleKey);
		}
	}

	StartRound();
}

void ADojoF1YardDirector::EndPlay(const EEndPlayReason::Type EndPlayReason)
{
	GetWorldTimerManager().ClearAllTimersForObject(this);

	Super::EndPlay(EndPlayReason);
}

void ADojoF1YardDirector::StartRound()
{
	if (bRoundRunning) return;

	for (ADojoF1PopupTarget* Target : Targets)
	{
		if (IsValid(Target)) Target->ResetForRound();
	}

	for (ADojoF1TrainingDummy* Dummy : Dummies)
	{
		if (IsValid(Dummy)) Dummy->ResetHits();
	}

	bBellRungThisRound = false;
	RiseTimes.Empty();

	if (IsValid(Keeper)) Keeper->ShowScore();

	bRoundRunning = true;

	FTimerManager& Timers = GetWorldTimerManager();
	Timers.SetTimer(RoundTimer, this, &ADojoF1YardDirector::EndRound, RoundSeconds, false);
	Timers.SetTimer(RiseTimer, this, &ADojoF1YardDirector::RiseStep, RiseInterval, true);
	Timers.SetTimer(LowerTimer, this, &ADojoF1YardDirector::LowerStep, LowerCheckInterval, true);
}

void ADojoF1YardDirector::EndRound()
{
	if (!bRoundRunning) return;

	FTimerManager& Timers = GetWorldTimerManager();
	Timers.ClearTimer(RoundTimer);
	Timers.ClearTimer(RiseTimer);
	Timers.ClearTimer(LowerTimer);

	bRoundRunning = false;

	if (IsValid(Keeper)) Keeper->ShowScore();
}

void ADojoF1YardDirector::HitTarget(int32 Index)
{
	if (!bRoundRunning || !Targets.IsValidIndex(Index) || !IsValid(Targets[Index])) return;

	Targets[Index]->Hit();
	CheckBell();
}

void ADojoF1YardDirector::StrikeDummy(int32 Index)
{
	if (!bRoundRunning || !Dummies.IsValidIndex(Index) || !IsValid(Dummies[Index])) return;

	Dummies[Index]->Strike();
	CheckBell();
}

void ADojoF1YardDirector::RestartRound()
{
	if (bRoundRunning) return;

	StartRound();
}

bool ADojoF1YardDirector::IsRoundRunning() const
{
	return bRoundRunning;
}

int32 ADojoF1YardDirector::CountRaised() const
{
	int32 Raised = 0;

	for (const ADojoF1PopupTarget* Target : Targets)
	{
		if (IsValid(Target) && Target->GetState() == EDojoF1TargetState::ETS_Raised) Raised++;
	}

	return Raised;
}

void ADojoF1YardDirector::RiseStep()
{
	if (CountRaised() >= MaxRaised) return;

	TArray<ADojoF1PopupTarget*> Lowered;
	for (ADojoF1PopupTarget* Target : Targets)
	{
		if (IsValid(Target) && Target->GetState() == EDojoF1TargetState::ETS_Lowered) Lowered.Add(Target);
	}

	if (Lowered.Num() == 0) return;

	ADojoF1PopupTarget* Chosen = Lowered[FMath::RandRange(0, Lowered.Num() - 1)];
	Chosen->Raise();
	RiseTimes.Add(Chosen, GetWorld()->GetTimeSeconds());
}

void ADojoF1YardDirector::LowerStep()
{
	const float Now = GetWorld()->GetTimeSeconds();

	for (ADojoF1PopupTarget* Target : Targets)
	{
		if (!IsValid(Target) || Target->GetState() != EDojoF1TargetState::ETS_Raised) continue;

		const float* RoseAt = RiseTimes.Find(Target);
		if (RoseAt && Now - *RoseAt >= UpSeconds) Target->Lower();
	}
}

void ADojoF1YardDirector::CheckBell()
{
	if (bBellRungThisRound || !IsValid(Keeper) || !IsValid(Bell)) return;
	if (Keeper->CountScore() < BellThreshold) return;

	Bell->Strike(Bell->FullVolumeForce);
	bBellRungThisRound = true;
}

void ADojoF1YardDirector::HandleKey(FKey Key)
{
	const FKey TargetKeys[] = { EKeys::One, EKeys::Two, EKeys::Three, EKeys::Four, EKeys::Five, EKeys::Six };
	for (int32 Index = 0; Index < UE_ARRAY_COUNT(TargetKeys); ++Index)
	{
		if (Key == TargetKeys[Index]) HitTarget(Index);
	}

	if (Key == EKeys::Q) StrikeDummy(0);
	if (Key == EKeys::E) StrikeDummy(1);
	if (Key == EKeys::R) RestartRound();
}
