#include "DojoP13RecipeMachine.h"

bool FDojoP13RecipeMachine::Run(const TArray<FDojoP13Instruction>& Program, FDojoP13Stats& Stats)
{
	Stack.Reset();
	FDojoP13Stats Working = Stats;

	for (const FDojoP13Instruction& Instruction : Program)
	{
		if (!Execute(Instruction, Working)) return false;
	}

	Stats = Working;
	return true;
}

bool FDojoP13RecipeMachine::Execute(const FDojoP13Instruction& Instruction, FDojoP13Stats& Stats)
{
	switch (Instruction.Op)
	{
	case EDojoP13Op::EO_PushNumber:
		return Push(Instruction.Number);

	case EDojoP13Op::EO_ReadStat:
		return Push(Stats.Get(Instruction.Stat));

	case EDojoP13Op::EO_WriteStat:
	{
		int32 Value = 0;
		if (!Pop(Value)) return false;

		Stats.Set(Instruction.Stat, Value);
		return true;
	}

	case EDojoP13Op::EO_Add:
	case EDojoP13Op::EO_Multiply:
	{
		int32 Top = 0;
		int32 Under = 0;
		if (!Pop(Top) || !Pop(Under)) return false;

		return Push(Instruction.Op == EDojoP13Op::EO_Add ? Top + Under : Top * Under);
	}
	}

	return false;
}

bool FDojoP13RecipeMachine::Push(int32 Value)
{
	if (Stack.Num() >= StackLimit) return false;

	Stack.Add(Value);
	return true;
}

bool FDojoP13RecipeMachine::Pop(int32& OutValue)
{
	if (Stack.IsEmpty()) return false;

	OutValue = Stack.Pop(EAllowShrinking::No);
	return true;
}
