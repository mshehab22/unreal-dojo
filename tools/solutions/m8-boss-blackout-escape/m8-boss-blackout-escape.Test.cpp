#include "Misc/AutomationTest.h"

#if WITH_AUTOMATION_TESTS

#include "Quests/m1-move-pad/DojoM1Walker.h"
#include "Quests/m1-turntable/DojoM1InputRig.h"
#include "Quests/m8-alert-meter/DojoM8AlertMeter.h"
#include "Quests/m8-boss-blackout-escape/DojoM8Moment.h"
#include "Quests/m8-exit-gate/DojoM8ExitGate.h"
#include "Quests/m8-fuse-box/DojoM8FuseBox.h"
#include "Quests/m8-moment-clock/DojoM8MomentClock.h"
#include "Quests/m8-searchlight/DojoM8Searchlight.h"
#include "Support/DojoTestWorld.h"

namespace DojoM8BossTest
{
	/** Holds a key for the given number of frames at 60 frames per second, lets go, and runs two more frames. */
	void Hold(FDojoTestWorld& TestWorld, FDojoM1InputRig& Rig, const FKey& Key, int32 Frames)
	{
		Rig.Press(Key);
		Rig.Tick(Frames);
		Rig.Release(Key);
		Rig.Tick(2);
	}

	/** Presses a key for two frames, lets go, and runs two more frames: one key press as the player makes it. */
	void Tap(FDojoTestWorld& TestWorld, FDojoM1InputRig& Rig, const FKey& Key)
	{
		Rig.Press(Key);
		Rig.Tick(2);
		Rig.Release(Key);
		Rig.Tick(2);
	}

	/** Holds the tower's beam still and aims it away from the hero's whole route: along minus Y. */
	void QuietTower(ADojoM8Moment* Moment)
	{
		Moment->Light->SweepDegreesPerSecond = 0.f;
		Moment->Light->SetActorRotation(FRotator(0.0, -90.0, 0.0));
	}

	/** Plays one whole round from its first moment: three fuses along a square route, then through the powered exit. */
	void PlayEscape(FAutomationTestBase& Test, FDojoTestWorld& TestWorld, FDojoM1InputRig& Rig, ADojoM8Moment* Moment)
	{
		QuietTower(Moment);

		Test.TestEqual(TEXT("A round starts running with nothing collected"), Moment->GetStatusLine(), FString(TEXT("RUNNING | fuses 0/3 | alert 0.0")));
		Test.TestFalse(TEXT("The exit has no power at the start"), Moment->ExitGate->IsPowered());

		Hold(TestWorld, Rig, EKeys::W, 120);
		Test.TestEqual(TEXT("Walking forward takes the first fuse"), Moment->FuseBox->GetCollected(), 1);
		Test.TestFalse(TEXT("A walk through the edge of the beam is not a catch"), Moment->AlertMeter->IsCaught());

		Hold(TestWorld, Rig, EKeys::D, 120);
		Test.TestEqual(TEXT("Walking right takes the second fuse"), Moment->FuseBox->GetCollected(), 2);
		Test.TestFalse(TEXT("Two fuses do not power the exit"), Moment->ExitGate->IsPowered());

		Hold(TestWorld, Rig, EKeys::S, 120);
		Test.TestEqual(TEXT("Walking back takes the third fuse"), Moment->FuseBox->GetCollected(), 3);
		Test.TestTrue(TEXT("Three fuses power the exit"), Moment->ExitGate->IsPowered());
		Test.TestTrue(TEXT("The moment is still running"), Moment->Clock->GetOutcome() == EDojoM8Outcome::EO_Running);

		Hold(TestWorld, Rig, EKeys::D, 140);
		Test.TestTrue(TEXT("Walking into the powered exit ends the moment as an escape"), Moment->Clock->GetOutcome() == EDojoM8Outcome::EO_Escaped);
		Test.TestTrue(TEXT("The status line gives the time"), Moment->GetStatusLine().StartsWith(TEXT("ESCAPED in ")));
		Test.TestTrue(TEXT("and the fuse count"), Moment->GetStatusLine().Contains(TEXT("fuses 3/3")));
		Test.TestFalse(TEXT("Nobody was caught on the way"), Moment->AlertMeter->IsCaught());
	}
}

IMPLEMENT_SIMPLE_AUTOMATION_TEST(FDojo_M8_BlackoutEscape_PlaysTwoRounds, "Dojo.M8.BlackoutEscape.PlaysTwoRounds", EAutomationTestFlags::EditorContext | EAutomationTestFlags::ProductFilter)

