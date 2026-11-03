#include "Misc/AutomationTest.h"

#if WITH_AUTOMATION_TESTS

#include "Components/TextRenderComponent.h"
#include "EngineUtils.h"
#include "Quests/m3-boss-vault-room/DojoM3VaultRoom.h"
#include "Quests/m3-checkpoint/DojoM3Checkpoint.h"
#include "Quests/m3-checkpoint/DojoM3Runner.h"
#include "Quests/m3-pawn-gate/DojoM3Gate.h"
#include "Quests/m3-return-pit/DojoM3Pit.h"
#include "Quests/m3-scale-plate/DojoM3Crate.h"
#include "Quests/m3-scale-plate/DojoM3Plate.h"
#include "Support/DojoTestWorld.h"

namespace DojoM3VaultRoomTest
{
	/** A runner and the room that plays with it. */
	struct FRoomScene
	{
		ADojoM3Runner* Runner = nullptr;
		ADojoM3VaultRoom* Room = nullptr;
	};

	/** Builds a room around a runner, wired the way a designer wires it in Details; the first round starts at BeginPlay. */
	FRoomScene MakeRoom(FDojoTestWorld& TestWorld)
	{
		FRoomScene Scene;
		Scene.Runner = TestWorld.GetWorld()->SpawnActor<ADojoM3Runner>(FVector(-3000.0, 0.0, 0.0), FRotator::ZeroRotator);
		Scene.Room = TestWorld.GetWorld()->SpawnActorDeferred<ADojoM3VaultRoom>(ADojoM3VaultRoom::StaticClass(), FTransform::Identity);
		Scene.Room->Runner = Scene.Runner;
		Scene.Room->FinishSpawning(FTransform::Identity);
		return Scene;
	}

	/** The board's text. */
	FString BoardOf(const FRoomScene& Scene)
	{
		return Scene.Room->Board->Text.ToString();
	}

	/** True when the actor exists and stands within Tolerance of Expected. */
	bool IsNear(const AActor* Actor, const FVector& Expected, double Tolerance)
	{
		return Actor && FVector::Dist(Actor->GetActorLocation(), Expected) <= Tolerance;
	}

	/** How many live actors of a class the world holds. */
	template<typename TActor>
	int32 CountActors(FDojoTestWorld& TestWorld)
	{
		int32 Count = 0;
		for (TActorIterator<TActor> It(TestWorld.GetWorld()); It; ++It) ++Count;
		return Count;
	}

