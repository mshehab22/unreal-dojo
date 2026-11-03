#include "Misc/AutomationTest.h"

#if WITH_AUTOMATION_TESTS

#include "Components/CapsuleComponent.h"
#include "Components/TextRenderComponent.h"
#include "EngineUtils.h"
#include "Quests/m5-boss-watchtower/DojoM5Pillar.h"
#include "Quests/m5-boss-watchtower/DojoM5Tower.h"
#include "Quests/m5-laser/DojoM5Laser.h"
#include "Quests/m5-sightline/DojoM5Eye.h"
#include "Support/DojoTestActor.h"
#include "Support/DojoTestWorld.h"

namespace DojoM5TowerTest
{
	/** The hero stands here behind the pillar, out of both sentries' sight. */
	const FVector HiddenSpot(700.f, 0.f, 0.f);

	/** The hero stands here in the open, seen by both sentries and clear of the laser. */
	const FVector SeenSpot(1150.f, 0.f, 0.f);

	/** The hero stands here on the laser beam. */
	const FVector BeamSpot(1300.f, 0.f, 0.f);

	/** A hero and the tower that watches it. */
	struct FYardScene
	{
		ADojoTestActor* Hero = nullptr;
		ADojoM5Tower* Tower = nullptr;
	};

	/** Spawns a hero: a capsule with the collision settings a game character's capsule has. */
	ADojoTestActor* SpawnHero(FDojoTestWorld& TestWorld)
	{
		ADojoTestActor* Hero = TestWorld.SpawnActor<ADojoTestActor>();
		if (!Hero) return nullptr;

		UCapsuleComponent* Capsule = TestWorld.AddComponent<UCapsuleComponent>(Hero);
		Capsule->SetCapsuleSize(34.f, 88.f);
		Capsule->SetCollisionEnabled(ECollisionEnabled::QueryAndPhysics);
		Capsule->SetCollisionObjectType(ECC_Pawn);
		Capsule->SetCollisionResponseToAllChannels(ECR_Block);
		Capsule->SetCollisionResponseToChannel(ECC_Visibility, ECR_Ignore);
		Capsule->AttachToComponent(Hero->GetRootComponent(), FAttachmentTransformRules::SnapToTargetNotIncludingScale);
		return Hero;
	}

	/** Builds a tower around a hero, wired the way a designer wires it in Details, after Configure has changed any settings; the first round starts at BeginPlay. */
	FYardScene MakeYard(FDojoTestWorld& TestWorld, TFunctionRef<void(ADojoM5Tower&)> Configure)
	{
		FYardScene Scene;
		Scene.Hero = SpawnHero(TestWorld);
		Scene.Tower = TestWorld.GetWorld()->SpawnActorDeferred<ADojoM5Tower>(ADojoM5Tower::StaticClass(), FTransform::Identity);
		Scene.Tower->Hero = Scene.Hero;
		Configure(*Scene.Tower);
		Scene.Tower->FinishSpawning(FTransform::Identity);
		return Scene;
	}

	/** Builds a tower with all its default settings. */
	FYardScene MakeYard(FDojoTestWorld& TestWorld)
	{
		return MakeYard(TestWorld, [](ADojoM5Tower&) {});
	}

