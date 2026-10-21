#include "Misc/AutomationTest.h"

#if WITH_AUTOMATION_TESTS

#include "Components/TextRenderComponent.h"
#include "EngineUtils.h"
#include "Quests/f1-popup-target/DojoF1PopupTarget.h"
#include "Quests/f1-training-dummy/DojoF1TrainingDummy.h"
#include "Quests/f2-boss-clay-range/DojoF2ClayRange.h"
#include "Quests/f2-clay-disc/DojoF2ClayDisc.h"
#include "Quests/f2-dummy-spawner/DojoF2DummySpawner.h"
#include "Quests/f2-spotter/DojoF2Spotter.h"
#include "Quests/f2-target-rack/DojoF2TargetRack.h"
#include "Support/DojoTestWorld.h"

namespace DojoF2RangeTest
{
	/** One range with its spotter, penalty spawner, and bonus rack, wired as a designer would. */
	struct FRange
	{
		ADojoF2Spotter* Spotter = nullptr;
		ADojoF2DummySpawner* Spawner = nullptr;
		ADojoF2TargetRack* Rack = nullptr;
		ADojoF2ClayRange* Range = nullptr;
	};

	/** Spawns the pieces, then the range deferred so its wiring is in place before BeginPlay starts round 1. */
	FRange SpawnRange(FDojoTestWorld& TestWorld)
	{
		FRange Setup;
		Setup.Spotter = TestWorld.SpawnActor<ADojoF2Spotter>();
		Setup.Spawner = TestWorld.SpawnActor<ADojoF2DummySpawner>();
		Setup.Rack = TestWorld.SpawnActor<ADojoF2TargetRack>();

		Setup.Range = TestWorld.GetWorld()->SpawnActorDeferred<ADojoF2ClayRange>(ADojoF2ClayRange::StaticClass(), FTransform::Identity);
		Setup.Range->Spotter = Setup.Spotter;
		Setup.Range->PenaltySpawner = Setup.Spawner;
		Setup.Range->BonusRack = Setup.Rack;
		Setup.Range->FinishSpawning(FTransform::Identity);

		return Setup;
	}

	/** Counts training dummies still in play in the world. */
	int32 CountDummies(UWorld* World)
	{
		int32 Count = 0;
		for (TActorIterator<ADojoF1TrainingDummy> It(World); It; ++It)
		{
			if (IsValid(*It)) Count++;
		}
		return Count;
	}
}

IMPLEMENT_SIMPLE_AUTOMATION_TEST(FDojo_F2_ClayRange_PerfectRoundsPlayAlike, "Dojo.F2.ClayRange.PerfectRoundsPlayAlike", EAutomationTestFlags::EditorContext | EAutomationTestFlags::ProductFilter)

/** Shoots every disc the moment the spotter has it and breaks every bonus target, for two rounds, and checks 175 each time and a clean reset. */
bool FDojo_F2_ClayRange_PerfectRoundsPlayAlike::RunTest(const FString& Parameters)
{
	using namespace DojoF2RangeTest;

	FDojoTestWorld TestWorld;
	FRange Setup = SpawnRange(TestWorld);
	ADojoF2ClayRange* Range = Setup.Range;

	for (int32 Round = 1; Round <= 2; ++Round)
	{
		const FString Prefix = FString::Printf(TEXT("Round %d: "), Round);

		TestTrue(Prefix + TEXT("running"), Range->IsRoundRunning());
		TestEqual(Prefix + TEXT("score label starts at 0"), Range->Label->Text.ToString(), FString(TEXT("0")));

		for (int32 Frame = 0; Frame < 60 && !Setup.Spotter->HasTarget(); ++Frame) TestWorld.Tick(1);
		Range->ShootSpotted();
		Range->RestartRound();
		TestEqual(Prefix + TEXT("R during a round does nothing"), Range->GetScore(), 10);

		int32 BonusesSeen = 0;
		for (int32 Frame = 0; Frame < 60 * 40 && Range->IsRoundRunning(); ++Frame)
		{
			if (Setup.Spotter->HasTarget())
			{
				TestTrue(Prefix + TEXT("the spotter watches a clay disc"), Setup.Spotter->GetTarget()->IsA<ADojoF2ClayDisc>());
				Range->ShootSpotted();
			}

			ADojoF1PopupTarget* Bonus = Range->GetActiveBonus();
			if (Bonus && Bonus->GetState() == EDojoF1TargetState::ETS_Raised)
			{
				BonusesSeen++;
				Range->HitBonus();
				Range->HitBonus();
				TestEqual(Prefix + TEXT("two hits break the bonus target"), Bonus->GetState(), EDojoF1TargetState::ETS_Broken);
			}

			TestWorld.Tick(1);
		}

		TestFalse(Prefix + TEXT("the round ends after the tenth disc and the last bonus"), Range->IsRoundRunning());
		TestEqual(Prefix + TEXT("ten discs thrown"), Range->GetThrownCount(), 10);
		TestEqual(Prefix + TEXT("three bonus targets for a perfect streak"), BonusesSeen, 3);
		TestEqual(Prefix + TEXT("ten discs at 10 and three bonuses at 25"), Range->GetScore(), 175);
		TestEqual(Prefix + TEXT("the score is on the label"), Range->Label->Text.ToString(), FString(TEXT("175")));
		TestEqual(Prefix + TEXT("every bonus target is back in the rack"), Setup.Rack->GetAvailableCount(), 3);
		TestFalse(Prefix + TEXT("the spotter watches nothing after the round"), Setup.Spotter->HasTarget());

		Range->ShootSpotted();
		Range->HitBonus();
		TestEqual(Prefix + TEXT("keys between rounds change nothing"), Range->GetScore(), 175);

		Range->RestartRound();
		TestTrue(Prefix + TEXT("R between rounds starts the next round"), Range->IsRoundRunning());
		TestEqual(Prefix + TEXT("the next round starts from 0"), Range->GetScore(), 0);
	}

	return true;
}

