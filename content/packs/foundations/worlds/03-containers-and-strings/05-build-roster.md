---
id: f3-roster
title: A roster that remembers every player's best
order: 5
kind: build
scaffold: faded
difficulty: 2
patterns: []
skills: [containers, strings]
terms: [tmap, fname, ufunction]
prerequisites: [f3-strings]
xp: 60
estimatedMinutes: 15
concepts:
  - A TMap from FName to a value finds a player's entry without a search
  - FName keys compare without regard to case
---

# Brief

When you press Play and run `ke * RecordScore Ana 50`, `ke * RecordScore Bo 70`, and `ke * RecordScore Ana 30`, Ana's best stays 50 and Bo leads; a later `ke * RecordScore ana 90` changes Ana's best, because ana and Ana are the same name.

The header is complete. In the source file every function has a comment naming its job; fill in:

1. `RecordScore`: ignore `NAME_None`; otherwise keep the higher of the player's old best and the new score.
2. `GetBestFor`: the player's best, or 0 for a player with no entry. Never use the square brackets on a key that may be missing.
3. `GetLeader`: the player with the highest best. When two are tied, the name that sorts first wins (Ana before Bo); with no players, `NAME_None`.

First version: an array of player and score pairs works too, and you would search it on every record. With six players nobody would notice; the map says what you mean, "find this player's entry", and keeps working at six hundred.

## See it in the editor

Place a `DojoF3Roster`, press Play, and run the console commands in the sentence above. Eject with F8 and select the roster: the Best Scores map in the Details panel shows one row per player. Run `ke * RecordScore ANA 10` and watch no new row appear.

# Files

## DojoF3Roster.h

```cpp
#pragma once

#include "CoreMinimal.h"
#include "GameFramework/Actor.h"
#include "DojoF3Roster.generated.h"

/** Remembers each player's best score by name and answers who leads. */
UCLASS()
class ADojoF3Roster : public AActor
{
	GENERATED_BODY()

public:
	/** Creates the scene root and turns ticking off. */
	ADojoF3Roster();

	/** Keeps Score as the player's best if it beats their old one; NAME_None is ignored. */
	UFUNCTION(BlueprintCallable, Category = "Roster")
	void RecordScore(FName Player, int32 Score);

	/** The player's best score, or 0 for a player with no score yet. */
	UFUNCTION(BlueprintPure, Category = "Roster")
	int32 GetBestFor(FName Player) const;

	/** The player with the highest best score; ties go to the name that sorts first; NAME_None when empty. */
	UFUNCTION(BlueprintPure, Category = "Roster")
	FName GetLeader() const;

	/** How many players have a score. */
	UFUNCTION(BlueprintPure, Category = "Roster")
	int32 GetPlayerCount() const;

private:
	/** Best score per player name. */
	UPROPERTY(VisibleInstanceOnly, Category = "Roster") // @explain: A reflected map shows each key and value as a row in the Details panel while playing.
	TMap<FName, int32> BestScores;
};
```

## DojoF3Roster.cpp

```cpp
#include "DojoF3Roster.h"

#include "Components/SceneComponent.h"

ADojoF3Roster::ADojoF3Roster()
{
	PrimaryActorTick.bCanEverTick = false;

	RootComponent = CreateDefaultSubobject<USceneComponent>(TEXT("Root"));
}

void ADojoF3Roster::RecordScore(FName Player, int32 Score)
{
	// Your code: ignore NAME_None.
	// Your code: find or add the player's entry and keep the higher of the two scores.
}

int32 ADojoF3Roster::GetBestFor(FName Player) const
{
	// Your code: look the player up safely and return 0 when there is no entry.
	return 0;
}

FName ADojoF3Roster::GetLeader() const
{
	// Your code: walk every entry, keep the highest, and on a tie keep the name that sorts first.
	return NAME_None;
}

int32 ADojoF3Roster::GetPlayerCount() const
{
	return BestScores.Num(); // @explain: Num on a map counts its keys, and each player is one key.
}
```

# Tests

