#include "DojoP19DuskHunt.h"

#include "Components/InputComponent.h"
#include "Components/TextRenderComponent.h"
#include "Engine/World.h"
#include "GameFramework/PlayerController.h"
#include "Kismet/GameplayStatics.h"
#include "Quests/p19-firefly-meadow/DojoP19Meadow.h"
#include "Quests/p19-firefly-swarm/DojoP19Swarm.h"
#include "TimerManager.h"

ADojoP19DuskHunt::ADojoP19DuskHunt()
{
	PrimaryActorTick.bCanEverTick = true;

	Label = CreateDefaultSubobject<UTextRenderComponent>(TEXT("Label"));
	RootComponent = Label;
	Label->SetHorizontalAlignment(EHTA_Center);
}

void ADojoP19DuskHunt::BeginPlay()
{
	Super::BeginPlay();

	if (!IsValid(Champion)) Champion = UGameplayStatics::GetPlayerPawn(this, 0);

	// The only actors of the evening: one swarm and one meadow. Every firefly after this is a record.
	const FTransform Here = GetActorTransform();
	Swarm = GetWorld()->SpawnActorDeferred<ADojoP19Swarm>(ADojoP19Swarm::StaticClass(), Here);
	if (Swarm)
	{
		Swarm->StartingFireflies = AmbientFireflies;
		Swarm->FinishSpawning(Here);
	}
	Meadow = GetWorld()->SpawnActor<ADojoP19Meadow>(GetActorLocation(), GetActorRotation());

	if (APlayerController* Player = GetWorld()->GetFirstPlayerController())
	{
		EnableInput(Player);
		InputComponent->BindKey(EKeys::R, IE_Pressed, this, &ADojoP19DuskHunt::HandleKey);
	}

	StartRound();
}

void ADojoP19DuskHunt::EndPlay(const EEndPlayReason::Type EndPlayReason)
{
	GetWorldTimerManager().ClearTimer(ReleaseTimer);
	GetWorldTimerManager().ClearTimer(DuskTimer);

	if (IsValid(Swarm)) Swarm->Destroy();
	if (IsValid(Meadow)) Meadow->Destroy();

	Super::EndPlay(EndPlayReason);
}

bool ADojoP19DuskHunt::StartRound()
{
	if (bRunning || !IsValid(Meadow)) return false;

	// Fireflies left over from the last round are taken out, so nothing of it counts in this one.
	for (const FDojoP19FlyHandle& Handle : Released)
	{
		Meadow->Catch(Handle);
	}
	Released.Empty();

	Spots.Initialize(Seed);
	Caught = 0;
	Missed = 0;
	bRunning = true;
	RoundStartSeconds = GetWorld()->GetTimeSeconds();

	GetWorldTimerManager().SetTimer(ReleaseTimer, this, &ADojoP19DuskHunt::ReleaseFirefly, ReleaseEverySeconds, true, FirstReleaseSeconds);
	GetWorldTimerManager().SetTimer(DuskTimer, this, &ADojoP19DuskHunt::HandleDusk, RoundSeconds, false);
	UpdateLabel();
	return true;
}

bool ADojoP19DuskHunt::IsRunning() const
{
	return bRunning;
}

int32 ADojoP19DuskHunt::GetCaughtCount() const
{
	return Caught;
}

int32 ADojoP19DuskHunt::GetMissedCount() const
{
	return Missed;
}

TArray<FDojoP19FlyHandle> ADojoP19DuskHunt::GetReleased() const
{
	return Released;
}

ADojoP19Meadow* ADojoP19DuskHunt::GetMeadow() const
{
	return Meadow;
}

ADojoP19Swarm* ADojoP19DuskHunt::GetSwarm() const
{
	return Swarm;
}

void ADojoP19DuskHunt::ReleaseFirefly()
{
	if (!bRunning || !IsValid(Meadow)) return;

	const FVector Where = GetActorLocation() + FVector(Spots.FRandRange(-400.f, 400.f), Spots.FRandRange(-400.f, 400.f), 100.f);
	const FVector Velocity(Spots.FRandRange(-30.f, 30.f), Spots.FRandRange(-30.f, 30.f), 0.f);
	Released.Add(Meadow->AddFirefly(Where, Velocity, FireflyLifeSeconds));
}

void ADojoP19DuskHunt::Tick(float DeltaSeconds)
{
	Super::Tick(DeltaSeconds);

	if (!bRunning || !IsValid(Meadow)) return;

	// With no champion the jar is far away, so nothing is caught and faded fireflies are still counted.
	const FVector JarAt = IsValid(Champion) ? Champion->GetActorLocation() : FVector(1.0e9);
	for (int32 Index = 0; Index < Released.Num(); )
	{
		const FDojoP19FlyHandle Handle = Released[Index];
		if (!Meadow->IsAlive(Handle))
		{
			Missed++;
			Released.RemoveAt(Index);
			continue;
		}

		if (FVector::Dist(Meadow->GetPosition(Handle), JarAt) > CatchRadius)
		{
			++Index;
			continue;
		}

		Meadow->Catch(Handle);
		Caught++;
		Released.RemoveAt(Index);

		// A caught firefly is let go into the ambient swarm at the jar.
		if (IsValid(Swarm)) Swarm->AddFirefly(JarAt, FVector(0.f, 0.f, 20.f), 1.f, -0.5f);

		if (Caught >= JarSize)
		{
			EndRound(true);
			return;
		}
	}

	UpdateLabel();
}

void ADojoP19DuskHunt::HandleDusk()
{
	if (bRunning) EndRound(false);
}

void ADojoP19DuskHunt::EndRound(bool bJarFull)
{
	GetWorldTimerManager().ClearTimer(ReleaseTimer);
	GetWorldTimerManager().ClearTimer(DuskTimer);
	bRunning = false;

	if (bJarFull)
	{
		const double Seconds = GetWorld()->GetTimeSeconds() - RoundStartSeconds;
		Label->SetText(FText::FromString(FString::Printf(TEXT("JAR FULL in %.1f s"), Seconds)));
		return;
	}

	Label->SetText(FText::FromString(FString::Printf(TEXT("DUSK: %d caught, %d missed"), Caught, Missed)));
}

void ADojoP19DuskHunt::UpdateLabel()
{
	const double Left = FMath::Max(0.0, RoundSeconds - (GetWorld()->GetTimeSeconds() - RoundStartSeconds));
	Label->SetText(FText::FromString(FString::Printf(TEXT("Caught %d of %d, missed %d, %.0f s left"), Caught, JarSize, Missed, Left)));
}

void ADojoP19DuskHunt::HandleKey(FKey Key)
{
	if (Key == EKeys::R) StartRound();
}
