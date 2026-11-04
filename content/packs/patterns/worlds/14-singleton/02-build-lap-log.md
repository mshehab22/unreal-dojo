---
id: p14-lap-log
title: Laps go into the log you are handed
order: 2
kind: build
scaffold: worked
difficulty: 3
patterns: [singleton]
skills: [singleton, references]
terms: [dependency-injection, uproperty, tobjectptr, newobject, tmap, fname]
prerequisites: [p14-reachable-from-anywhere]
xp: 60
estimatedMinutes: 20
concepts:
  - A finish line writes its laps into a log that whoever sets up the race hands it, so nothing about the log is global
  - Two lines can write into two logs, or into the same one, and the line's code does not change
  - The line is told the time instead of reading a clock, so a test can give it any time
  - A UPROPERTY pointer keeps the handed log alive for as long as the line uses it
  - The line depends on the log; the log knows nothing about lines or tracks
---

# Brief

When you press Play with the setup below, laps driven through the ranked line land in the ranked log and laps driven through the practice line land in the practice log, and neither log ever sees the other's laps.

`UDojoP14LapLog` is a book of lap times: `Record` writes one lap for a driver, and `GetLaps`, `GetLapCountFor`, and `GetBestFor` read them back. `ADojoP14FinishLine` times laps. Whoever sets up the race makes a log with `NewObject` and hands it to the line with `UseLog`; the line keeps it in a `UPROPERTY` and never looks for a log anywhere else. The line depends on the log; the log knows nothing about lines or tracks.

Most of the code is written. First read the marked lines and say in a sentence why each one is there. Then fill the one gap: `CrossLine`. A driver crossing the line at `Now` seconds starts their lap the first time; every later crossing writes the finished lap, `Now` minus when that lap started, into the line's log and starts the next lap at `Now`. Each driver is timed apart from the others. While the line has no log, `CrossLine` returns false and times nothing at all, not even a start; otherwise it returns true. A log handed over while a lap is under way receives that lap when it finishes.

## See it in the editor

Place two `DojoP14FinishLine` actors and name them RankedLine and PracticeLine. In the Level Blueprint, on Begin Play, use Construct Object from Class twice to make two `DojoP14LapLog` objects, store them in variables RankedLog and PracticeLog, and call Use Log on each line with its own log. Then call Cross Line on RankedLine for driver Ada at times 0, 31.5, and 60, and on PracticeLine for Ada at 0 and 25. Print Get Lap Count For (Ada) and Get Best For (Ada) on each log: the ranked log shows 2 laps with a best of 28.5, and the practice log shows 1 lap of 25. Hand both lines the RankedLog instead and play again: it now shows 3 laps and a best of 25, because both lines write into the one log they were given.

# Files

## DojoP14LapLog.h

```cpp
#pragma once

#include "CoreMinimal.h"
#include "UObject/Object.h"
#include "DojoP14LapLog.generated.h"

/** One timed lap: who drove it and how many seconds it took. */
USTRUCT(BlueprintType)
struct FDojoP14Lap
{
	GENERATED_BODY()

	/** Who drove the lap. */
	UPROPERTY(VisibleAnywhere, BlueprintReadOnly, Category = "Laps")
	FName Driver;

	/** How long the lap took. */
	UPROPERTY(VisibleAnywhere, BlueprintReadOnly, Category = "Laps")
	float Seconds = 0.f;
};

/** A book of lap times. Whoever makes one decides which finish lines write in it; it knows nothing about tracks. */
UCLASS(BlueprintType) // @explain: BlueprintType lets a Blueprint keep a log in a variable and hand it to a line, so a designer can set up a second log without any code.
class UDojoP14LapLog : public UObject
{
	GENERATED_BODY()

public:
	/** Writes one finished lap. */
	UFUNCTION(BlueprintCallable, Category = "Laps")
	void Record(FName Driver, float Seconds);

	/** Every lap written so far, oldest first. */
	UFUNCTION(BlueprintPure, Category = "Laps")
	TArray<FDojoP14Lap> GetLaps() const;

	/** How many laps Driver has in this log. */
	UFUNCTION(BlueprintPure, Category = "Laps")
	int32 GetLapCountFor(FName Driver) const;

	/** Driver's fastest lap in this log, or 0 when they have none. */
	UFUNCTION(BlueprintPure, Category = "Laps")
	float GetBestFor(FName Driver) const;

private:
	/** Every lap written so far, oldest first. */
	UPROPERTY()
	TArray<FDojoP14Lap> Laps;
};
```

## DojoP14LapLog.cpp

