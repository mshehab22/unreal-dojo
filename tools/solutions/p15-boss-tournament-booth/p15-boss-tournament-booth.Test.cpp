#include "Misc/AutomationTest.h"

#if WITH_AUTOMATION_TESTS

#include "Components/TextRenderComponent.h"
#include "Engine/World.h"
#include "Quests/p15-announcer-desk/DojoP15AnnouncerDesk.h"
#include "Quests/p15-announcer-desk/DojoP15NullAnnouncer.h"
#include "Quests/p15-announcer-desk/DojoP15RecordingAnnouncer.h"
#include "Quests/p15-boss-tournament-booth/DojoP15MemoryScoreboard.h"
#include "Quests/p15-boss-tournament-booth/DojoP15NullScoreboard.h"
#include "Quests/p15-boss-tournament-booth/DojoP15ScoreboardDesk.h"
#include "Quests/p15-boss-tournament-booth/DojoP15TournamentDirector.h"
#include "Quests/p15-crier-trace/DojoP15TracingAnnouncer.h"
#include "Support/DojoTestWorld.h"
#include "UObject/Package.h"

namespace DojoP15BoothTest
{
	/** Spawns the director with the provider classes set before its BeginPlay, which provides them and starts round 1. */
	ADojoP15TournamentDirector* SpawnDirector(FDojoTestWorld& TestWorld, TSubclassOf<UObject> AnnouncerClass, TSubclassOf<UObject> ScoreboardClass)
	{
		ADojoP15TournamentDirector* Director = TestWorld.GetWorld()->SpawnActorDeferred<ADojoP15TournamentDirector>(ADojoP15TournamentDirector::StaticClass(), FTransform::Identity);
		Director->AnnouncerClass = AnnouncerClass;
		Director->ScoreboardClass = ScoreboardClass;
		Director->FinishSpawning(FTransform::Identity);
		return Director;
	}

	/** The announcer desk of the test world. */
	UDojoP15AnnouncerDesk* AnnouncerDeskOf(FDojoTestWorld& TestWorld)
	{
		return UDojoP15AnnouncerDesk::Locate(TestWorld.GetWorld());
	}

	/** The scoreboard desk of the test world. */
	UDojoP15ScoreboardDesk* ScoreboardDeskOf(FDojoTestWorld& TestWorld)
	{
		return UDojoP15ScoreboardDesk::Locate(TestWorld.GetWorld());
	}

	/** Ticks until the world's time reaches Seconds. */
	void TickUntil(FDojoTestWorld& TestWorld, float Seconds)
	{
		while (TestWorld.GetWorld()->GetTimeSeconds() < Seconds) TestWorld.Tick(1);
	}

	/** Presses H at each offset in Offsets, counted from Start. */
	void PressHitsAt(FDojoTestWorld& TestWorld, ADojoP15TournamentDirector* Director, float Start, const TArray<float>& Offsets)
	{
		for (const float Offset : Offsets)
		{
			TickUntil(TestWorld, Start + Offset);
			Director->PressHit();
		}
	}

	/** The lines a round announces: its start, each hit in time order (the rival hits every 4 seconds), then Time and the result. */
	TArray<FString> ExpectedLines(int32 Round, const TArray<float>& PlayerOffsets, int32 RivalHitCount, const FString& Result)
	{
		TArray<TPair<float, FString>> Events;
		for (int32 Index = 0; Index < PlayerOffsets.Num(); Index++) Events.Add(TPair<float, FString>(PlayerOffsets[Index], FString::Printf(TEXT("Ayla hits (%d)"), Index + 1)));
		for (int32 Index = 0; Index < RivalHitCount; Index++) Events.Add(TPair<float, FString>(4.f * (Index + 1), FString::Printf(TEXT("Brom hits (%d)"), Index + 1)));
		Events.Sort([](const TPair<float, FString>& A, const TPair<float, FString>& B) { return A.Key < B.Key; });

		TArray<FString> Lines;
		Lines.Add(FString::Printf(TEXT("Round %d begins"), Round));
		for (const TPair<float, FString>& Event : Events) Lines.Add(Event.Value);
		Lines.Add(TEXT("Time"));
		Lines.Add(Result);
		return Lines;
	}

