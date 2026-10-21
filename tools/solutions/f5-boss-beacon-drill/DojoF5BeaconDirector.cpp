#include "DojoF5BeaconDirector.h"

#include "Components/InputComponent.h"
#include "Components/TextRenderComponent.h"
#include "Engine/World.h"
#include "GameFramework/PlayerController.h"
#include "InputCoreTypes.h"
#include "Kismet/GameplayStatics.h"
#include "Quests/f5-cooldown/DojoF5CooldownComponent.h"
#include "Quests/f5-follower/DojoF5Follower.h"
#include "Quests/f5-interact/DojoF5Prodder.h"
#include "Quests/f5-lever/DojoF5Lever.h"
#include "TimerManager.h"

ADojoF5BeaconDirector::ADojoF5BeaconDirector()
{
	PrimaryActorTick.bCanEverTick = false;

	Label = CreateDefaultSubobject<UTextRenderComponent>(TEXT("Label"));
	RootComponent = Label;
	Label->SetHorizontalAlignment(EHTA_Center);
}

void ADojoF5BeaconDirector::BeginPlay()
{
	Super::BeginPlay();

	AActor* Host = IsValid(FollowTarget) ? FollowTarget.Get() : UGameplayStatics::GetPlayerPawn(this, 0);
	if (IsValid(Keeper) && IsValid(Host)) Keeper->AttachToActor(Host, FAttachmentTransformRules::SnapToTargetNotIncludingScale);

	for (ADojoF5Lever* Lever : Levers)
	{
		if (IsValid(Lever)) Lever->OnPulled.AddDynamic(this, &ADojoF5BeaconDirector::HandleAnyLeverPulled);
	}

	if (APlayerController* Player = GetWorld()->GetFirstPlayerController())
	{
		EnableInput(Player);
		InputComponent->BindKey(EKeys::E, IE_Pressed, this, &ADojoF5BeaconDirector::HandleKey);
		InputComponent->BindKey(EKeys::R, IE_Pressed, this, &ADojoF5BeaconDirector::HandleKey);
	}

	StartRound();
}

void ADojoF5BeaconDirector::EndPlay(const EEndPlayReason::Type EndPlayReason)
{
	for (ADojoF5Lever* Lever : Levers)
	{
		if (IsValid(Lever)) Lever->OnPulled.RemoveDynamic(this, &ADojoF5BeaconDirector::HandleAnyLeverPulled);
	}

	GetWorldTimerManager().ClearAllTimersForObject(this);

	Super::EndPlay(EndPlayReason);
}

void ADojoF5BeaconDirector::StartRound()
{
	// The round is not running yet, so the pull handler ignores these pulls and starts no cooldowns.
	for (ADojoF5Lever* Lever : Levers)
	{
		if (IsValid(Lever) && Lever->IsOn()) Lever->Pull();
	}

	for (ADojoF5Lever* Lever : Levers)
	{
		UDojoF5CooldownComponent* Cooldown = IsValid(Lever) ? Lever->FindComponentByClass<UDojoF5CooldownComponent>() : nullptr;
		if (!Cooldown) continue;

		Cooldown->CooldownSeconds = CooldownSeconds;
		Cooldown->Cancel();
	}

	WasOn.Init(false, Levers.Num());
	LitAt.Init(0.f, Levers.Num());
	if (IsValid(Drone)) Drone->Follow(nullptr);

	Alarms = 0;
	bRunning = true;
	StartedAt = GetWorld()->GetTimeSeconds();
	Label->SetText(FText::FromString(TEXT("ALARM 0")));

	FTimerManager& Timers = GetWorldTimerManager();
	Timers.SetTimer(RoundTimer, this, &ADojoF5BeaconDirector::HandleTimeUp, RoundSeconds, false);
	Timers.SetTimer(CheckTimer, this, &ADojoF5BeaconDirector::CheckStep, CheckInterval, true);
}

