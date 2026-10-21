#include "DojoP6Fighter.h"

#include "Components/TextRenderComponent.h"
#include "DojoP6ArenaHerald.h"

ADojoP6Fighter::ADojoP6Fighter()
{
	PrimaryActorTick.bCanEverTick = false;

	Label = CreateDefaultSubobject<UTextRenderComponent>(TEXT("Label"));
	RootComponent = Label;
	Label->SetHorizontalAlignment(EHTA_Center);
}

void ADojoP6Fighter::BeginPlay()
{
	Super::BeginPlay();

	Label->SetText(FText::FromName(FighterName));
}

void ADojoP6Fighter::KnockOut(ADojoP6Fighter* Winner)
{
	if (IsValid(Herald))
	{
		FDojoP6KnockoutEvent Event;
		Event.FallenName = FighterName;
		Event.FallenTeam = Team;
		Event.WinnerName = IsValid(Winner) ? Winner->FighterName : NAME_None;
		Herald->Post(Event);
	}

	Destroy();
}
