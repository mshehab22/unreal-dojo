#include "DojoP14StartLights.h"

#include "Components/SceneComponent.h"
#include "EngineUtils.h"

ADojoP14StartLights::ADojoP14StartLights()
{
	PrimaryActorTick.bCanEverTick = true;

	RootComponent = CreateDefaultSubobject<USceneComponent>(TEXT("Root"));
}

void ADojoP14StartLights::BeginPlay()
{
	Super::BeginPlay();

	for (TActorIterator<ADojoP14StartLights> Other(GetWorld()); Other; ++Other)
	{
		if (*Other == this || !Other->IsRunning()) continue;

		bDuplicate = true;
		SetActorHiddenInGame(true);
		return;
	}

	bRunning = true;
}

void ADojoP14StartLights::EndPlay(const EEndPlayReason::Type EndPlayReason)
{
	bRunning = false;

	Super::EndPlay(EndPlayReason);
}

bool ADojoP14StartLights::BeginCountdown()
{
	if (!bRunning) return false;

	bCounting = true;
	bGreen = false;
	CountedSeconds = 0.f;
	return true;
}

bool ADojoP14StartLights::IsGreen() const
{
	return bGreen;
}

bool ADojoP14StartLights::IsRunning() const
{
	return bRunning;
}

bool ADojoP14StartLights::IsDuplicate() const
{
	return bDuplicate;
}

void ADojoP14StartLights::Tick(float DeltaSeconds)
{
	Super::Tick(DeltaSeconds);

	if (!bCounting) return;

	CountedSeconds += DeltaSeconds;
	if (CountedSeconds < CountdownSeconds) return;

	bCounting = false;
	bGreen = true;
}
