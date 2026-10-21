#include "DojoF2TargetRack.h"

#include "Components/SceneComponent.h"
#include "Engine/World.h"
#include "Quests/f1-popup-target/DojoF1PopupTarget.h"

ADojoF2TargetRack::ADojoF2TargetRack()
{
	PrimaryActorTick.bCanEverTick = false;

	RootComponent = CreateDefaultSubobject<USceneComponent>(TEXT("Root"));

	TargetClass = ADojoF1PopupTarget::StaticClass();
}

void ADojoF2TargetRack::BeginPlay()
{
	Super::BeginPlay();

	if (!TargetClass) return;

	for (int32 Slot = 0; Slot < PoolSize; ++Slot)
	{
		const FVector Location = GetActorLocation() + SlotSpacing * (Slot + 1);
		ADojoF1PopupTarget* Target = GetWorld()->SpawnActor<ADojoF1PopupTarget>(TargetClass, Location, GetActorRotation());
		if (!Target) continue;

		SetTargetActive(Target, false);
		Available.Add(Target);
	}
}

void ADojoF2TargetRack::EndPlay(const EEndPlayReason::Type EndPlayReason)
{
	for (ADojoF1PopupTarget* Target : Available)
	{
		if (IsValid(Target)) Target->Destroy();
	}

	for (ADojoF1PopupTarget* Target : Deployed)
	{
		if (IsValid(Target)) Target->Destroy();
	}

	Available.Empty();
	Deployed.Empty();

	Super::EndPlay(EndPlayReason);
}

ADojoF1PopupTarget* ADojoF2TargetRack::Deploy()
{
	if (Available.Num() == 0) return nullptr;

	ADojoF1PopupTarget* Target = Available.Pop();
	Deployed.Add(Target);

	SetTargetActive(Target, true);
	Target->Raise();
	return Target;
}

bool ADojoF2TargetRack::Recall(ADojoF1PopupTarget* Target)
{
	if (!Deployed.Contains(Target)) return false;

	Deployed.Remove(Target);

	if (Target->GetState() == EDojoF1TargetState::ETS_Broken) Target->Repair();

	SetTargetActive(Target, false);
	Available.Add(Target);
	return true;
}

int32 ADojoF2TargetRack::GetAvailableCount() const
{
	return Available.Num();
}

int32 ADojoF2TargetRack::GetDeployedCount() const
{
	return Deployed.Num();
}

void ADojoF2TargetRack::SetTargetActive(ADojoF1PopupTarget* Target, bool bActive)
{
	Target->SetActorHiddenInGame(!bActive);
	Target->SetActorEnableCollision(bActive);
}
