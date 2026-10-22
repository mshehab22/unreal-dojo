#include "DojoP6ArenaHerald.h"

#include "Components/TextRenderComponent.h"

ADojoP6ArenaHerald::ADojoP6ArenaHerald()
{
	PrimaryActorTick.bCanEverTick = true;
	PrimaryActorTick.TickGroup = TG_PostUpdateWork;

	Label = CreateDefaultSubobject<UTextRenderComponent>(TEXT("Label"));
	RootComponent = Label;
	Label->SetHorizontalAlignment(EHTA_Center);
}

void ADojoP6ArenaHerald::Tick(float DeltaSeconds)
{
	Super::Tick(DeltaSeconds);

	Announce();
}

void ADojoP6ArenaHerald::Post(const FDojoP6KnockoutEvent& Event)
{
	Mailbox.Add(Event);
}

void ADojoP6ArenaHerald::Announce()
{
	// Take the whole mailbox first, so a listener that posts while hearing an announcement adds to the next batch, not this one.
	TArray<FDojoP6KnockoutEvent> Batch = MoveTemp(Mailbox);
	Mailbox.Reset();

	for (const FDojoP6KnockoutEvent& Event : Batch)
	{
		const FString Line = Event.WinnerName.IsNone() ? FString::Printf(TEXT("%s is out"), *Event.FallenName.ToString()) : FString::Printf(TEXT("%s knocked out %s"), *Event.WinnerName.ToString(), *Event.FallenName.ToString());
		Label->SetText(FText::FromString(Line));

		OnKnockoutAnnounced.Broadcast(Event);
	}
}

int32 ADojoP6ArenaHerald::GetWaitingCount() const
{
	return Mailbox.Num();
}
