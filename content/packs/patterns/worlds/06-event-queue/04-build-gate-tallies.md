---
id: p6-gate-tallies
title: Gate reports from worker threads, a few per tick
order: 4
kind: build
scaffold: stub
difficulty: 3
patterns: [event-queue]
skills: [event-queue, threading]
terms: [tqueue, parallel-for, game-thread, ustruct, tick]
prerequisites: [p6-event-queue-card]
xp: 100
estimatedMinutes: 25
concepts:
  - Work on other threads hands results to the game thread through a thread-safe queue, by value
  - A queue with many writers and one reader needs the multi-producer mode
  - The reader decides the pace, taking at most a set number per tick so a burst never lands in one frame
---

# Brief

When you press Play and run `ke * SimulateGates`, forty gate reports arrive at once from worker threads, and the attendance board's label climbs over the next ten frames to its total instead of jumping in one.

The arena's ticket gates are counted on worker threads, away from gameplay. Each counter sends an `FDojoP6GateReport` (which gate, how many tickets) whenever it likes, possibly several at the same instant from different threads. The board's counts may only be touched on the game thread. So between them sits a mailbox: a `TQueue` in multi-producer mode, which many threads may add to at once and one thread may take from.

The declarations, the constructor, `BeginPlay`, `Tick`, the getters, the label, and `SimulateGates` (the worker side) are given. Yours:

- `SubmitReport` adds a report to the mailbox. It runs on worker threads, so it does nothing else.
- `ApplyReports` runs on the game thread each tick. It takes reports out oldest first, counts every one it takes, adds each report's tickets to its gate and to the attendance, drops reports for gates that do not exist, and refreshes the label.
- A burst of reports must not all land in one frame: `ApplyReports` takes at most `ReportsPerTick` reports per call, and the rest wait for later ticks.

Write the obvious version first and run the tests. One of them fails on purpose for most people. Read its name and message before you read the hints.

## See it in the editor

Place a `DojoP6AttendanceBoard` in the sandbox map, press Play, open the console, and run `ke * SimulateGates`. The label climbs from Attendance: 0 to Attendance: 79 over ten frames, four reports per frame. Set Reports Per Tick to 1 in the Details panel and try again: the climb takes forty frames. Run `stat unit` while it climbs: the game thread's time per frame barely moves, because each frame does only a few reports' work.

# Files

## DojoP6AttendanceBoard.h

```cpp
#pragma once

#include "CoreMinimal.h"
#include "Containers/Queue.h"
#include "GameFramework/Actor.h"
#include "DojoP6AttendanceBoard.generated.h"

class UTextRenderComponent;

/** One gate's ticket report, made on a worker thread and carried by value to the game thread. */
USTRUCT(BlueprintType)
struct FDojoP6GateReport
{
	GENERATED_BODY()

	/** Which gate sold the tickets. */
	UPROPERTY(BlueprintReadOnly, Category = "Gate")
	int32 Gate = 0;

	/** Tickets sold since that gate's last report. */
	UPROPERTY(BlueprintReadOnly, Category = "Gate")
	int32 Tickets = 0;
};

/** The arena's attendance board: gate counters on worker threads submit reports at any moment, and the game thread applies a few per tick. */
UCLASS()
class ADojoP6AttendanceBoard : public AActor
{
	GENERATED_BODY()

public:
	/** Creates the label and turns ticking on. */
	ADojoP6AttendanceBoard();

	/** Floating text that shows the attendance. */
	UPROPERTY(VisibleAnywhere, Category = "Attendance")
	TObjectPtr<UTextRenderComponent> Label;

	/** Gates into the arena. */
	UPROPERTY(EditAnywhere, Category = "Attendance", meta = (ClampMin = "1"))
	int32 GateCount = 4;

	/** The most reports the board applies in one tick; the rest wait. */
	UPROPERTY(EditAnywhere, Category = "Attendance", meta = (ClampMin = "1"))
	int32 ReportsPerTick = 4;

	/** Adds a report to the mailbox. Safe to call from any thread at the same time as other callers. */
	void SubmitReport(const FDojoP6GateReport& Report);

	/** On the game thread: applies waiting reports, oldest first, at most ReportsPerTick of them. Reports for gates that do not exist are dropped. */
	UFUNCTION(BlueprintCallable, Category = "Attendance")
	void ApplyReports();

	/** Sends ten reports per gate from worker threads, to try the board out. */
	UFUNCTION(BlueprintCallable, Category = "Attendance")
	void SimulateGates();

	/** Tickets counted across every gate. */
	UFUNCTION(BlueprintPure, Category = "Attendance")
	int32 GetAttendance() const;

	/** Tickets counted at one gate; 0 for a gate that does not exist. */
	UFUNCTION(BlueprintPure, Category = "Attendance")
	int32 GetGateTickets(int32 Gate) const;

	/** Reports taken out of the mailbox so far, including dropped ones. */
	UFUNCTION(BlueprintPure, Category = "Attendance")
	int32 GetReportsTaken() const;

	/** Applies this tick's share of the reports. */
	virtual void Tick(float DeltaSeconds) override;

protected:
	/** Sizes the per-gate counts and shows the starting attendance. */
	virtual void BeginPlay() override;

private:
	/** Writes the attendance into the label. */
	void RefreshLabel();

	/** Reports waiting for the game thread; many threads may add, only the game thread takes. */
	TQueue<FDojoP6GateReport, EQueueMode::Mpsc> Mailbox;

	/** Tickets per gate, touched only on the game thread. */
	TArray<int32> GateTickets;

	int32 Attendance = 0;
	int32 ReportsTaken = 0;
};
```

