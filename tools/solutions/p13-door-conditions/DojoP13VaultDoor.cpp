#include "DojoP13VaultDoor.h"

#include "Components/SceneComponent.h"

ADojoP13VaultDoor::ADojoP13VaultDoor()
{
	PrimaryActorTick.bCanEverTick = false;

	RootComponent = CreateDefaultSubobject<USceneComponent>(TEXT("Root"));
}

EDojoP13Verdict ADojoP13VaultDoor::Judge(const FDojoP13Stats& Stats) const
{
	TArray<int32> Stack;
	for (const FDojoP13CheckStep& Step : Condition)
	{
		if (!ApplyStep(Step, Stats, Stack)) return EDojoP13Verdict::EV_Broken;
	}
	if (Stack.Num() != 1) return EDojoP13Verdict::EV_Broken;
	return Stack[0] != 0 ? EDojoP13Verdict::EV_Open : EDojoP13Verdict::EV_Shut;
}

bool ADojoP13VaultDoor::ApplyStep(const FDojoP13CheckStep& Step, const FDojoP13Stats& Stats, TArray<int32>& Stack) const
{
	switch (Step.Op)
	{
	case EDojoP13CheckOp::ECO_PushNumber:
	case EDojoP13CheckOp::ECO_ReadStat:
		if (Stack.Num() >= StackLimit) return false;

		Stack.Add(Step.Op == EDojoP13CheckOp::ECO_PushNumber ? Step.Number : Stats.Get(Step.Stat));
		return true;

	case EDojoP13CheckOp::ECO_Not:
		if (Stack.IsEmpty()) return false;

		Stack.Last() = Stack.Last() == 0 ? 1 : 0;
		return true;

	case EDojoP13CheckOp::ECO_Equal:
	case EDojoP13CheckOp::ECO_Less:
	case EDojoP13CheckOp::ECO_Greater:
	case EDojoP13CheckOp::ECO_And:
	case EDojoP13CheckOp::ECO_Or:
	{
		if (Stack.Num() < 2) return false;

		// The value on top was written second, so it is the right-hand side.
		const int32 Right = Stack.Pop(EAllowShrinking::No);
		const int32 Left = Stack.Pop(EAllowShrinking::No);

		bool bResult = false;
		switch (Step.Op)
		{
		case EDojoP13CheckOp::ECO_Equal: bResult = Left == Right; break;
		case EDojoP13CheckOp::ECO_Less: bResult = Left < Right; break;
		case EDojoP13CheckOp::ECO_Greater: bResult = Left > Right; break;
		case EDojoP13CheckOp::ECO_And: bResult = Left != 0 && Right != 0; break;
		case EDojoP13CheckOp::ECO_Or: bResult = Left != 0 || Right != 0; break;
		default: break;
		}

		Stack.Add(bResult ? 1 : 0);
		return true;
	}
	}

	return false;
}

bool ADojoP13VaultDoor::TryOpen(const FDojoP13Stats& Stats)
{
	if (Judge(Stats) == EDojoP13Verdict::EV_Open)
	{
		bOpen = true;
		SetActorHiddenInGame(true);
		SetActorEnableCollision(false);
	}
	return bOpen;
}

void ADojoP13VaultDoor::Shut()
{
	bOpen = false;
	SetActorHiddenInGame(false);
	SetActorEnableCollision(true);
}

bool ADojoP13VaultDoor::IsOpen() const
{
	return bOpen;
}