void ADojoF5BeaconDirector::EndRound(bool bWon)
{
	bRunning = false;

	FTimerManager& Timers = GetWorldTimerManager();
	Timers.ClearTimer(RoundTimer);
	Timers.ClearTimer(CheckTimer);

	if (bWon)
	{
		WinSeconds = GetWorld()->GetTimeSeconds() - StartedAt;
		Label->SetText(FText::FromString(FString::Printf(TEXT("WIN %.1f s"), WinSeconds)));
	}
	else
	{
		Label->SetText(FText::FromString(TEXT("TIME UP")));
	}
}

void ADojoF5BeaconDirector::PressInteract()
{
	if (!bRunning || !IsValid(Keeper)) return;

	ADojoF5Lever* Nearest = nullptr;
	double NearestSquared = FMath::Square(static_cast<double>(InteractRange));

	for (ADojoF5Lever* Lever : Levers)
	{
		if (!IsValid(Lever)) continue;

		// Strictly closer only, so on a tie the lower index keeps its place.
		const double DistanceSquared = FVector::DistSquared(Keeper->GetActorLocation(), Lever->GetActorLocation());
		if (Nearest == nullptr ? DistanceSquared <= NearestSquared : DistanceSquared < NearestSquared)
		{
			Nearest = Lever;
			NearestSquared = DistanceSquared;
		}
	}

	if (Nearest) Keeper->Prod(Nearest);
}

void ADojoF5BeaconDirector::RestartRound()
{
	if (bRunning) return;

	StartRound();
}

bool ADojoF5BeaconDirector::IsRunning() const
{
	return bRunning;
}

int32 ADojoF5BeaconDirector::GetAlarms() const
{
	return Alarms;
}

float ADojoF5BeaconDirector::GetWinSeconds() const
{
	return WinSeconds;
}

void ADojoF5BeaconDirector::HandleAnyLeverPulled(bool bIsOn)
{
	if (!bRunning) return;

	const float Now = GetWorld()->GetTimeSeconds();
	bool bAllOn = Levers.Num() > 0;

	for (int32 Index = 0; Index < Levers.Num(); ++Index)
	{
		ADojoF5Lever* Lever = Levers[Index];
		if (!IsValid(Lever)) continue;

		const bool bOnNow = Lever->IsOn();
		if (bOnNow && !WasOn[Index])
		{
			LitAt[Index] = Now;
			if (IsValid(Drone)) Drone->Follow(Lever);
		}
		else if (!bOnNow && WasOn[Index])
		{
			// Every lever that goes dark, by timeout or by the alarm, starts its own cooldown.
			if (UDojoF5CooldownComponent* Cooldown = Lever->FindComponentByClass<UDojoF5CooldownComponent>()) Cooldown->TryStart();
		}

		WasOn[Index] = bOnNow;
		bAllOn &= bOnNow;
	}

	if (!bAllOn) return;

	Alarms++;
	Label->SetText(FText::FromString(FString::Printf(TEXT("ALARM %d"), Alarms)));

	// The alarm puts every lever out; each pull re-enters this handler and starts that lever's cooldown.
	for (ADojoF5Lever* Lever : Levers)
	{
		if (IsValid(Lever) && Lever->IsOn()) Lever->Pull();
	}

	if (Alarms >= AlarmsToWin) EndRound(true);
}

void ADojoF5BeaconDirector::CheckStep()
{
	const float Now = GetWorld()->GetTimeSeconds();

	for (int32 Index = 0; Index < Levers.Num(); ++Index)
	{
		ADojoF5Lever* Lever = Levers[Index];
		if (IsValid(Lever) && Lever->IsOn() && Now - LitAt[Index] >= LitSeconds) Lever->Pull();
	}
}

void ADojoF5BeaconDirector::HandleTimeUp()
{
	if (bRunning) EndRound(false);
}

void ADojoF5BeaconDirector::HandleKey(FKey Key)
{
	if (Key == EKeys::E) PressInteract();
	if (Key == EKeys::R) RestartRound();
}
