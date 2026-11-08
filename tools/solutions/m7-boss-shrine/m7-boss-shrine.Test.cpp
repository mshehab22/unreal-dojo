#include "Misc/AutomationTest.h"

#if WITH_AUTOMATION_TESTS

#include "Components/TextRenderComponent.h"
#include "Quests/m3-checkpoint/DojoM3Runner.h"
#include "Quests/m3-scale-plate/DojoM3Crate.h"
#include "Quests/m7-boss-shrine/DojoM7ShrineDirector.h"
#include "Quests/m7-key-ring/DojoM7KeyPickup.h"
#include "Quests/m7-key-ring/DojoM7KeyRing.h"
#include "Quests/m7-locked-door/DojoM7LockedDoor.h"
#include "Quests/m7-plate-gate/DojoM7PlateGate.h"
#include "Quests/m7-signal-plate/DojoM7SignalPlate.h"
#include "Support/DojoTestWorld.h"
#include "UObject/UnrealType.h"

namespace DojoM7ShrineTest
{
	/** Where each piece of the shrine stands. */
	const FVector LeftPlateSpot(0.0, 600.0, 0.0);
	const FVector RightPlateSpot(0.0, -600.0, 0.0);
	const FVector LeftCrateHome(-1500.0, 600.0, 0.0);
	const FVector RightCrateHome(-1500.0, -600.0, 0.0);
	const FVector GateSpot(800.0, 0.0, 0.0);
	const FVector PickupSpot(1200.0, 0.0, 0.0);
	const FVector DoorSpot(1800.0, 0.0, 0.0);
	const FVector DoorstepSpot(1700.0, 0.0, 0.0);
	const FVector RunnerStart(-2500.0, 0.0, 0.0);

	/** Every actor in one shrine. */
	struct FShrineScene
	{
		ADojoM3Runner* Runner = nullptr;
		UDojoM7KeyRing* Ring = nullptr;
		ADojoM7SignalPlate* LeftPlate = nullptr;
		ADojoM7SignalPlate* RightPlate = nullptr;
		ADojoM3Crate* LeftCrate = nullptr;
		ADojoM3Crate* RightCrate = nullptr;
		ADojoM7PlateGate* Gate = nullptr;
		ADojoM7KeyPickup* Pickup = nullptr;
		ADojoM7LockedDoor* Door = nullptr;
		ADojoM7ShrineDirector* Director = nullptr;
	};

	/** Spawns an actor of a quest class at a spot. */
	template<typename TActor>
	TActor* SpawnAt(FDojoTestWorld& TestWorld, const FVector& Where)
	{
		return TestWorld.GetWorld()->SpawnActor<TActor>(Where, FRotator::ZeroRotator);
	}

	/** Builds the shrine the way a designer wires it in Details, with a runner that carries a key ring. */
	FShrineScene MakeShrine(FDojoTestWorld& TestWorld, float ResetSeconds)
	{
		UWorld* World = TestWorld.GetWorld();
		FShrineScene Scene;

		Scene.Runner = SpawnAt<ADojoM3Runner>(TestWorld, RunnerStart);
		Scene.LeftPlate = SpawnAt<ADojoM7SignalPlate>(TestWorld, LeftPlateSpot);
		Scene.RightPlate = SpawnAt<ADojoM7SignalPlate>(TestWorld, RightPlateSpot);
		Scene.LeftCrate = SpawnAt<ADojoM3Crate>(TestWorld, LeftCrateHome);
		Scene.RightCrate = SpawnAt<ADojoM3Crate>(TestWorld, RightCrateHome);
		Scene.Pickup = SpawnAt<ADojoM7KeyPickup>(TestWorld, PickupSpot);
		Scene.Door = SpawnAt<ADojoM7LockedDoor>(TestWorld, DoorSpot);
		if (!Scene.Runner || !Scene.LeftPlate || !Scene.RightPlate || !Scene.LeftCrate || !Scene.RightCrate || !Scene.Pickup || !Scene.Door) return Scene;

		Scene.Ring = NewObject<UDojoM7KeyRing>(Scene.Runner);
		Scene.Ring->RegisterComponent();

		const FTransform GateTransform(GateSpot);
		Scene.Gate = World->SpawnActorDeferred<ADojoM7PlateGate>(ADojoM7PlateGate::StaticClass(), GateTransform);
		Scene.Gate->Plates.Add(Scene.LeftPlate);
		Scene.Gate->Plates.Add(Scene.RightPlate);
		Scene.Gate->FinishSpawning(GateTransform);

		Scene.Director = World->SpawnActorDeferred<ADojoM7ShrineDirector>(ADojoM7ShrineDirector::StaticClass(), FTransform::Identity);
		Scene.Director->Gate = Scene.Gate;
		Scene.Director->KeyPickup = Scene.Pickup;
		Scene.Director->Door = Scene.Door;
		Scene.Director->Crates.Add(Scene.LeftCrate);
		Scene.Director->Crates.Add(Scene.RightCrate);
		Scene.Director->ResetSeconds = ResetSeconds;
		Scene.Director->FinishSpawning(FTransform::Identity);
		return Scene;
	}

