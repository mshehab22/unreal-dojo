#include "Misc/AutomationTest.h"

#if WITH_AUTOMATION_TESTS

#include "Components/TextRenderComponent.h"
#include "Internationalization/Internationalization.h"
#include "Quests/f1-popup-target/DojoF1PopupTarget.h"
#include "Quests/f2-target-rack/DojoF2TargetRack.h"
#include "Quests/f3-announcer/DojoF3Announcer.h"
#include "Quests/f3-boss-league-night/DojoF3LeagueDirector.h"
#include "Quests/f3-roster/DojoF3Roster.h"
#include "Quests/f3-score-board/DojoF3ScoreBoard.h"
#include "Quests/f3-sentry/DojoF3Sentry.h"
#include "Support/DojoTestWorld.h"

namespace DojoF3LeagueTest
{
	/** Every piece of a league night, wired the way a designer would. */
	struct FLeague
	{
		ADojoF2TargetRack* Rack = nullptr;
		ADojoF3Sentry* Sentry = nullptr;
		ADojoF3ScoreBoard* Board = nullptr;
		ADojoF3Roster* Roster = nullptr;
		ADojoF3Announcer* Announcer = nullptr;
		ADojoF3LeagueDirector* Director = nullptr;
	};

	/** Spawns the pieces, then the director deferred so its wiring is in place before BeginPlay starts the league. */
	FLeague SpawnLeague(FDojoTestWorld& TestWorld)
	{
		FLeague League;
		League.Rack = TestWorld.SpawnActor<ADojoF2TargetRack>();
		League.Sentry = TestWorld.SpawnActor<ADojoF3Sentry>();
		League.Board = TestWorld.SpawnActor<ADojoF3ScoreBoard>();
		League.Roster = TestWorld.SpawnActor<ADojoF3Roster>();
		League.Announcer = TestWorld.SpawnActor<ADojoF3Announcer>();

		League.Director = TestWorld.GetWorld()->SpawnActorDeferred<ADojoF3LeagueDirector>(ADojoF3LeagueDirector::StaticClass(), FTransform::Identity);
		League.Director->Rack = League.Rack;
		League.Director->Sentry = League.Sentry;
		League.Director->Board = League.Board;
		League.Director->Roster = League.Roster;
		League.Director->Announcer = League.Announcer;
		League.Director->FinishSpawning(FTransform::Identity);

		return League;
	}

	/** Ticks until the director's turn state matches bRunning, at most Seconds of game time. */
	void TickUntilTurn(FDojoTestWorld& TestWorld, const FLeague& League, bool bRunning, float Seconds)
	{
		for (int32 Frame = 0; Frame < FMath::CeilToInt(Seconds * 60.f) && League.Director->IsTurnRunning() != bRunning; ++Frame) TestWorld.Tick(1);
	}
}

IMPLEMENT_SIMPLE_AUTOMATION_TEST(FDojo_F3_LeagueNight_TwoLeaguesPlayAlike, "Dojo.F3.LeagueNight.TwoLeaguesPlayAlike", EAutomationTestFlags::EditorContext | EAutomationTestFlags::ProductFilter)

