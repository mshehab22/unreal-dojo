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
	Mailbox.Enqueue(Report);
}

void ADojoP6AttendanceBoard::ApplyReports()
{
	FDojoP6GateReport Report;

	for (int32 Taken = 0; Taken < ReportsPerTick && Mailbox.Dequeue(Report); ++Taken)
	{
		ReportsTaken++;

		if (!GateTickets.IsValidIndex(Report.Gate)) continue;

		GateTickets[Report.Gate] += Report.Tickets;
		Attendance += Report.Tickets;
	}

	RefreshLabel();
}

void ADojoP6AttendanceBoard::SimulateGates()
{
	const int32 Gates = GateCount;

	// ParallelFor runs these submissions on worker threads and on this thread, and returns once all are queued; each only submits, and never touches the board's counts.
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
