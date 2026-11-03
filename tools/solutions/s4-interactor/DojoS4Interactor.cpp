#include "DojoS4Interactor.h"

#include "Quests/s4-interactable/DojoS4Interactable.h"

UDojoS4Interactor::UDojoS4Interactor()
{
	PrimaryComponentTick.bCanEverTick = false;

	InitSphereRadius(200.f);
	SetCollisionProfileName(TEXT("OverlapAllDynamic"));
	SetGenerateOverlapEvents(true);
}

void UDojoS4Interactor::BeginPlay()
{
	Super::BeginPlay();

	OnComponentBeginOverlap.AddUniqueDynamic(this, &UDojoS4Interactor::HandleBeginOverlap);
	OnComponentEndOverlap.AddUniqueDynamic(this, &UDojoS4Interactor::HandleEndOverlap);
	TransformUpdated.AddUObject(this, &UDojoS4Interactor::HandleMoved);

	// Things already inside the sphere when play starts never fire a begin event, so collect them now.
	TArray<AActor*> Inside;
	GetOverlappingActors(Inside);

	for (AActor* Candidate : Inside)
	{
		if (Candidate != GetOwner() && Candidate->GetClass()->ImplementsInterface(UDojoS4Interactable::StaticClass()))
		{
			Nearby.AddUnique(Candidate);
		}
	}

	Refresh();
}

void UDojoS4Interactor::EndPlay(const EEndPlayReason::Type EndPlayReason)
{
	OnComponentBeginOverlap.RemoveDynamic(this, &UDojoS4Interactor::HandleBeginOverlap);
	OnComponentEndOverlap.RemoveDynamic(this, &UDojoS4Interactor::HandleEndOverlap);
	TransformUpdated.RemoveAll(this);

	Super::EndPlay(EndPlayReason);
}

AActor* UDojoS4Interactor::GetFocus() const
{
	return CurrentFocus;
}

FText UDojoS4Interactor::GetFocusPrompt() const
{
	return CurrentPrompt;
}

void UDojoS4Interactor::Refresh()
{
	Nearby.RemoveAll([](const TObjectPtr<AActor>& Candidate) { return !IsValid(Candidate); });

	// The nearest interactable that can be used wins; at the same distance the one that arrived first keeps it.
	AActor* Best = nullptr;
	float BestDistance = 0.f;

	for (AActor* Candidate : Nearby)
	{
		if (!IDojoS4Interactable::Execute_CanInteract(Candidate, GetOwner()))
		{
			continue;
		}

		const float Distance = FVector::DistSquared(GetComponentLocation(), Candidate->GetActorLocation());

		if (Best == nullptr || Distance < BestDistance)
		{
			Best = Candidate;
			BestDistance = Distance;
		}
	}

	const FText Prompt = Best != nullptr ? IDojoS4Interactable::Execute_GetPrompt(Best) : FText::GetEmpty();

	if (Best == CurrentFocus && Prompt.EqualTo(CurrentPrompt))
	{
		return;
	}

	CurrentFocus = Best;
	CurrentPrompt = Prompt;
	OnFocusChanged.Broadcast(CurrentFocus, CurrentPrompt);
}

bool UDojoS4Interactor::TryInteract()
{
	if (!IsValid(CurrentFocus))
	{
		return false;
	}

	const bool bDone = IDojoS4Interactable::Execute_Interact(CurrentFocus, GetOwner());
	Refresh();
	return bDone;
}

void UDojoS4Interactor::HandleBeginOverlap(UPrimitiveComponent* OverlappedComponent, AActor* OtherActor, UPrimitiveComponent* OtherComponent, int32 OtherBodyIndex, bool bFromSweep, const FHitResult& SweepResult)
{
	if (OtherActor == nullptr || OtherActor == GetOwner() || !OtherActor->GetClass()->ImplementsInterface(UDojoS4Interactable::StaticClass()))
	{
		return;
	}

	Nearby.AddUnique(OtherActor);
	Refresh();
}

void UDojoS4Interactor::HandleMoved(USceneComponent* MovedComponent, EUpdateTransformFlags UpdateTransformFlags, ETeleportType Teleport)
{
	Refresh();
}

void UDojoS4Interactor::HandleEndOverlap(UPrimitiveComponent* OverlappedComponent, AActor* OtherActor, UPrimitiveComponent* OtherComponent, int32 OtherBodyIndex)
{
	if (Nearby.Remove(OtherActor) > 0)
	{
		Refresh();
	}
}
