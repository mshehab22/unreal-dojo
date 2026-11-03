#include "DojoS4Echo.h"

#include "Components/BoxComponent.h"

ADojoS4Echo::ADojoS4Echo()
{
	PrimaryActorTick.bCanEverTick = false;

	Body = CreateDefaultSubobject<UBoxComponent>(TEXT("Body"));
	RootComponent = Body;
	Body->SetBoxExtent(FVector(30.f, 30.f, 60.f));
	Body->SetCollisionProfileName(TEXT("OverlapAllDynamic"));
	Body->SetGenerateOverlapEvents(true);
}

AActor* ADojoS4Echo::GetLastAsker() const
{
	return LastAsker.Get();
}

AActor* ADojoS4Echo::GetLastUser() const
{
	return LastUser.Get();
}

int32 ADojoS4Echo::GetUseCount() const
{
	return UseCount;
}

FText ADojoS4Echo::GetPrompt_Implementation() const
{
	return FText::FromString(TEXT("Echo"));
}

bool ADojoS4Echo::CanInteract_Implementation(AActor* Interactor) const
{
	LastAsker = Interactor;
	return true;
}

bool ADojoS4Echo::Interact_Implementation(AActor* Interactor)
{
	LastUser = Interactor;
	++UseCount;
	return true;
}
