#include "DojoP4StrawFloor.h"

#include "Components/TextRenderComponent.h"
#include "DrawDebugHelpers.h"
#include "TimerManager.h"

ADojoP4StrawFloor::ADojoP4StrawFloor()
{
	PrimaryActorTick.bCanEverTick = true;

	Label = CreateDefaultSubobject<UTextRenderComponent>(TEXT("Label"));
	RootComponent = Label;
	Label->SetHorizontalAlignment(EHTA_Center);
}

void ADojoP4StrawFloor::BeginPlay()
{
	Super::BeginPlay();

	ResetGrid(Width, Height);
	GetWorldTimerManager().SetTimer(StepTimer, this, &ADojoP4StrawFloor::Step, StepSeconds, true);
}

void ADojoP4StrawFloor::Tick(float DeltaSeconds)
{
	Super::Tick(DeltaSeconds);

	for (int32 Index = 0; Index < Squares.Num(); ++Index)
	{
		if (Squares[Index] != EDojoP4StrawState::ESS_Burning) continue;

		const FVector Center = GetActorLocation() + FVector((Index % Width) * 100.f, (Index / Width) * 100.f, 0.f);
		DrawDebugSolidBox(GetWorld(), Center, FVector(45.f, 45.f, 5.f), FColor::Orange);
	}
}

void ADojoP4StrawFloor::ResetGrid(int32 NewWidth, int32 NewHeight)
{
	Width = FMath::Max(1, NewWidth);
	Height = FMath::Max(1, NewHeight);
	Squares.Init(EDojoP4StrawState::ESS_Straw, Width * Height);
	NextSquares.Init(EDojoP4StrawState::ESS_Straw, Width * Height);
	RefreshLabel();
}

void ADojoP4StrawFloor::Ignite(int32 X, int32 Y)
{
	if (X < 0 || X >= Width || Y < 0 || Y >= Height) return;

	EDojoP4StrawState& Square = Squares[Y * Width + X];
	if (Square == EDojoP4StrawState::ESS_Straw) Square = EDojoP4StrawState::ESS_Burning;

	RefreshLabel();
}

void ADojoP4StrawFloor::Step()
{
	NextSquares.SetNum(Squares.Num());

	for (int32 Visit = 0; Visit < Squares.Num(); ++Visit)
	{
		const int32 Index = bWalkBackward ? Squares.Num() - 1 - Visit : Visit;
		NextSquares[Index] = NextStateOf(Index);
	}

	Swap(Squares, NextSquares);

	RefreshLabel();
}

EDojoP4StrawState ADojoP4StrawFloor::NextStateOf(int32 Index) const
{
	const EDojoP4StrawState Current = Squares[Index];

	if (Current == EDojoP4StrawState::ESS_Burning) return EDojoP4StrawState::ESS_Ash;
	if (Current == EDojoP4StrawState::ESS_Ash) return EDojoP4StrawState::ESS_Ash;

	const int32 X = Index % Width;
	const int32 Y = Index / Width;
	const bool bNextToFire = IsBurningAt(X - 1, Y) || IsBurningAt(X + 1, Y) || IsBurningAt(X, Y - 1) || IsBurningAt(X, Y + 1);

	return bNextToFire ? EDojoP4StrawState::ESS_Burning : EDojoP4StrawState::ESS_Straw;
}

bool ADojoP4StrawFloor::IsBurningAt(int32 X, int32 Y) const
{
	return GetSquare(X, Y) == EDojoP4StrawState::ESS_Burning;
}

EDojoP4StrawState ADojoP4StrawFloor::GetSquare(int32 X, int32 Y) const
{
	if (X < 0 || X >= Width || Y < 0 || Y >= Height) return EDojoP4StrawState::ESS_Ash;

	return Squares[Y * Width + X];
}

int32 ADojoP4StrawFloor::CountBurning() const
{
	int32 Count = 0;
	for (const EDojoP4StrawState Square : Squares)
	{
		if (Square == EDojoP4StrawState::ESS_Burning) Count++;
	}
	return Count;
}

void ADojoP4StrawFloor::RefreshLabel()
{
	Label->SetText(FText::FromString(FString::Printf(TEXT("Burning: %d"), CountBurning())));
}
