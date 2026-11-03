#include "DojoS4Door.h"

#include "Components/BoxComponent.h"
#include "Components/TextRenderComponent.h"

ADojoS4Door::ADojoS4Door()
{
	PrimaryActorTick.bCanEverTick = false;

	Body = CreateDefaultSubobject<UBoxComponent>(TEXT("Body"));
	RootComponent = Body;
	Body->SetBoxExtent(FVector(50.f, 50.f, 100.f));
	Body->SetCollisionProfileName(TEXT("OverlapAllDynamic"));
	Body->SetGenerateOverlapEvents(true);

	Label = CreateDefaultSubobject<UTextRenderComponent>(TEXT("Label"));
	Label->SetupAttachment(Body);
	Label->SetHorizontalAlignment(EHTA_Center);
	Label->SetText(FText::FromString(TEXT("SHUT")));
}

bool ADojoS4Door::IsOpen() const
{
	return bOpen;
}

bool ADojoS4Door::IsLocked() const
{
	return bLocked;
}

void ADojoS4Door::Lock()
{
	bOpen = false;
	bLocked = true;
	RefreshLabel();
}

void ADojoS4Door::Unlock()
{
	bLocked = false;
	RefreshLabel();
}

FText ADojoS4Door::GetPrompt_Implementation() const
{
	if (bLocked)
	{
		return FText::FromString(TEXT("Locked"));
	}

	return FText::FromString(bOpen ? TEXT("Close door") : TEXT("Open door"));
}

bool ADojoS4Door::CanInteract_Implementation(AActor* Interactor) const
{
	return !bLocked;
}

bool ADojoS4Door::Interact_Implementation(AActor* Interactor)
{
	if (bLocked)
	{
		return false;
	}

	bOpen = !bOpen;
	RefreshLabel();
	return true;
}

void ADojoS4Door::RefreshLabel()
{
	const TCHAR* State = bLocked ? TEXT("LOCKED") : (bOpen ? TEXT("OPEN") : TEXT("SHUT"));
	Label->SetText(FText::FromString(State));
}