	/** The player's hit times, each far from the rival's hits at 4, 8, 12, and so on. */
	const TArray<float> TenHits = { 1.f, 2.f, 3.f, 5.f, 6.f, 7.f, 9.f, 10.f, 11.f, 13.f };
	const TArray<float> FiveHits = { 1.f, 2.f, 3.f, 5.f, 6.f };
	const TArray<float> SevenHits = { 1.f, 2.f, 3.f, 5.f, 6.f, 7.f, 9.f };
}

IMPLEMENT_SIMPLE_AUTOMATION_TEST(FDojo_P15_TournamentBooth_TwoRoundsThroughTheDesks, "Dojo.P15.TournamentBooth.TwoRoundsThroughTheDesks", EAutomationTestFlags::EditorContext | EAutomationTestFlags::ProductFilter)

/** Plays two rounds; every line and point goes to whatever is provided at that moment, and a provider swapped between rounds takes over completely. */
bool FDojo_P15_TournamentBooth_TwoRoundsThroughTheDesks::RunTest(const FString& Parameters)
{
	using namespace DojoP15BoothTest;

	FDojoTestWorld TestWorld;

	ADojoP15TournamentDirector* Director = SpawnDirector(TestWorld, UDojoP15RecordingAnnouncer::StaticClass(), UDojoP15MemoryScoreboard::StaticClass());
	if (!TestNotNull(TEXT("Director spawned"), Director)) return false;

	UDojoP15AnnouncerDesk* Announcers = AnnouncerDeskOf(TestWorld);
	UDojoP15ScoreboardDesk* Scoreboards = ScoreboardDeskOf(TestWorld);
	if (!TestNotNull(TEXT("Announcer desk found"), Announcers) || !TestNotNull(TEXT("Scoreboard desk found"), Scoreboards)) return false;

	const UDojoP15RecordingAnnouncer* RoundOneRecord = Cast<UDojoP15RecordingAnnouncer>(Announcers->GetProvider());
	if (!TestNotNull(TEXT("The director provided a recording announcer"), RoundOneRecord)) return false;
	TestTrue(TEXT("And a memory scoreboard"), Cast<UDojoP15MemoryScoreboard>(Scoreboards->GetProvider()) != nullptr);

	TestTrue(TEXT("Round 1 is running"), Director->IsRunning());
	TestEqual(TEXT("It is round 1"), Director->GetRoundNumber(), 1);

	const float RoundOneStart = TestWorld.GetWorld()->GetTimeSeconds();
	PressHitsAt(TestWorld, Director, RoundOneStart, TenHits);
	TestEqual(TEXT("Ten player hits by second 13"), Director->GetPlayerHits(), 10);
	TickUntil(TestWorld, RoundOneStart + 30.5f);

	TestFalse(TEXT("Round 1 is over at 30 seconds"), Director->IsRunning());
	TestEqual(TEXT("Ten hits to seven"), Director->GetPlayerHits(), 10);
	TestEqual(TEXT("The rival hit seven times"), Director->GetRivalHits(), 7);
	TestTrue(TEXT("Every line was announced, in time order"), RoundOneRecord->GetLines() == ExpectedLines(1, TenHits, 7, TEXT("Winner: Ayla")));
	TestEqual(TEXT("The winner got 3 points"), Scoreboards->GetPoints(TEXT("Ayla")), 3);
	TestEqual(TEXT("The loser got none"), Scoreboards->GetPoints(TEXT("Brom")), 0);
	TestTrue(TEXT("The label shows the result and the points"), Director->Label->Text.ToString().Contains(TEXT("Winner: Ayla")) && Director->Label->Text.ToString().Contains(TEXT("Points Ayla 3")));

	const int32 RoundOneLineCount = RoundOneRecord->GetLines().Num();
	Director->PressHit();
	TestEqual(TEXT("A hit between rounds changes nothing"), Director->GetPlayerHits(), 10);
	TestEqual(TEXT("And announces nothing"), RoundOneRecord->GetLines().Num(), RoundOneLineCount);

	UDojoP15RecordingAnnouncer* RoundTwoRecord = NewObject<UDojoP15RecordingAnnouncer>(GetTransientPackage());
	TestTrue(TEXT("A new announcer is provided between rounds"), Announcers->Provide(RoundTwoRecord));

	Director->PressNextRound();
	TestTrue(TEXT("Round 2 is running"), Director->IsRunning());
	TestEqual(TEXT("It is round 2"), Director->GetRoundNumber(), 2);
	TestEqual(TEXT("The hits start again at 0"), Director->GetPlayerHits() + Director->GetRivalHits(), 0);

	const float RoundTwoStart = TestWorld.GetWorld()->GetTimeSeconds();
	PressHitsAt(TestWorld, Director, RoundTwoStart, FiveHits);
	TickUntil(TestWorld, RoundTwoStart + 30.5f);

	TestFalse(TEXT("Round 2 is over"), Director->IsRunning());
	TestTrue(TEXT("Round 2's lines all went to the new announcer"), RoundTwoRecord->GetLines() == ExpectedLines(2, FiveHits, 7, TEXT("Winner: Brom")));
	TestEqual(TEXT("The old announcer heard nothing more"), RoundOneRecord->GetLines().Num(), RoundOneLineCount);
	TestEqual(TEXT("The totals carry over: Ayla"), Scoreboards->GetPoints(TEXT("Ayla")), 3);
	TestEqual(TEXT("And Brom won round 2"), Scoreboards->GetPoints(TEXT("Brom")), 3);

	return true;
}