```cpp
#include "DojoP14LapLog.h"

void UDojoP14LapLog::Record(FName Driver, float Seconds)
{
	FDojoP14Lap Lap;
	Lap.Driver = Driver;
	Lap.Seconds = Seconds;
	Laps.Add(Lap);
}

TArray<FDojoP14Lap> UDojoP14LapLog::GetLaps() const
{
	return Laps;
}

int32 UDojoP14LapLog::GetLapCountFor(FName Driver) const
{
	int32 Count = 0;
	for (const FDojoP14Lap& Lap : Laps)
	{
		if (Lap.Driver == Driver) Count++;
	}
	return Count;
}

float UDojoP14LapLog::GetBestFor(FName Driver) const
{
	float Best = 0.f;
	for (const FDojoP14Lap& Lap : Laps)
	{
		if (Lap.Driver != Driver) continue;
		if (Best == 0.f || Lap.Seconds < Best) Best = Lap.Seconds;
	}
	return Best;
}
```

## DojoP14FinishLine.h

```cpp
#pragma once

#include "CoreMinimal.h"
#include "GameFramework/Actor.h"
#include "DojoP14FinishLine.generated.h"

class UDojoP14LapLog;

/** A finish line that times each driver's laps and writes them into the log it was handed. */
UCLASS()
class ADojoP14FinishLine : public AActor
{
	GENERATED_BODY()

public:
	/** Creates the scene root and turns ticking off. */
	ADojoP14FinishLine();

	/** From now on, finished laps go into NewLog; nullptr stops the line timing. */
	UFUNCTION(BlueprintCallable, Category = "Finish Line")
	void UseLog(UDojoP14LapLog* NewLog); // @explain: The line never goes looking for a log: whoever sets up the race hands it one, so a practice line and a ranked line can write into different logs.

	/** The log finished laps go into, or nullptr. */
	UFUNCTION(BlueprintPure, Category = "Finish Line")
	UDojoP14LapLog* GetLog() const;

	/** Driver crosses the line at Now seconds: the first crossing starts a lap, each later one writes the finished lap into the log and starts the next. False, timing nothing, while the line has no log. */
	UFUNCTION(BlueprintCallable, Category = "Finish Line")
	bool CrossLine(FName Driver, float Now); // @explain: The line is told the time instead of reading a clock, so a test, a replay, or a race director can give it whatever time it means.

private:
	/** The log this line writes into. */
	UPROPERTY()
	TObjectPtr<UDojoP14LapLog> Log; // @explain: A UPROPERTY pointer is one the garbage collector can see, so the log stays alive as long as a line still writes into it.

	/** When each driver's current lap started. */
	TMap<FName, float> LapStarts;
};
```

## DojoP14FinishLine.cpp

```cpp
#include "DojoP14FinishLine.h"

#include "Components/SceneComponent.h"
#include "DojoP14LapLog.h"

ADojoP14FinishLine::ADojoP14FinishLine()
{
	PrimaryActorTick.bCanEverTick = false;

	RootComponent = CreateDefaultSubobject<USceneComponent>(TEXT("Root"));
}

void ADojoP14FinishLine::UseLog(UDojoP14LapLog* NewLog)
{
	Log = NewLog;
}

UDojoP14LapLog* ADojoP14FinishLine::GetLog() const
{
	return Log;
}

bool ADojoP14FinishLine::CrossLine(FName Driver, float Now)
{
	return false;
}
```

# Tests

