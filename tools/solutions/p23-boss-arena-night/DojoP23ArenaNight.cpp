#include "DojoP23ArenaNight.h"

#include "Components/InputComponent.h"
#include "Components/TextRenderComponent.h"
#include "Engine/World.h"
#include "GameFramework/PlayerController.h"
#include "Quests/p6-knockout-herald/DojoP6Fighter.h"
#include "Quests/p9-arena-parts/DojoP9HealthComponent.h"
#include "Quests/p9-arena-parts/DojoP9LootComponent.h"
#include "TimerManager.h"

ADojoP23ArenaNight::ADojoP23ArenaNight()
{
	PrimaryActorTick.bCanEverTick = false;

	Label = CreateDefaultSubobject<UTextRenderComponent>(TEXT("Label"));
	RootComponent = Label;
	Label->SetHorizontalAlignment(EHTA_Center);
}

void ADojoP23ArenaNight::BeginPlay()
{
	Super::BeginPlay();

	Herald = GetWorld()->SpawnActor<ADojoP6ArenaHerald>(GetActorLocation(), FRotator::ZeroRotator);
	if (IsValid(Herald)) Herald->OnKnockoutAnnounced.AddUObject(this, &ADojoP23ArenaNight::HandleAnnounced);

	if (APlayerController* Player = GetWorld()->GetFirstPlayerController())
	{
		EnableInput(Player);
		InputComponent->BindKey(EKeys::R, IE_Pressed, this, &ADojoP23ArenaNight::HandleKey);
	}

	StartRound();
}

void ADojoP23ArenaNight::EndPlay(const EEndPlayReason::Type EndPlayReason)
{
	GetWorldTimerManager().ClearTimer(TurnTimer);
	GetWorldTimerManager().ClearTimer(RoundTimer);

	if (IsValid(Herald)) Herald->OnKnockoutAnnounced.RemoveAll(this);

	Super::EndPlay(EndPlayReason);
}

void ADojoP23ArenaNight::PressNextRound()
{
	if (bRunning) return;

	StartRound();
}

bool ADojoP23ArenaNight::IsRunning() const
{
	return bRunning;
}

int32 ADojoP23ArenaNight::GetRoundNumber() const
{
	return RoundNumber;
}

int32 ADojoP23ArenaNight::GetStandingCount() const
{
	int32 Standing = 0;
	for (const TPair<FName, TObjectPtr<ADojoP6Fighter>>& Entry : Fighters) Standing += IsValid(Entry.Value) ? 1 : 0;
	return Standing;
}

int32 ADojoP23ArenaNight::GetKnockoutsFor(int32 Team) const
{
	const int32* Count = Knockouts.Find(Team);
	return Count ? *Count : 0;
}

int32 ADojoP23ArenaNight::GetPurse(FName Item) const
{
	const int32* Count = Purse.Find(Item);
	return Count ? *Count : 0;
}

FString ADojoP23ArenaNight::GetResult() const
{
	return Result;
}

const TArray<FDojoP23Announcement>& ADojoP23ArenaNight::GetAnnouncements() const
{
	return Announcements;
}

ADojoP6ArenaHerald* ADojoP23ArenaNight::GetHerald() const
{
	return Herald.Get();
}

ADojoP6Fighter* ADojoP23ArenaNight::GetFighter(FName FighterName) const
{
	const TObjectPtr<ADojoP6Fighter>* Found = Fighters.Find(FighterName);
	return Found && IsValid(*Found) ? Found->Get() : nullptr;
}

void ADojoP23ArenaNight::StartRound()
{
	ClearArena();

	RoundNumber++;
	TurnIndex = 0;
	NightRoster = Roster;

	for (const FDojoP23FighterPlan& Plan : NightRoster) BuildFighter(Plan);

	bRunning = true;
	GetWorldTimerManager().SetTimer(TurnTimer, this, &ADojoP23ArenaNight::HandleTurn, TurnSeconds, true, TurnSeconds);
	GetWorldTimerManager().SetTimer(RoundTimer, this, &ADojoP23ArenaNight::HandleTimeUp, TurnSeconds * (TurnCount + 0.5f), false);

	UpdateLabel();
}

void ADojoP23ArenaNight::EndRound()
{
	bRunning = false;
	GetWorldTimerManager().ClearTimer(TurnTimer);
	GetWorldTimerManager().ClearTimer(RoundTimer);

	const int32 TeamOne = GetKnockoutsFor(1);
	const int32 TeamTwo = GetKnockoutsFor(2);
	if (TeamOne > TeamTwo) Result = TEXT("TEAM 1 WINS");
	else if (TeamTwo > TeamOne) Result = TEXT("TEAM 2 WINS");
	else Result = TEXT("DRAW");

	UpdateLabel();
}