IMPLEMENT_SIMPLE_AUTOMATION_TEST(FDojo_P15_TournamentBooth_TracingWrapsAndRestores, "Dojo.P15.TournamentBooth.TracingWrapsAndRestores", EAutomationTestFlags::EditorContext | EAutomationTestFlags::ProductFilter)

/** T slips a tracer in front of the announcer in place and T again puts the same announcer back; lines reach the announcer either way. */
bool FDojo_P15_TournamentBooth_TracingWrapsAndRestores::RunTest(const FString& Parameters)
{
	using namespace DojoP15BoothTest;

	FDojoTestWorld TestWorld;

	ADojoP15TournamentDirector* Director = SpawnDirector(TestWorld, UDojoP15RecordingAnnouncer::StaticClass(), UDojoP15MemoryScoreboard::StaticClass());
	if (!TestNotNull(TEXT("Director spawned"), Director)) return false;

	UDojoP15AnnouncerDesk* Announcers = AnnouncerDeskOf(TestWorld);
	if (!TestNotNull(TEXT("Announcer desk found"), Announcers)) return false;

	UObject* Original = Announcers->GetProvider();
	const UDojoP15RecordingAnnouncer* Record = Cast<UDojoP15RecordingAnnouncer>(Original);
	if (!TestNotNull(TEXT("A recording announcer is in place"), Record)) return false;

	const float Start = TestWorld.GetWorld()->GetTimeSeconds();
	TestFalse(TEXT("Not tracing yet"), Director->IsTracing());

	TickUntil(TestWorld, Start + 2.f);
	Director->PressTrace();
	TestTrue(TEXT("Tracing is on"), Director->IsTracing());
	TestTrue(TEXT("The tracer is the announcer in place"), Announcers->GetProvider() == Director->GetTracer());
	TestTrue(TEXT("It wraps the announcer that was in place"), Director->GetTracer() != nullptr && Director->GetTracer()->GetWrapped() == Original);

	const UDojoP15TracingAnnouncer* FirstTracer = Director->GetTracer();
	TickUntil(TestWorld, Start + 3.f);
	Director->PressHit();
	TickUntil(TestWorld, Start + 4.5f);
	TestEqual(TEXT("The tracer saw the player's hit and the rival's hit"), FirstTracer->GetForwardedCount(), 2);

	TickUntil(TestWorld, Start + 5.f);
	Director->PressTrace();
	TestFalse(TEXT("Tracing is off"), Director->IsTracing());
	TestTrue(TEXT("The very same announcer is back"), Announcers->GetProvider() == Original);

	Director->PressHit();
	TestEqual(TEXT("The tracer saw nothing more"), FirstTracer->GetForwardedCount(), 2);
	TestEqual(TEXT("Every line reached the announcer: begins, two player hits, one rival hit"), Record->GetLines().Num(), 4);

	return true;
}

