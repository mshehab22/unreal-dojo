#include "DojoP22Gauntlet.h"

#include "Components/InputComponent.h"
#include "Components/TextRenderComponent.h"
#include "Engine/World.h"
#include "GameFramework/PlayerController.h"
#include "Kismet/GameplayStatics.h"
#include "Quests/p22-checkpoint-desk/DojoP22CheckpointDesk.h"
#include "Quests/p22-hit-feedback/DojoP22HitFeedback.h"

namespace DojoP22GauntletRules
{
	/** Where the runner starts. */
	const FVector Start = FVector::ZeroVector;

	/** The first gate's X; each later gate is this much further. */
	constexpr double GateSpacing = 1000.0;

	/** How far in front of its gate a dummy stands. */
	constexpr double DummyLead = 300.0;

	/** How far apart a gate's dummies stand, side to side. */
	constexpr double DummySpread = 200.0;

	/** A dummy's health when it stands up. */
	constexpr int32 DummyStartHealth = 60;

	/** The damage one strike does. */
	constexpr int32 StrikeDamage = 25;

	/** The damage a breaking strike reports to the feedback, so it plays as a heavy hit. */
	constexpr float BreakFeedbackDamage = 60.f;

	/** How far the runner reaches. */
	constexpr double Reach = 200.0;

	/** The runner's health when a round starts. */
	constexpr int32 RunnerHealth = 100;

	/** Health the pit takes. */
	constexpr int32 FallDamage = 30;

	/** Length of a round. */
	constexpr float RoundSeconds = 60.f;
}

ADojoP22Gauntlet::ADojoP22Gauntlet()
{
	PrimaryActorTick.bCanEverTick = true;

	Label = CreateDefaultSubobject<UTextRenderComponent>(TEXT("Label"));
	RootComponent = Label;
	Label->SetHorizontalAlignment(EHTA_Center);
}

void ADojoP22Gauntlet::BeginPlay()
{
	Super::BeginPlay();

	if (!IsValid(Runner)) Runner = UGameplayStatics::GetPlayerPawn(this, 0);

	if (APlayerController* Player = GetWorld()->GetFirstPlayerController())
	{
		EnableInput(Player);
		InputComponent->BindKey(EKeys::E, IE_Pressed, this, &ADojoP22Gauntlet::HandleKey);
		InputComponent->BindKey(EKeys::R, IE_Pressed, this, &ADojoP22Gauntlet::HandleKey);
	}

	StartRound();
}

void ADojoP22Gauntlet::StartRound()
{
	DummyHealth.Init(DojoP22GauntletRules::DummyStartHealth, GateCount * DummiesPerGate);
	Health = DojoP22GauntletRules::RunnerHealth;
	GatesOpen = 0;
	Elapsed = 0.f;
	bRunning = true;

	if (UDojoP22CheckpointDesk* Desk = GetWorld()->GetSubsystem<UDojoP22CheckpointDesk>()) Desk->ClearCheckpoints();
	if (IsValid(Runner)) Runner->SetActorLocation(DojoP22GauntletRules::Start);

	UpdateLabel();
}

FVector ADojoP22Gauntlet::GetDummySpot(int32 Index) const
{
	const int32 Gate = Index / DummiesPerGate;
	const int32 Place = Index % DummiesPerGate;
	const double X = DojoP22GauntletRules::GateSpacing * (Gate + 1) - DojoP22GauntletRules::DummyLead;
	const double Y = DojoP22GauntletRules::DummySpread * (Place - 1);
	return FVector(X, Y, 0.0);
}

