#include "Misc/AutomationTest.h"

#if WITH_AUTOMATION_TESTS

#include "DojoM1DroneHandoff.h"
#include "Quests/m1-charge-meter/DojoM1Charger.h"
#include "Quests/m1-move-pad/DojoM1Walker.h"
#include "Quests/m1-pause-context/DojoM1PauseSwitch.h"
#include "Quests/m1-turntable/DojoM1InputRig.h"
#include "Quests/m1-turntable/DojoM1Turntable.h"
#include "Support/DojoTestWorld.h"

namespace DojoM1BossTest
{
	/** Presses a key for two frames, lets go, and runs two more frames: one key press as the player makes it. */
	void Tap(FDojoTestWorld& TestWorld, FDojoM1InputRig& Rig, const FKey& Key)
	{
		Rig.Press(Key);
		Rig.Tick(2);
		Rig.Release(Key);
		Rig.Tick(2);
	}

	/** Holds a key for the given number of frames at 60 frames per second, lets go, and runs two more frames. */
	void Hold(FDojoTestWorld& TestWorld, FDojoM1InputRig& Rig, const FKey& Key, int32 Frames)
	{
		Rig.Press(Key);
		Rig.Tick(Frames);
		Rig.Release(Key);
		Rig.Tick(2);
	}

	/** Plays one full drill from a fresh round: walk, take over the scanner and turn it (with a pause in the middle), walk, take over the cannon and fire a light then a heavy shot. */
	void PlayDrill(FAutomationTestBase& Test, FDojoTestWorld& TestWorld, FDojoM1InputRig& Rig, ADojoM1DroneHandoff* Director)
	{
		Test.TestEqual(TEXT("A round starts with the hero in control"), Director->GetModeLabel(), FString(TEXT("HERO")));
		Test.TestFalse(TEXT("A fresh round is not done"), Director->IsRoundDone());

		Hold(TestWorld, Rig, EKeys::W, 60);
		Test.TestNearlyEqual(TEXT("The hero walked about 300 forward"), Director->Hero->GetActorLocation().X, 300.0, 10.0);

		Tap(TestWorld, Rig, EKeys::R);
		Test.TestNearlyEqual(TEXT("R before the drill is finished changes nothing"), Director->Hero->GetActorLocation().X, 300.0, 10.0);

		Tap(TestWorld, Rig, EKeys::F);
		Test.TestEqual(TEXT("Standing within reach of the scanner, F hands it over"), Director->GetModeLabel(), FString(TEXT("SCANNER")));
		Test.TestTrue(TEXT("The scanner now has the player's controller"), Director->Scanner->GetController() == Rig.GetController());

		Hold(TestWorld, Rig, EKeys::W, 30);
		Test.TestNearlyEqual(TEXT("W belongs to the hero, so the hero does not move"), Director->Hero->GetActorLocation().X, 300.0, 10.0);

		Hold(TestWorld, Rig, EKeys::D, 70);
		const double TurnedYaw = Director->Scanner->GetActorRotation().Yaw;
		Test.TestTrue(TEXT("D turned the scanner past the goal"), TurnedYaw >= 90.0);

		Tap(TestWorld, Rig, EKeys::Tab);
		Test.TestEqual(TEXT("Tab opens the pause"), Director->GetModeLabel(), FString(TEXT("SCANNER PAUSED")));
		Hold(TestWorld, Rig, EKeys::D, 70);
		Test.TestNearlyEqual(TEXT("While paused D does not turn the scanner"), Director->Scanner->GetActorRotation().Yaw, TurnedYaw, 0.01);
		Tap(TestWorld, Rig, EKeys::F);
		Test.TestEqual(TEXT("While paused F does not hand control back"), Director->GetModeLabel(), FString(TEXT("SCANNER PAUSED")));
		Tap(TestWorld, Rig, EKeys::Tab);
		Test.TestEqual(TEXT("Tab closes the pause"), Director->GetModeLabel(), FString(TEXT("SCANNER")));

		Tap(TestWorld, Rig, EKeys::F);
		Test.TestEqual(TEXT("F hands control back to the hero"), Director->GetModeLabel(), FString(TEXT("HERO")));
		Test.TestFalse(TEXT("The cannon has not fired, so the drill is not done"), Director->IsRoundDone());

		Hold(TestWorld, Rig, EKeys::S, 120);
		Test.TestNearlyEqual(TEXT("The hero walked back to about 300 behind the start"), Director->Hero->GetActorLocation().X, -300.0, 12.0);

		Tap(TestWorld, Rig, EKeys::F);
		Test.TestEqual(TEXT("Within reach of the cannon, F hands it over"), Director->GetModeLabel(), FString(TEXT("CANNON")));

		Hold(TestWorld, Rig, EKeys::SpaceBar, 18);
		Test.TestTrue(TEXT("A short hold fires a light shot"), Director->Cannon->GetLastShot() == EDojoM1ShotTier::Light);

		Tap(TestWorld, Rig, EKeys::F);
		Test.TestEqual(TEXT("Back to the hero after a light shot"), Director->GetModeLabel(), FString(TEXT("HERO")));
		Test.TestFalse(TEXT("A light shot does not finish the drill"), Director->IsRoundDone());

		Tap(TestWorld, Rig, EKeys::F);
		Test.TestEqual(TEXT("The cannon can be taken over again"), Director->GetModeLabel(), FString(TEXT("CANNON")));
		Hold(TestWorld, Rig, EKeys::SpaceBar, 78);
		Test.TestTrue(TEXT("A full hold fires a heavy shot"), Director->Cannon->GetLastShot() == EDojoM1ShotTier::Heavy);

		Tap(TestWorld, Rig, EKeys::F);
		Test.TestTrue(TEXT("Both drones did their job and the hero is back, so the drill is done"), Director->IsRoundDone());
		Test.TestTrue(TEXT("The status line gives the round time"), Director->GetStatusLine().StartsWith(TEXT("DRILL DONE in ")));
	}
}

