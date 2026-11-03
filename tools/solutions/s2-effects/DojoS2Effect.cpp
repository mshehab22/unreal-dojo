#include "DojoS2Effect.h"

#include "Engine/World.h"
#include "EngineUtils.h"
#include "GameFramework/Actor.h"

bool UDojoS2Effect::Apply(AActor* User)
{
	if (!IsValid(User) || User->GetWorld() == nullptr)
	{
		return false;
	}

	OnApply(User);
	return true;
}

void UDojoS2Effect::OnApply(AActor* User)
{
}

void UDojoS2Effect::MoveActor(AActor* Target, const FVector& Offset) const
{
	if (IsValid(Target))
	{
		Target->AddActorWorldOffset(Offset);
	}
}

TArray<AActor*> UDojoS2Effect::FindTargetsNear(const FVector& Center, float Radius, const AActor* Ignore) const
{
	TArray<AActor*> Found;

	if (Ignore == nullptr || Ignore->GetWorld() == nullptr)
	{
		return Found;
	}

	for (TActorIterator<AActor> It(Ignore->GetWorld()); It; ++It)
	{
		AActor* Candidate = *It;

		if (Candidate != Ignore && IsValid(Candidate) && Candidate->ActorHasTag(TargetTag) && FVector::Dist(Candidate->GetActorLocation(), Center) <= Radius)
		{
			Found.Add(Candidate);
		}
	}

	return Found;
}
