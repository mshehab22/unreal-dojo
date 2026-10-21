#include "DojoF3Announcer.h"

#include "Components/TextRenderComponent.h"
#include "Dojo.h"

#define LOCTEXT_NAMESPACE "DojoF3Announcer"

ADojoF3Announcer::ADojoF3Announcer()
{
	PrimaryActorTick.bCanEverTick = false;

	Label = CreateDefaultSubobject<UTextRenderComponent>(TEXT("Label"));
	RootComponent = Label;
	Label->SetHorizontalAlignment(EHTA_Center);

	TurnFormat = LOCTEXT("TurnFormat", "{Player} scored {Score} (best {Best})");
	LeaderFormat = LOCTEXT("LeaderFormat", "{Player} leads with {Score}");
	NoScoresText = LOCTEXT("NoScores", "No scores yet");
}

FText ADojoF3Announcer::AnnounceTurn(FName Player, int32 Score, int32 Best)
{
	FFormatNamedArguments Arguments;
	Arguments.Add(TEXT("Player"), FText::FromName(Player));
	Arguments.Add(TEXT("Score"), FText::AsNumber(Score));
	Arguments.Add(TEXT("Best"), FText::AsNumber(Best));

	const FText Text = FText::Format(TurnFormat, Arguments);
	Show(Text);
	return Text;
}

FText ADojoF3Announcer::AnnounceLeader(FName Player, int32 Score)
{
	if (Player.IsNone())
	{
		Show(NoScoresText);
		return NoScoresText;
	}

	FFormatNamedArguments Arguments;
	Arguments.Add(TEXT("Player"), FText::FromName(Player));
	Arguments.Add(TEXT("Score"), FText::AsNumber(Score));

	const FText Text = FText::Format(LeaderFormat, Arguments);
	Show(Text);
	return Text;
}

void ADojoF3Announcer::Show(const FText& Text)
{
	Label->SetText(Text);
	UE_LOG(LogDojo, Log, TEXT("%s"), *Text.ToString());
}

#undef LOCTEXT_NAMESPACE