IMPLEMENT_SIMPLE_AUTOMATION_TEST(FDojo_F2_ClayRange_FallenDiscsCostTime, "Dojo.F2.ClayRange.FallenDiscsCostTime", EAutomationTestFlags::EditorContext | EAutomationTestFlags::ProductFilter)

/** Lets discs fall and checks the penalty dummy, the pause in throwing, the broken streak, and that the round end removes every penalty dummy. */
bool FDojo_F2_ClayRange_FallenDiscsCostTime::RunTest(const FString& Parameters)
{
	using namespace DojoF2RangeTest;

	FDojoTestWorld TestWorld;
	FRange Setup = SpawnRange(TestWorld);
	ADojoF2ClayRange* Range = Setup.Range;

	// Shoot the first two discs, then let the third fall: a broken streak earns no bonus.
	for (int32 Frame = 0; Frame < 60 * 5 && Range->GetThrownCount() < 3; ++Frame)
	{
		if (Setup.Spotter->HasTarget()) Range->ShootSpotted();
		TestWorld.Tick(1);
	}
	TestEqual(TEXT("Two discs shot before the third"), Range->GetScore(), 20);

	TestWorld.Tick(60 * 3 + 12);
	TestEqual(TEXT("A fallen disc spawns one penalty dummy"), Range->CountStandingPenalties(), 1);
	TestFalse(TEXT("The streak was broken, so no bonus"), Range->GetActiveBonus() != nullptr);

	const int32 ThrownBefore = Range->GetThrownCount();
	TestWorld.Tick(60 * 5);
	TestEqual(TEXT("No disc is thrown while a penalty dummy stands"), Range->GetThrownCount(), ThrownBefore);

	// The fourth disc was already in the air and has fallen too, so two penalty dummies stand by now.
	TestEqual(TEXT("Each fallen disc adds a penalty dummy"), Range->CountStandingPenalties(), 2);
	for (int32 Strike = 0; Strike < 6; ++Strike) Range->StrikePenalty();
	TestEqual(TEXT("Three strikes each knock both penalty dummies down, oldest first"), Range->CountStandingPenalties(), 0);

	TestWorld.Tick(60 * 2 + 6);
	TestEqual(TEXT("Throwing resumes once no penalty dummy stands"), Range->GetThrownCount(), ThrownBefore + 1);

	// Let every remaining disc fall, knocking each penalty dummy down so throwing goes on.
	for (int32 Frame = 0; Frame < 60 * 120 && Range->IsRoundRunning(); ++Frame)
	{
		while (Range->CountStandingPenalties() > 0) Range->StrikePenalty();
		TestWorld.Tick(1);
	}

	TestFalse(TEXT("The round ends after the tenth disc"), Range->IsRoundRunning());
	TestEqual(TEXT("Only the first two discs scored"), Range->GetScore(), 20);
	TestEqual(TEXT("The round end removes every penalty dummy"), CountDummies(TestWorld.GetWorld()), 0);
	TestEqual(TEXT("The spawner starts its line again"), Setup.Spawner->GetSpawnedCount(), 0);

	Range->StrikePenalty();
	TestEqual(TEXT("F between rounds does nothing"), CountDummies(TestWorld.GetWorld()), 0);

	return true;
}

IMPLEMENT_SIMPLE_AUTOMATION_TEST(FDojo_F2_ClayRange_SpotterAndStreak, "Dojo.F2.ClayRange.SpotterAndStreak", EAutomationTestFlags::EditorContext | EAutomationTestFlags::ProductFilter)

