#include "DojoM5Tower.h"

#include "Components/TextRenderComponent.h"
#include "DojoM5Pillar.h"
#include "Quests/m5-laser/DojoM5Laser.h"
#include "Quests/m5-sightline/DojoM5Eye.h"

namespace
{
	/** Where the hero starts and where an alarm or a zap sends it back to. */
	const FVector StartGate(0.f, 0.f, 0.f);

	/** Spawns a piece with its settings applied before BeginPlay runs. */
	template<typename TActor>
	TActor* SpawnPiece(UWorld* World, const FVector& Location, float YawDegrees, TFunctionRef<void(TActor&)> Configure)
	{
		const FTransform Where(FRotator(0.f, YawDegrees, 0.f), Location);
		TActor* Piece = World->SpawnActorDeferred<TActor>(TActor::StaticClass(), Where);
		if (!Piece) return nullptr;

		Configure(*Piece);
		Piece->FinishSpawning(Where);
		return Piece;
	}
}

ADojoM5Tower::ADojoM5Tower()
{
	PrimaryActorTick.bCanEverTick = false;

	Board = CreateDefaultSubobject<UTextRenderComponent>(TEXT("Board"));
	RootComponent = Board;
	Board->SetHorizontalAlignment(EHTA_Center);
}

void ADojoM5Tower::BeginPlay()
{
	Super::BeginPlay();

	StartRound();
}

void ADojoM5Tower::EndPlay(const EEndPlayReason::Type EndPlayReason)
{
	GetWorldTimerManager().ClearAllTimersForObject(this);

	Super::EndPlay(EndPlayReason);
}

bool ADojoM5Tower::PressRestart()
{
	if (bRunning) return false;

	StartRound();
	return true;
}

bool ADojoM5Tower::IsRunning() const
{
	return bRunning;
}

int32 ADojoM5Tower::GetAlarms() const
{
	return Alarms;
}

int32 ADojoM5Tower::GetZaps() const
{
	return Zaps;
}

float ADojoM5Tower::GetMeter() const
{
	return Meter;
}

float ADojoM5Tower::GetRoundSeconds() const
{
	if (!bRunning) return FinishSeconds;

	return static_cast<float>(GetWorld()->GetTimeSeconds() - RoundStartSeconds);
}

ADojoM5Eye* ADojoM5Tower::GetSentry(int32 Index) const
{
	return Sentries.IsValidIndex(Index) ? Sentries[Index].Get() : nullptr;
}

ADojoM5Laser* ADojoM5Tower::GetLaser() const
{
	return Laser;
}

void ADojoM5Tower::StartRound()
{
	ClearYard();

	Meter = 0.f;
	Alarms = 0;
	Zaps = 0;
	bRunning = true;
	FinishSeconds = 0.f;
	RoundStartSeconds = GetWorld()->GetTimeSeconds();

	if (IsValid(Hero)) Hero->SetActorLocation(StartGate);

	Pillar = SpawnPiece<ADojoM5Pillar>(GetWorld(), FVector(800.f, -300.f, 0.f), 0.f, [](ADojoM5Pillar&) {});

	const auto TuneEye = [this](ADojoM5Eye& Eye)
	{
		Eye.Range = SightRange;
		Eye.HalfAngleDegrees = SightHalfAngle;
	};
	Sentries.Add(SpawnPiece<ADojoM5Eye>(GetWorld(), FVector(800.f, -600.f, 0.f), 90.f, TuneEye));
	Sentries.Add(SpawnPiece<ADojoM5Eye>(GetWorld(), FVector(1400.f, 600.f, 0.f), -90.f, TuneEye));

	Laser = SpawnPiece<ADojoM5Laser>(GetWorld(), FVector(1300.f, -500.f, 0.f), 90.f, [](ADojoM5Laser& Beam)
	{
		Beam.MaxBounces = 0;
		Beam.SegmentLength = 1100.f;
	});
	if (Laser) Laser->Fire();

	GetWorldTimerManager().SetTimer(CheckTimer, this, &ADojoM5Tower::CheckYard, CheckSeconds, true);

	RefreshBoard();
}

void ADojoM5Tower::EndRound()
{
	FinishSeconds = GetRoundSeconds();
	bRunning = false;

	GetWorldTimerManager().ClearTimer(CheckTimer);

	RefreshBoard();
}

void ADojoM5Tower::CheckYard()
{
	if (!bRunning || !IsValid(Hero)) return;

	bool bSeen = false;
	for (ADojoM5Eye* Sentry : Sentries)
	{
		if (IsValid(Sentry) && Sentry->CanSee(Hero)) bSeen = true;
	}

	const float Change = bSeen ? FillPerSecond * CheckSeconds : -DrainPerSecond * CheckSeconds;
	Meter = FMath::Clamp(Meter + Change, 0.f, 1.f);

	bool bSentBack = false;
	if (Meter >= 1.f - KINDA_SMALL_NUMBER)
	{
		Alarms++;
		Meter = 0.f;
		SendHeroBack();
		bSentBack = true;
	}

	if (!bSentBack && IsValid(Laser))
	{
		Laser->Fire();

		if (BeamTouchesHero())
		{
			Zaps++;
			SendHeroBack();
			bSentBack = true;
		}
	}

	if (bSentBack)
	{
		RefreshBoard();
		return;
	}

	if (Hero->GetActorLocation().X >= ExitX) EndRound();
}

void ADojoM5Tower::SendHeroBack()
{
	Hero->SetActorLocation(StartGate);
}

bool ADojoM5Tower::BeamTouchesHero() const
{
	const FVector HeroLocation = Hero->GetActorLocation();

	for (int32 Index = 1; Index < Laser->GetPointCount(); ++Index)
	{
		const double Gap = FMath::PointDistToSegment(HeroLocation, Laser->GetPoint(Index - 1), Laser->GetPoint(Index));
		if (Gap < ZapRadius) return true;
	}

	return false;
}

void ADojoM5Tower::RefreshBoard()
{
	const FString Text = bRunning
		? FString::Printf(TEXT("Alarms: %d, Zaps: %d"), Alarms, Zaps)
		: FString::Printf(TEXT("CLEAR in %.1f s, %d alarms, %d zaps"), FinishSeconds, Alarms, Zaps);
	Board->SetText(FText::FromString(Text));
}

void ADojoM5Tower::ClearYard()
{
	for (ADojoM5Eye* Sentry : Sentries)
	{
		if (IsValid(Sentry)) Sentry->Destroy();
	}
	Sentries.Empty();

	if (IsValid(Laser)) Laser->Destroy();
	if (IsValid(Pillar)) Pillar->Destroy();

	Laser = nullptr;
	Pillar = nullptr;
}