```cpp
#include "Misc/AutomationTest.h"

#if WITH_AUTOMATION_TESTS

#include "Quests/f3-roster/DojoF3Roster.h"
#include "Support/DojoTestWorld.h"

IMPLEMENT_SIMPLE_AUTOMATION_TEST(FDojo_F3_Roster_KeepsBestPerPlayer, "Dojo.F3.Roster.KeepsBestPerPlayer", EAutomationTestFlags::EditorContext | EAutomationTestFlags::ProductFilter)

/** Records scores for three players and checks bests, missing players, the leader, and the tie rule. */
bool FDojo_F3_Roster_KeepsBestPerPlayer::RunTest(const FString& Parameters)
{
	FDojoTestWorld TestWorld;

	ADojoF3Roster* Roster = TestWorld.SpawnActor<ADojoF3Roster>();
	if (!TestNotNull(TEXT("Roster spawned"), Roster)) return false;

	TestTrue(TEXT("Nobody leads an empty roster"), Roster->GetLeader().IsNone());

	Roster->RecordScore(TEXT("Ana"), 50);
	Roster->RecordScore(TEXT("Bo"), 70);
	Roster->RecordScore(TEXT("Ana"), 30);
	Roster->RecordScore(NAME_None, 999);

	TestEqual(TEXT("A lower score does not replace a best"), Roster->GetBestFor(TEXT("Ana")), 50);
	TestEqual(TEXT("A player with no score has 0"), Roster->GetBestFor(TEXT("Dee")), 0);
	TestEqual(TEXT("NAME_None is not a player"), Roster->GetPlayerCount(), 2);
	TestEqual(TEXT("Bo leads"), Roster->GetLeader(), FName(TEXT("Bo")));

	Roster->RecordScore(TEXT("Cy"), 70);
	TestEqual(TEXT("A tie goes to the name that sorts first"), Roster->GetLeader(), FName(TEXT("Bo")));

	// Al joins last, so a walk that keeps the first maximum it finds would still say Bo.
	Roster->RecordScore(TEXT("Al"), 70);
	TestEqual(TEXT("A later player who ties and sorts first leads"), Roster->GetLeader(), FName(TEXT("Al")));

	Roster->RecordScore(TEXT("Ana"), 70);
	TestEqual(TEXT("Ana ties too, but Al still sorts first"), Roster->GetLeader(), FName(TEXT("Al")));

	return true;
}

IMPLEMENT_SIMPLE_AUTOMATION_TEST(FDojo_F3_Roster_NamesIgnoreCase, "Dojo.F3.Roster.NamesIgnoreCase", EAutomationTestFlags::EditorContext | EAutomationTestFlags::ProductFilter)

/** Records the same name in two spellings and checks they are one player, because FName comparison ignores case. */
bool FDojo_F3_Roster_NamesIgnoreCase::RunTest(const FString& Parameters)
{
	FDojoTestWorld TestWorld;

	ADojoF3Roster* Roster = TestWorld.SpawnActor<ADojoF3Roster>();
	if (!TestNotNull(TEXT("Roster spawned"), Roster)) return false;

	Roster->RecordScore(TEXT("Ana"), 40);
	Roster->RecordScore(TEXT("ana"), 90);

	TestEqual(TEXT("Ana and ana are one player"), Roster->GetPlayerCount(), 1);
	TestEqual(TEXT("Either spelling finds the best"), Roster->GetBestFor(TEXT("ANA")), 90);

	return true;
}

#endif
```

# Hints

- Each function is a lookup or a walk over the map; decide which one before you write a line.
- The map has a call that returns a reference and adds a default entry only when the key is missing, and one that returns a pointer or nullptr; for the tie, FName can compare itself alphabetically.
- `TMap::FindOrAdd` and `TMap::Find` are in `Containers/Map.h`; `FName::LexicalLess` and `FName::IsNone` are in `UObject/NameTypes.h`.

# Rubric

- RecordScore ignores NAME_None and keeps the higher score with one lookup.
- GetBestFor uses Find and returns 0 for a missing player, never the square brackets.
- GetLeader walks the map once and breaks ties by alphabetical order, returning NAME_None when empty.
- Player names are FName keys, so Ana and ana are one player.
- The map is a UPROPERTY visible in the Details panel while playing.

# Alternative

The roster could keep a `TArray` of a small USTRUCT with a name and a best score, sorted by score after every record. Then the leader is always element 0 and a top five is the first five entries, which suits a leaderboard screen. The cost is a search to find a player before every update and a sort after it. When the main question is "what is this player's best", the map is the better shape; when it is "show the top N", a sorted array is.

# Parsons

```yaml
- id: roster-record
  prompt: Put RecordScore in order.
  lines:
    - "void ADojoF3Roster::RecordScore(FName Player, int32 Score)"
    - "{"
    - "	if (Player.IsNone()) return;"
    - "	int32& Best = BestScores.FindOrAdd(Player, Score);"
    - "	Best = FMath::Max(Best, Score);"
    - "}"
  distractors:
    - line: "	int32& Best = BestScores[Player];"
      mistake: The square brackets assert for a player who has no entry yet.
```