/** With two discs up, checks the spotter watches the newer and moves to the older after a shot; then shows a fallen disc resets the streak, so shoot 2, fall 1, shoot 1 earns no bonus. */
bool FDojo_F2_ClayRange_SpotterAndStreak::RunTest(const FString& Parameters)
{
	using namespace DojoF2RangeTest;

	FDojoTestWorld TestWorld;
	FRange Setup = SpawnRange(TestWorld);
	ADojoF2ClayRange* Range = Setup.Range;

	for (int32 Frame = 0; Frame < 60 && Range->GetThrownCount() < 1; ++Frame) TestWorld.Tick(1);
	AActor* Older = Setup.Spotter->GetTarget();
	if (!TestNotNull(TEXT("The spotter watches the first disc"), Older)) return false;

	// The second disc is thrown at 2 seconds, while the first is still in play until 3; a few more frames let the check step run.
	for (int32 Frame = 0; Frame < 60 * 3 && Range->GetThrownCount() < 2; ++Frame) TestWorld.Tick(1);
	TestWorld.Tick(12);
	AActor* Newer = Setup.Spotter->GetTarget();
	TestTrue(TEXT("With two discs in play the spotter watches the newer one"), Newer != nullptr && Newer != Older);

	Range->ShootSpotted();
	TestWorld.Tick(12);
	TestTrue(TEXT("After the newer disc is shot the spotter moves to the older one"), Setup.Spotter->GetTarget() == Older);

	Range->ShootSpotted();
	TestEqual(TEXT("Two discs shot"), Range->GetScore(), 20);

	// Let the third disc fall, knock its penalty dummy down, then shoot the fourth.
	for (int32 Frame = 0; Frame < 60 * 5 && Range->CountStandingPenalties() == 0; ++Frame) TestWorld.Tick(1);
	TestEqual(TEXT("The third disc fell"), Range->CountStandingPenalties(), 1);
	while (Range->CountStandingPenalties() > 0) Range->StrikePenalty();

	const int32 ThrownBefore = Range->GetThrownCount();
	for (int32 Frame = 0; Frame < 60 * 3 && Range->GetThrownCount() == ThrownBefore; ++Frame) TestWorld.Tick(1);
	Range->ShootSpotted();

	TestEqual(TEXT("Three discs shot in all"), Range->GetScore(), 30);
	TestNull(TEXT("The fall reset the streak, so the third shot in all earns no bonus"), Range->GetActiveBonus());
	TestEqual(TEXT("Every bonus target is still in the rack"), Setup.Rack->GetAvailableCount(), 3);

	return true;
}

IMPLEMENT_SIMPLE_AUTOMATION_TEST(FDojo_F2_ClayRange_BonusGetsItsTime, "Dojo.F2.ClayRange.BonusGetsItsTime", EAutomationTestFlags::EditorContext | EAutomationTestFlags::ProductFilter)

/** Earns the last bonus on the ninth disc, never hits it, shoots the tenth, and checks the bonus stays out for its 4 seconds and the round waits for it. */
bool FDojo_F2_ClayRange_BonusGetsItsTime::RunTest(const FString& Parameters)
{
	using namespace DojoF2RangeTest;

	FDojoTestWorld TestWorld;
	FRange Setup = SpawnRange(TestWorld);
	ADojoF2ClayRange* Range = Setup.Range;
	UWorld* World = TestWorld.GetWorld();

	ADojoF1PopupTarget* Bonus = nullptr;
	float LentAt = 0.f;
	for (int32 Frame = 0; Frame < 60 * 30 && Range->GetThrownCount() < 10; ++Frame)
	{
		if (Setup.Spotter->HasTarget()) Range->ShootSpotted();

		// Break the bonuses from discs 3 and 6, but leave the one from disc 9 alone.
		ADojoF1PopupTarget* Active = Range->GetActiveBonus();
		if (Active && Active->GetState() == EDojoF1TargetState::ETS_Raised)
		{
			if (Range->GetScore() >= 90)
			{
				if (Bonus != Active) LentAt = World->GetTimeSeconds();
				Bonus = Active;
			}
			else
			{
				Range->HitBonus();
				Range->HitBonus();
			}
		}

		TestWorld.Tick(1);
	}

	if (!TestNotNull(TEXT("The ninth disc lent a bonus target"), Bonus)) return false;

	for (int32 Frame = 0; Frame < 60 && Setup.Spotter->HasTarget() == false; ++Frame) TestWorld.Tick(1);
	Range->ShootSpotted();
	TestEqual(TEXT("All ten discs shot"), Range->GetScore(), 150);
	TestTrue(TEXT("The round keeps running while the bonus is still lent"), Range->IsRoundRunning());

	while (World->GetTimeSeconds() < LentAt + 3.8f) TestWorld.Tick(1);
	TestFalse(TEXT("At 3.8 seconds the unbroken bonus is still out"), Bonus->IsHidden());
	TestEqual(TEXT("At 3.8 seconds the rack still lends it"), Setup.Rack->GetAvailableCount(), 2);
	TestTrue(TEXT("At 3.8 seconds the round is still running"), Range->IsRoundRunning());

	while (World->GetTimeSeconds() < LentAt + 4.3f) TestWorld.Tick(1);
	TestTrue(TEXT("After 4 seconds the unbroken bonus is hidden"), Bonus->IsHidden());
	TestEqual(TEXT("After 4 seconds it is back in the rack"), Setup.Rack->GetAvailableCount(), 3);
	TestFalse(TEXT("With the bonus back, the round ends"), Range->IsRoundRunning());
	TestEqual(TEXT("Ten discs and two broken bonuses"), Range->GetScore(), 150);

	return true;
}

#endif