	/** Plays one round from its first moment to the vault and returns the finish time, or -1 if the round broke. */
	float PlayRound(FAutomationTestBase& Test, FDojoTestWorld& TestWorld, const FRoomScene& Scene, const FString& Round)
	{
		const FString Prefix = Round + TEXT(": ");
		ADojoM3VaultRoom* Room = Scene.Room;
		ADojoM3Runner* Runner = Scene.Runner;

		if (!Test.TestTrue(Prefix + TEXT("the round is running"), Room->IsRunning())) return -1.f;
		Test.TestEqual(Prefix + TEXT("no falls yet"), Room->GetFalls(), 0);
		Test.TestEqual(Prefix + TEXT("the board starts empty"), BoardOf(Scene), FString(TEXT("Plate 0 / 2, falls 0")));
		Test.TestTrue(Prefix + TEXT("the runner starts at the entrance"), IsNear(Runner, FVector::ZeroVector, 0.1));
		Test.TestTrue(Prefix + TEXT("and comes back there until it reaches a flag"), Runner->GetRespawnPoint().Equals(FVector::ZeroVector, 0.1));
		Test.TestEqual(Prefix + TEXT("one flag stands in the room"), CountActors<ADojoM3Checkpoint>(TestWorld), 1);
		Test.TestEqual(Prefix + TEXT("one plate stands in the room"), CountActors<ADojoM3Plate>(TestWorld), 1);
		Test.TestEqual(Prefix + TEXT("one gate stands in the room"), CountActors<ADojoM3Gate>(TestWorld), 1);
		Test.TestEqual(Prefix + TEXT("one pit is dug in the room"), CountActors<ADojoM3Pit>(TestWorld), 1);
		Test.TestEqual(Prefix + TEXT("no crate exists yet"), CountActors<ADojoM3Crate>(TestWorld), 0);
		if (!Room->GetFlag() || !Room->GetPlate() || !Room->GetGate() || !Room->GetPit()) return -1.f;

		Test.TestTrue(Prefix + TEXT("the flag stands at 600"), IsNear(Room->GetFlag(), FVector(600.0, 0.0, 0.0), 0.1));
		Test.TestTrue(Prefix + TEXT("the plate stands at 900, 500"), IsNear(Room->GetPlate(), FVector(900.0, 500.0, 0.0), 0.1));
		Test.TestTrue(Prefix + TEXT("the pit is at 900, -500"), IsNear(Room->GetPit(), FVector(900.0, -500.0, 0.0), 0.1));
		Test.TestTrue(Prefix + TEXT("the gate stands at 1200"), IsNear(Room->GetGate(), FVector(1200.0, 0.0, 0.0), 0.1));
		Test.TestFalse(Prefix + TEXT("the flag is fresh"), Room->GetFlag()->IsReached());
		Test.TestTrue(Prefix + TEXT("the gate starts shut"), Room->GetGate()->IsBlockingPawns());

		Runner->AddActorWorldOffset(FVector(1500.0, 0.0, 0.0), true);
		Test.TestTrue(Prefix + TEXT("running down the hall passes the flag"), Room->GetFlag()->IsReached());
		Test.TestTrue(Prefix + TEXT("which becomes the respawn point"), Runner->GetRespawnPoint().Equals(FVector(600.0, 0.0, 0.0), 0.1));
		Test.TestTrue(Prefix + TEXT("and the shut gate stops the runner"), Runner->GetActorLocation().X > 1110.0 && Runner->GetActorLocation().X < 1121.0);
		Test.TestTrue(Prefix + TEXT("so the round goes on"), Room->IsRunning());
		TestWorld.Tick(30);

		Test.TestTrue(Prefix + TEXT("the lever drops a first crate"), Room->PressDispense());
		Test.TestTrue(Prefix + TEXT("and a second"), Room->PressDispense());
		Test.TestFalse(Prefix + TEXT("but never a third"), Room->PressDispense());
		const TArray<ADojoM3Crate*> Crates = Room->GetCrates();
		if (!Test.TestEqual(Prefix + TEXT("two crates are in the room"), Crates.Num(), 2)) return -1.f;
		Test.TestEqual(Prefix + TEXT("and no others"), CountActors<ADojoM3Crate>(TestWorld), 2);
		Test.TestTrue(Prefix + TEXT("crates appear at the chute"), IsNear(Crates[0], FVector(300.0, 500.0, 0.0), 0.1));

		Test.TestFalse(Prefix + TEXT("R does nothing mid-round"), Room->PressRestart());
		Test.TestEqual(Prefix + TEXT("and leaves the crates alone"), CountActors<ADojoM3Crate>(TestWorld), 2);

		Crates[0]->SetActorLocation(FVector(900.0, 500.0, 0.0));
		Test.TestEqual(Prefix + TEXT("one crate on the plate shows on the board"), BoardOf(Scene), FString(TEXT("Plate 1 / 2, falls 0")));
		Test.TestTrue(Prefix + TEXT("and leaves the gate shut"), Room->GetGate()->IsBlockingPawns());

		Runner->SetActorLocation(FVector(950.0, 430.0, 0.0));
		Test.TestEqual(Prefix + TEXT("a crate and the runner on the plate make two"), BoardOf(Scene), FString(TEXT("Plate 2 / 2, falls 0")));
		Test.TestTrue(Prefix + TEXT("and open the gate"), Room->GetGate()->IsOpen());

		Runner->SetActorLocation(FVector(1000.0, 0.0, 0.0));
		Test.TestEqual(Prefix + TEXT("stepping off drops the plate to one"), BoardOf(Scene), FString(TEXT("Plate 1 / 2, falls 0")));
		Test.TestTrue(Prefix + TEXT("and shuts the gate behind the runner"), Room->GetGate()->IsBlockingPawns());
		TestWorld.Tick(30);

		Crates[1]->SetActorLocation(FVector(900.0, -500.0, 0.0));
		Test.TestTrue(Prefix + TEXT("a crate in the pit comes back to the chute"), IsNear(Crates[1], FVector(300.0, 500.0, 0.0), 0.1));
		Test.TestEqual(Prefix + TEXT("and is not a fall"), Room->GetFalls(), 0);

		Runner->SetActorLocation(FVector(900.0, -500.0, 0.0));
		Test.TestTrue(Prefix + TEXT("the runner in the pit comes back at the flag"), IsNear(Runner, FVector(600.0, 0.0, 0.0), 0.1));
		Test.TestEqual(Prefix + TEXT("and that is a fall"), Room->GetFalls(), 1);
		Test.TestEqual(Prefix + TEXT("which the board shows"), BoardOf(Scene), FString(TEXT("Plate 1 / 2, falls 1")));

		Crates[1]->SetActorLocation(FVector(830.0, 430.0, 0.0));
		Test.TestEqual(Prefix + TEXT("two crates on the plate make two"), BoardOf(Scene), FString(TEXT("Plate 2 / 2, falls 1")));
		Test.TestTrue(Prefix + TEXT("and hold the gate open"), Room->GetGate()->IsOpen());
		TestWorld.Tick(30);

		Runner->AddActorWorldOffset(FVector(1000.0, 0.0, 0.0), true);
		Test.TestTrue(Prefix + TEXT("the runner walks through the open gate into the vault"), IsNear(Runner, FVector(1600.0, 0.0, 0.0), 0.5));
		if (!Test.TestFalse(Prefix + TEXT("reaching the vault ends the round"), Room->IsRunning())) return -1.f;

		const float FinishSeconds = Room->GetRoundSeconds();
		Test.TestTrue(Prefix + TEXT("the finish time is the time the round took"), FinishSeconds > 1.4f && FinishSeconds < 1.6f);
		Test.TestEqual(Prefix + TEXT("the board calls the finish with the time and the falls"), BoardOf(Scene), FString::Printf(TEXT("VAULT in %.1f s, 1 falls"), FinishSeconds));

		Runner->SetActorLocation(FVector(900.0, -500.0, 0.0));
		TestWorld.Tick(60);
		Test.TestEqual(Prefix + TEXT("a finished round counts no more falls"), Room->GetFalls(), 1);
		Test.TestEqual(Prefix + TEXT("the finish time stays frozen"), Room->GetRoundSeconds(), FinishSeconds);
		Test.TestFalse(Prefix + TEXT("and the lever does nothing"), Room->PressDispense());

		return FinishSeconds;
	}
}

