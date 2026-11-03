#include "DojoP13TrapRoutine.h"

void UDojoP13TrapRoutine::AddFire()
{
	FDojoP13TrapStep Step;
	Step.Kind = EDojoP13TrapStepKind::Fire;
	Steps.Add(Step);
}

void UDojoP13TrapRoutine::AddWait(float Seconds)
{
	FDojoP13TrapStep Step;
	Step.Kind = EDojoP13TrapStepKind::Wait;
	Step.Seconds = Seconds;
	Steps.Add(Step);
}

void UDojoP13TrapRoutine::AddJump(int32 Target)
{
	FDojoP13TrapStep Step;
	Step.Kind = EDojoP13TrapStepKind::Jump;
	Step.Target = Target;
	Steps.Add(Step);
}