## DojoP6AttendanceBoard.cpp

```cpp
#include "DojoP6AttendanceBoard.h"

#include "Async/ParallelFor.h"
#include "Components/TextRenderComponent.h"

ADojoP6AttendanceBoard::ADojoP6AttendanceBoard()
{
	PrimaryActorTick.bCanEverTick = true;

	Label = CreateDefaultSubobject<UTextRenderComponent>(TEXT("Label"));
	RootComponent = Label;
	Label->SetHorizontalAlignment(EHTA_Center);
}

void ADojoP6AttendanceBoard::BeginPlay()
{
	Super::BeginPlay();

	GateTickets.Init(0, GateCount);
	RefreshLabel();
}

void ADojoP6AttendanceBoard::Tick(float DeltaSeconds)
{
	Super::Tick(DeltaSeconds);

	ApplyReports();
}

void ADojoP6AttendanceBoard::SubmitReport(const FDojoP6GateReport& Report)
{
}

void ADojoP6AttendanceBoard::ApplyReports()
{
}

void ADojoP6AttendanceBoard::SimulateGates()
{
	const int32 Gates = GateCount;

	// The gate counters run on worker threads; each only submits, and never touches the board's counts.
	ParallelFor(Gates * 10, [this, Gates](int32 Index)
	{
		FDojoP6GateReport Report;
		Report.Gate = Index % Gates;
		Report.Tickets = 1 + Index % 3;
		SubmitReport(Report);
	});
}

int32 ADojoP6AttendanceBoard::GetAttendance() const
{
	return Attendance;
}

int32 ADojoP6AttendanceBoard::GetGateTickets(int32 Gate) const
{
	return GateTickets.IsValidIndex(Gate) ? GateTickets[Gate] : 0;
}

int32 ADojoP6AttendanceBoard::GetReportsTaken() const
{
	return ReportsTaken;
}

void ADojoP6AttendanceBoard::RefreshLabel()
{
	Label->SetText(FText::FromString(FString::Printf(TEXT("Attendance: %d"), Attendance)));
}
```

# Tests

