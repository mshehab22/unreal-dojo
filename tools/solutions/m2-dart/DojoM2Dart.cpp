#include "DojoM2Dart.h"

#include "Components/ArrowComponent.h"
#include "Components/SceneComponent.h"

ADojoM2Dart::ADojoM2Dart()
{
	PrimaryActorTick.bCanEverTick = true;

	USceneComponent* Root = CreateDefaultSubobject<USceneComponent>(TEXT("Root"));
	RootComponent = Root;

	UArrowComponent* Arrow = CreateDefaultSubobject<UArrowComponent>(TEXT("Arrow"));
	Arrow->SetupAttachment(Root);
}

void ADojoM2Dart::Launch(AActor* NewTarget)
{
	Target = NewTarget;
}

AActor* ADojoM2Dart::GetTarget() const
{
	return Target.Get();
}

void ADojoM2Dart::Tick(float DeltaSeconds)
{
	Super::Tick(DeltaSeconds);

	if (const AActor* Goal = Target.Get())
	{
		const FRotator Wanted = (Goal->GetActorLocation() - GetActorLocation()).Rotation();
		SetActorRotation(FMath::RInterpConstantTo(GetActorRotation(), Wanted, DeltaSeconds, TurnRate));
	}

	AddActorWorldOffset(GetActorForwardVector() * Speed * DeltaSeconds);
}
