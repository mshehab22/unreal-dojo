#include "DojoF5Lever.h"

#include "Components/TextRenderComponent.h"
#include "Quests/f5-cooldown/DojoF5CooldownComponent.h"

ADojoF5Lever::ADojoF5Lever()
{
	PrimaryActorTick.bCanEverTick = false;

	Label = CreateDefaultSubobject<UTextRenderComponent>(TEXT("Label"));
	RootComponent = Label;
	Label->SetHorizontalAlignment(EHTA_Center);
}

void ADojoF5Lever::BeginPlay()
{
	Super::BeginPlay();

	RefreshLabel();
}

void ADojoF5Lever::Pull()
{
	bIsOn = !bIsOn;
	RefreshLabel();

	OnPulled.Broadcast(bIsOn);
}

bool ADojoF5Lever::IsOn() const
{
	return bIsOn;
}

bool ADojoF5Lever::Interact_Implementation(AActor* Instigator)
{
	if (bIsOn) return false;

	const UDojoF5CooldownComponent* Cooldown = FindComponentByClass<UDojoF5CooldownComponent>();
	if (Cooldown && !Cooldown->IsReady()) return false;

	Pull();
	return true;
}

void ADojoF5Lever::RefreshLabel()
{
	Label->SetText(FText::FromString(bIsOn ? TEXT("ON") : TEXT("OFF")));
}