```cpp
#include "Misc/AutomationTest.h"

#if WITH_AUTOMATION_TESTS

#include "Quests/p14-lap-log/DojoP14FinishLine.h"
#include "Quests/p14-lap-log/DojoP14LapLog.h"
#include "Support/DojoTestWorld.h"

IMPLEMENT_SIMPLE_AUTOMATION_TEST(FDojo_P14_LapLog_LapsComeFromCrossings, "Dojo.P14.LapLog.LapsComeFromCrossings", EAutomationTestFlags::EditorContext | EAutomationTestFlags::ProductFilter)

/** Crossings at 1, 31.5, and 60 seconds make two laps of 30.5 and 28.5 in the line's log. */
bool FDojo_P14_LapLog_LapsComeFromCrossings::RunTest(const FString& Parameters)
{
	FDojoTestWorld TestWorld;

	ADojoP14FinishLine* Line = TestWorld.SpawnActor<ADojoP14FinishLine>();
	UDojoP14LapLog* Log = NewObject<UDojoP14LapLog>();
	if (!TestNotNull(TEXT("Line spawned"), Line)) return false;
	Line->UseLog(Log);

	const FName Ada = TEXT("Ada");
	TestTrue(TEXT("The first crossing is accepted"), Line->CrossLine(Ada, 1.f));
	TestEqual(TEXT("It only starts a lap"), Log->GetLaps().Num(), 0);

	TestTrue(TEXT("The second crossing is accepted"), Line->CrossLine(Ada, 31.5f));
	TestEqual(TEXT("One lap is written"), Log->GetLapCountFor(Ada), 1);
	TestEqual(TEXT("It took 30.5 seconds"), Log->GetBestFor(Ada), 30.5f);

	Line->CrossLine(Ada, 60.f);
	TestEqual(TEXT("A third crossing writes a second lap"), Log->GetLapCountFor(Ada), 2);
	TestEqual(TEXT("Timed from the second crossing, it took 28.5 seconds and is the best lap"), Log->GetBestFor(Ada), 28.5f);

	return true;
}

IMPLEMENT_SIMPLE_AUTOMATION_TEST(FDojo_P14_LapLog_DriversAreTimedApart, "Dojo.P14.LapLog.DriversAreTimedApart", EAutomationTestFlags::EditorContext | EAutomationTestFlags::ProductFilter)

/** Two drivers crossing in turns each get their own lap, timed from their own start. */
bool FDojo_P14_LapLog_DriversAreTimedApart::RunTest(const FString& Parameters)
{
	FDojoTestWorld TestWorld;

	ADojoP14FinishLine* Line = TestWorld.SpawnActor<ADojoP14FinishLine>();
	UDojoP14LapLog* Log = NewObject<UDojoP14LapLog>();
	if (!TestNotNull(TEXT("Line spawned"), Line)) return false;
	Line->UseLog(Log);

	const FName Ada = TEXT("Ada");
	const FName Ben = TEXT("Ben");
	Line->CrossLine(Ada, 0.f);
	Line->CrossLine(Ben, 2.f);
	Line->CrossLine(Ada, 30.f);
	Line->CrossLine(Ben, 35.f);

	TestEqual(TEXT("Ada has one lap"), Log->GetLapCountFor(Ada), 1);
	TestEqual(TEXT("Ben has one lap"), Log->GetLapCountFor(Ben), 1);
	TestEqual(TEXT("Ada's lap is timed from Ada's own start: 30 seconds"), Log->GetBestFor(Ada), 30.f);
	TestEqual(TEXT("Ben's lap is timed from Ben's own start: 33 seconds"), Log->GetBestFor(Ben), 33.f);
	TestEqual(TEXT("Nobody else has laps"), Log->GetLapCountFor(TEXT("Cy")), 0);

	return true;
}

IMPLEMENT_SIMPLE_AUTOMATION_TEST(FDojo_P14_LapLog_EachLineWritesWhereItIsTold, "Dojo.P14.LapLog.EachLineWritesWhereItIsTold", EAutomationTestFlags::EditorContext | EAutomationTestFlags::ProductFilter)

/** A ranked line and a practice line with their own logs keep their laps apart; a line handed another log mid-lap finishes that lap in the new log. */
bool FDojo_P14_LapLog_EachLineWritesWhereItIsTold::RunTest(const FString& Parameters)
{
	FDojoTestWorld TestWorld;

	ADojoP14FinishLine* RankedLine = TestWorld.SpawnActor<ADojoP14FinishLine>();
	ADojoP14FinishLine* PracticeLine = TestWorld.SpawnActor<ADojoP14FinishLine>();
	UDojoP14LapLog* RankedLog = NewObject<UDojoP14LapLog>();
	UDojoP14LapLog* PracticeLog = NewObject<UDojoP14LapLog>();
	if (!TestNotNull(TEXT("Ranked line spawned"), RankedLine) || !TestNotNull(TEXT("Practice line spawned"), PracticeLine)) return false;
	RankedLine->UseLog(RankedLog);
	PracticeLine->UseLog(PracticeLog);
	TestTrue(TEXT("Each line holds the log it was given"), RankedLine->GetLog() == RankedLog && PracticeLine->GetLog() == PracticeLog);

	const FName Ada = TEXT("Ada");
	RankedLine->CrossLine(Ada, 0.f);
	RankedLine->CrossLine(Ada, 40.f);
	PracticeLine->CrossLine(Ada, 0.f);
	PracticeLine->CrossLine(Ada, 25.f);

	TestEqual(TEXT("The ranked log has the ranked lap only"), RankedLog->GetLaps().Num(), 1);
	TestEqual(TEXT("Of 40 seconds"), RankedLog->GetBestFor(Ada), 40.f);
	TestEqual(TEXT("The practice log has the practice lap only"), PracticeLog->GetLaps().Num(), 1);
	TestEqual(TEXT("Of 25 seconds"), PracticeLog->GetBestFor(Ada), 25.f);

	PracticeLine->UseLog(RankedLog);
	PracticeLine->CrossLine(Ada, 45.f);
	TestEqual(TEXT("The lap under way when the log changed lands in the new log"), RankedLog->GetLaps().Num(), 2);
	TestEqual(TEXT("And the old log gets nothing more"), PracticeLog->GetLaps().Num(), 1);
	TestEqual(TEXT("Its time runs from the practice line's last crossing: 20 seconds"), RankedLog->GetBestFor(Ada), 20.f);

	return true;
}

IMPLEMENT_SIMPLE_AUTOMATION_TEST(FDojo_P14_LapLog_NoLogTimesNothing, "Dojo.P14.LapLog.NoLogTimesNothing", EAutomationTestFlags::EditorContext | EAutomationTestFlags::ProductFilter)

/** A line without a log refuses crossings and does not even start a lap; once handed a log it times normally, and handing it nullptr stops it again. */
bool FDojo_P14_LapLog_NoLogTimesNothing::RunTest(const FString& Parameters)
{
	FDojoTestWorld TestWorld;

	ADojoP14FinishLine* Line = TestWorld.SpawnActor<ADojoP14FinishLine>();
	if (!TestNotNull(TEXT("Line spawned"), Line)) return false;

	const FName Ada = TEXT("Ada");
	TestFalse(TEXT("Without a log the crossing is refused"), Line->CrossLine(Ada, 5.f));

	UDojoP14LapLog* Log = NewObject<UDojoP14LapLog>();
	Line->UseLog(Log);
	TestTrue(TEXT("With a log the next crossing is accepted"), Line->CrossLine(Ada, 10.f));
	TestEqual(TEXT("It starts the first lap, because the refused crossing started nothing"), Log->GetLaps().Num(), 0);
	Line->CrossLine(Ada, 40.f);
	TestEqual(TEXT("The lap is timed from 10, not from 5"), Log->GetBestFor(Ada), 30.f);

	Line->UseLog(nullptr);
	TestFalse(TEXT("Handed nullptr, the line refuses again"), Line->CrossLine(Ada, 70.f));
	TestEqual(TEXT("And writes nothing"), Log->GetLaps().Num(), 1);

	return true;
}

#endif
```

