#include "DojoS5WaveBanner.h"

#include "Components/TextRenderComponent.h"
#include "Quests/s5-wave-director/DojoS5WaveDirector.h"

ADojoS5WaveBanner::ADojoS5WaveBanner()
{
	PrimaryActorTick.bCanEverTick = false;

	Display = CreateDefaultSubobject<UTextRenderComponent>(TEXT("Display"));
	RootComponent = Display;
	Display->SetHorizontalAlignment(EHTA_Center);
	Display->SetText(FText::GetEmpty());
}

void ADojoS5WaveBanner::Watch(ADojoS5WaveDirector* Director)
{
	StopWatching();
	ShowLine(FString());

	if (Director == nullptr)
	{
		return;
	}

	Watched = Director;
	Watched->OnWaveStarted.AddUniqueDynamic(this, &ADojoS5WaveBanner::HandleWaveStarted);
	Watched->OnWaveCleared.AddUniqueDynamic(this, &ADojoS5WaveBanner::HandleWaveCleared);
	Watched->OnRestStarted.AddUniqueDynamic(this, &ADojoS5WaveBanner::HandleRestStarted);
}

void ADojoS5WaveBanner::EndPlay(const EEndPlayReason::Type EndPlayReason)
{
	StopWatching();

	Super::EndPlay(EndPlayReason);
}

void ADojoS5WaveBanner::HandleWaveStarted(int32 Wave, int32 BeetleCount)
{
	ShowLine(FString::Printf(TEXT("Wave %d: %d %s"), Wave, BeetleCount, BeetleCount == 1 ? TEXT("beetle") : TEXT("beetles")));
}

void ADojoS5WaveBanner::HandleWaveCleared(int32 Wave)
{
	ShowLine(FString::Printf(TEXT("Wave %d cleared"), Wave));
}

void ADojoS5WaveBanner::HandleRestStarted(int32 NextWave, float Seconds)
{
	ShowLine(FString::Printf(TEXT("Rest: wave %d in %d s"), NextWave, FMath::CeilToInt(Seconds)));
}

void ADojoS5WaveBanner::StopWatching()
{
	if (Watched != nullptr)
	{
		Watched->OnWaveStarted.RemoveDynamic(this, &ADojoS5WaveBanner::HandleWaveStarted);
		Watched->OnWaveCleared.RemoveDynamic(this, &ADojoS5WaveBanner::HandleWaveCleared);
		Watched->OnRestStarted.RemoveDynamic(this, &ADojoS5WaveBanner::HandleRestStarted);
	}

	Watched = nullptr;
}

void ADojoS5WaveBanner::ShowLine(const FString& Line)
{
	Display->SetText(FText::FromString(Line));
}