/** Plays two whole leagues where every player shoots perfectly, and checks every turn scores the same, the board, the roster, the leader, and the reset. */
bool FDojo_F3_LeagueNight_TwoLeaguesPlayAlike::RunTest(const FString& Parameters)
{
	using namespace DojoF3LeagueTest;

	FInternationalization::FCultureStateSnapshot Snapshot;
	FInternationalization::Get().BackupCultureState(Snapshot);
	FInternationalization::Get().SetCurrentCulture(TEXT("en"));

	FDojoTestWorld TestWorld;
	FLeague League = SpawnLeague(TestWorld);
	ADojoF3LeagueDirector* Director = League.Director;

	for (int32 Round = 1; Round <= 2; ++Round)
	{
		const FString Prefix = FString::Printf(TEXT("League %d: "), Round);

		TestTrue(Prefix + TEXT("running"), Director->IsLeagueRunning());
		TestEqual(Prefix + TEXT("the board starts empty"), League.Board->GetCount(), 0);
		TestEqual(Prefix + TEXT("the roster starts empty"), League.Roster->GetPlayerCount(), 0);

		TArray<int32> TurnScores;
		TArray<FName> TurnPlayers;
		int32 MostLent = 0;
		for (int32 Frame = 0; Frame < 60 * 140 && Director->IsLeagueRunning(); ++Frame)
		{
			const bool bWasRunning = Director->IsTurnRunning();

			// A perfect shooter: two shots the moment anything is aimable.
			Director->ShootAimed();
			Director->ShootAimed();
			MostLent = FMath::Max(MostLent, Director->CountLent());

			TestWorld.Tick(1);

			if (bWasRunning && !Director->IsTurnRunning())
			{
				TurnScores.Add(Director->GetTurnScore());
				TurnPlayers.Add(Director->GetCurrentPlayer());
				TestEqual(Prefix + TEXT("every target is back in the rack after a turn"), League.Rack->GetAvailableCount(), 3);
			}
		}

		TestFalse(Prefix + TEXT("the league ends after six turns and the last break"), Director->IsLeagueRunning());
		TestEqual(Prefix + TEXT("six turns played"), TurnScores.Num(), 6);
		const TArray<FName> Order = Director->Players;
		TestTrue(Prefix + TEXT("players take turns in the listed order"), TurnPlayers == TArray<FName>({ Order[0], Order[1], Order[2], Order[0], Order[1], Order[2] }));
		TestTrue(Prefix + TEXT("at most one target is out at a time for a perfect shooter"), MostLent <= 1);

		// Lends at 0, 2, 4, ... 14 seconds of a 15 second turn: 8 targets, each broken with 2 hits of 10.
		const int32 PerfectTurn = TurnScores.Num() > 0 ? TurnScores[0] : 0;
		TestEqual(Prefix + TEXT("a perfect turn scores 8 targets at 20"), PerfectTurn, 160);
		bool bAllSame = true;
		for (const int32 Score : TurnScores) bAllSame &= Score == PerfectTurn;
		TestTrue(Prefix + TEXT("every perfect turn scores the same"), bAllSame);

		TestEqual(Prefix + TEXT("the board keeps the last five turns"), League.Board->GetCount(), 5);
		TestEqual(Prefix + TEXT("the board's best is a perfect turn"), League.Board->GetBest(), PerfectTurn);
		TestEqual(Prefix + TEXT("three players on the roster"), League.Roster->GetPlayerCount(), 3);
		TestEqual(Prefix + TEXT("everyone tied, so Ana, who sorts first, leads in any turn order"), League.Roster->GetLeader(), FName(TEXT("Ana")));
		TestEqual(Prefix + TEXT("the announcer names the leader"), League.Announcer->Label->Text.ToString(), FString::Printf(TEXT("Ana leads with %d"), PerfectTurn));

		const int32 BoardCount = League.Board->GetCount();
		Director->ShootAimed();
		TestEqual(Prefix + TEXT("Space between leagues does nothing"), League.Board->GetCount(), BoardCount);

		// League 2 lists the players in reverse, so Cy joins the roster first and only the alphabetical tie rule makes Ana lead.
		Director->Players = { TEXT("Cy"), TEXT("Bo"), TEXT("Ana") };
		Director->RestartLeague();
	}

	FInternationalization::Get().RestoreCultureState(Snapshot);
	return true;
}

IMPLEMENT_SIMPLE_AUTOMATION_TEST(FDojo_F3_LeagueNight_TurnsBreaksAndRecalls, "Dojo.F3.LeagueNight.TurnsBreaksAndRecalls", EAutomationTestFlags::EditorContext | EAutomationTestFlags::ProductFilter)

