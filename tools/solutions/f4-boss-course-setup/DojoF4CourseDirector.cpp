#include "DojoF4CourseDirector.h"

#include "Components/InputComponent.h"
#include "Components/TextRenderComponent.h"
#include "Engine/World.h"
#include "GameFramework/PlayerController.h"
#include "InputCoreTypes.h"
#include "Kismet/GameplayStatics.h"
#include "Quests/f4-carrier/DojoF4Carrier.h"
#include "Quests/f4-fence/DojoF4Fence.h"
#include "Quests/f4-hit-counter/DojoF4HitCounterComponent.h"
#include "Quests/f4-registry/DojoF4TargetRegistry.h"

ADojoF4CourseDirector::ADojoF4CourseDirector()
{
	PrimaryActorTick.bCanEverTick = false;

	Label = CreateDefaultSubobject<UTextRenderComponent>(TEXT("Label"));
	RootComponent = Label;
	Label->SetHorizontalAlignment(EHTA_Center);
}

void ADojoF4CourseDirector::BeginPlay()
{
	Super::BeginPlay();

	for (AActor* Dummy : Dummies)
	{
		if (IsValid(Dummy)) StartLocations.Add(Dummy, Dummy->GetActorLocation());
	}

	// The keeper walks with the player: it rides on the pawn (or a designer's chosen actor) through attachment, so it needs no movement code of its own.
	AActor* Host = IsValid(FollowTarget) ? FollowTarget.Get() : UGameplayStatics::GetPlayerPawn(this, 0);
	if (IsValid(Keeper) && IsValid(Host)) Keeper->AttachToActor(Host, FAttachmentTransformRules::SnapToTargetNotIncludingScale);

	if (APlayerController* Player = GetWorld()->GetFirstPlayerController())
	{
		EnableInput(Player);
		InputComponent->BindKey(EKeys::E, IE_Pressed, this, &ADojoF4CourseDirector::HandleKey);
		InputComponent->BindKey(EKeys::T, IE_Pressed, this, &ADojoF4CourseDirector::HandleKey);
		InputComponent->BindKey(EKeys::R, IE_Pressed, this, &ADojoF4CourseDirector::HandleKey);
	}

	StartRound();
}

void ADojoF4CourseDirector::StartRound()
{
	UDojoF4TargetRegistry* Registry = GetRegistry();

	if (IsValid(Keeper)) Keeper->Drop();

	// Unregister everyone first, then register in the designer's order, so ties break the same way every round.
	for (AActor* Dummy : Dummies)
	{
		if (Registry) Registry->Unregister(Dummy);
	}

	for (AActor* Dummy : Dummies)
	{
		if (!IsValid(Dummy)) continue;

		if (const FVector* Start = StartLocations.Find(Dummy)) Dummy->SetActorLocation(*Start);
		if (UDojoF4HitCounterComponent* Counter = Dummy->FindComponentByClass<UDojoF4HitCounterComponent>()) Counter->ResetHits();
		if (Registry) Registry->Register(Dummy);
	}

	Occupants.Init(nullptr, IsValid(Fence) ? Fence->GetBuiltPostCount() : 0);

	StartedAt = GetWorld()->GetTimeSeconds();
	bRunning = true;
	Label->SetText(FText::FromString(FString::Printf(TEXT("PAR %.0f s"), ParSeconds)));
}

void ADojoF4CourseDirector::FinishRound()
{
	bRunning = false;
	FinishSeconds = GetWorld()->GetTimeSeconds() - StartedAt;

	const TCHAR* Verdict = FinishSeconds <= ParSeconds ? TEXT("UNDER PAR") : TEXT("OVER PAR");
	Label->SetText(FText::FromString(FString::Printf(TEXT("READY %.1f s %s"), FinishSeconds, Verdict)));
}

