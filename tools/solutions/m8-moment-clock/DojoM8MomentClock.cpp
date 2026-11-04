#include "DojoM8MomentClock.h"

#include "Components/SceneComponent.h"
#include "Engine/World.h"
#include "Quests/m8-alert-meter/DojoM8AlertMeter.h"
#include "Quests/m8-exit-gate/DojoM8ExitGate.h"

ADojoM8MomentClock::ADojoM8MomentClock()
{
	PrimaryActorTick.bCanEverTick = false;

	RootComponent = CreateDefaultSubobject<USceneComponent>(TEXT("Root"));
}

void ADojoM8MomentClock::WatchExit(ADojoM8ExitGate* Gate)
{
	if (!IsValid(Gate)) return;

	Gate->OnEscaped.AddUniqueDynamic(this, &ADojoM8MomentClock::HandleEscaped);
}

void ADojoM8MomentClock::WatchAlert(ADojoM8AlertMeter* Meter)
{
	if (!IsValid(Meter)) return;

	Meter->OnCaught.AddUniqueDynamic(this, &ADojoM8MomentClock::HandleCaught);
}

void ADojoM8MomentClock::Start()
{
	GetWorldTimerManager().ClearTimer(LimitHandle);

	Outcome = EDojoM8Outcome::EO_Running;
	StartSeconds = GetWorld()->GetTimeSeconds();
	EndSeconds = StartSeconds;
	GetWorldTimerManager().SetTimer(LimitHandle, this, &ADojoM8MomentClock::HandleTimeUp, TimeLimitSeconds, false);
}

EDojoM8Outcome ADojoM8MomentClock::GetOutcome() const
{
	return Outcome;
}

float ADojoM8MomentClock::GetElapsedSeconds() const
{
	switch (Outcome)
	{
	case EDojoM8Outcome::EO_Waiting:
		return 0.f;
	case EDojoM8Outcome::EO_Running:
		return static_cast<float>(GetWorld()->GetTimeSeconds() - StartSeconds);
	default:
		return static_cast<float>(EndSeconds - StartSeconds);
	}
}

FString ADojoM8MomentClock::GetLabel() const
{
	switch (Outcome)
	{
	case EDojoM8Outcome::EO_Waiting:
		return TEXT("WAITING");
	case EDojoM8Outcome::EO_Running:
		return TEXT("RUNNING");
	case EDojoM8Outcome::EO_Escaped:
		return FString::Printf(TEXT("ESCAPED in %.1f s"), GetElapsedSeconds());
	case EDojoM8Outcome::EO_Caught:
		return FString::Printf(TEXT("CAUGHT after %.1f s"), GetElapsedSeconds());
	default:
		return TEXT("TIME UP");
	}
}

void ADojoM8MomentClock::HandleEscaped(AActor* Escapee)
{
	Finish(EDojoM8Outcome::EO_Escaped);
}

void ADojoM8MomentClock::HandleCaught()
{
	Finish(EDojoM8Outcome::EO_Caught);
}

void ADojoM8MomentClock::HandleTimeUp()
{
	Finish(EDojoM8Outcome::EO_TimeUp);
}

void ADojoM8MomentClock::Finish(EDojoM8Outcome Result)
{
	if (Outcome != EDojoM8Outcome::EO_Running) return;

	Outcome = Result;
	EndSeconds = GetWorld()->GetTimeSeconds();
	GetWorldTimerManager().ClearTimer(LimitHandle);
}