	/** The board's text. */
	FString BoardOf(const FShrineScene& Scene)
	{
		return Scene.Director->Board->Text.ToString();
	}

	/** The board as it should read for a round count, the gate, and a coming reset. */
	FString ExpectedBoard(int32 Rounds, bool bGateOpen, bool bResetting)
	{
		FString Text = FString::Printf(TEXT("Rounds cleared: %d\n%s"), Rounds, bGateOpen ? TEXT("Gate: OPEN") : TEXT("Gate: SHUT"));
		if (bResetting) Text += TEXT("\nResetting");
		return Text;
	}

	/** True when the actor stands within 0.1 of Expected. */
	bool IsAt(const AActor* Actor, const FVector& Expected)
	{
		return Actor && FVector::Dist(Actor->GetActorLocation(), Expected) <= 0.1;
	}

	/** Plays one visit from a fresh shrine to the reset after it; returns false if the round broke. */
	bool PlayRound(FAutomationTestBase& Test, FDojoTestWorld& TestWorld, const FShrineScene& Scene, int32 Round)
	{
		const FString Prefix = FString::Printf(TEXT("Round %d: "), Round);

		Test.TestEqual(Prefix + TEXT("the rounds before this one are counted"), Scene.Director->GetRoundsCleared(), Round - 1);
		Test.TestFalse(Prefix + TEXT("no reset is coming"), Scene.Director->IsResetting());
		Test.TestEqual(Prefix + TEXT("the board starts fresh"), BoardOf(Scene), ExpectedBoard(Round - 1, false, false));
		Test.TestTrue(Prefix + TEXT("the gate starts closed"), FMath::IsNearlyZero(Scene.Gate->GetOpenFraction()));
		Test.TestFalse(Prefix + TEXT("the key waits on its pedestal"), Scene.Pickup->IsTaken());
		Test.TestFalse(Prefix + TEXT("in plain sight"), Scene.Pickup->IsHidden());
		Test.TestFalse(Prefix + TEXT("the door is locked"), Scene.Door->IsOpen());
		Test.TestFalse(Prefix + TEXT("and the runner holds no key"), Scene.Ring->HasKey(TEXT("ShrineKey")));

		Scene.Runner->SetActorLocation(DoorstepSpot);
		Test.TestFalse(Prefix + TEXT("trying the door before the key fails"), Scene.Door->TryOpen(Scene.Runner));
		Test.TestEqual(Prefix + TEXT("and counts a locked try"), Scene.Door->GetLockedTries(), Round);
		Test.TestEqual(Prefix + TEXT("and clears no round"), Scene.Director->GetRoundsCleared(), Round - 1);

		Scene.LeftCrate->SetActorLocation(LeftPlateSpot);
		TestWorld.Tick(60);
		Test.TestTrue(Prefix + TEXT("one crate presses its plate"), Scene.LeftPlate->IsPressed());
		Test.TestTrue(Prefix + TEXT("but one plate of two leaves the gate closed"), FMath::IsNearlyZero(Scene.Gate->GetOpenFraction()));

		Scene.RightCrate->SetActorLocation(RightPlateSpot);
		Test.TestTrue(Prefix + TEXT("with both plates pressed the gate wants to open"), Scene.Gate->WantsOpen());
		TestWorld.Tick(50);
		Test.TestTrue(Prefix + TEXT("and is fully open after 0.8 s and a frame"), Scene.Gate->IsOpen());
		Test.TestEqual(Prefix + TEXT("which the board shows"), BoardOf(Scene), ExpectedBoard(Round - 1, true, false));

		Scene.Runner->SetActorLocation(PickupSpot);
		Test.TestTrue(Prefix + TEXT("the runner takes the key"), Scene.Ring->HasKey(TEXT("ShrineKey")));
		Test.TestTrue(Prefix + TEXT("from the pedestal"), Scene.Pickup->IsTaken());

		Scene.Runner->SetActorLocation(DoorstepSpot);
		if (!Test.TestTrue(Prefix + TEXT("with the key the door opens"), Scene.Door->TryOpen(Scene.Runner))) return false;
		Test.TestEqual(Prefix + TEXT("which clears the round"), Scene.Director->GetRoundsCleared(), Round);
		Test.TestTrue(Prefix + TEXT("and starts the reset clock"), Scene.Director->IsResetting());
		Test.TestEqual(Prefix + TEXT("the board counts the round"), BoardOf(Scene), ExpectedBoard(Round, true, true));
		Test.TestEqual(Prefix + TEXT("and no locked try is added"), Scene.Door->GetLockedTries(), Round);

		TestWorld.Tick(60);
		Test.TestTrue(Prefix + TEXT("one second later nothing is reset yet"), Scene.Director->IsResetting());
		Test.TestTrue(Prefix + TEXT("the door is still open"), Scene.Door->IsOpen());
		Test.TestTrue(Prefix + TEXT("the crates still stand on the plates"), IsAt(Scene.LeftCrate, LeftPlateSpot) && IsAt(Scene.RightCrate, RightPlateSpot));

		TestWorld.Tick(62);
		Test.TestFalse(Prefix + TEXT("after 2 s and a frame the reset has run"), Scene.Director->IsResetting());
		Test.TestTrue(Prefix + TEXT("the crates are home"), IsAt(Scene.LeftCrate, LeftCrateHome) && IsAt(Scene.RightCrate, RightCrateHome));
		Test.TestEqual(Prefix + TEXT("sent home once per round"), Scene.LeftCrate->GetReturns(), Round);
		Test.TestFalse(Prefix + TEXT("the plates are free"), Scene.LeftPlate->IsPressed() || Scene.RightPlate->IsPressed());
		Test.TestFalse(Prefix + TEXT("so the gate no longer wants to open"), Scene.Gate->WantsOpen());
		Test.TestTrue(Prefix + TEXT("and is on its way down"), Scene.Gate->GetOpenFraction() < 1.f);
		Test.TestFalse(Prefix + TEXT("the key is back on its pedestal"), Scene.Pickup->IsTaken());
		Test.TestFalse(Prefix + TEXT("in plain sight"), Scene.Pickup->IsHidden());
		Test.TestFalse(Prefix + TEXT("the door is locked again"), Scene.Door->IsOpen());
		Test.TestEqual(Prefix + TEXT("and keeps its count of locked tries"), Scene.Door->GetLockedTries(), Round);
		Test.TestFalse(Prefix + TEXT("the key is gone from the runner's ring"), Scene.Ring->HasKey(TEXT("ShrineKey")));

		TestWorld.Tick(50);
		Test.TestTrue(Prefix + TEXT("the gate is closed within 0.8 s"), FMath::IsNearlyZero(Scene.Gate->GetOpenFraction()));
		Test.TestEqual(Prefix + TEXT("and the board is ready for the next visitor"), BoardOf(Scene), ExpectedBoard(Round, false, false));

		Scene.Runner->SetActorLocation(RunnerStart);
		return true;
	}
}