IMPLEMENT_SIMPLE_AUTOMATION_TEST(FDojo_M1_DroneHandoff_PlaysTwoRounds, "Dojo.M1.DroneHandoff.PlaysTwoRounds", EAutomationTestFlags::EditorContext | EAutomationTestFlags::ProductFilter)

/** Plays a whole drill, restarts with R, and plays it again from a clean start. */
bool FDojo_M1_DroneHandoff_PlaysTwoRounds::RunTest(const FString& Parameters)
{
	using namespace DojoM1BossTest;

	FDojoTestWorld TestWorld;
	FDojoM1InputRig Rig(TestWorld);

	ADojoM1DroneHandoff* Director = TestWorld.SpawnActor<ADojoM1DroneHandoff>();
	if (!TestNotNull(TEXT("Director spawned"), Director)) return false;
	Rig.Tick(2);
	if (!TestNotNull(TEXT("The round spawned the hero"), Director->Hero.Get())) return false;

	TestNearlyEqual(TEXT("The scanner waits 500 ahead"), Director->Scanner->GetActorLocation().X, 500.0, 0.01);
	TestNearlyEqual(TEXT("The cannon waits 500 behind"), Director->Cannon->GetActorLocation().X, -500.0, 0.01);

	PlayDrill(*this, TestWorld, Rig, Director);

	const ADojoM1Walker* FirstHero = Director->Hero;
	const ADojoM1Charger* FirstCannon = Director->Cannon;

	Tap(TestWorld, Rig, EKeys::Tab);
	TestTrue(TEXT("Tab still works after the drill, so the pause can be open when the next round starts"), Director->Pause->IsOpen());

	Tap(TestWorld, Rig, EKeys::R);
	TestFalse(TEXT("A new round starts with the pause closed"), Director->Pause->IsOpen());
	TestFalse(TEXT("R after the drill starts a new round"), Director->IsRoundDone());
	TestTrue(TEXT("The new round has a fresh hero"), Director->Hero != FirstHero);
	TestTrue(TEXT("The new round has a fresh cannon"), Director->Cannon != FirstCannon);
	TestEqual(TEXT("The fresh cannon has fired nothing"), Director->Cannon->GetShotsFired(), 0);
	TestNearlyEqual(TEXT("The fresh scanner has not turned"), Director->Scanner->GetActorRotation().Yaw, 0.0, 0.01);
	TestNearlyEqual(TEXT("The fresh hero is back at the start"), Director->Hero->GetActorLocation().Size(), 0.0, 0.01);

	PlayDrill(*this, TestWorld, Rig, Director);

	return true;
}

