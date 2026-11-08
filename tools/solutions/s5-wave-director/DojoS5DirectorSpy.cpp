#include "DojoS5DirectorSpy.h"

void UDojoS5DirectorSpy::Watch(ADojoS5WaveDirector* Director)
{
	Watched = Director;

	if (Director == nullptr)
	{
		return;
	}

	Director->OnWaveStarted.AddUniqueDynamic(this, &UDojoS5DirectorSpy::HandleWaveStarted);
	Director->OnWaveCleared.AddUniqueDynamic(this, &UDojoS5DirectorSpy::HandleWaveCleared);
	Director->OnRestStarted.AddUniqueDynamic(this, &UDojoS5DirectorSpy::HandleRestStarted);
}

void UDojoS5DirectorSpy::HandleWaveStarted(int32 Wave, int32 BeetleCount)
{
	Heard.Add(FString::Printf(TEXT("start %d %d %s"), Wave, BeetleCount, *StateWord()));
}

void UDojoS5DirectorSpy::HandleWaveCleared(int32 Wave)
{
	Heard.Add(FString::Printf(TEXT("clear %d %s"), Wave, *StateWord()));
}

void UDojoS5DirectorSpy::HandleRestStarted(int32 NextWave, float Seconds)
{
	Heard.Add(FString::Printf(TEXT("rest %d %.1f %s"), NextWave, Seconds, *StateWord()));
}

FString UDojoS5DirectorSpy::StateWord() const
{
	if (Watched == nullptr)
	{
		return TEXT("?");
	}

	switch (Watched->GetState())
	{
	case EDojoS5DirectorState::EDS_Idle:
		return TEXT("Idle");
	case EDojoS5DirectorState::EDS_Wave:
		return TEXT("Wave");
	case EDojoS5DirectorState::EDS_Rest:
		return TEXT("Rest");
	case EDojoS5DirectorState::EDS_Done:
		return TEXT("Done");
	default:
		return TEXT("?");
	}
}