IMPLEMENT_SIMPLE_AUTOMATION_TEST(FDojo_M7_Shrine_TwoRoundsPlayAlike, "Dojo.M7.Shrine.TwoRoundsPlayAlike", EAutomationTestFlags::EditorContext | EAutomationTestFlags::ProductFilter)

/** Plays two visits through the shrine and checks the second plays exactly like the first, with both rounds and both locked tries counted. */
bool FDojo_M7_Shrine_TwoRoundsPlayAlike::RunTest(const FString& Parameters)
{
	using namespace DojoM7ShrineTest;

	FDojoTestWorld TestWorld;
	const FShrineScene Scene = MakeShrine(TestWorld, 2.f);
	if (!TestNotNull(TEXT("The shrine was built"), Scene.Director) || !Scene.Gate || !Scene.Ring) return false;

	TestTrue(TEXT("The director listens to the door"), Scene.Door->OnUnlocked.Contains(Scene.Director, TEXT("HandleDoorUnlocked")));

	if (!PlayRound(*this, TestWorld, Scene, 1)) return false;
	if (!PlayRound(*this, TestWorld, Scene, 2)) return false;

	TestEqual(TEXT("Two rounds are cleared"), Scene.Director->GetRoundsCleared(), 2);
	TestEqual(TEXT("and both early tries were counted"), Scene.Door->GetLockedTries(), 2);
	TestEqual(TEXT("The right crate went home once per round too"), Scene.RightCrate->GetReturns(), 2);

	const FProperty* OnRoundCleared = ADojoM7ShrineDirector::StaticClass()->FindPropertyByName(TEXT("OnRoundCleared"));
	if (!TestNotNull(TEXT("OnRoundCleared is a UPROPERTY"), OnRoundCleared)) return false;
	TestTrue(TEXT("Blueprints can bind to OnRoundCleared"), OnRoundCleared->HasAnyPropertyFlags(CPF_BlueprintAssignable));

	return true;
}

