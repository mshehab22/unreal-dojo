#include "DojoS6ShiftDirector.h"

#include "Components/InputComponent.h"
#include "Components/SphereComponent.h"
#include "Components/TextRenderComponent.h"
#include "DojoS6GuardController.h"
#include "Engine/World.h"
#include "GameFramework/Pawn.h"
#include "GameFramework/PlayerController.h"
#include "Kismet/GameplayStatics.h"
#include "Perception/AISense_Hearing.h"
#include "Quests/s6-sense-memory/DojoS6SenseMemoryComponent.h"
#include "Quests/s6-walk-beat/DojoS6Guard.h"

/** Makes the board and the vault zone, and a square beat around the post. */
ADojoS6ShiftDirector::ADojoS6ShiftDirector()
{
	PrimaryActorTick.bCanEverTick = false;

	RootComponent = CreateDefaultSubobject<USceneComponent>(TEXT("Root"));

	Board = CreateDefaultSubobject<UTextRenderComponent>(TEXT("Board"));
	Board->SetupAttachment(RootComponent);

	VaultZone = CreateDefaultSubobject<USphereComponent>(TEXT("VaultZone"));
	VaultZone->SetupAttachment(RootComponent);
	VaultZone->InitSphereRadius(150.f);
	VaultZone->SetCollisionProfileName(TEXT("OverlapAllDynamic"));

	GuardBeat = { FVector(800.f, 0.f, 0.f), FVector(800.f, 800.f, 0.f), FVector(0.f, 800.f, 0.f), FVector::ZeroVector };
}

/** Throws a pebble that lands 400 units in front of the thief and makes a noise there. */
void ADojoS6ShiftDirector::ThrowPebble()
{
	if (!bRunning || Thief == nullptr)
	{
		return;
	}

	const FVector Landing = Thief->GetActorLocation() + Thief->GetActorForwardVector() * 400.f;
	UAISense_Hearing::ReportNoiseEvent(this, Landing, 1.f, Thief, 0.f, NAME_None);
}

/** Starts the next round, only after the last one ended. */
void ADojoS6ShiftDirector::PressRestart()
{
	if (bRunning)
	{
		return;
	}

	StartRound();
}

/** The board's text. */
FString ADojoS6ShiftDirector::GetBoardText() const
{
	return BoardText;
}

/** The guard of the current round. */
ADojoS6Guard* ADojoS6ShiftDirector::GetGuard() const
{
	return CurrentGuard;
}

/** True while a round runs. */
bool ADojoS6ShiftDirector::IsRunning() const
{
	return bRunning;
}

/** Finds the thief, binds the keys, and starts round 1. */
void ADojoS6ShiftDirector::BeginPlay()
{
	Super::BeginPlay();

	if (Thief == nullptr)
	{
		Thief = UGameplayStatics::GetPlayerPawn(this, 0);
	}

	if (APlayerController* Player = GetWorld()->GetFirstPlayerController())
	{
		EnableInput(Player);
		InputComponent->BindKey(EKeys::N, IE_Pressed, this, &ADojoS6ShiftDirector::ThrowPebble);
		InputComponent->BindKey(EKeys::R, IE_Pressed, this, &ADojoS6ShiftDirector::PressRestart);
	}

	VaultZone->SetWorldLocation(VaultLocation);
	VaultZone->OnComponentBeginOverlap.AddDynamic(this, &ADojoS6ShiftDirector::HandleVaultOverlap);

	StartRound();
}

/** Unbinds from the guard. */
void ADojoS6ShiftDirector::EndPlay(const EEndPlayReason::Type EndPlayReason)
{
	StopListening();
	VaultZone->OnComponentBeginOverlap.RemoveDynamic(this, &ADojoS6ShiftDirector::HandleVaultOverlap);
	Super::EndPlay(EndPlayReason);
}