IMPLEMENT_SIMPLE_AUTOMATION_TEST(FDojo_P15_TournamentBooth_NothingProvidedStillPlays, "Dojo.P15.TournamentBooth.NothingProvidedStillPlays", EAutomationTestFlags::EditorContext | EAutomationTestFlags::ProductFilter)

/** With nothing provided the do-nothing services take every line and point, and the round plays exactly the same. */
bool FDojo_P15_TournamentBooth_NothingProvidedStillPlays::RunTest(const FString& Parameters)
{
	using namespace DojoP15BoothTest;

	FDojoTestWorld TestWorld;

	ADojoP15TournamentDirector* Director = SpawnDirector(TestWorld, nullptr, nullptr);
	if (!TestNotNull(TEXT("Director spawned"), Director)) return false;

	UDojoP15AnnouncerDesk* Announcers = AnnouncerDeskOf(TestWorld);
	UDojoP15ScoreboardDesk* Scoreboards = ScoreboardDeskOf(TestWorld);
	if (!TestNotNull(TEXT("Announcer desk found"), Announcers) || !TestNotNull(TEXT("Scoreboard desk found"), Scoreboards)) return false;

	TestTrue(TEXT("The do-nothing announcer is in place"), Announcers->GetProvider() == Announcers->GetNullAnnouncer());
	TestTrue(TEXT("The do-nothing scoreboard is in place"), Scoreboards->GetProvider() == Scoreboards->GetNullScoreboard());

	const float Start = TestWorld.GetWorld()->GetTimeSeconds();
	PressHitsAt(TestWorld, Director, Start, { 1.f, 2.f, 3.f });
	TickUntil(TestWorld, Start + 30.5f);

	TestFalse(TEXT("The round still ended"), Director->IsRunning());
	TestEqual(TEXT("Three player hits"), Director->GetPlayerHits(), 3);
	TestEqual(TEXT("Seven rival hits"), Director->GetRivalHits(), 7);
	TestEqual(TEXT("The announcer absorbed begins, ten hits, Time, and the result"), Announcers->GetNullAnnouncer()->GetAbsorbedCount(), 13);
	TestEqual(TEXT("The scoreboard absorbed the one result"), Scoreboards->GetNullScoreboard()->GetAbsorbedCount(), 1);
	TestEqual(TEXT("And keeps no points"), Scoreboards->GetPoints(TEXT("Brom")), 0);

	Director->PressNextRound();
	TestEqual(TEXT("The next round starts as usual"), Director->GetRoundNumber(), 2);

	return true;
}

IMPLEMENT_SIMPLE_AUTOMATION_TEST(FDojo_P15_TournamentBooth_DrawsAndRestartRules, "Dojo.P15.TournamentBooth.DrawsAndRestartRules", EAutomationTestFlags::EditorContext | EAutomationTestFlags::ProductFilter)

/** A tied round gives each fighter 1 point, R is ignored while a round runs, and a new round clears the hits. */
bool FDojo_P15_TournamentBooth_DrawsAndRestartRules::RunTest(const FString& Parameters)
{
	using namespace DojoP15BoothTest;

	FDojoTestWorld TestWorld;

	ADojoP15TournamentDirector* Director = SpawnDirector(TestWorld, UDojoP15RecordingAnnouncer::StaticClass(), UDojoP15MemoryScoreboard::StaticClass());
	if (!TestNotNull(TEXT("Director spawned"), Director)) return false;

	UDojoP15AnnouncerDesk* Announcers = AnnouncerDeskOf(TestWorld);
	UDojoP15ScoreboardDesk* Scoreboards = ScoreboardDeskOf(TestWorld);
	if (!TestNotNull(TEXT("Announcer desk found"), Announcers) || !TestNotNull(TEXT("Scoreboard desk found"), Scoreboards)) return false;

	const UDojoP15RecordingAnnouncer* Record = Cast<UDojoP15RecordingAnnouncer>(Announcers->GetProvider());
	if (!TestNotNull(TEXT("A recording announcer is in place"), Record)) return false;

	const float Start = TestWorld.GetWorld()->GetTimeSeconds();
	PressHitsAt(TestWorld, Director, Start, SevenHits);

	Director->PressNextRound();
	TestEqual(TEXT("R is ignored while a round runs"), Director->GetRoundNumber(), 1);
	TestEqual(TEXT("And the hits stay"), Director->GetPlayerHits(), 7);

	TickUntil(TestWorld, Start + 30.5f);
	TestFalse(TEXT("The round is over"), Director->IsRunning());
	TestEqual(TEXT("Seven hits each"), Director->GetPlayerHits(), Director->GetRivalHits());
	TestEqual(TEXT("A draw gives Ayla one point"), Scoreboards->GetPoints(TEXT("Ayla")), 1);
	TestEqual(TEXT("And Brom one point"), Scoreboards->GetPoints(TEXT("Brom")), 1);
	TestTrue(TEXT("The round ended with the draw"), Record->GetLines().Num() > 0 && Record->GetLines().Last() == TEXT("Draw"));

	Director->PressNextRound();
	TestTrue(TEXT("R starts round 2 once round 1 is over"), Director->IsRunning() && Director->GetRoundNumber() == 2);
	TestEqual(TEXT("Round 2 starts with no hits for the player"), Director->GetPlayerHits(), 0);
	TestEqual(TEXT("Or for the rival"), Director->GetRivalHits(), 0);

	return true;
}