```cpp
#include "Misc/AutomationTest.h"

#if WITH_AUTOMATION_TESTS

#include "Async/ParallelFor.h"
#include "Components/TextRenderComponent.h"
#include "Quests/p6-gate-tallies/DojoP6AttendanceBoard.h"
#include "Support/DojoTestWorld.h"

namespace DojoP6GateTalliesTest
{
	/** Builds a report for one gate. */
	FDojoP6GateReport MakeReport(int32 Gate, int32 Tickets)
	{
		FDojoP6GateReport Report;
		Report.Gate = Gate;
		Report.Tickets = Tickets;
		return Report;
	}
}

IMPLEMENT_SIMPLE_AUTOMATION_TEST(FDojo_P6_GateTallies_AFewReportsPerTick, "Dojo.P6.GateTallies.AFewReportsPerTick", EAutomationTestFlags::EditorContext | EAutomationTestFlags::ProductFilter)

/** Ten waiting reports are applied four, four, then two, and an empty mailbox changes nothing. */
bool FDojo_P6_GateTallies_AFewReportsPerTick::RunTest(const FString& Parameters)
{
	using namespace DojoP6GateTalliesTest;

	FDojoTestWorld TestWorld;

	ADojoP6AttendanceBoard* Board = TestWorld.SpawnActor<ADojoP6AttendanceBoard>();
	if (!TestNotNull(TEXT("Board spawned"), Board) || !TestNotNull(TEXT("Board has a label"), Board->Label.Get())) return false;

	for (int32 Index = 0; Index < 10; ++Index) Board->SubmitReport(MakeReport(Index % 4, 2));

	TestEqual(TEXT("Submitting applies nothing yet"), Board->GetAttendance(), 0);

	Board->ApplyReports();
	TestEqual(TEXT("The first tick takes only ReportsPerTick reports"), Board->GetReportsTaken(), 4);
	TestEqual(TEXT("Four reports of two tickets"), Board->GetAttendance(), 8);

	Board->ApplyReports();
	TestEqual(TEXT("The second tick takes four more"), Board->GetReportsTaken(), 8);

	Board->ApplyReports();
	TestEqual(TEXT("The third tick takes the last two"), Board->GetReportsTaken(), 10);
	TestEqual(TEXT("Every ticket is counted"), Board->GetAttendance(), 20);
	TestEqual(TEXT("The label shows the attendance"), Board->Label->Text.ToString(), FString(TEXT("Attendance: 20")));

	Board->ApplyReports();
	TestEqual(TEXT("An empty mailbox changes nothing"), Board->GetReportsTaken(), 10);

	return true;
}

IMPLEMENT_SIMPLE_AUTOMATION_TEST(FDojo_P6_GateTallies_ReportsFromManyThreads, "Dojo.P6.GateTallies.ReportsFromManyThreads", EAutomationTestFlags::EditorContext | EAutomationTestFlags::ProductFilter)

/** Two hundred reports submitted from worker threads at once all arrive, never more than four per tick. */
bool FDojo_P6_GateTallies_ReportsFromManyThreads::RunTest(const FString& Parameters)
{
	using namespace DojoP6GateTalliesTest;

	FDojoTestWorld TestWorld;

	ADojoP6AttendanceBoard* Board = TestWorld.SpawnActor<ADojoP6AttendanceBoard>();
	if (!TestNotNull(TEXT("Board spawned"), Board)) return false;

	ParallelFor(200, [Board](int32 Index) { Board->SubmitReport(MakeReport(Index % 4, 1)); });

	int32 Ticks = 0;
	int32 Largest = 0;
	while (Board->GetReportsTaken() < 200 && Ticks < 100)
	{
		const int32 Before = Board->GetReportsTaken();
		Board->ApplyReports();
		Largest = FMath::Max(Largest, Board->GetReportsTaken() - Before);
		Ticks++;
	}

	TestEqual(TEXT("Every report arrived"), Board->GetReportsTaken(), 200);
	TestEqual(TEXT("Every ticket is counted"), Board->GetAttendance(), 200);
	TestEqual(TEXT("Each gate got its share"), Board->GetGateTickets(3), 50);
	TestTrue(TEXT("No tick took more than four reports"), Largest <= 4);
	TestEqual(TEXT("It took fifty ticks at four per tick"), Ticks, 50);

	return true;
}

IMPLEMENT_SIMPLE_AUTOMATION_TEST(FDojo_P6_GateTallies_UnknownGatesDropped, "Dojo.P6.GateTallies.UnknownGatesDropped", EAutomationTestFlags::EditorContext | EAutomationTestFlags::ProductFilter)

/** A report for a gate that does not exist is taken from the mailbox and dropped without counting tickets. */
bool FDojo_P6_GateTallies_UnknownGatesDropped::RunTest(const FString& Parameters)
{
	using namespace DojoP6GateTalliesTest;

	FDojoTestWorld TestWorld;

	ADojoP6AttendanceBoard* Board = TestWorld.SpawnActor<ADojoP6AttendanceBoard>();
	if (!TestNotNull(TEXT("Board spawned"), Board)) return false;

	Board->SubmitReport(MakeReport(9, 50));
	Board->SubmitReport(MakeReport(-1, 50));
	Board->SubmitReport(MakeReport(2, 5));
	Board->ApplyReports();

	TestEqual(TEXT("All three reports were taken"), Board->GetReportsTaken(), 3);
	TestEqual(TEXT("Only the real gate's tickets count"), Board->GetAttendance(), 5);
	TestEqual(TEXT("Gate 2 has its tickets"), Board->GetGateTickets(2), 5);

	return true;
}

#endif
```

# Hints

- The failing test submits ten reports and calls ApplyReports once. Count how many your version takes, and compare with the property the brief names.
- Stop taking reports when either the mailbox is empty or you have taken ReportsPerTick of them this call, whichever comes first; the rest stay in the queue in order for the next tick.
- `TQueue::Enqueue` and `TQueue::Dequeue` are in `Containers/Queue.h`; Dequeue returns false when nothing is waiting, which makes it a natural loop condition alongside a counter.

# Rubric

- SubmitReport only enqueues into the multi-producer queue; worker threads never touch the board's counts.
- ApplyReports takes reports oldest first and at most ReportsPerTick per call; the rest wait in order.
- Every report taken is counted, and reports for unknown gates are dropped without changing tickets.
- Reports carry their data by value, so nothing on the game thread reads worker-thread memory.
- The budget is an editable property, and applying happens in Tick on the game thread.
- The label shows the attendance after each call.

# Alternative

Each worker could instead schedule its report straight onto the game thread with `AsyncTask(ENamedThreads::GameThread, ...)`, which is the engine's own queue to the game thread and needs no member queue at all. That is less code for occasional results. The board's own mailbox wins when results come in bursts: it can cap how many are applied per frame, merge or reorder them before applying, and be inspected or drained in a test, none of which a pile of separately scheduled tasks allows.