IMPLEMENT_SIMPLE_AUTOMATION_TEST(FDojo_M3_VaultRoom_TwoRoundsPlayAlike, "Dojo.M3.VaultRoom.TwoRoundsPlayAlike", EAutomationTestFlags::EditorContext | EAutomationTestFlags::ProductFilter)

/** Plays a whole round, restarts with R, and checks the second round plays exactly like the first. */
bool FDojo_M3_VaultRoom_TwoRoundsPlayAlike::RunTest(const FString& Parameters)
{
	using namespace DojoM3VaultRoomTest;

	FDojoTestWorld TestWorld;
	const FRoomScene Scene = MakeRoom(TestWorld);
	if (!TestNotNull(TEXT("The room spawned"), Scene.Room)) return false;

	const float First = PlayRound(*this, TestWorld, Scene, TEXT("Round 1"));
	if (First < 0.f) return false;

	if (!TestTrue(TEXT("R starts a fresh round after the vault"), Scene.Room->PressRestart())) return false;
	const float Second = PlayRound(*this, TestWorld, Scene, TEXT("Round 2"));
	if (Second < 0.f) return false;

	TestTrue(TEXT("The second round took as long as the first"), FMath::IsNearlyEqual(First, Second, 0.05f));

	return true;
}

IMPLEMENT_SIMPLE_AUTOMATION_TEST(FDojo_M3_VaultRoom_CratesNeverReachTheVault, "Dojo.M3.VaultRoom.CratesNeverReachTheVault", EAutomationTestFlags::EditorContext | EAutomationTestFlags::ProductFilter)

