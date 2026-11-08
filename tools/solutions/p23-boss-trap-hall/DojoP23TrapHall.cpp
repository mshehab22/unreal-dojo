#include "DojoP23TrapHall.h"

#include "Components/InputComponent.h"
#include "Components/TextRenderComponent.h"
#include "Engine/World.h"
#include "GameFramework/PlayerController.h"
#include "Quests/p7-ballista/DojoP7Ballista.h"
#include "Quests/p8-trap-family/DojoP8Fighter.h"
#include "Quests/p8-trap-family/DojoP8TrapBase.h"
#include "TimerManager.h"

ADojoP23TrapHall::ADojoP23TrapHall()
{
	PrimaryActorTick.bCanEverTick = false;

	Label = CreateDefaultSubobject<UTextRenderComponent>(TEXT("Label"));
	RootComponent = Label;
	Label->SetHorizontalAlignment(EHTA_Center);
}

void ADojoP23TrapHall::BeginPlay()
{
	Super::BeginPlay();

	if (APlayerController* Player = GetWorld()->GetFirstPlayerController())
	{
		EnableInput(Player);
		InputComponent->BindKey(EKeys::R, IE_Pressed, this, &ADojoP23TrapHall::HandleKey);
	}

	StartRound();
}

void ADojoP23TrapHall::EndPlay(const EEndPlayReason::Type EndPlayReason)
{
	GetWorldTimerManager().ClearTimer(WatchTimer);
	GetWorldTimerManager().ClearTimer(FireTimer);
	GetWorldTimerManager().ClearTimer(TrapTimer);
	GetWorldTimerManager().ClearTimer(RoundTimer);

	Super::EndPlay(EndPlayReason);
}

void ADojoP23TrapHall::PressNextRound()
{
	if (bRunning) return;

	StartRound();
}

bool ADojoP23TrapHall::IsRunning() const
{
	return bRunning;
}

int32 ADojoP23TrapHall::GetRoundNumber() const
{
	return RoundNumber;
}

int32 ADojoP23TrapHall::GetBolts() const
{
	return IsValid(Ballista) ? Ballista->GetBoltsFired() : 0;
}

int32 ADojoP23TrapHall::GetStandingCount() const
{
	int32 Standing = 0;
	for (const TObjectPtr<ADojoP8Fighter>& Fighter : BuiltFighters) Standing += IsValid(Fighter) && !Fighter->IsDown() ? 1 : 0;
	return Standing;
}

FString ADojoP23TrapHall::GetResult() const
{
	return Result;
}

ADojoP7Ballista* ADojoP23TrapHall::GetBallista() const
{
	return Ballista.Get();
}

ADojoP8TrapBase* ADojoP23TrapHall::GetTrap(int32 Index) const
{
	return BuiltTraps.IsValidIndex(Index) ? BuiltTraps[Index].Get() : nullptr;
}

ADojoP8Fighter* ADojoP23TrapHall::GetFighter(int32 Index) const
{
	return BuiltFighters.IsValidIndex(Index) ? BuiltFighters[Index].Get() : nullptr;
}

void ADojoP23TrapHall::StartRound()
{
	ClearActors();

	RoundNumber++;
	Result.Reset();

	Ballista = GetWorld()->SpawnActor<ADojoP7Ballista>(GetActorLocation() + BallistaOffset, FRotator::ZeroRotator);
	if (IsValid(Ballista))
	{
		Ballista->AimSeconds = AimSeconds;
		Ballista->ReloadSeconds = ReloadSeconds;
	}

	for (const FDojoP23TrapPlan& Plan : Traps)
	{
		UClass* Chosen = Plan.TrapClass.Get();
		ADojoP8TrapBase* Trap = Chosen == nullptr || Chosen->HasAnyClassFlags(CLASS_Abstract) ? nullptr : GetWorld()->SpawnActor<ADojoP8TrapBase>(Chosen, Plan.Location, FRotator::ZeroRotator);
		if (IsValid(Trap)) Trap->CooldownSeconds = Plan.RestSeconds;
		BuiltTraps.Add(Trap);
	}

	for (const FDojoP23HallFighterPlan& Plan : Roster)
	{
		ADojoP8Fighter* Fighter = GetWorld()->SpawnActorDeferred<ADojoP8Fighter>(ADojoP8Fighter::StaticClass(), FTransform(Plan.Location));
		if (IsValid(Fighter))
		{
			Fighter->Health = Plan.StartHealth;
			Fighter->FinishSpawning(FTransform(Plan.Location));
		}
		BuiltFighters.Add(Fighter);
	}

	bRunning = true;
	GetWorldTimerManager().SetTimer(WatchTimer, this, &ADojoP23TrapHall::HandleWatch, 0.5f, true, 0.25f);
	GetWorldTimerManager().SetTimer(FireTimer, this, &ADojoP23TrapHall::HandleFire, 1.f, true, 1.f);
	GetWorldTimerManager().SetTimer(TrapTimer, this, &ADojoP23TrapHall::HandleTraps, 1.f, true, 0.5f);
	GetWorldTimerManager().SetTimer(RoundTimer, this, &ADojoP23TrapHall::HandleTimeUp, RoundSeconds, false);

	UpdateLabel();
}

