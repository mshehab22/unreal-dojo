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
	for (int32 Step = 0; Step < Rows.Num() && !Row->ParentName.IsNone(); Step++)
	{
		Row = FindRow(Row->ParentName);
		if (!Row) return false;

		Result.BorrowUnsetFrom(*Row);
	}

	if (!Row->ParentName.IsNone()) return false;

	OutTrial = Result;
	OutTrial.ZeroUnset();
	return true;
}