/** Escapes, restarts with R, and escapes again from a clean start. */
bool FDojo_M8_BlackoutEscape_PlaysTwoRounds::RunTest(const FString& Parameters)
{
	using namespace DojoM8BossTest;

	FDojoTestWorld TestWorld;
	FDojoM1InputRig Rig(TestWorld);

	ADojoM8Moment* Moment = TestWorld.SpawnActor<ADojoM8Moment>();
	if (!TestNotNull(TEXT("Director spawned"), Moment)) return false;
	Rig.Tick(2);
	if (!TestNotNull(TEXT("The round spawned its pieces"), Moment->Clock.Get())) return false;

	TestTrue(TEXT("The hero stands at the start"), Moment->Hero->GetActorLocation().Equals(FVector::ZeroVector, 1.0));
	TestTrue(TEXT("The tower stands in the middle of the yard"), Moment->Light->GetActorLocation().Equals(FVector(300.0, 300.0, 0.0), 1.0));
	TestTrue(TEXT("The exit waits 1200 to the right"), Moment->ExitGate->GetActorLocation().Equals(FVector(0.0, 1200.0, 0.0), 1.0));

	PlayEscape(*this, TestWorld, Rig, Moment);

	const TWeakObjectPtr<ADojoM1Walker> FirstHero = Moment->Hero;
	const TWeakObjectPtr<ADojoM8FuseBox> FirstBox = Moment->FuseBox;

	Tap(TestWorld, Rig, EKeys::R);
	TestEqual(TEXT("R after the ending starts a clean round"), Moment->GetStatusLine(), FString(TEXT("RUNNING | fuses 0/3 | alert 0.0")));
	TestFalse(TEXT("The old hero is gone"), FirstHero.IsValid());
	TestFalse(TEXT("The old fuse box is gone"), FirstBox.IsValid());
	TestFalse(TEXT("The new exit has no power"), Moment->ExitGate->IsPowered());
	TestTrue(TEXT("The new hero stands at the start"), Moment->Hero->GetActorLocation().Equals(FVector::ZeroVector, 1.0));

	PlayEscape(*this, TestWorld, Rig, Moment);

	return true;
}

IMPLEMENT_SIMPLE_AUTOMATION_TEST(FDojo_M8_BlackoutEscape_TheBeamCatchesAHeroWhoStandsStill, "Dojo.M8.BlackoutEscape.TheBeamCatchesAHeroWhoStandsStill", EAutomationTestFlags::EditorContext | EAutomationTestFlags::ProductFilter)

/** Aims the beam at the hero and waits, and checks the moment ends as a catch that an escape cannot change. */
bool FDojo_M8_BlackoutEscape_TheBeamCatchesAHeroWhoStandsStill::RunTest(const FString& Parameters)
{
	using namespace DojoM8BossTest;

	FDojoTestWorld TestWorld;
	FDojoM1InputRig Rig(TestWorld);

	ADojoM8Moment* Moment = TestWorld.SpawnActor<ADojoM8Moment>();
	if (!TestNotNull(TEXT("Director spawned"), Moment)) return false;
	Rig.Tick(2);

	Moment->Light->SweepDegreesPerSecond = 0.f;
	Moment->Light->SetActorRotation(FRotator(0.0, -135.0, 0.0));

	Rig.Tick(60);
	TestTrue(TEXT("One second in the beam is not yet a catch"), Moment->Clock->GetOutcome() == EDojoM8Outcome::EO_Running);
	TestTrue(TEXT("but the alert is rising"), Moment->AlertMeter->GetAlertLevel() > 0.4f);

	Rig.Tick(120);
	TestTrue(TEXT("Three seconds in the beam is a catch"), Moment->Clock->GetOutcome() == EDojoM8Outcome::EO_Caught);
	TestTrue(TEXT("The status line says so"), Moment->GetStatusLine().StartsWith(TEXT("CAUGHT after ")));

	Moment->ExitGate->OnEscaped.Broadcast(Moment->Hero);
	TestTrue(TEXT("An escape after the catch changes nothing"), Moment->Clock->GetOutcome() == EDojoM8Outcome::EO_Caught);

	Tap(TestWorld, Rig, EKeys::R);
	TestTrue(TEXT("R after a catch starts a new round"), Moment->Clock->GetOutcome() == EDojoM8Outcome::EO_Running);
	TestEqual(TEXT("with an empty alert"), Moment->AlertMeter->GetAlertLevel(), 0.f);

	return true;
}

IMPLEMENT_SIMPLE_AUTOMATION_TEST(FDojo_M8_BlackoutEscape_TheLimitEndsARoundThatDrags, "Dojo.M8.BlackoutEscape.TheLimitEndsARoundThatDrags", EAutomationTestFlags::EditorContext | EAutomationTestFlags::ProductFilter)

