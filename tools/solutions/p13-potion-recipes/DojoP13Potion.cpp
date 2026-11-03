#include "DojoP13Potion.h"

#include "Components/SceneComponent.h"
#include "DojoP13RecipeMachine.h"

ADojoP13Potion::ADojoP13Potion()
{
	PrimaryActorTick.bCanEverTick = false;

	RootComponent = CreateDefaultSubobject<USceneComponent>(TEXT("Root"));
}

bool ADojoP13Potion::Drink(FDojoP13Stats& Stats)
{
	FDojoP13RecipeMachine Machine;
	return Machine.Run(Recipe, Stats);
}
