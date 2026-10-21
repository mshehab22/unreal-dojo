#include "DojoF3Roster.h"

#include "Components/SceneComponent.h"

ADojoF3Roster::ADojoF3Roster()
{
	PrimaryActorTick.bCanEverTick = false;

	RootComponent = CreateDefaultSubobject<USceneComponent>(TEXT("Root"));
}

void ADojoF3Roster::RecordScore(FName Player, int32 Score)
{
	if (Player.IsNone()) return;

	int32& Best = BestScores.FindOrAdd(Player, Score);
	Best = FMath::Max(Best, Score);
}

int32 ADojoF3Roster::GetBestFor(FName Player) const
{
	const int32* Best = BestScores.Find(Player);
	return Best ? *Best : 0;
}

FName ADojoF3Roster::GetLeader() const
{
	FName Leader = NAME_None;
	int32 LeaderScore = 0;

	for (const TPair<FName, int32>& Entry : BestScores)
	{
		const bool bHigher = Leader.IsNone() || Entry.Value > LeaderScore;
		const bool bTieSortsFirst = Entry.Value == LeaderScore && Entry.Key.LexicalLess(Leader);

		if (bHigher || bTieSortsFirst)
		{
			Leader = Entry.Key;
			LeaderScore = Entry.Value;
		}
	}

	return Leader;
}

int32 ADojoF3Roster::GetPlayerCount() const
{
	return BestScores.Num();
}
