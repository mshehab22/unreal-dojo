#include "DojoP15ScoreboardDesk.h"

#include "Engine/World.h"

void UDojoP15ScoreboardDesk::Initialize(FSubsystemCollectionBase& Collection)
{
	Super::Initialize(Collection);

	Silent = NewObject<UDojoP15NullScoreboard>(this);
	Current = Silent;
}

UDojoP15ScoreboardDesk* UDojoP15ScoreboardDesk::Locate(const UWorld* LevelWorld)
{
	return LevelWorld ? LevelWorld->GetSubsystem<UDojoP15ScoreboardDesk>() : nullptr;
}

bool UDojoP15ScoreboardDesk::Provide(UObject* Provider)
{
	if (!IsValid(Provider))
	{
		Current = Silent;
		return true;
	}

	if (!Provider->Implements<UDojoP15Scoreboard>()) return false;

	Current = Provider;
	return true;
}

void UDojoP15ScoreboardDesk::AddPoints(FName Fighter, int32 Points)
{
	IDojoP15Scoreboard* Board = Cast<IDojoP15Scoreboard>(Current.Get());
	if (Board != nullptr) Board->AddPoints(Fighter, Points);
}

int32 UDojoP15ScoreboardDesk::GetPoints(FName Fighter) const
{
	const IDojoP15Scoreboard* Board = Cast<IDojoP15Scoreboard>(Current.Get());
	return Board != nullptr ? Board->GetPoints(Fighter) : 0;
}

UObject* UDojoP15ScoreboardDesk::GetProvider() const
{
	return Current.Get();
}

UDojoP15NullScoreboard* UDojoP15ScoreboardDesk::GetNullScoreboard() const
{
	return Silent.Get();
}
