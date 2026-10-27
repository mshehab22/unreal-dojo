#include "DojoP11Stands.h"

#include "Components/InstancedStaticMeshComponent.h"

ADojoP11Stands::ADojoP11Stands()
{
	PrimaryActorTick.bCanEverTick = false;

	Seats = CreateDefaultSubobject<UInstancedStaticMeshComponent>(TEXT("Seats"));
	RootComponent = Seats;
}

void ADojoP11Stands::BeginPlay()
{
	Super::BeginPlay();

	BuildSeats();
}

void ADojoP11Stands::BuildSeats()
{
	Seats->SetStaticMesh(SeatMesh);
	SeatIntact.Init(true, Rows * SeatsPerRow);
	RedrawSeats();
}

bool ADojoP11Stands::BreakSeat(int32 Seat)
{
	if (!IsSeatIntact(Seat)) return false;

	SeatIntact[Seat] = false;

	// Instances are only numbers in a list, and removing one renumbers the others, so redraw from the seats instead of removing by seat number.
	RedrawSeats();
	return true;
}

bool ADojoP11Stands::IsSeatIntact(int32 Seat) const
{
	return SeatIntact.IsValidIndex(Seat) && SeatIntact[Seat];
}

int32 ADojoP11Stands::GetIntactCount() const
{
	int32 Count = 0;
	for (const bool bIntact : SeatIntact) Count += bIntact ? 1 : 0;
	return Count;
}

FVector ADojoP11Stands::GetSeatLocation(int32 Seat) const
{
	const int32 Row = Seat / SeatsPerRow;
	const int32 Column = Seat % SeatsPerRow;
	return FVector(Row * RowDepth, Column * SeatSpacing, Row * RowRise);
}

void ADojoP11Stands::RedrawSeats()
{
	Seats->ClearInstances();

	for (int32 Seat = 0; Seat < SeatIntact.Num(); Seat++)
	{
		if (SeatIntact[Seat]) Seats->AddInstance(FTransform(GetSeatLocation(Seat)));
	}
}
