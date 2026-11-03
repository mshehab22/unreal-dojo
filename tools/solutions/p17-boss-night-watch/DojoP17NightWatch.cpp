#include "DojoP17NightWatch.h"

#include "Components/InputComponent.h"
#include "Components/TextRenderComponent.h"
#include "Engine/World.h"
#include "GameFramework/PlayerController.h"
#include "Quests/p17-guard-rating/DojoP17GuardStats.h"
#include "Quests/p17-tower-rig/DojoP17TowerRig.h"
#include "TimerManager.h"

ADojoP17NightWatch::ADojoP17NightWatch()
{
	PrimaryActorTick.bCanEverTick = false;

	Label = CreateDefaultSubobject<UTextRenderComponent>(TEXT("Label"));
	RootComponent = Label;
	Label->SetHorizontalAlignment(EHTA_Center);

	Guard = CreateDefaultSubobject<UDojoP17GuardStats>(TEXT("Guard"));
}

void ADojoP17NightWatch::BeginPlay()
{
	Super::BeginPlay();

	if (!IsValid(Rig)) Rig = MakeDefaultRig();
	if (IsValid(Rig)) BaseStart = Rig->GetLocalOffset(0);

	if (APlayerController* Player = GetWorld()->GetFirstPlayerController())
	{
		EnableInput(Player);
		InputComponent->BindKey(EKeys::B, IE_Pressed, this, &ADojoP17NightWatch::HandleKey);
		InputComponent->BindKey(EKeys::E, IE_Pressed, this, &ADojoP17NightWatch::HandleKey);
		InputComponent->BindKey(EKeys::R, IE_Pressed, this, &ADojoP17NightWatch::HandleKey);
	}

	StartRound();
}

void ADojoP17NightWatch::EndPlay(const EEndPlayReason::Type EndPlayReason)
{
	GetWorldTimerManager().ClearTimer(RoundTimer);
	GetWorldTimerManager().ClearTimer(CheckTimer);
	GetWorldTimerManager().ClearTimer(GustTimer);

	Super::EndPlay(EndPlayReason);
}

void ADojoP17NightWatch::PressOil()
{
	if (!bRunning) return;

	ActiveBuffIds.Add(Guard->AddBuff(OilBonus));
	ActiveBuffExpiry.Add(GetWorld()->GetTimeSeconds() + OilSeconds);
}

void ADojoP17NightWatch::PressArmour()
{
	if (!bRunning) return;

	if (!Guard->Unequip(ArmourName)) Guard->Equip(ArmourName, ArmourBonus);
}

void ADojoP17NightWatch::PressNextRound()
{
	if (bRunning) return;

	StartRound();
}

bool ADojoP17NightWatch::IsRunning() const
{
	return bRunning;
}

int32 ADojoP17NightWatch::GetRoundNumber() const
{
	return RoundNumber;
}

int32 ADojoP17NightWatch::GetShakyChecks() const
{
	return ShakyChecks;
}

FString ADojoP17NightWatch::GetResult() const
{
	return Result;
}

ADojoP17TowerRig* ADojoP17NightWatch::MakeDefaultRig()
{
	ADojoP17TowerRig* NewRig = GetWorld()->SpawnActorDeferred<ADojoP17TowerRig>(ADojoP17TowerRig::StaticClass(), FTransform::Identity);
	if (NewRig == nullptr) return nullptr;

	FDojoP17RigNode BaseNode;
	BaseNode.NodeName = TEXT("Base");

	FDojoP17RigNode PlatformNode;
	PlatformNode.NodeName = TEXT("Platform");
	PlatformNode.ParentIndex = 0;
	PlatformNode.LocalOffset = FVector(0.f, 0.f, 300.f);

	FDojoP17RigNode LanternNode;
	LanternNode.NodeName = TEXT("Lantern");
	LanternNode.ParentIndex = 1;
	LanternNode.LocalOffset = FVector(0.f, 0.f, 100.f);

	NewRig->Nodes = { BaseNode, PlatformNode, LanternNode };
	NewRig->FinishSpawning(FTransform::Identity);
	return NewRig;
}

void ADojoP17NightWatch::StartRound()
{
	RoundNumber++;
	ShakyChecks = 0;
	Result.Reset();

	Guard->ClearBuffs();
	ActiveBuffIds.Reset();
	ActiveBuffExpiry.Reset();
	Guard->Unequip(ArmourName);
	Guard->SetBaseGuard(StartingGuard);
	if (IsValid(Rig)) Rig->SetLocalOffset(0, BaseStart);

	bRunning = true;
	GetWorldTimerManager().SetTimer(RoundTimer, this, &ADojoP17NightWatch::HandleTimeUp, RoundSeconds, false);
	GetWorldTimerManager().SetTimer(CheckTimer, this, &ADojoP17NightWatch::HandleCheck, 1.f, true, 0.5f);
	GetWorldTimerManager().SetTimer(GustTimer, this, &ADojoP17NightWatch::HandleGust, GustInterval, true, FirstGustSeconds);

	UpdateLabel();
}

void ADojoP17NightWatch::EndRound()
{
	bRunning = false;
	GetWorldTimerManager().ClearTimer(RoundTimer);
	GetWorldTimerManager().ClearTimer(CheckTimer);
	GetWorldTimerManager().ClearTimer(GustTimer);

	Result = ShakyChecks <= MostShakyChecks ? TEXT("HELD") : TEXT("FELL");
	UpdateLabel();
}

void ADojoP17NightWatch::UpdateLabel()
{
	const FVector Lantern = IsValid(Rig) ? Rig->GetPosition(LanternJoint) : FVector::ZeroVector;
	FString Text = FString::Printf(TEXT("Round %d  Guard %d  Lantern %d,%d,%d  Shaky %d"), RoundNumber, Guard->GetGuard(), FMath::RoundToInt(Lantern.X), FMath::RoundToInt(Lantern.Y), FMath::RoundToInt(Lantern.Z), ShakyChecks);
	if (!Result.IsEmpty()) Text += TEXT("  ") + Result;

	Label->SetText(FText::FromString(Text));
}

void ADojoP17NightWatch::HandleCheck()
{
	if (!bRunning) return;

	const float Now = GetWorld()->GetTimeSeconds();
	for (int32 Index = ActiveBuffIds.Num() - 1; Index >= 0; Index--)
	{
		if (ActiveBuffExpiry[Index] > Now) continue;

		Guard->RemoveBuff(ActiveBuffIds[Index]);
		ActiveBuffIds.RemoveAt(Index);
		ActiveBuffExpiry.RemoveAt(Index);
	}

	if (Guard->GetGuard() < SteadyGuard) ShakyChecks++;
	UpdateLabel();
}

void ADojoP17NightWatch::HandleGust()
{
	if (!bRunning || !IsValid(Rig)) return;

	Rig->SetLocalOffset(0, Rig->GetLocalOffset(0) + GustPush);
}

void ADojoP17NightWatch::HandleTimeUp()
{
	if (bRunning) EndRound();
}

void ADojoP17NightWatch::HandleKey(FKey Key)
{
	if (Key == EKeys::B) PressOil();
	else if (Key == EKeys::E) PressArmour();
	else if (Key == EKeys::R) PressNextRound();
}