IMPLEMENT_SIMPLE_AUTOMATION_TEST(FDojo_P15_TournamentBooth_SwappedScoreboardTakesOver, "Dojo.P15.TournamentBooth.SwappedScoreboardTakesOver", EAutomationTestFlags::EditorContext | EAutomationTestFlags::ProductFilter)

/** A scoreboard provided between rounds receives the next round's points, and the old scoreboard keeps what it had. */
bool FDojo_P15_TournamentBooth_SwappedScoreboardTakesOver::RunTest(const FString& Parameters)
{
	using namespace DojoP15BoothTest;

	FDojoTestWorld TestWorld;

	ADojoP15TournamentDirector* Director = SpawnDirector(TestWorld, UDojoP15RecordingAnnouncer::StaticClass(), UDojoP15MemoryScoreboard::StaticClass());
	if (!TestNotNull(TEXT("Director spawned"), Director)) return false;

	UDojoP15ScoreboardDesk* Scoreboards = ScoreboardDeskOf(TestWorld);
	if (!TestNotNull(TEXT("Scoreboard desk found"), Scoreboards)) return false;

	const UDojoP15MemoryScoreboard* First = Cast<UDojoP15MemoryScoreboard>(Scoreboards->GetProvider());
	if (!TestNotNull(TEXT("A memory scoreboard is in place"), First)) return false;

	const float RoundOneStart = TestWorld.GetWorld()->GetTimeSeconds();
	PressHitsAt(TestWorld, Director, RoundOneStart, TenHits);
	TickUntil(TestWorld, RoundOneStart + 30.5f);
	TestEqual(TEXT("Ayla won round 1 on the first scoreboard"), First->GetPoints(TEXT("Ayla")), 3);

	UDojoP15MemoryScoreboard* Second = NewObject<UDojoP15MemoryScoreboard>(GetTransientPackage());
	TestTrue(TEXT("A new scoreboard is provided between rounds"), Scoreboards->Provide(Second));

	Director->PressNextRound();
	const float RoundTwoStart = TestWorld.GetWorld()->GetTimeSeconds();
	PressHitsAt(TestWorld, Director, RoundTwoStart, FiveHits);
	TickUntil(TestWorld, RoundTwoStart + 30.5f);

	TestEqual(TEXT("Brom's round 2 win went to the new scoreboard"), Second->GetPoints(TEXT("Brom")), 3);
	TestEqual(TEXT("The new scoreboard has nothing for Ayla"), Second->GetPoints(TEXT("Ayla")), 0);
	TestEqual(TEXT("The first scoreboard kept Ayla's points"), First->GetPoints(TEXT("Ayla")), 3);
	TestEqual(TEXT("And got nothing for Brom"), First->GetPoints(TEXT("Brom")), 0);
	TestTrue(TEXT("The label reads the scoreboard now in place"), Director->Label->Text.ToString().Contains(TEXT("Points Ayla 0")));

	return true;
}

#endif
