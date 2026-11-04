#include "DojoP15Gong.h"

#include "Components/SceneComponent.h"
#include "Quests/p15-announcer-desk/DojoP15AnnouncerDesk.h"

ADojoP15Gong::ADojoP15Gong()
{
	PrimaryActorTick.bCanEverTick = false;

	RootComponent = CreateDefaultSubobject<USceneComponent>(TEXT("Root"));
}

void ADojoP15Gong::Strike()
{
	StrikeCount++;

	UDojoP15AnnouncerDesk* Desk = UDojoP15AnnouncerDesk::Locate(GetWorld());
	if (Desk != nullptr) Desk->Get().Announce(TEXT("Gong!"));
}

int32 ADojoP15Gong::GetStrikeCount() const
{
	return StrikeCount;
}
