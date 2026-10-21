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

/** The arena's attendance board: gate counters on worker threads submit reports at any moment, and the game thread applies a few per tick (Event Queue: a thread-safe mailbox drained at a pace the board chooses). */
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