void ADojoF4CourseDirector::PressInteract()
{
	if (!bRunning || !IsValid(Keeper)) return;

	UDojoF4TargetRegistry* Registry = GetRegistry();
	if (!Registry) return;

	if (!Keeper->IsCarrying())
	{
		if (AActor* Nearest = Registry->FindNearest(Keeper->GetActorLocation(), PickupRange)) Keeper->Carry(Nearest);
		return;
	}

	AActor* Dummy = Keeper->Drop();
	const int32 Post = FindFreePost(Keeper->GetActorLocation());
	if (!Dummy || Post == INDEX_NONE) return;

	// Placed dummies leave the registry, which holds only the loose ones.
	Dummy->SetActorLocation(Fence->GetPostLocation(Post));
	Occupants[Post] = Dummy;
	Registry->Unregister(Dummy);
}

void ADojoF4CourseDirector::PressTest()
{
	if (!bRunning || !IsValid(Keeper) || !IsSetupDone()) return;

	AActor* Nearest = nullptr;
	double NearestSquared = FMath::Square(static_cast<double>(TestRange));
	for (AActor* Occupant : Occupants)
	{
		if (!IsValid(Occupant)) continue;

		const double DistanceSquared = FVector::DistSquared(Keeper->GetActorLocation(), Occupant->GetActorLocation());
		if (DistanceSquared <= NearestSquared)
		{
			Nearest = Occupant;
			NearestSquared = DistanceSquared;
		}
	}

	UDojoF4HitCounterComponent* Counter = Nearest ? Nearest->FindComponentByClass<UDojoF4HitCounterComponent>() : nullptr;
	if (!Counter) return;

	Counter->RegisterHit();

	for (AActor* Occupant : Occupants)
	{
		const UDojoF4HitCounterComponent* OccupantCounter = IsValid(Occupant) ? Occupant->FindComponentByClass<UDojoF4HitCounterComponent>() : nullptr;
		if (!OccupantCounter || !OccupantCounter->IsDown()) return;
	}

	FinishRound();
}

void ADojoF4CourseDirector::RestartCourse()
{
	if (bRunning) return;

	StartRound();
}

bool ADojoF4CourseDirector::IsRunning() const
{
	return bRunning;
}

int32 ADojoF4CourseDirector::GetPlacedCount() const
{
	int32 Placed = 0;

	for (const AActor* Occupant : Occupants)
	{
		if (IsValid(Occupant)) Placed++;
	}

	return Placed;
}

AActor* ADojoF4CourseDirector::GetOccupant(int32 PostIndex) const
{
	return Occupants.IsValidIndex(PostIndex) ? Occupants[PostIndex].Get() : nullptr;
}

float ADojoF4CourseDirector::GetFinishSeconds() const
{
	return FinishSeconds;
}

int32 ADojoF4CourseDirector::FindFreePost(const FVector& Location) const
{
	if (!IsValid(Fence)) return INDEX_NONE;

	int32 Best = INDEX_NONE;
	double BestSquared = FMath::Square(static_cast<double>(PlaceRange));

	for (int32 Index = 0; Index < Occupants.Num(); ++Index)
	{
		if (IsValid(Occupants[Index])) continue;

		// Strictly closer only, so on a tie the lower-numbered post keeps its place.
		const double DistanceSquared = FVector::DistSquared(Location, Fence->GetPostLocation(Index));
		if (Best == INDEX_NONE ? DistanceSquared <= BestSquared : DistanceSquared < BestSquared)
		{
			Best = Index;
			BestSquared = DistanceSquared;
		}
	}

	return Best;
}

bool ADojoF4CourseDirector::IsSetupDone() const
{
	return Occupants.Num() > 0 && GetPlacedCount() == Occupants.Num();
}

UDojoF4TargetRegistry* ADojoF4CourseDirector::GetRegistry() const
{
	return GetWorld()->GetSubsystem<UDojoF4TargetRegistry>();
}

void ADojoF4CourseDirector::HandleKey(FKey Key)
{
	if (Key == EKeys::E) PressInteract();
	if (Key == EKeys::T) PressTest();
	if (Key == EKeys::R) RestartCourse();
}