/** Removes the old guard, spawns a fresh one, puts the thief back, and clears the board. */
void ADojoS6ShiftDirector::StartRound()
{
	RemoveGuard();

	if (Thief != nullptr)
	{
		Thief->SetActorLocation(ThiefStart, false, nullptr, ETeleportType::TeleportPhysics);
	}

	const FTransform PostTransform(GuardPost);
	ADojoS6Guard* Guard = GetWorld()->SpawnActorDeferred<ADojoS6Guard>(ADojoS6Guard::StaticClass(), PostTransform);
	Guard->Beat = GuardBeat;
	Guard->AIControllerClass = ADojoS6GuardController::StaticClass();
	Guard->FinishSpawning(PostTransform);

	CurrentGuard = Guard;
	CurrentController = Cast<ADojoS6GuardController>(Guard->GetController());

	if (CurrentController != nullptr)
	{
		CurrentController->GetMemory()->OnMemoryChanged.AddDynamic(this, &ADojoS6ShiftDirector::HandleMemoryChanged);
		CurrentController->OnCaught.AddDynamic(this, &ADojoS6ShiftDirector::HandleCaught);
	}

	ResultLine.Reset();
	RoundStartTime = Now();
	bRunning = true;
	RewriteBoard();
}

/** Unbinds from the guard and removes it and its controller. */
void ADojoS6ShiftDirector::RemoveGuard()
{
	StopListening();

	if (CurrentController != nullptr)
	{
		CurrentController->UnPossess();
		CurrentController->Destroy();
	}

	if (CurrentGuard != nullptr)
	{
		CurrentGuard->Destroy();
	}

	CurrentController = nullptr;
	CurrentGuard = nullptr;
}

/** Unbinds from the guard controller and its memory. */
void ADojoS6ShiftDirector::StopListening()
{
	if (CurrentController == nullptr)
	{
		return;
	}

	CurrentController->GetMemory()->OnMemoryChanged.RemoveDynamic(this, &ADojoS6ShiftDirector::HandleMemoryChanged);
	CurrentController->OnCaught.RemoveDynamic(this, &ADojoS6ShiftDirector::HandleCaught);
}

/** Ends the round with a line such as CAUGHT in 8.3 s, and stops the guard. */
void ADojoS6ShiftDirector::FinishRound(const TCHAR* Label)
{
	if (!bRunning)
	{
		return;
	}

	bRunning = false;
	ResultLine = FString::Printf(TEXT("%s in %.1f s"), Label, static_cast<float>(Now() - RoundStartTime));

	if (CurrentController != nullptr)
	{
		CurrentController->EndShift();
	}

	RewriteBoard();
}

/** Rewrites the board from the guard's memory and the round's result. */
void ADojoS6ShiftDirector::RewriteBoard()
{
	const UDojoS6SenseMemoryComponent* Memory = CurrentController != nullptr ? CurrentController->GetMemory() : nullptr;
	const TCHAR* State = TEXT("on patrol");

	if (Memory != nullptr && Memory->IsTargetVisible())
	{
		State = TEXT("chasing");
	}
	else if (Memory != nullptr && Memory->HasClue())
	{
		State = TEXT("searching");
	}

	BoardText = FString::Printf(TEXT("Guard: %s"), State);

	if (!ResultLine.IsEmpty())
	{
		BoardText += TEXT("\n") + ResultLine;
	}

	Board->SetText(FText::FromString(BoardText));
}

/** Rewrites the board when the guard's memory changes. */
void ADojoS6ShiftDirector::HandleMemoryChanged(UDojoS6SenseMemoryComponent* Memory)
{
	RewriteBoard();
}

/** Ends the round when the guard catches the thief. */
void ADojoS6ShiftDirector::HandleCaught(AActor* Caught)
{
	if (Caught != nullptr && Caught == Thief)
	{
		FinishRound(TEXT("CAUGHT"));
	}
}

/** Ends the round when the thief reaches the vault. */
void ADojoS6ShiftDirector::HandleVaultOverlap(UPrimitiveComponent* OverlappedComponent, AActor* OtherActor, UPrimitiveComponent* OtherComponent, int32 OtherBodyIndex, bool bFromSweep, const FHitResult& SweepResult)
{
	if (OtherActor != nullptr && OtherActor == Thief)
	{
		FinishRound(TEXT("VAULT OPEN"));
	}
}

/** The world's time in seconds. */
double ADojoS6ShiftDirector::Now() const
{
	return GetWorld()->GetTimeSeconds();
}