	/** The board's text. */
	FString BoardOf(const FYardScene& Scene)
	{
		return Scene.Tower->Board->Text.ToString();
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

	/** Plays one round from its first moment to its finish and returns the finish time, or -1 if the round broke. */
	float PlayRound(FAutomationTestBase& Test, FDojoTestWorld& TestWorld, const FYardScene& Scene, const FString& Round)
	{
		const FString Prefix = Round + TEXT(": ");

		if (!Test.TestTrue(Prefix + TEXT("the round is running"), Scene.Tower->IsRunning())) return -1.f;
		Test.TestEqual(Prefix + TEXT("no alarms yet"), Scene.Tower->GetAlarms(), 0);
		Test.TestEqual(Prefix + TEXT("no zaps yet"), Scene.Tower->GetZaps(), 0);
		Test.TestEqual(Prefix + TEXT("the awareness starts empty"), Scene.Tower->GetMeter(), 0.f, 0.001f);
		Test.TestEqual(Prefix + TEXT("the board starts at zero"), BoardOf(Scene), FString(TEXT("Alarms: 0, Zaps: 0")));
		Test.TestTrue(Prefix + TEXT("the hero starts at the gate"), IsNear(Scene.Hero, FVector::ZeroVector, 0.1));
		Test.TestEqual(Prefix + TEXT("two sentries stand in the yard"), CountActors<ADojoM5Eye>(TestWorld), 2);
		Test.TestEqual(Prefix + TEXT("one laser stands in the yard"), CountActors<ADojoM5Laser>(TestWorld), 1);
		Test.TestEqual(Prefix + TEXT("one pillar stands in the yard"), CountActors<ADojoM5Pillar>(TestWorld), 1);
		if (!Scene.Tower->GetSentry(0) || !Scene.Tower->GetSentry(1)) return -1.f;
		Test.TestTrue(Prefix + TEXT("the first sentry stands at its post"), IsNear(Scene.Tower->GetSentry(0), FVector(800.f, -600.f, 0.f), 0.1));
		Test.TestTrue(Prefix + TEXT("the second sentry stands at its post"), IsNear(Scene.Tower->GetSentry(1), FVector(1400.f, 600.f, 0.f), 0.1));
		Test.TestTrue(Prefix + TEXT("the laser stands at its post"), IsNear(Scene.Tower->GetLaser(), FVector(1300.f, -500.f, 0.f), 0.1));

		Scene.Hero->SetActorLocation(HiddenSpot);
		TestWorld.Tick(60);
		Test.TestEqual(Prefix + TEXT("behind the pillar the awareness stays empty"), Scene.Tower->GetMeter(), 0.f, 0.01f);
		Test.TestEqual(Prefix + TEXT("and no alarm sounds"), Scene.Tower->GetAlarms(), 0);

		Scene.Hero->SetActorLocation(SeenSpot);
		TestWorld.Tick(30);
		Test.TestTrue(Prefix + TEXT("half a second in the open fills about half the awareness"), Scene.Tower->GetMeter() > 0.3f && Scene.Tower->GetMeter() < 0.7f);
		Test.TestEqual(Prefix + TEXT("with no alarm yet"), Scene.Tower->GetAlarms(), 0);

		Scene.Hero->SetActorLocation(HiddenSpot);
		TestWorld.Tick(24);
		Test.TestTrue(Prefix + TEXT("hiding again drains it, but not all the way in 0.4 seconds"), Scene.Tower->GetMeter() > 0.05f && Scene.Tower->GetMeter() < 0.5f);

		Test.TestFalse(Prefix + TEXT("R does nothing mid-round"), Scene.Tower->PressRestart());

		Scene.Hero->SetActorLocation(BeamSpot);
		TestWorld.Tick(12);
		Test.TestEqual(Prefix + TEXT("standing in the beam is a zap"), Scene.Tower->GetZaps(), 1);
		Test.TestTrue(Prefix + TEXT("a zap sends the hero back to the gate"), IsNear(Scene.Hero, FVector::ZeroVector, 0.1));
		Test.TestEqual(Prefix + TEXT("a zap is not an alarm"), Scene.Tower->GetAlarms(), 0);
		Test.TestEqual(Prefix + TEXT("the board shows the zap"), BoardOf(Scene), FString(TEXT("Alarms: 0, Zaps: 1")));

		Scene.Hero->SetActorLocation(SeenSpot);
		TestWorld.Tick(90);
		Test.TestEqual(Prefix + TEXT("a second and a half in the open fills the awareness and raises one alarm"), Scene.Tower->GetAlarms(), 1);
		Test.TestTrue(Prefix + TEXT("an alarm sends the hero back to the gate"), IsNear(Scene.Hero, FVector::ZeroVector, 0.1));
		Test.TestEqual(Prefix + TEXT("and empties the awareness"), Scene.Tower->GetMeter(), 0.f, 0.01f);
		Test.TestEqual(Prefix + TEXT("the board shows the alarm and the zap"), BoardOf(Scene), FString(TEXT("Alarms: 1, Zaps: 1")));

		Scene.Hero->SetActorLocation(FVector(1900.f, 0.f, 0.f));
		TestWorld.Tick(12);
		Test.TestTrue(Prefix + TEXT("1900 is short of the exit, so the round goes on"), Scene.Tower->IsRunning());

		Scene.Hero->SetActorLocation(FVector(2100.f, 0.f, 0.f));
		TestWorld.Tick(12);
		if (!Test.TestFalse(Prefix + TEXT("past 2000 the round is finished"), Scene.Tower->IsRunning())) return -1.f;

		const float FinishSeconds = Scene.Tower->GetRoundSeconds();
		Test.TestTrue(Prefix + TEXT("the finish time is the time the round took"), FinishSeconds > 3.6f && FinishSeconds < 4.2f);
		Test.TestEqual(Prefix + TEXT("the board calls the finish with the time, the alarms, and the zaps"), BoardOf(Scene), FString::Printf(TEXT("CLEAR in %.1f s, 1 alarms, 1 zaps"), FinishSeconds));

		Scene.Hero->SetActorLocation(BeamSpot);
		TestWorld.Tick(120);
		Test.TestEqual(Prefix + TEXT("a finished round counts no more zaps"), Scene.Tower->GetZaps(), 1);
		Test.TestEqual(Prefix + TEXT("and no more alarms"), Scene.Tower->GetAlarms(), 1);
		Test.TestEqual(Prefix + TEXT("the finish time stays frozen"), Scene.Tower->GetRoundSeconds(), FinishSeconds);

		return FinishSeconds;
	}
}

IMPLEMENT_SIMPLE_AUTOMATION_TEST(FDojo_M5_Watchtower_TwoRoundsPlayAlike, "Dojo.M5.Watchtower.TwoRoundsPlayAlike", EAutomationTestFlags::EditorContext | EAutomationTestFlags::ProductFilter)

/** Plays a whole round, restarts with R, and checks the second round plays exactly like the first. */
bool FDojo_M5_Watchtower_TwoRoundsPlayAlike::RunTest(const FString& Parameters)
{
	using namespace DojoM5TowerTest;

	FDojoTestWorld TestWorld;
	const FYardScene Scene = MakeYard(TestWorld);
	if (!TestNotNull(TEXT("The tower spawned"), Scene.Tower)) return false;

	const float First = PlayRound(*this, TestWorld, Scene, TEXT("Round 1"));
	if (First < 0.f) return false;

	if (!TestTrue(TEXT("R starts a fresh round after the finish"), Scene.Tower->PressRestart())) return false;
	const float Second = PlayRound(*this, TestWorld, Scene, TEXT("Round 2"));
	if (Second < 0.f) return false;

	TestTrue(TEXT("The second round took as long as the first, give or take one check"), FMath::IsNearlyEqual(First, Second, 0.12f));

	return true;
}

IMPLEMENT_SIMPLE_AUTOMATION_TEST(FDojo_M5_Watchtower_SentriesSeeOnlyWhatTheyCanSee, "Dojo.M5.Watchtower.SentriesSeeOnlyWhatTheyCanSee", EAutomationTestFlags::EditorContext | EAutomationTestFlags::ProductFilter)

/** Moves the hero between the open, the pillar's shadow, and the far side of the cone, and checks the awareness rises and falls at the set rates. */
bool FDojo_M5_Watchtower_SentriesSeeOnlyWhatTheyCanSee::RunTest(const FString& Parameters)
{
	using namespace DojoM5TowerTest;

	FDojoTestWorld TestWorld;
	const FYardScene Scene = MakeYard(TestWorld);
	if (!TestNotNull(TEXT("The tower spawned"), Scene.Tower)) return false;

	Scene.Hero->SetActorLocation(HiddenSpot);
	TestWorld.Tick(120);
	TestEqual(TEXT("The pillar hides the hero from the first sentry and the second cannot see round to it, so nothing fills"), Scene.Tower->GetMeter(), 0.f, 0.01f);

	Scene.Hero->SetActorLocation(SeenSpot);
	TestWorld.Tick(30);
	const float Filled = Scene.Tower->GetMeter();
	TestTrue(TEXT("In the open it fills at about 1 a second, half in half a second"), Filled > 0.3f && Filled < 0.7f);

	Scene.Hero->SetActorLocation(HiddenSpot);
	TestWorld.Tick(30);
	const float Drained = Scene.Tower->GetMeter();
	TestTrue(TEXT("Hiding drains it at about half that rate, a quarter in half a second"), Drained < Filled && Filled - Drained > 0.15f && Filled - Drained < 0.35f);

	Scene.Hero->SetActorLocation(FVector(100.f, 0.f, 0.f));
	TestWorld.Tick(200);
	TestEqual(TEXT("Near the gate, outside both cones, it drains away to nothing and stays there"), Scene.Tower->GetMeter(), 0.f, 0.001f);

	return true;
}

IMPLEMENT_SIMPLE_AUTOMATION_TEST(FDojo_M5_Watchtower_SightAndFillAreTunable, "Dojo.M5.Watchtower.SightAndFillAreTunable", EAutomationTestFlags::EditorContext | EAutomationTestFlags::ProductFilter)

/** Spawns one tower with a short sight and one with a fast fill, and checks that each setting changes what the yard does. */
bool FDojo_M5_Watchtower_SightAndFillAreTunable::RunTest(const FString& Parameters)
{
	using namespace DojoM5TowerTest;

	{
		FDojoTestWorld ShortSight;
		const FYardScene Scene = MakeYard(ShortSight, [](ADojoM5Tower& Tower) { Tower.SightRange = 300.f; });
		if (!TestNotNull(TEXT("The short-sighted tower spawned"), Scene.Tower)) return false;

		Scene.Hero->SetActorLocation(SeenSpot);
		ShortSight.Tick(150);
		TestEqual(TEXT("With a sight of 300 the open spot is out of range, so nothing fills"), Scene.Tower->GetMeter(), 0.f, 0.001f);
		TestEqual(TEXT("and no alarm sounds"), Scene.Tower->GetAlarms(), 0);
	}

	{
		FDojoTestWorld FastFill;
		const FYardScene Scene = MakeYard(FastFill, [](ADojoM5Tower& Tower) { Tower.FillPerSecond = 5.f; });
		if (!TestNotNull(TEXT("The quick-filling tower spawned"), Scene.Tower)) return false;

		Scene.Hero->SetActorLocation(SeenSpot);
		FastFill.Tick(36);
		TestEqual(TEXT("At 5 a second a third of a second in the open is enough for an alarm"), Scene.Tower->GetAlarms(), 1);
	}

	return true;
}

IMPLEMENT_SIMPLE_AUTOMATION_TEST(FDojo_M5_Watchtower_ExitAndZapReachAreTunable, "Dojo.M5.Watchtower.ExitAndZapReachAreTunable", EAutomationTestFlags::EditorContext | EAutomationTestFlags::ProductFilter)

/** Moves the exit nearer and widens the beam's reach in two towers and checks each setting changes what the yard does. */
bool FDojo_M5_Watchtower_ExitAndZapReachAreTunable::RunTest(const FString& Parameters)
{
	using namespace DojoM5TowerTest;

	{
		FDojoTestWorld NearExit;
		const FYardScene Scene = MakeYard(NearExit, [](ADojoM5Tower& Tower) { Tower.ExitX = 1000.f; });
		if (!TestNotNull(TEXT("The tower with the near exit spawned"), Scene.Tower)) return false;

		Scene.Hero->SetActorLocation(FVector(1050.f, 0.f, 0.f));
		NearExit.Tick(12);
		TestFalse(TEXT("With the exit at 1000 the round ends at 1050"), Scene.Tower->IsRunning());
	}

	{
		FDojoTestWorld WideBeam;
		const FYardScene Scene = MakeYard(WideBeam, [](ADojoM5Tower& Tower) { Tower.ZapRadius = 200.f; });
		if (!TestNotNull(TEXT("The tower with the wide beam spawned"), Scene.Tower)) return false;

		Scene.Hero->SetActorLocation(SeenSpot);
		WideBeam.Tick(12);
		TestEqual(TEXT("A hero 150 units from the beam is zapped when the zap radius is 200"), Scene.Tower->GetZaps(), 1);
	}

	{
		FDojoTestWorld DefaultBeam;
		const FYardScene Scene = MakeYard(DefaultBeam);
		if (!TestNotNull(TEXT("The default tower spawned"), Scene.Tower)) return false;

		Scene.Hero->SetActorLocation(FVector(1200.f, 0.f, 0.f));
		DefaultBeam.Tick(12);
		TestEqual(TEXT("A hero 100 units from the beam is safe with the default radius of 60"), Scene.Tower->GetZaps(), 0);
	}

	return true;
}

#endif