IMPLEMENT_SIMPLE_AUTOMATION_TEST(FDojo_M1_DroneHandoff_ReachIs250, "Dojo.M1.DroneHandoff.ReachIs250", EAutomationTestFlags::EditorContext | EAutomationTestFlags::ProductFilter)

/** Presses F at 500, about 350, and about 200 from the scanner and checks only the last is in reach. */
bool FDojo_M1_DroneHandoff_ReachIs250::RunTest(const FString& Parameters)
{
	using namespace DojoM1BossTest;

	FDojoTestWorld TestWorld;
	FDojoM1InputRig Rig(TestWorld);

	ADojoM1DroneHandoff* Director = TestWorld.SpawnActor<ADojoM1DroneHandoff>();
	if (!TestNotNull(TEXT("Director spawned"), Director)) return false;
	Rig.Tick(2);

	Tap(TestWorld, Rig, EKeys::F);
	TestEqual(TEXT("Both drones are 500 away, out of reach, so F does nothing"), Director->GetModeLabel(), FString(TEXT("HERO")));

	Hold(TestWorld, Rig, EKeys::W, 30);
	Tap(TestWorld, Rig, EKeys::F);
	TestEqual(TEXT("About 350 from the scanner is out of the 250 reach"), Director->GetModeLabel(), FString(TEXT("HERO")));

	Hold(TestWorld, Rig, EKeys::W, 30);
	Tap(TestWorld, Rig, EKeys::F);
	TestEqual(TEXT("About 200 from the scanner is in reach"), Director->GetModeLabel(), FString(TEXT("SCANNER")));

	return true;
}

IMPLEMENT_SIMPLE_AUTOMATION_TEST(FDojo_M1_DroneHandoff_TiesGoToTheScanner, "Dojo.M1.DroneHandoff.TiesGoToTheScanner", EAutomationTestFlags::EditorContext | EAutomationTestFlags::ProductFilter)

/** Widens the reach so both drones are equally near and checks the scanner wins the tie. */
bool FDojo_M1_DroneHandoff_TiesGoToTheScanner::RunTest(const FString& Parameters)
{
	using namespace DojoM1BossTest;

	FDojoTestWorld TestWorld;
	FDojoM1InputRig Rig(TestWorld);

	ADojoM1DroneHandoff* Director = TestWorld.SpawnActor<ADojoM1DroneHandoff>();
	if (!TestNotNull(TEXT("Director spawned"), Director)) return false;
	Rig.Tick(2);

	Director->ReachDistance = 600.f;
	Tap(TestWorld, Rig, EKeys::F);
	TestEqual(TEXT("Equally near, the scanner wins the tie"), Director->GetModeLabel(), FString(TEXT("SCANNER")));

	return true;
}

IMPLEMENT_SIMPLE_AUTOMATION_TEST(FDojo_M1_DroneHandoff_PauseSitsAboveEverything, "Dojo.M1.DroneHandoff.PauseSitsAboveEverything", EAutomationTestFlags::EditorContext | EAutomationTestFlags::ProductFilter)

