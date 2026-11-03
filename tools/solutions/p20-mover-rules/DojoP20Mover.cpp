#include "DojoP20Mover.h"

#include "Components/SceneComponent.h"

ADojoP20Mover::ADojoP20Mover()
{
	PrimaryActorTick.bCanEverTick = false;

	RootComponent = CreateDefaultSubobject<USceneComponent>(TEXT("Root"));
}

void ADojoP20Mover::BeginPlay()
{
	Super::BeginPlay();

	Anchor = GetActorLocation();
}

void ADojoP20Mover::SetRuleClass(TSubclassOf<UDojoP20MoveRule> NewClass)
{
	RuleClass = NewClass;
	Rule = nullptr;
}

void ADojoP20Mover::Step(float DeltaSeconds)
{
	UClass* Chosen = RuleClass.Get();
	if (Chosen == nullptr || Chosen->HasAnyClassFlags(CLASS_Abstract)) return;

	if (!IsValid(Rule)) Rule = NewObject<UDojoP20MoveRule>(this, Chosen);

	SetActorLocation(Rule->NextLocation(GetActorLocation(), Anchor, DeltaSeconds));
}

FVector ADojoP20Mover::GetAnchor() const
{
	return Anchor;
}

UDojoP20MoveRule* ADojoP20Mover::GetRule() const
{
	return Rule.Get();
}
