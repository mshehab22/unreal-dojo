#pragma once

#include "CoreMinimal.h"
#include "DojoP13Instruction.h"
#include "DojoP13Stats.h"

/** Runs a potion recipe, one step at a time, passing values between steps on a small stack. Bytecode pattern. */
class FDojoP13RecipeMachine
{
public:
	/** The most values the stack may hold at once. */
	static constexpr int32 StackLimit = 8;

	/** Runs every step of Program against a copy of Stats and keeps the copy only if no step failed; false, with Stats untouched, when a step failed. */
	bool Run(const TArray<FDojoP13Instruction>& Program, FDojoP13Stats& Stats);

private:
	/** Does one step to Stats; false when the step cannot be done. */
	bool Execute(const FDojoP13Instruction& Instruction, FDojoP13Stats& Stats);

	/** Puts Value on top of the stack; false when the stack is full. */
	bool Push(int32 Value);

	/** Takes the top value off the stack into OutValue; false when the stack is empty. */
	bool Pop(int32& OutValue);

	/** Values waiting for the next step, the last one pushed on top. */
	TArray<int32, TInlineAllocator<StackLimit>> Stack;
};