/** Plays unevenly and checks the turn announcement, keys during a break, recalls after 4 seconds, the leader by best turn, and R only between leagues. */
bool FDojo_F3_LeagueNight_TurnsBreaksAndRecalls::RunTest(const FString& Parameters)
{
	using namespace DojoF3LeagueTest;

	FDojoTestWorld TestWorld;
	FLeague League = SpawnLeague(TestWorld);
	ADojoF3LeagueDirector* Director = League.Director;

	TestEqual(TEXT("Ana goes first"), Director->GetCurrentPlayer(), FName(TEXT("Ana")));

	// Ana breaks exactly one target.
	TickUntilTurn(TestWorld, League, true, 1.f);
	for (int32 Frame = 0; Frame < 60 && Director->CountLent() == 0; ++Frame) TestWorld.Tick(1);
	Director->ShootAimed();
	Director->ShootAimed();
	TestEqual(TEXT("Two hits break a target for 20"), Director->GetTurnScore(), 20);

	// The next lent target is left alone and goes back after 4 seconds, not before.
	for (int32 Frame = 0; Frame < 60 * 3 && Director->CountLent() == 0; ++Frame) TestWorld.Tick(1);
	ADojoF1PopupTarget* LeftAlone = League.Sentry->Targets.Num() > 0 ? League.Sentry->Targets.Last().Get() : nullptr;
	if (!TestNotNull(TEXT("A second target is lent"), LeftAlone)) return false;
	TestFalse(TEXT("A lent target is visible"), LeftAlone->IsHidden());
	TestWorld.Tick(60 * 3 + 30);
	TestFalse(TEXT("Still out at 3.5 seconds"), LeftAlone->IsHidden());
	TestWorld.Tick(48);
	TestTrue(TEXT("Back in the rack, hidden, just after 4 seconds"), LeftAlone->IsHidden());
	TestFalse(TEXT("The sentry no longer aims at it"), League.Sentry->Targets.Contains(LeftAlone));

	TickUntilTurn(TestWorld, League, false, 20.f);
	TestFalse(TEXT("Ana's turn ended"), Director->IsTurnRunning());
	TestEqual(TEXT("Ana's turn is announced"), League.Announcer->Label->Text.ToString(), FString(TEXT("Ana scored 20 (best 20)")));
	TestEqual(TEXT("Every target is back after the turn"), League.Rack->GetAvailableCount(), 3);

	Director->ShootAimed();
	TestEqual(TEXT("Space during the break does nothing"), Director->GetTurnScore(), 20);
	Director->RestartLeague();
	TestEqual(TEXT("R during a league does nothing"), Director->GetTurnsStarted(), 1);

	// Bo and Cy score nothing; Ana's second turn scores one hit that does not break.
	TickUntilTurn(TestWorld, League, true, 5.f);
	TestEqual(TEXT("Bo is next"), Director->GetCurrentPlayer(), FName(TEXT("Bo")));
	TickUntilTurn(TestWorld, League, false, 20.f);
	TickUntilTurn(TestWorld, League, true, 5.f);
	TestEqual(TEXT("Cy is next"), Director->GetCurrentPlayer(), FName(TEXT("Cy")));
	TickUntilTurn(TestWorld, League, false, 20.f);
	TickUntilTurn(TestWorld, League, true, 5.f);
	TestEqual(TEXT("Ana again"), Director->GetCurrentPlayer(), FName(TEXT("Ana")));
	for (int32 Frame = 0; Frame < 60 && Director->CountLent() == 0; ++Frame) TestWorld.Tick(1);
	Director->ShootAimed();
	TestEqual(TEXT("One hit that does not break scores 10"), Director->GetTurnScore(), 10);
	TickUntilTurn(TestWorld, League, false, 20.f);
	TestEqual(TEXT("A worse second turn keeps Ana's best"), League.Announcer->Label->Text.ToString(), FString(TEXT("Ana scored 10 (best 20)")));

	for (int32 Frame = 0; Frame < 60 * 60 && Director->IsLeagueRunning(); ++Frame) TestWorld.Tick(1);
	TestFalse(TEXT("The league is over"), Director->IsLeagueRunning());
	TestEqual(TEXT("Ana leads with her best turn"), League.Announcer->Label->Text.ToString(), FString(TEXT("Ana leads with 20")));

	Director->RestartLeague();
	TestTrue(TEXT("R after the league starts a new one"), Director->IsLeagueRunning());
	TestEqual(TEXT("The roster is cleared"), League.Roster->GetPlayerCount(), 0);
	TestEqual(TEXT("The board is cleared"), League.Board->GetCount(), 0);
	TestEqual(TEXT("Ana starts the new league"), Director->GetCurrentPlayer(), FName(TEXT("Ana")));

	return true;
}

IMPLEMENT_SIMPLE_AUTOMATION_TEST(FDojo_F3_LeagueNight_TurnAndBreakLengths, "Dojo.F3.LeagueNight.TurnAndBreakLengths", EAutomationTestFlags::EditorContext | EAutomationTestFlags::ProductFilter)

/** Watches the clock through the first turn and break and checks the turn lasts 15 seconds and the break 3. */
bool FDojo_F3_LeagueNight_TurnAndBreakLengths::RunTest(const FString& Parameters)
{
	using namespace DojoF3LeagueTest;

	FDojoTestWorld TestWorld;
	FLeague League = SpawnLeague(TestWorld);
	ADojoF3LeagueDirector* Director = League.Director;
	UWorld* World = TestWorld.GetWorld();
	const float Start = World->GetTimeSeconds();

	while (World->GetTimeSeconds() < Start + 14.9f) TestWorld.Tick(1);
	TestTrue(TEXT("The first turn is still running at 14.9 seconds"), Director->IsTurnRunning());

	while (World->GetTimeSeconds() < Start + 15.1f) TestWorld.Tick(1);
	TestFalse(TEXT("The first turn is over at 15.1 seconds"), Director->IsTurnRunning());

	while (World->GetTimeSeconds() < Start + 17.9f) TestWorld.Tick(1);
	TestFalse(TEXT("The break still runs at 17.9 seconds"), Director->IsTurnRunning());
	TestEqual(TEXT("Only one turn has started during the break"), Director->GetTurnsStarted(), 1);

	while (World->GetTimeSeconds() < Start + 18.1f) TestWorld.Tick(1);
	TestTrue(TEXT("The second turn has started at 18.1 seconds"), Director->IsTurnRunning());
	TestEqual(TEXT("It is Bo's turn"), Director->GetCurrentPlayer(), FName(TEXT("Bo")));

	return true;
}

#endif