# Hints

- Look at what the line already stores for each driver, and decide what finding nothing there tells you.
- A finished lap is the later time minus an earlier one, so work out which of the two you are holding and which one you must look up.
- Do the check for a missing log before any bookkeeping, or a refused crossing would still start a lap.

# Rubric

- CrossLine starts a driver's lap on their first crossing and, on every later one, writes the finished lap into the line's log and starts the next lap at that moment.
- Each driver is timed from their own start, and laps are measured from the crossing before, not from the first one.
- A line without a log returns false and starts nothing; with a log it returns true.
- Laps go only into the log the line was handed, and a line handed another log writes every later lap there.
- The line never reaches a log through anything but its own pointer, set by whoever sets up the race.
- The line depends on the log; the log knows nothing about lines or tracks.

# Alternative

The line could ask its world for the log, through a world subsystem, instead of being handed one. That suits a race where every line in the level writes to the same place and nobody should have to wire anything, and it is the right home when the log belongs to the level. It costs exactly what this quest needs: a practice line and a ranked line in the same level could not write to different logs without the subsystem learning about modes. Handing the log in keeps the decision with whoever sets up the race. The price is the wiring: something has to make the logs and pass them along, and a line that is never handed one times nothing.

# Parsons

```yaml
- id: cross-line
  prompt: Put CrossLine in order.
  lines:
    - "bool ADojoP14FinishLine::CrossLine(FName Driver, float Now)"
    - "{"
    - "	if (!IsValid(Log)) return false;"
    - "	if (const float* LapStart = LapStarts.Find(Driver))"
    - "	{"
    - "		Log->Record(Driver, Now - *LapStart);"
    - "	}"
    - "	LapStarts.Add(Driver, Now);"
    - "	return true;"
    - "}"
  distractors:
    - line: "		GetMutableDefault<UDojoP14LapLog>()->Record(Driver, Now - *LapStart);"
      mistake: GetMutableDefault returns the class default object, one log for the whole program that every line would reach, so the ranked and practice lines could never keep their laps apart; the line writes into the log it was handed.
```
