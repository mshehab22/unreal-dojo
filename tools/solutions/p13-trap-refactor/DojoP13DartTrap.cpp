#include "DojoP13DartTrap.h"

#include "Components/SceneComponent.h"

ADojoP13DartTrap::ADojoP13DartTrap()
{
	PrimaryActorTick.bCanEverTick = true;

	RootComponent = CreateDefaultSubobject<USceneComponent>(TEXT("Root"));
}

void ADojoP13DartTrap::Tick(float DeltaSeconds)
{
	Super::Tick(DeltaSeconds);

	if (bJammed || !IsValid(Routine)) return;

	for (int32 Spent = 0; Spent < StepsPerFrame; Spent++)
	{
		if (!Routine->Steps.IsValidIndex(StepIndex)) return;

		const FDojoP13TrapStep& Step = Routine->Steps[StepIndex];
		switch (Step.Kind)
		{
		case EDojoP13TrapStepKind::ETSK_Fire:
			ShotsFired++;
			StepIndex++;
			break;

		case EDojoP13TrapStepKind::ETSK_Wait:
			WaitedSeconds += DeltaSeconds;
			if (WaitedSeconds >= Step.Seconds)
			{
				WaitedSeconds = 0.f;
				StepIndex++;
			}
			return;

		case EDojoP13TrapStepKind::ETSK_Jump:
			if (!Routine->Steps.IsValidIndex(Step.Target))
			{
				bJammed = true;
				return;
			}
			StepIndex = Step.Target;
			break;
		}
	}

	bJammed = true;
}

int32 ADojoP13DartTrap::GetShotsFired() const
{
	return ShotsFired;
}

bool ADojoP13DartTrap::IsJammed() const
{
	return bJammed;
}

bool ADojoP13DartTrap::IsFinished() const
{
	return !bJammed && IsValid(Routine) && !Routine->Steps.IsValidIndex(StepIndex);
}