void ADojoP23ArenaNight::ClearArena()
{
	for (TPair<FName, TObjectPtr<ADojoP6Fighter>>& Entry : Fighters)
	{
		if (IsValid(Entry.Value)) Entry.Value->Destroy();
	}

	Fighters.Reset();
	Knockouts.Reset();
	Purse.Reset();
	Announcements.Reset();
	Result.Reset();
}

void ADojoP23ArenaNight::BuildFighter(const FDojoP23FighterPlan& Plan)
{
	ADojoP6Fighter* Fighter = GetWorld()->SpawnActorDeferred<ADojoP6Fighter>(ADojoP6Fighter::StaticClass(), FTransform(Plan.StartLocation));
	if (!IsValid(Fighter)) return;

	Fighter->FighterName = Plan.FighterName;
	Fighter->Team = Plan.Team;
	Fighter->Herald = Herald;
	Fighter->FinishSpawning(FTransform(Plan.StartLocation));

	UDojoP9HealthComponent* Health = NewObject<UDojoP9HealthComponent>(Fighter);
	Health->MaxHealth = Plan.MaxHealth;
	Fighter->AddInstanceComponent(Health);
	Health->RegisterComponent();

	UDojoP9LootComponent* Loot = NewObject<UDojoP9LootComponent>(Fighter);
	Loot->LootItem = Plan.LootItem;
	Loot->LootCount = Plan.LootCount;
	Fighter->AddInstanceComponent(Loot);
	Loot->RegisterComponent();
	Loot->ListenTo(Health);
	Loot->OnLootDropped.AddDynamic(this, &ADojoP23ArenaNight::HandleLootDropped);

	Fighters.Add(Plan.FighterName, Fighter);
}

void ADojoP23ArenaNight::HandleTurn()
{
	if (!bRunning) return;

	TurnIndex++;
	for (const FDojoP23ScriptedStrike& Strike : Script)
	{
		if (Strike.Turn == TurnIndex) ApplyStrike(Strike);
	}

	UpdateLabel();
}

void ADojoP23ArenaNight::ApplyStrike(const FDojoP23ScriptedStrike& Strike)
{
	ADojoP6Fighter* Striker = GetFighter(Strike.Attacker);
	ADojoP6Fighter* Struck = GetFighter(Strike.Target);
	if (!IsValid(Striker) || !IsValid(Struck)) return;

	UDojoP9HealthComponent* Health = Struck->FindComponentByClass<UDojoP9HealthComponent>();
	if (!IsValid(Health)) return;

	Health->ApplyDamage(Strike.Damage);

	// The loot part has already heard the health run out, so sending the fighter out of the arena now cannot cut its drop short.
	if (Health->IsDepleted()) Struck->KnockOut(Striker);
}

void ADojoP23ArenaNight::HandleAnnounced(const FDojoP6KnockoutEvent& Event)
{
	FDojoP23Announcement Heard;
	Heard.Fallen = Event.FallenName;
	Heard.Winner = Event.WinnerName;
	Heard.Seconds = GetWorld()->GetTimeSeconds();
	Announcements.Add(Heard);

	const int32 WinningTeam = TeamOf(Event.WinnerName);
	if (WinningTeam > 0) Knockouts.FindOrAdd(WinningTeam)++;

	UpdateLabel();
}

void ADojoP23ArenaNight::HandleLootDropped(FName Item, int32 Count)
{
	Purse.FindOrAdd(Item) += Count;
}

void ADojoP23ArenaNight::HandleTimeUp()
{
	if (bRunning) EndRound();
}

void ADojoP23ArenaNight::HandleKey(FKey Key)
{
	if (Key == EKeys::R) PressNextRound();
}

void ADojoP23ArenaNight::UpdateLabel()
{
	FString Text = FString::Printf(TEXT("Night %d  Team 1: %d  Team 2: %d  Standing %d"), RoundNumber, GetKnockoutsFor(1), GetKnockoutsFor(2), GetStandingCount());
	if (!Result.IsEmpty()) Text += TEXT("  ") + Result;

	Label->SetText(FText::FromString(Text));
}

int32 ADojoP23ArenaNight::TeamOf(FName FighterName) const
{
	for (const FDojoP23FighterPlan& Plan : NightRoster)
	{
		if (Plan.FighterName == FighterName) return Plan.Team;
	}

	return 0;
}
