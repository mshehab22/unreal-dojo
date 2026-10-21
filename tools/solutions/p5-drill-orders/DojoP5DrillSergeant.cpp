#include "DojoP5DrillSergeant.h"

#include "Components/TextRenderComponent.h"
#include "DojoP5DrillDummy.h"
#include "TimerManager.h"

bool FDojoP5DrillOrder::CarryOut() const
{
	ADojoP5DrillDummy* Target = Dummy.Get();
	if (!IsValid(Target)) return false;

	switch (Move)
	{
	case EDojoP5DrillMove::EDM_StepLeft:
		Target->Step(-1);
		break;
	case EDojoP5DrillMove::EDM_StepRight:
		Target->Step(1);
		break;
	case EDojoP5DrillMove::EDM_Block:
		Target->Block();
		break;
	}

	return true;
}

ADojoP5DrillSergeant::ADojoP5DrillSergeant()
{
	PrimaryActorTick.bCanEverTick = false;

	Label = CreateDefaultSubobject<UTextRenderComponent>(TEXT("Label"));
	RootComponent = Label;
	Label->SetHorizontalAlignment(EHTA_Center);
}

void ADojoP5DrillSergeant::BeginPlay()
{
	Super::BeginPlay();

	RefreshLabel();
	GetWorldTimerManager().SetTimer(BeatTimer, this, &ADojoP5DrillSergeant::Beat, BeatSeconds, true);
}

void ADojoP5DrillSergeant::Order(ADojoP5DrillDummy* Dummy, EDojoP5DrillMove Move)
{
	if (!IsValid(Dummy)) return;

	FDojoP5DrillOrder NewOrder;
	NewOrder.Dummy = Dummy;
	NewOrder.Move = Move;
	Queue.Add(NewOrder);

	RefreshLabel();
}

void ADojoP5DrillSergeant::QueueRoutine()
{
	Order(FloorDummy, EDojoP5DrillMove::EDM_StepLeft);
	Order(FloorDummy, EDojoP5DrillMove::EDM_Block);
	Order(FloorDummy, EDojoP5DrillMove::EDM_StepRight);
	Order(FloorDummy, EDojoP5DrillMove::EDM_StepRight);
	Order(FloorDummy, EDojoP5DrillMove::EDM_Block);
}

void ADojoP5DrillSergeant::Beat()
{
	while (Queue.Num() > 0)
	{
		const FDojoP5DrillOrder Next = Queue[0];
		Queue.RemoveAt(0);

		if (Next.CarryOut())
		{
			OrdersCarriedOut++;
			break;
		}
	}

	RefreshLabel();
}

int32 ADojoP5DrillSergeant::GetOrdersWaiting() const
{
	return Queue.Num();
}

int32 ADojoP5DrillSergeant::GetOrdersCarriedOut() const
{
	return OrdersCarriedOut;
}

void ADojoP5DrillSergeant::RefreshLabel()
{
	Label->SetText(FText::FromString(FString::Printf(TEXT("Orders waiting: %d"), Queue.Num())));
}
