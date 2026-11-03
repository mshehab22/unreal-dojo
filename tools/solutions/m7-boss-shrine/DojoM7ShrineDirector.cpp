#include "DojoM7ShrineDirector.h"

#include "Components/TextRenderComponent.h"
#include "Engine/World.h"
#include "Quests/m3-scale-plate/DojoM3Crate.h"
#include "Quests/m7-key-ring/DojoM7KeyPickup.h"
#include "Quests/m7-key-ring/DojoM7KeyRing.h"
#include "Quests/m7-locked-door/DojoM7LockedDoor.h"
#include "Quests/m7-plate-gate/DojoM7PlateGate.h"
#include "TimerManager.h"

ADojoM7ShrineDirector::ADojoM7ShrineDirector()
{
	PrimaryActorTick.bCanEverTick = false;

	Board = CreateDefaultSubobject<UTextRenderComponent>(TEXT("Board"));
	RootComponent = Board;
	Board->SetHorizontalAlignment(EHTA_Left);
}

void ADojoM7ShrineDirector::BeginPlay()
{
	Super::BeginPlay();

	if (IsValid(Door)) Door->OnUnlocked.AddUniqueDynamic(this, &ADojoM7ShrineDirector::HandleDoorUnlocked);

	if (IsValid(Gate))
	{
		Gate->OnOpened.AddUniqueDynamic(this, &ADojoM7ShrineDirector::HandleGateOpened);
		Gate->OnClosed.AddUniqueDynamic(this, &ADojoM7ShrineDirector::HandleGateClosed);
		bGateOpen = Gate->IsOpen();
	}

	RefreshBoard();
}

void ADojoM7ShrineDirector::EndPlay(const EEndPlayReason::Type EndPlayReason)
{
	if (IsValid(Door)) Door->OnUnlocked.RemoveDynamic(this, &ADojoM7ShrineDirector::HandleDoorUnlocked);

	if (IsValid(Gate))
	{
		Gate->OnOpened.RemoveDynamic(this, &ADojoM7ShrineDirector::HandleGateOpened);
		Gate->OnClosed.RemoveDynamic(this, &ADojoM7ShrineDirector::HandleGateClosed);
	}

	GetWorldTimerManager().ClearTimer(ResetTimer);

	Super::EndPlay(EndPlayReason);
}

int32 ADojoM7ShrineDirector::GetRoundsCleared() const
{
	return RoundsCleared;
}

bool ADojoM7ShrineDirector::IsResetting() const
{
	return bResetting;
}

void ADojoM7ShrineDirector::HandleDoorUnlocked(ADojoM7LockedDoor* UnlockedDoor, AActor* Visitor)
{
	RoundsCleared++;
	LastVisitor = Visitor;
	bResetting = true;
	RefreshBoard();
	OnRoundCleared.Broadcast(RoundsCleared);

	// A timer with no time never fires, so a zero pause resets at once.
	if (ResetSeconds <= 0.f)
	{
		ResetShrine();
		return;
	}

	GetWorldTimerManager().SetTimer(ResetTimer, this, &ADojoM7ShrineDirector::ResetShrine, ResetSeconds, false);
}

void ADojoM7ShrineDirector::HandleGateOpened()
{
	bGateOpen = true;
	RefreshBoard();
}

void ADojoM7ShrineDirector::HandleGateClosed()
{
	bGateOpen = false;
	RefreshBoard();
}

void ADojoM7ShrineDirector::ResetShrine()
{
	for (ADojoM3Crate* Crate : Crates)
	{
		if (IsValid(Crate)) Crate->ReturnHome();
	}

	// The pickup comes back before the key leaves the ring, so a visitor still standing on it does not take it again at once.
	if (IsValid(KeyPickup)) KeyPickup->ResetPickup();
	if (IsValid(Door)) Door->Relock();

	if (IsValid(LastVisitor) && IsValid(Door))
	{
		if (UDojoM7KeyRing* Ring = LastVisitor->FindComponentByClass<UDojoM7KeyRing>()) Ring->RemoveKey(Door->RequiredKey);
	}

	LastVisitor = nullptr;
	bResetting = false;
	RefreshBoard();
}

void ADojoM7ShrineDirector::RefreshBoard()
{
	TArray<FString> Lines;
	Lines.Add(FString::Printf(TEXT("Rounds cleared: %d"), RoundsCleared));
	Lines.Add(bGateOpen ? FString(TEXT("Gate: OPEN")) : FString(TEXT("Gate: SHUT")));
	if (bResetting) Lines.Add(FString(TEXT("Resetting")));

	Board->SetText(FText::FromString(FString::Join(Lines, TEXT("\n"))));
}