void ADojoP23TrapHall::EndRound()
{
	bRunning = false;
	GetWorldTimerManager().ClearTimer(WatchTimer);
	GetWorldTimerManager().ClearTimer(FireTimer);
	GetWorldTimerManager().ClearTimer(TrapTimer);
	GetWorldTimerManager().ClearTimer(RoundTimer);

	Result = GetStandingCount() == 0 ? TEXT("CLEARED") : TEXT("HELD");
	UpdateLabel();
}

void ADojoP23TrapHall::ClearActors()
{
	if (IsValid(Ballista)) Ballista->Destroy();
	for (const TObjectPtr<ADojoP8TrapBase>& Trap : BuiltTraps)
	{
		if (IsValid(Trap)) Trap->Destroy();
	}
	for (const TObjectPtr<ADojoP8Fighter>& Fighter : BuiltFighters)
	{
		if (IsValid(Fighter)) Fighter->Destroy();
	}

	BuiltTraps.Reset();
	BuiltFighters.Reset();
}

void ADojoP23TrapHall::HandleWatch()
{
	if (!bRunning || !IsValid(Ballista)) return;

	const bool bTargetInReach = NearestFighterInReach() != nullptr;
	if (bTargetInReach && !Ballista->HasTarget()) Ballista->SpotTarget();
	else if (!bTargetInReach && Ballista->HasTarget()) Ballista->LoseTarget();
}

void ADojoP23TrapHall::HandleFire()
{
	if (!bRunning || !IsValid(Ballista)) return;

	const int32 BoltsBefore = Ballista->GetBoltsFired();
	Ballista->Fire();

	if (Ballista->GetBoltsFired() > BoltsBefore)
	{
		ADojoP8Fighter* Struck = NearestFighterInReach();
		if (IsValid(Struck)) Struck->TakeHit(BoltDamage);
	}

	UpdateLabel();
}

void ADojoP23TrapHall::HandleTraps()
{
	if (!bRunning) return;

	for (const TObjectPtr<ADojoP8TrapBase>& Trap : BuiltTraps)
	{
		if (IsValid(Trap)) Trap->Spring();
	}

	UpdateLabel();
}

void ADojoP23TrapHall::HandleTimeUp()
{
	if (bRunning) EndRound();
}

void ADojoP23TrapHall::HandleKey(FKey Key)
{
	if (Key == EKeys::R) PressNextRound();
}

void ADojoP23TrapHall::UpdateLabel()
{
	FString Text = FString::Printf(TEXT("Round %d  Bolts %d  Standing %d"), RoundNumber, GetBolts(), GetStandingCount());
	if (!Result.IsEmpty()) Text += TEXT("  ") + Result;

	Label->SetText(FText::FromString(Text));
}

ADojoP8Fighter* ADojoP23TrapHall::NearestFighterInReach() const
{
	if (!IsValid(Ballista)) return nullptr;

	ADojoP8Fighter* Nearest = nullptr;
	double NearestDistance = 0.0;

	for (const TObjectPtr<ADojoP8Fighter>& Fighter : BuiltFighters)
	{
		if (!IsValid(Fighter) || Fighter->IsDown()) continue;

		const double Distance = FVector::Dist(Ballista->GetActorLocation(), Fighter->GetActorLocation());
		if (Distance > BallistaReach) continue;

		// Strictly nearer only, so on a tie the earlier fighter in the roster keeps its place.
		if (Nearest == nullptr || Distance < NearestDistance)
		{
			Nearest = Fighter;
			NearestDistance = Distance;
		}
	}

	return Nearest;
}