/** Holds the gate open with the runner and a crate on the plate, then pushes the other crate at the gate and into the vault's space. */
bool FDojo_M3_VaultRoom_CratesNeverReachTheVault::RunTest(const FString& Parameters)
{
	using namespace DojoM3VaultRoomTest;

	FDojoTestWorld TestWorld;
	const FRoomScene Scene = MakeRoom(TestWorld);
	if (!TestNotNull(TEXT("The room spawned"), Scene.Room) || !Scene.Room->GetGate()) return false;

	Scene.Room->PressDispense();
	Scene.Room->PressDispense();
	const TArray<ADojoM3Crate*> Crates = Scene.Room->GetCrates();
	if (!TestEqual(TEXT("Two crates dropped"), Crates.Num(), 2)) return false;

	Crates[0]->SetActorLocation(FVector(870.0, 470.0, 0.0));
	Scene.Runner->SetActorLocation(FVector(950.0, 530.0, 0.0));
	TestTrue(TEXT("A crate and the runner hold the gate open"), Scene.Room->GetGate()->IsOpen());

	Crates[1]->SetActorLocation(FVector(1000.0, 0.0, 0.0));
	Crates[1]->AddActorWorldOffset(FVector(800.0, 0.0, 0.0), true);
	TestTrue(TEXT("A crate pushed at the open gate is stopped at its face"), Crates[1]->GetActorLocation().X < 1121.0);

	Crates[1]->SetActorLocation(FVector(1600.0, 0.0, 0.0));
	TestTrue(TEXT("Even a crate dropped straight into the vault does not end the round"), Scene.Room->IsRunning());
	Crates[1]->SetActorLocation(FVector(900.0, -500.0, 0.0));
	TestTrue(TEXT("A crate dropped in the pit goes back to the chute"), Crates[1]->GetActorLocation().Equals(FVector(300.0, 500.0, 0.0), 0.1));
	TestEqual(TEXT("and is never a fall"), Scene.Room->GetFalls(), 0);

	return true;
}

IMPLEMENT_SIMPLE_AUTOMATION_TEST(FDojo_M3_VaultRoom_GateWaitsForTheDoorway, "Dojo.M3.VaultRoom.GateWaitsForTheDoorway", EAutomationTestFlags::EditorContext | EAutomationTestFlags::ProductFilter)

/** Takes a crate off the plate while the runner stands in the gateway and checks the gate waits for the runner to leave. */
bool FDojo_M3_VaultRoom_GateWaitsForTheDoorway::RunTest(const FString& Parameters)
{
	using namespace DojoM3VaultRoomTest;

	FDojoTestWorld TestWorld;
	const FRoomScene Scene = MakeRoom(TestWorld);
	if (!TestNotNull(TEXT("The room spawned"), Scene.Room) || !Scene.Room->GetGate()) return false;

	Scene.Room->PressDispense();
	Scene.Room->PressDispense();
	const TArray<ADojoM3Crate*> Crates = Scene.Room->GetCrates();
	if (!TestEqual(TEXT("Two crates dropped"), Crates.Num(), 2)) return false;

	Crates[0]->SetActorLocation(FVector(870.0, 470.0, 0.0));
	Crates[1]->SetActorLocation(FVector(940.0, 540.0, 0.0));
	TestTrue(TEXT("Two crates open the gate"), Scene.Room->GetGate()->IsOpen());

	Scene.Runner->SetActorLocation(FVector(1200.0, 0.0, 0.0));
	Crates[1]->SetActorLocation(FVector(300.0, 500.0, 0.0));
	TestFalse(TEXT("Taking a crate off closes the gate"), Scene.Room->GetGate()->IsOpen());
	TestFalse(TEXT("but it does not turn solid around the runner in the doorway"), Scene.Room->GetGate()->IsBlockingPawns());

	Scene.Runner->SetActorLocation(FVector(1000.0, 0.0, 0.0));
	TestTrue(TEXT("Once the runner steps back out, the gate is solid"), Scene.Room->GetGate()->IsBlockingPawns());

	Scene.Runner->AddActorWorldOffset(FVector(600.0, 0.0, 0.0), true);
	TestTrue(TEXT("and the runner cannot reach the vault"), Scene.Room->IsRunning());
	TestEqual(TEXT("The board shows the plate at one"), BoardOf(Scene), FString(TEXT("Plate 1 / 2, falls 0")));

	return true;
}

#endif