/** Checks the pause layer is above the director's and the pawns' layers and that the director's layer is above the pawns'. */
bool FDojo_M1_DroneHandoff_PauseSitsAboveEverything::RunTest(const FString& Parameters)
{
	using namespace DojoM1BossTest;

	FDojoTestWorld TestWorld;
	FDojoM1InputRig Rig(TestWorld);

	ADojoM1DroneHandoff* Director = TestWorld.SpawnActor<ADojoM1DroneHandoff>();
	if (!TestNotNull(TEXT("Director spawned"), Director)) return false;
	Rig.Tick(2);

	Tap(TestWorld, Rig, EKeys::Tab);
	Rig.Tick(1);

	int32 PausePriority = -1;
	int32 HeroPriority = -1;
	TestTrue(TEXT("The pause layer is active"), Rig.GetSubsystem()->HasMappingContext(Director->Pause->PauseContext, PausePriority));
	TestTrue(TEXT("The hero's layer is active"), Rig.GetSubsystem()->HasMappingContext(Director->Hero->MoveContext, HeroPriority));
	TestTrue(TEXT("The pause layer is above the hero's"), PausePriority > HeroPriority);
	TestTrue(TEXT("The pause layer is above the director's own layer (5)"), PausePriority > 5);

	Tap(TestWorld, Rig, EKeys::Tab);
	TestFalse(TEXT("The pause layer is gone after the second Tab"), Rig.GetSubsystem()->HasMappingContext(Director->Pause->PauseContext));
	TestTrue(TEXT("The hero's layer is still there"), Rig.GetSubsystem()->HasMappingContext(Director->Hero->MoveContext));

	return true;
}

IMPLEMENT_SIMPLE_AUTOMATION_TEST(FDojo_M1_DroneHandoff_NeedsBothDrones, "Dojo.M1.DroneHandoff.NeedsBothDrones", EAutomationTestFlags::EditorContext | EAutomationTestFlags::ProductFilter)

/** Fires a heavy shot but never turns the scanner, and checks the drill is not done. */
bool FDojo_M1_DroneHandoff_NeedsBothDrones::RunTest(const FString& Parameters)
{
	using namespace DojoM1BossTest;

	FDojoTestWorld TestWorld;
	FDojoM1InputRig Rig(TestWorld);

	ADojoM1DroneHandoff* Director = TestWorld.SpawnActor<ADojoM1DroneHandoff>();
	if (!TestNotNull(TEXT("Director spawned"), Director)) return false;
	Rig.Tick(2);

	Hold(TestWorld, Rig, EKeys::S, 60);
	Tap(TestWorld, Rig, EKeys::F);
	TestEqual(TEXT("The hero took over the cannon"), Director->GetModeLabel(), FString(TEXT("CANNON")));

	Hold(TestWorld, Rig, EKeys::SpaceBar, 78);
	Tap(TestWorld, Rig, EKeys::F);
	TestTrue(TEXT("The cannon fired a heavy shot"), Director->Cannon->GetLastShot() == EDojoM1ShotTier::Heavy);
	TestEqual(TEXT("Back with the hero"), Director->GetModeLabel(), FString(TEXT("HERO")));
	TestFalse(TEXT("The scanner never turned, so the drill is not done"), Director->IsRoundDone());

	return true;
}

IMPLEMENT_SIMPLE_AUTOMATION_TEST(FDojo_M1_DroneHandoff_LeavesNoLayerBehind, "Dojo.M1.DroneHandoff.LeavesNoLayerBehind", EAutomationTestFlags::EditorContext | EAutomationTestFlags::ProductFilter)

/** Destroys the director and checks its context is taken off the player. */
bool FDojo_M1_DroneHandoff_LeavesNoLayerBehind::RunTest(const FString& Parameters)
{
	FDojoTestWorld TestWorld;
	FDojoM1InputRig Rig(TestWorld);

	ADojoM1DroneHandoff* Director = TestWorld.SpawnActor<ADojoM1DroneHandoff>();
	if (!TestNotNull(TEXT("Director spawned"), Director) || !TestNotNull(TEXT("Its context was built"), Director->DirectorContext.Get())) return false;
	Rig.Tick(2);

	const UInputMappingContext* DirectorContext = Director->DirectorContext;
	TestTrue(TEXT("While the director plays its keys are on the player"), Rig.GetSubsystem()->HasMappingContext(DirectorContext));

	Director->Destroy();
	Rig.Tick(2);
	TestFalse(TEXT("A destroyed director leaves no context behind"), Rig.GetSubsystem()->HasMappingContext(DirectorContext));

	return true;
}

#endif
