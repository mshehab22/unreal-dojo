#include "DojoS4Sign.h"

#include "Components/BoxComponent.h"

ADojoS4Sign::ADojoS4Sign()
{
	PrimaryActorTick.bCanEverTick = false;

	Body = CreateDefaultSubobject<UBoxComponent>(TEXT("Body"));
	RootComponent = Body;
	Body->SetBoxExtent(FVector(30.f, 30.f, 60.f));
	Body->SetCollisionProfileName(TEXT("OverlapAllDynamic"));
	Body->SetGenerateOverlapEvents(true);
}

int32 ADojoS4Sign::GetReadCount() const
{
	return ReadCount;
}

FText ADojoS4Sign::GetPrompt_Implementation() const
{
	return FText::FromString(TEXT("Read sign"));
}

bool ADojoS4Sign::CanInteract_Implementation(AActor* Interactor) const
{
	return true;
}

bool ADojoS4Sign::Interact_Implementation(AActor* Interactor)
{
	++ReadCount;
	return true;
}
