#include "DojoP12TrialBook.h"

ADojoP12TrialBook::ADojoP12TrialBook()
{
	PrimaryActorTick.bCanEverTick = false;
}

const FDojoP12TrialRow* ADojoP12TrialBook::FindRow(FName TrialName) const
{
	return Rows.FindByPredicate([TrialName](const FDojoP12TrialRow& Candidate) { return Candidate.TrialName == TrialName; });
}

bool ADojoP12TrialBook::Resolve(FName TrialName, FDojoP12TrialRow& OutTrial) const
{
	const FDojoP12TrialRow* Row = FindRow(TrialName);
	if (!Row) return false;

	FDojoP12TrialRow Result = *Row;
	for (int32 Step = 0; !Row->ParentName.IsNone(); Step++)
	{
		if (Step >= Rows.Num()) return false;

		Row = FindRow(Row->ParentName);
		if (!Row) return false;

		if (Result.BladeCount < 0) Result.BladeCount = Row->BladeCount;
		if (Result.SwingSpeed < 0.f) Result.SwingSpeed = Row->SwingSpeed;
		if (Result.TimeLimit < 0.f) Result.TimeLimit = Row->TimeLimit;
		if (Result.Reward < 0) Result.Reward = Row->Reward;
	}

	Result.BladeCount = FMath::Max(Result.BladeCount, 0);
	Result.SwingSpeed = FMath::Max(Result.SwingSpeed, 0.f);
	Result.TimeLimit = FMath::Max(Result.TimeLimit, 0.f);
	Result.Reward = FMath::Max(Result.Reward, 0);

	OutTrial = Result;
	return true;
}
