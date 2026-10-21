#include "DojoF4Carrier.h"

#include "Components/SceneComponent.h"

ADojoF4Carrier::ADojoF4Carrier()
{
	PrimaryActorTick.bCanEverTick = false;

	RootComponent = CreateDefaultSubobject<USceneComponent>(TEXT("Root"));

	Mount = CreateDefaultSubobject<USceneComponent>(TEXT("Mount"));
	Mount->SetupAttachment(RootComponent);
	Mount->SetRelativeLocation(FVector(0.f, 0.f, 150.f));
}

bool ADojoF4Carrier::Carry(AActor* NewCargo)
{
	if (IsCarrying() || !IsValid(NewCargo) || NewCargo == this) return false;

	NewCargo->AttachToComponent(Mount, FAttachmentTransformRules::SnapToTargetNotIncludingScale);
	Cargo = NewCargo;
	return true;
}

AActor* ADojoF4Carrier::Drop()
{
	if (!IsCarrying()) return nullptr;

	AActor* Dropped = Cargo;
	Dropped->DetachFromActor(FDetachmentTransformRules::KeepWorldTransform);
	Cargo = nullptr;
	return Dropped;
}

bool ADojoF4Carrier::IsCarrying() const
{
	return IsValid(Cargo);
}

AActor* ADojoF4Carrier::GetCargo() const
{
	return IsCarrying() ? Cargo.Get() : nullptr;
}
