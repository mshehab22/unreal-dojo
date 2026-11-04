#include "DojoP20PracticeYard.h"

#include "Components/InputComponent.h"
#include "Components/TextRenderComponent.h"
#include "Engine/World.h"
#include "GameFramework/PlayerController.h"
#include "Quests/p20-mover-rules/DojoP20Mover.h"
#include "Quests/p20-target-rules/DojoP20Launcher.h"
#include "TimerManager.h"

ADojoP20PracticeYard::ADojoP20PracticeYard()
{
	PrimaryActorTick.bCanEverTick = false;

	Label = CreateDefaultSubobject<UTextRenderComponent>(TEXT("Label"));
	RootComponent = Label;
	Label->SetHorizontalAlignment(EHTA_Center);
}

void ADojoP20PracticeYard::BeginPlay()
{
	Super::BeginPlay();

	Launcher = GetWorld()->SpawnActor<ADojoP20Launcher>(GetActorLocation(), FRotator::ZeroRotator);

	for (const FDojoP20DummyPlan& Plan : Dummies)
	{
		ADojoP20Mover* Mover = GetWorld()->SpawnActor<ADojoP20Mover>(Plan.StartLocation, FRotator::ZeroRotator);
		if (Mover) Mover->SetRuleClass(Plan.MoveRuleClass);
		Movers.Add(Mover);
	}

	ApplyRuleClass();

	if (APlayerController* Player = GetWorld()->GetFirstPlayerController())
	{
		EnableInput(Player);
		InputComponent->BindKey(EKeys::T, IE_Pressed, this, &ADojoP20PracticeYard::HandleKey);
		InputComponent->BindKey(EKeys::R, IE_Pressed, this, &ADojoP20PracticeYard::HandleKey);
	}

	StartRound();
}

void ADojoP20PracticeYard::EndPlay(const EEndPlayReason::Type EndPlayReason)
{
	GetWorldTimerManager().ClearTimer(RoundTimer);
	GetWorldTimerManager().ClearTimer(StepTimer);
	GetWorldTimerManager().ClearTimer(FireTimer);

	Super::EndPlay(EndPlayReason);
}

void ADojoP20PracticeYard::PressCycleRule()
{
	if (RuleClasses.Num() == 0) return;

	RuleIndex = (RuleIndex + 1) % RuleClasses.Num();
	ApplyRuleClass();
	UpdateLabel();
}

void ADojoP20PracticeYard::PressNextRound()
{
	if (bRunning) return;

	StartRound();
}

bool ADojoP20PracticeYard::IsRunning() const
{
	return bRunning;
}

int32 ADojoP20PracticeYard::GetRoundNumber() const
{
	return RoundNumber;
}

int32 ADojoP20PracticeYard::GetHits() const
{
	return Hits;
}

int32 ADojoP20PracticeYard::GetStandingCount() const
{
	int32 Standing = 0;
	for (const int32 Left : Health) Standing += Left > 0 ? 1 : 0;
	return Standing;
}

FString ADojoP20PracticeYard::GetResult() const
{
	return Result;
}

const TArray<FName>& ADojoP20PracticeYard::GetShotLog() const
{
	return ShotLog;
}

ADojoP20Mover* ADojoP20PracticeYard::GetMover(int32 Index) const
{
	return Movers.IsValidIndex(Index) ? Movers[Index].Get() : nullptr;
}

ADojoP20Launcher* ADojoP20PracticeYard::GetLauncher() const
{
	return Launcher.Get();
}

void ADojoP20PracticeYard::StartRound()
{
	RoundNumber++;
	Hits = 0;
	ShotLog.Reset();
	Result.Reset();

	Health.Reset();
	for (int32 Index = 0; Index < Dummies.Num(); Index++)
	{
		Health.Add(Dummies[Index].StartHealth);

		ADojoP20Mover* Mover = Movers[Index];
		if (!IsValid(Mover)) continue;

		Mover->SetActorLocation(Dummies[Index].StartLocation);
		Mover->SetRuleClass(Dummies[Index].MoveRuleClass);
	}

	bRunning = true;
	GetWorldTimerManager().SetTimer(RoundTimer, this, &ADojoP20PracticeYard::HandleTimeUp, RoundSeconds, false);
	GetWorldTimerManager().SetTimer(StepTimer, this, &ADojoP20PracticeYard::HandleStep, 0.5f, true, 0.25f);
	GetWorldTimerManager().SetTimer(FireTimer, this, &ADojoP20PracticeYard::HandleFire, FireInterval, true, FireInterval);

	UpdateLabel();
}

void ADojoP20PracticeYard::EndRound()
{
	bRunning = false;
	GetWorldTimerManager().ClearTimer(RoundTimer);
	GetWorldTimerManager().ClearTimer(StepTimer);
	GetWorldTimerManager().ClearTimer(FireTimer);

	Result = GetStandingCount() == 0 ? TEXT("CLEARED") : TEXT("ESCAPED");
	UpdateLabel();
}

void ADojoP20PracticeYard::ApplyRuleClass()
{
	if (!IsValid(Launcher)) return;

	if (!RuleClasses.IsValidIndex(RuleIndex) || RuleClasses[RuleIndex].Get() == nullptr || RuleClasses[RuleIndex]->HasAnyClassFlags(CLASS_Abstract))
	{
		Launcher->Rule = nullptr;
		return;
	}

	Launcher->Rule = NewObject<UDojoP20TargetRule>(Launcher, RuleClasses[RuleIndex].Get());
}

void ADojoP20PracticeYard::UpdateLabel()
{
	const FString RuleName = IsValid(Launcher) && IsValid(Launcher->Rule) ? Launcher->Rule->GetClass()->GetName() : FString(TEXT("None"));
	FString Text = FString::Printf(TEXT("Round %d  %s  Hits %d  Standing %d"), RoundNumber, *RuleName, Hits, GetStandingCount());
	if (!Result.IsEmpty()) Text += TEXT("  ") + Result;

	Label->SetText(FText::FromString(Text));
}

void ADojoP20PracticeYard::HandleStep()
{
	if (!bRunning) return;

	for (int32 Index = 0; Index < Movers.Num(); Index++)
	{
		if (Health.IsValidIndex(Index) && Health[Index] > 0 && IsValid(Movers[Index])) Movers[Index]->Step(0.5f);
	}
}

void ADojoP20PracticeYard::HandleFire()
{
	if (!bRunning || !IsValid(Launcher)) return;

	TArray<FDojoP20Candidate> Candidates;
	for (int32 Index = 0; Index < Dummies.Num(); Index++)
	{
		FDojoP20Candidate Candidate;
		Candidate.Name = Dummies[Index].DummyName;
		Candidate.Location = IsValid(Movers[Index]) ? Movers[Index]->GetActorLocation() : Dummies[Index].StartLocation;
		Candidate.Health = Health[Index];
		Candidates.Add(Candidate);
	}
	Launcher->Candidates = Candidates;

	const FName Target = Launcher->Fire();
	ShotLog.Add(Target);

	for (int32 Index = 0; Index < Dummies.Num(); Index++)
	{
		if (Target == NAME_None || Dummies[Index].DummyName != Target) continue;

		Health[Index] -= HitDamage;
		Hits++;
		break;
	}

	UpdateLabel();
}

void ADojoP20PracticeYard::HandleTimeUp()
{
	if (bRunning) EndRound();
}

void ADojoP20PracticeYard::HandleKey(FKey Key)
{
	if (Key == EKeys::T) PressCycleRule();
	else if (Key == EKeys::R) PressNextRound();
}