/** Shortens the limit to five seconds, waits it out, and checks the round ends and can be restarted. */
bool FDojo_M8_BlackoutEscape_TheLimitEndsARoundThatDrags::RunTest(const FString& Parameters)
{
	using namespace DojoM8BossTest;

	FDojoTestWorld TestWorld;
	FDojoM1InputRig Rig(TestWorld);

	ADojoM8Moment* Moment = TestWorld.SpawnActor<ADojoM8Moment>();
	if (!TestNotNull(TEXT("Director spawned"), Moment)) return false;

	Moment->TimeLimitSeconds = 5.f;
	Moment->StartRound();
	Rig.Tick(2);
	QuietTower(Moment);

	Rig.Tick(240);
	TestTrue(TEXT("At four seconds the round is still running"), Moment->Clock->GetOutcome() == EDojoM8Outcome::EO_Running);

	Rig.Tick(120);
	TestTrue(TEXT("At six seconds the time is up"), Moment->GetStatusLine().StartsWith(TEXT("TIME UP")));

	Tap(TestWorld, Rig, EKeys::R);
	TestTrue(TEXT("R after the time is up starts a new round"), Moment->Clock->GetOutcome() == EDojoM8Outcome::EO_Running);

	return true;
}

IMPLEMENT_SIMPLE_AUTOMATION_TEST(FDojo_M8_BlackoutEscape_TheExitNeedsPowerAndRestartNeedsAnEnding, "Dojo.M8.BlackoutEscape.TheExitNeedsPowerAndRestartNeedsAnEnding", EAutomationTestFlags::EditorContext | EAutomationTestFlags::ProductFilter)

/** Walks straight to the unpowered exit and presses R mid-round, and checks neither changes anything. */
bool FDojo_M8_BlackoutEscape_TheExitNeedsPowerAndRestartNeedsAnEnding::RunTest(const FString& Parameters)
{
	using namespace DojoM8BossTest;

	FDojoTestWorld TestWorld;
	FDojoM1InputRig Rig(TestWorld);

	ADojoM8Moment* Moment = TestWorld.SpawnActor<ADojoM8Moment>();
	if (!TestNotNull(TEXT("Director spawned"), Moment)) return false;
	Rig.Tick(2);
	QuietTower(Moment);

	const TWeakObjectPtr<ADojoM1Walker> FirstHero = Moment->Hero;

	Hold(TestWorld, Rig, EKeys::D, 60);
	Tap(TestWorld, Rig, EKeys::R);
	TestTrue(TEXT("R in the middle of a round changes nothing"), FirstHero.IsValid() && Moment->Hero == FirstHero.Get());
	TestNearlyEqual(TEXT("The hero is where it walked to"), Moment->Hero->GetActorLocation().Y, 300.0, 12.0);

	Hold(TestWorld, Rig, EKeys::D, 180);
	TestTrue(TEXT("The hero is standing in the exit"), Moment->Hero->GetActorLocation().Y > 1150.0);
	TestTrue(TEXT("but with no power the moment is still running"), Moment->Clock->GetOutcome() == EDojoM8Outcome::EO_Running);
	TestFalse(TEXT("and nobody has escaped"), Moment->ExitGate->HasEscaped());

	return true;
}

IMPLEMENT_SIMPLE_AUTOMATION_TEST(FDojo_M8_BlackoutEscape_TheTowerSweeps, "Dojo.M8.BlackoutEscape.TheTowerSweeps", EAutomationTestFlags::EditorContext | EAutomationTestFlags::ProductFilter)

/** Leaves the tower at its defaults and checks the beam turns during a round. */
bool FDojo_M8_BlackoutEscape_TheTowerSweeps::RunTest(const FString& Parameters)
{
	using namespace DojoM8BossTest;

	FDojoTestWorld TestWorld;
	FDojoM1InputRig Rig(TestWorld);

	ADojoM8Moment* Moment = TestWorld.SpawnActor<ADojoM8Moment>();
	if (!TestNotNull(TEXT("Director spawned"), Moment)) return false;

	Rig.Tick(60);
	TestNearlyEqual(TEXT("A tower at its default speed turns about 45 degrees in a second"), Moment->Light->GetActorRotation().Yaw, 45.0, 3.0);

	return true;
}

IMPLEMENT_SIMPLE_AUTOMATION_TEST(FDojo_M8_BlackoutEscape_LeavesNoLayerBehind, "Dojo.M8.BlackoutEscape.LeavesNoLayerBehind", EAutomationTestFlags::EditorContext | EAutomationTestFlags::ProductFilter)

/** Destroys the director and checks its context is taken off the player. */
bool FDojo_M8_BlackoutEscape_LeavesNoLayerBehind::RunTest(const FString& Parameters)
{
	FDojoTestWorld TestWorld;
	FDojoM1InputRig Rig(TestWorld);

	ADojoM8Moment* Moment = TestWorld.SpawnActor<ADojoM8Moment>();
	if (!TestNotNull(TEXT("Director spawned"), Moment) || !TestNotNull(TEXT("Its context was built"), Moment->DirectorContext.Get())) return false;
	Rig.Tick(2);

	const UInputMappingContext* DirectorContext = Moment->DirectorContext;
	TestTrue(TEXT("While the director plays its key is on the player"), Rig.GetSubsystem()->HasMappingContext(DirectorContext));

	Moment->Destroy();
	Rig.Tick(2);
	TestFalse(TEXT("A destroyed director leaves no context behind"), Rig.GetSubsystem()->HasMappingContext(DirectorContext));

	return true;
}

#endif