void ADojoP22Gauntlet::PressStrike()
{
	if (!bRunning || !IsValid(Runner)) return;

	UDojoP22HitFeedback* Feedback = GetWorld()->GetSubsystem<UDojoP22HitFeedback>();
	const FVector From = Runner->GetActorLocation();

	int32 Best = INDEX_NONE;
	double BestDistance = TNumericLimits<double>::Max();
	const int32 First = GatesOpen * DummiesPerGate;
	for (int32 Index = First; Index < First + DummiesPerGate && Index < DummyHealth.Num(); ++Index)
	{
		const double Distance = FVector::Dist2D(GetDummySpot(Index), From);
		if (DummyHealth[Index] <= 0 || Distance > DojoP22GauntletRules::Reach || Distance >= BestDistance) continue;

		Best = Index;
		BestDistance = Distance;
	}

	if (Best == INDEX_NONE)
	{
		if (Feedback) Feedback->PlayMissFeedback(From);
		return;
	}

	DummyHealth[Best] -= DojoP22GauntletRules::StrikeDamage;
	const bool bBroke = DummyHealth[Best] <= 0;
	if (Feedback) Feedback->PlayHitFeedback(GetDummySpot(Best), bBroke ? DojoP22GauntletRules::BreakFeedbackDamage : static_cast<float>(DojoP22GauntletRules::StrikeDamage));

	bool bGateClear = true;
	for (int32 Index = First; Index < First + DummiesPerGate; ++Index)
	{
		if (DummyHealth[Index] > 0) bGateClear = false;
	}

	if (bGateClear) OpenGate();
	UpdateLabel();
}

void ADojoP22Gauntlet::OpenGate()
{
	++GatesOpen;

	const FVector GateSpot(DojoP22GauntletRules::GateSpacing * GatesOpen, 0.0, 0.0);
	if (UDojoP22CheckpointDesk* Desk = GetWorld()->GetSubsystem<UDojoP22CheckpointDesk>())
	{
		Desk->SaveCheckpoint(FName(*FString::Printf(TEXT("Gate%d"), GatesOpen)), GateSpot, Health);
	}

	if (GatesOpen >= GateCount) EndRound(FString::Printf(TEXT("CLEAR %.1f s"), Elapsed));
}

void ADojoP22Gauntlet::RunnerFell()
{
	if (!bRunning || !IsValid(Runner)) return;

	Health -= DojoP22GauntletRules::FallDamage;
	if (Health <= 0)
	{
		Health = 0;
		EndRound(TEXT("DOWN"));
		return;
	}

	FName Gate;
	FVector Back = DojoP22GauntletRules::Start;
	int32 SavedHealth = 0;
	if (UDojoP22CheckpointDesk* Desk = GetWorld()->GetSubsystem<UDojoP22CheckpointDesk>()) Desk->LoadLatest(Gate, Back, SavedHealth);

	Runner->SetActorLocation(Back);
	UpdateLabel();
}

void ADojoP22Gauntlet::Tick(float DeltaSeconds)
{
	Super::Tick(DeltaSeconds);

	if (!bRunning) return;

	Elapsed += DeltaSeconds;
	if (Elapsed >= DojoP22GauntletRules::RoundSeconds)
	{
		EndRound(TEXT("TIME UP"));
		return;
	}

	UpdateLabel();
}

void ADojoP22Gauntlet::EndRound(const FString& ResultText)
{
	bRunning = false;
	if (Label) Label->SetText(FText::FromString(ResultText));
}

void ADojoP22Gauntlet::RestartRound()
{
	if (bRunning) return;

	StartRound();
}

void ADojoP22Gauntlet::HandleKey(FKey Key)
{
	if (Key == EKeys::E) PressStrike();
	else if (Key == EKeys::R) RestartRound();
}

void ADojoP22Gauntlet::UpdateLabel()
{
	if (!Label || !bRunning) return;

	const int32 SecondsLeft = FMath::Max(0, FMath::CeilToInt32(DojoP22GauntletRules::RoundSeconds - Elapsed));
	Label->SetText(FText::FromString(FString::Printf(TEXT("GATE %d/%d  HEALTH %d  %d s"), FMath::Min(GatesOpen + 1, GateCount), GateCount, Health, SecondsLeft)));
}

bool ADojoP22Gauntlet::IsRunning() const
{
	return bRunning;
}

int32 ADojoP22Gauntlet::GetHealth() const
{
	return Health;
}

int32 ADojoP22Gauntlet::GetGatesOpen() const
{
	return GatesOpen;
}

float ADojoP22Gauntlet::GetElapsed() const
{
	return Elapsed;
}

int32 ADojoP22Gauntlet::GetDummyHealth(int32 Index) const
{
	return DummyHealth.IsValidIndex(Index) ? DummyHealth[Index] : 0;
}
