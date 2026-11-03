#include "DojoM7LockedDoor.h"

#include "Components/BoxComponent.h"
#include "Components/TextRenderComponent.h"
#include "Quests/m7-key-ring/DojoM7KeyRing.h"

ADojoM7LockedDoor::ADojoM7LockedDoor()
{
	PrimaryActorTick.bCanEverTick = false;

	Panel = CreateDefaultSubobject<UBoxComponent>(TEXT("Panel"));
	Panel->SetBoxExtent(FVector(20.f, 150.f, 150.f));
	Panel->SetCollisionProfileName(TEXT("BlockAllDynamic"));
	RootComponent = Panel;

	Label = CreateDefaultSubobject<UTextRenderComponent>(TEXT("Label"));
	Label->SetupAttachment(Panel);
	Label->SetRelativeLocation(FVector(-30.f, 0.f, 180.f));
	Label->SetHorizontalAlignment(EHTA_Center);
	Label->SetText(FText::FromString(TEXT("Locked")));
}

bool ADojoM7LockedDoor::TryOpen(AActor* Visitor)
{
	if (bOpen) return true;

	const UDojoM7KeyRing* Ring = IsValid(Visitor) ? Visitor->FindComponentByClass<UDojoM7KeyRing>() : nullptr;
	if (!Ring || !Ring->HasKey(RequiredKey))
	{
		LockedTries++;
		SetLabel(TEXT("Locked"));
		return false;
	}

	bOpen = true;
	Panel->SetCollisionEnabled(ECollisionEnabled::NoCollision);
	SetLabel(TEXT("Open"));
	OnUnlocked.Broadcast(this, Visitor);
	return true;
}

bool ADojoM7LockedDoor::IsOpen() const
{
	return bOpen;
}

int32 ADojoM7LockedDoor::GetLockedTries() const
{
	return LockedTries;
}

void ADojoM7LockedDoor::Relock()
{
	bOpen = false;
	Panel->SetCollisionEnabled(ECollisionEnabled::QueryAndPhysics);
	SetLabel(TEXT("Locked"));
}

void ADojoM7LockedDoor::SetLabel(const TCHAR* Text)
{
	Label->SetText(FText::FromString(Text));
}
