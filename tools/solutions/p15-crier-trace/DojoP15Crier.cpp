#include "DojoP15Crier.h"

#include "Components/SceneComponent.h"
#include "Quests/p15-announcer-desk/DojoP15AnnouncerDesk.h"

ADojoP15Crier::ADojoP15Crier()
{
	PrimaryActorTick.bCanEverTick = false;

	RootComponent = CreateDefaultSubobject<USceneComponent>(TEXT("Root"));
}

void ADojoP15Crier::BeginPlay()
{
	Super::BeginPlay();
}

void ADojoP15Crier::CallOut(const FString& Line)
{
	UDojoP15AnnouncerDesk* Desk = UDojoP15AnnouncerDesk::Locate(GetWorld());
	if (Desk == nullptr) return;

	Desk->Get().Announce(Line);
}