IMPLEMENT_SIMPLE_AUTOMATION_TEST(FDojo_M7_Shrine_ResetFollowsTheKnob, "Dojo.M7.Shrine.ResetFollowsTheKnob", EAutomationTestFlags::EditorContext | EAutomationTestFlags::ProductFilter)

/** Shortens the reset pause in Details, checks the reset follows it, and checks a destroyed director stops listening and cancels its reset. */
bool FDojo_M7_Shrine_ResetFollowsTheKnob::RunTest(const FString& Parameters)
{
	using namespace DojoM7ShrineTest;

	FDojoTestWorld TestWorld;
	const FShrineScene Scene = MakeShrine(TestWorld, 0.5f);
	if (!TestNotNull(TEXT("The shrine was built"), Scene.Director) || !Scene.Gate || !Scene.Ring) return false;

	Scene.Ring->AddKey(TEXT("ShrineKey"));
	Scene.Runner->SetActorLocation(DoorstepSpot);
	TestTrue(TEXT("A runner given the key opens the door"), Scene.Door->TryOpen(Scene.Runner));
	TestEqual(TEXT("which clears a round"), Scene.Director->GetRoundsCleared(), 1);

	TestWorld.Tick(20);
	TestTrue(TEXT("A third of a second later the door is still open"), Scene.Door->IsOpen());
	TestWorld.Tick(15);
	TestFalse(TEXT("After the half second set in Details it is locked again"), Scene.Door->IsOpen());
	TestFalse(TEXT("and the key is off the ring"), Scene.Ring->HasKey(TEXT("ShrineKey")));
	TestFalse(TEXT("and no reset is pending"), Scene.Director->IsResetting());

	Scene.Ring->AddKey(TEXT("ShrineKey"));
	TestTrue(TEXT("The door opens for a second visit"), Scene.Door->TryOpen(Scene.Runner));
	TestEqual(TEXT("which clears a second round"), Scene.Director->GetRoundsCleared(), 2);

	Scene.Director->Destroy();
	TestFalse(TEXT("A destroyed director no longer listens to the door"), Scene.Door->OnUnlocked.Contains(Scene.Director, TEXT("HandleDoorUnlocked")));
	TestWorld.Tick(60);
	TestTrue(TEXT("and its pending reset never runs, so the door stays open"), Scene.Door->IsOpen());
	TestTrue(TEXT("and the key stays on the ring"), Scene.Ring->HasKey(TEXT("ShrineKey")));

	return true;
}

#endif
