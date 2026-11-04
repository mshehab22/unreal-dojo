#include "DojoM8AlertMeter.h"

#include "Components/SceneComponent.h"
#include "DojoM8Searchlight.h"
#include "Engine/World.h"

ADojoM8AlertMeter::ADojoM8AlertMeter()
{
	PrimaryActorTick.bCanEverTick = false;

	RootComponent = CreateDefaultSubobject<USceneComponent>(TEXT("Root"));
}

void ADojoM8AlertMeter::BeginPlay()
{
	Super::BeginPlay();

	GetWorldTimerManager().SetTimer(PulseHandle, this, &ADojoM8AlertMeter::Pulse, PulseSeconds, true);
}

void ADojoM8AlertMeter::Watch(ADojoM8Searchlight* Light)
{
	if (!IsValid(Light)) return;

	Light->OnSightChanged.AddUniqueDynamic(this, &ADojoM8AlertMeter::HandleSightChanged);
}

void ADojoM8AlertMeter::StartOver()
{
	AlertLevel = 0.f;
	bCaught = false;
}

float ADojoM8AlertMeter::GetAlertLevel() const
{
	return AlertLevel;
}

bool ADojoM8AlertMeter::IsCaught() const
{
	return bCaught;
}

void ADojoM8AlertMeter::HandleSightChanged(ADojoM8Searchlight* Light, bool bSeen)
{
	bSeenNow = bSeen;
}

void ADojoM8AlertMeter::Pulse()
{
	if (bCaught) return;

	if (bSeenNow) AlertLevel += PulseSeconds;
	else AlertLevel = FMath::Max(0.f, AlertLevel - CalmDownPerSecond * PulseSeconds);

	if (AlertLevel < CaughtAfterSeconds) return;

	bCaught = true;
	OnCaught.Broadcast();
}
