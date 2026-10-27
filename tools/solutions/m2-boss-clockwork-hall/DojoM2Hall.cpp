#include "DojoM2Hall.h"

#include "Components/TextRenderComponent.h"
#include "Quests/m2-bumper/DojoM2Bumper.h"
#include "Quests/m2-bumper/DojoM2Wall.h"
#include "Quests/m2-dart/DojoM2Dart.h"
#include "Quests/m2-patrol/DojoM2Patrol.h"
#include "Quests/m2-sled/DojoM2Sled.h"

namespace
{
	/** Where the hero starts and where a hit sends it back to. */
	const FVector StartGate(0.f, 0.f, 0.f);

	/** Spawns a hazard with its settings applied before BeginPlay runs. */
	template<typename TActor>
	TActor* SpawnHazard(UWorld* World, const FVector& Location, const FRotator& Rotation, TFunctionRef<void(TActor&)> Configure)
	{
		const FTransform Where(Rotation, Location);
		TActor* Hazard = World->SpawnActorDeferred<TActor>(TActor::StaticClass(), Where);
		if (!Hazard) return nullptr;

		Configure(*Hazard);
		Hazard->FinishSpawning(Where);
		return Hazard;
	}
}

ADojoM2Hall::ADojoM2Hall()
{
	PrimaryActorTick.bCanEverTick = false;

	Board = CreateDefaultSubobject<UTextRenderComponent>(TEXT("Board"));
	RootComponent = Board;
	Board->SetHorizontalAlignment(EHTA_Center);
}

void ADojoM2Hall::BeginPlay()
{
	Super::BeginPlay();

	StartRound();
}

void ADojoM2Hall::EndPlay(const EEndPlayReason::Type EndPlayReason)
{
	GetWorldTimerManager().ClearAllTimersForObject(this);

	Super::EndPlay(EndPlayReason);
}

bool ADojoM2Hall::PressRestart()
{
	if (bRunning) return false;

	StartRound();
	return true;
}

bool ADojoM2Hall::IsRunning() const
{
	return bRunning;
}

int32 ADojoM2Hall::GetHits() const
{
	return Hits;
}

float ADojoM2Hall::GetRoundSeconds() const
{
	if (!bRunning) return FinishSeconds;

	return static_cast<float>(GetWorld()->GetTimeSeconds() - RoundStartSeconds);
}

AActor* ADojoM2Hall::GetCrusher() const
{
	return Crusher;
}

AActor* ADojoM2Hall::GetBoulder() const
{
	return Boulder;
}

AActor* ADojoM2Hall::GetBouncer() const
{
	return Bouncer;
}

AActor* ADojoM2Hall::GetDart() const
{
	return Dart;
}

void ADojoM2Hall::StartRound()
{
	ClearHazards();

	Hits = 0;
	bRunning = true;
	FinishSeconds = 0.f;
	RoundStartSeconds = GetWorld()->GetTimeSeconds();

	if (IsValid(Hero)) Hero->SetActorLocation(StartGate);

	Crusher = SpawnHazard<ADojoM2Patrol>(GetWorld(), FVector(500.f, -300.f, 0.f), FRotator(0.f, 90.f, 0.f), [](ADojoM2Patrol& Patrol)
	{
		Patrol.TravelDistance = 600.f;
		Patrol.Speed = 300.f;
	});

	for (const float WallY : { -400.f, 400.f })
	{
		Walls.Add(SpawnHazard<ADojoM2Wall>(GetWorld(), FVector(1400.f, WallY, 0.f), FRotator::ZeroRotator, [](ADojoM2Wall&) {}));
	}

	Bouncer = SpawnHazard<ADojoM2Bumper>(GetWorld(), FVector(1400.f, 0.f, 0.f), FRotator::ZeroRotator, [](ADojoM2Bumper& Ball)
	{
		Ball.Heading = FVector::RightVector;
		Ball.Speed = 300.f;
	});

	ReleaseBoulder();

	FTimerManager& Timers = GetWorldTimerManager();
	Timers.SetTimer(CheckTimer, this, &ADojoM2Hall::CheckHall, CheckSeconds, true);
	Timers.SetTimer(BoulderTimer, this, &ADojoM2Hall::ReleaseBoulder, BoulderSeconds, true);
	Timers.SetTimer(DartTimer, this, &ADojoM2Hall::FireDart, DartSeconds, true);

	RefreshBoard();
}

void ADojoM2Hall::EndRound()
{
	FinishSeconds = GetRoundSeconds();
	bRunning = false;

	FTimerManager& Timers = GetWorldTimerManager();
	Timers.ClearTimer(CheckTimer);
	Timers.ClearTimer(BoulderTimer);
	Timers.ClearTimer(DartTimer);

	RefreshBoard();
}

void ADojoM2Hall::CheckHall()
{
	if (!bRunning || !IsValid(Hero)) return;

	AActor* const Hazards[] = { Crusher, Boulder, Bouncer, Dart };
	for (AActor* Hazard : Hazards)
	{
		if (!IsValid(Hazard)) continue;
		if (FVector::Dist(Hero->GetActorLocation(), Hazard->GetActorLocation()) >= HitRadius) continue;

		Hits++;
		Hero->SetActorLocation(StartGate);

		if (Hazard == GetDart())
		{
			Hazard->Destroy();
			Dart = nullptr;
		}

		RefreshBoard();
		return;
	}

	if (Hero->GetActorLocation().X >= ExitX) EndRound();
}

void ADojoM2Hall::ReleaseBoulder()
{
	if (IsValid(Boulder)) Boulder->Destroy();

	Boulder = SpawnHazard<ADojoM2Sled>(GetWorld(), FVector(1000.f, -700.f, 0.f), FRotator(0.f, 90.f, 0.f), [](ADojoM2Sled& Rolling)
	{
		Rolling.Direction = FVector::ForwardVector;
		Rolling.bLocalSpace = true;
		Rolling.Speed = 350.f;
	});
}

void ADojoM2Hall::FireDart()
{
	if (IsValid(Dart)) Dart->Destroy();

	Dart = SpawnHazard<ADojoM2Dart>(GetWorld(), FVector(1800.f, 800.f, 0.f), FRotator(0.f, -90.f, 0.f), [](ADojoM2Dart& Shot)
	{
		Shot.Speed = 500.f;
		Shot.TurnRate = 90.f;
	});

	if (Dart) Dart->Launch(Hero);
}

void ADojoM2Hall::RefreshBoard()
{
	const FString Text = bRunning ? FString::Printf(TEXT("Hits: %d"), Hits) : FString::Printf(TEXT("CLEAR in %.1f s, %d hits"), FinishSeconds, Hits);
	Board->SetText(FText::FromString(Text));
}

void ADojoM2Hall::ClearHazards()
{
	TArray<AActor*> Built = { Crusher, Boulder, Bouncer, Dart };
	for (AActor* Wall : Walls) Built.Add(Wall);

	for (AActor* Hazard : Built)
	{
		if (IsValid(Hazard)) Hazard->Destroy();
	}

	Crusher = nullptr;
	Boulder = nullptr;
	Bouncer = nullptr;
	Dart = nullptr;
	Walls.Empty();
}
