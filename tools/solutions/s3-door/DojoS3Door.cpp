#include "DojoS3Door.h"

#include "Components/SceneComponent.h"
#include "Quests/s3-saveable/DojoS3SaveableComponent.h"

ADojoS3Door::ADojoS3Door()
{
	PrimaryActorTick.bCanEverTick = false;

	RootComponent = CreateDefaultSubobject<USceneComponent>(TEXT("Frame"));
	Panel = CreateDefaultSubobject<USceneComponent>(TEXT("Panel"));
	Panel->SetupAttachment(RootComponent);
	Saveable = CreateDefaultSubobject<UDojoS3SaveableComponent>(TEXT("Saveable"));
}

void ADojoS3Door::BeginPlay()
{
	Super::BeginPlay();

	ApplyPanel();
}

void ADojoS3Door::Open()
{
	SetOpen(true);
}

void ADojoS3Door::Close()
{
	SetOpen(false);
}

void ADojoS3Door::Toggle()
{
	SetOpen(!bOpen);
}

bool ADojoS3Door::IsOpen() const
{
	return bOpen;
}

float ADojoS3Door::GetPanelYaw() const
{
	return Panel->GetRelativeRotation().Yaw;
}

void ADojoS3Door::OnRestoredFromSave_Implementation()
{
	ApplyPanel();
}

void ADojoS3Door::SetOpen(bool bNewOpen)
{
	bOpen = bNewOpen;
	ApplyPanel();
}

void ADojoS3Door::ApplyPanel()
{
	Panel->SetRelativeRotation(FRotator(0.f, bOpen ? 90.f : 0.f, 0.f));
}
