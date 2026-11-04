#include "Misc/AutomationTest.h"

#if WITH_AUTOMATION_TESTS

#include "Components/TextRenderComponent.h"
#include "EngineUtils.h"
#include "Quests/m2-boss-clockwork-hall/DojoM2Hall.h"
#include "Quests/m2-bumper/DojoM2Bumper.h"
#include "Quests/m2-bumper/DojoM2Wall.h"
#include "Quests/m2-dart/DojoM2Dart.h"
#include "Quests/m2-patrol/DojoM2Patrol.h"
#include "Quests/m2-sled/DojoM2Sled.h"
#include "Support/DojoTestActor.h"
#include "Support/DojoTestWorld.h"

namespace DojoM2HallTest
{
	/** A hero and the hall that watches it. */
	struct FHallScene
	{
		ADojoTestActor* Hero = nullptr;
		ADojoM2Hall* Hall = nullptr;
	};

	/** Builds a hall around a hero, wired the way a designer wires it in Details; the first round starts at BeginPlay. */
	FHallScene MakeHall(FDojoTestWorld& TestWorld)
	{
		FHallScene Scene;
		Scene.Hero = TestWorld.SpawnActor<ADojoTestActor>();
		Scene.Hall = TestWorld.GetWorld()->SpawnActorDeferred<ADojoM2Hall>(ADojoM2Hall::StaticClass(), FTransform::Identity);
		Scene.Hall->Hero = Scene.Hero;
		Scene.Hall->FinishSpawning(FTransform::Identity);
		return Scene;
	}

	/** The board's text. */
	FString BoardOf(const FHallScene& Scene)
	{
		return Scene.Hall->Board->Text.ToString();
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
	float PlayRound(FAutomationTestBase& Test, FDojoTestWorld& TestWorld, const FHallScene& Scene, const FString& Round)
	{
		const FString Prefix = Round + TEXT(": ");

		if (!Test.TestTrue(Prefix + TEXT("the round is running"), Scene.Hall->IsRunning())) return -1.f;
		Test.TestEqual(Prefix + TEXT("no hits yet"), Scene.Hall->GetHits(), 0);
		Test.TestEqual(Prefix + TEXT("the board starts at zero hits"), BoardOf(Scene), FString(TEXT("Hits: 0")));
		Test.TestTrue(Prefix + TEXT("the hero starts at the gate"), IsNear(Scene.Hero, FVector::ZeroVector, 0.1));
		Test.TestTrue(Prefix + TEXT("the crusher waits at its start"), IsNear(Scene.Hall->GetCrusher(), FVector(500.f, -300.f, 0.f), 0.1));
		Test.TestTrue(Prefix + TEXT("the boulder waits at its start"), IsNear(Scene.Hall->GetBoulder(), FVector(1000.f, -700.f, 0.f), 0.1));
		Test.TestTrue(Prefix + TEXT("the bouncer waits in the middle of its channel"), IsNear(Scene.Hall->GetBouncer(), FVector(1400.f, 0.f, 0.f), 0.1));
		Test.TestNull(Prefix + TEXT("no dart yet"), Scene.Hall->GetDart());
		Test.TestEqual(Prefix + TEXT("one crusher stands in the hall"), CountActors<ADojoM2Patrol>(TestWorld), 1);
		Test.TestEqual(Prefix + TEXT("one boulder rolls in the hall"), CountActors<ADojoM2Sled>(TestWorld), 1);
		Test.TestEqual(Prefix + TEXT("one bouncer rolls in the hall"), CountActors<ADojoM2Bumper>(TestWorld), 1);
		Test.TestEqual(Prefix + TEXT("two walls stand in the hall"), CountActors<ADojoM2Wall>(TestWorld), 2);
		Test.TestEqual(Prefix + TEXT("no dart actor exists yet"), CountActors<ADojoM2Dart>(TestWorld), 0);
		if (!Scene.Hall->GetCrusher()) return -1.f;

		Scene.Hero->SetActorLocation(Scene.Hall->GetCrusher()->GetActorLocation() + FVector(130.f, 0.f, 0.f));
		TestWorld.Tick(8);
		Test.TestEqual(Prefix + TEXT("130 from a hazard is out of the 100 hit radius"), Scene.Hall->GetHits(), 0);

		Scene.Hero->SetActorLocation(Scene.Hall->GetCrusher()->GetActorLocation() + FVector(60.f, 0.f, 0.f));
		TestWorld.Tick(8);
		Test.TestEqual(Prefix + TEXT("60 from the crusher is a hit"), Scene.Hall->GetHits(), 1);
		Test.TestTrue(Prefix + TEXT("a hit sends the hero back to the gate"), IsNear(Scene.Hero, FVector::ZeroVector, 0.1));
		Test.TestEqual(Prefix + TEXT("the board shows the hit"), BoardOf(Scene), FString(TEXT("Hits: 1")));

		Test.TestFalse(Prefix + TEXT("R does nothing mid-round"), Scene.Hall->PressRestart());
		Test.TestEqual(Prefix + TEXT("R mid-round keeps the hits"), Scene.Hall->GetHits(), 1);

		Scene.Hero->SetActorLocation(FVector(1900.f, 0.f, 0.f));
		TestWorld.Tick(8);
		Test.TestTrue(Prefix + TEXT("1900 is short of the exit, so the round goes on"), Scene.Hall->IsRunning());

		Scene.Hero->SetActorLocation(FVector(2050.f, 0.f, 0.f));
		TestWorld.Tick(8);
		if (!Test.TestFalse(Prefix + TEXT("past 2000 the round is finished"), Scene.Hall->IsRunning())) return -1.f;

		const float FinishSeconds = Scene.Hall->GetRoundSeconds();
		Test.TestTrue(Prefix + TEXT("the finish time is the time the round took"), FinishSeconds > 0.3f && FinishSeconds < 0.7f);
		Test.TestEqual(Prefix + TEXT("the board calls the finish with the time and the hits"), BoardOf(Scene), FString::Printf(TEXT("CLEAR in %.1f s, 1 hits"), FinishSeconds));

		AActor* BoulderAtFinish = Scene.Hall->GetBoulder();
		Scene.Hero->SetActorLocation(Scene.Hall->GetCrusher()->GetActorLocation());
		TestWorld.Tick(300);
		Test.TestEqual(Prefix + TEXT("a finished round counts no more hits"), Scene.Hall->GetHits(), 1);
		Test.TestEqual(Prefix + TEXT("the finish time stays frozen"), Scene.Hall->GetRoundSeconds(), FinishSeconds);
		Test.TestTrue(Prefix + TEXT("a finished round stops releasing boulders"), Scene.Hall->GetBoulder() == BoulderAtFinish);
		Test.TestNull(Prefix + TEXT("a finished round stops firing darts"), Scene.Hall->GetDart());

		return FinishSeconds;
	}
}

IMPLEMENT_SIMPLE_AUTOMATION_TEST(FDojo_M2_ClockworkHall_TwoRoundsPlayAlike, "Dojo.M2.ClockworkHall.TwoRoundsPlayAlike", EAutomationTestFlags::EditorContext | EAutomationTestFlags::ProductFilter)

/** Plays a whole round, restarts with R, and checks the second round plays exactly like the first. */
bool FDojo_M2_ClockworkHall_TwoRoundsPlayAlike::RunTest(const FString& Parameters)
{
	using namespace DojoM2HallTest;

	FDojoTestWorld TestWorld;
	const FHallScene Scene = MakeHall(TestWorld);
	if (!TestNotNull(TEXT("The hall spawned"), Scene.Hall)) return false;

	const float First = PlayRound(*this, TestWorld, Scene, TEXT("Round 1"));
	if (First < 0.f) return false;

	if (!TestTrue(TEXT("R starts a fresh round after the finish"), Scene.Hall->PressRestart())) return false;
	const float Second = PlayRound(*this, TestWorld, Scene, TEXT("Round 2"));
	if (Second < 0.f) return false;

	TestTrue(TEXT("The second round took as long as the first, give or take one hit check"), FMath::IsNearlyEqual(First, Second, 0.12f));

	return true;
}

IMPLEMENT_SIMPLE_AUTOMATION_TEST(FDojo_M2_ClockworkHall_HazardsDoTheirJobs, "Dojo.M2.ClockworkHall.HazardsDoTheirJobs", EAutomationTestFlags::EditorContext | EAutomationTestFlags::ProductFilter)

/** Parks the hero far from everything and checks each hazard moves the way its piece should and on the hall's schedule. */
bool FDojo_M2_ClockworkHall_HazardsDoTheirJobs::RunTest(const FString& Parameters)
{
	using namespace DojoM2HallTest;

	FDojoTestWorld TestWorld;
	const FHallScene Scene = MakeHall(TestWorld);
	if (!TestNotNull(TEXT("The hall spawned"), Scene.Hall)) return false;

	Scene.Hero->SetActorLocation(FVector(0.f, -3000.f, 0.f));
	TestWorld.Tick(60);
	TestTrue(TEXT("After 1 second the crusher is halfway out along its swing"), IsNear(Scene.Hall->GetCrusher(), FVector(500.f, 0.f, 0.f), 3.0));
	TestTrue(TEXT("The boulder rolls along its own forward, which the level turned to the east"), IsNear(Scene.Hall->GetBoulder(), FVector(1000.f, -350.f, 0.f), 3.0));
	const ADojoM2Bumper* Bouncer = Cast<ADojoM2Bumper>(Scene.Hall->GetBouncer());
	if (!TestNotNull(TEXT("The bouncer exists"), Bouncer)) return false;
	TestTrue(TEXT("The bouncer rolls toward a wall"), IsNear(Bouncer, FVector(1400.f, 300.f, 0.f), 3.0));
	TestEqual(TEXT("It has not bounced yet"), Bouncer->GetBounces(), 0);

	TestWorld.Tick(120);
	TestEqual(TEXT("After 3 seconds the bouncer has bounced once"), Bouncer->GetBounces(), 1);
	TestTrue(TEXT("It is rolling back across the channel"), Bouncer->Heading.Y < 0.0 && Bouncer->GetActorLocation().Y < 300.0);

	TestWorld.Tick(3);
	const ADojoM2Dart* Dart = Cast<ADojoM2Dart>(Scene.Hall->GetDart());
	if (!TestNotNull(TEXT("A dart is fired every 3 seconds"), Dart)) return false;
	TestTrue(TEXT("It leaves its launcher"), IsNear(Dart, FVector(1800.f, 800.f, 0.f), 40.0));
	TestTrue(TEXT("It chases the hero"), Dart->GetTarget() == Scene.Hero);

	AActor* FirstBoulder = Scene.Hall->GetBoulder();
	TestWorld.Tick(60);
	TestTrue(TEXT("A new boulder rolls every 4 seconds"), Scene.Hall->GetBoulder() != FirstBoulder);
	TestFalse(TEXT("The old boulder is gone"), IsValid(FirstBoulder));
	if (!TestNotNull(TEXT("A boulder is alive"), Scene.Hall->GetBoulder())) return false;
	TestTrue(TEXT("The new boulder is fresh at its start"), Scene.Hall->GetBoulder()->GetActorLocation().Y < -650.0);

	return true;
}

IMPLEMENT_SIMPLE_AUTOMATION_TEST(FDojo_M2_ClockworkHall_DartChasesTheHero, "Dojo.M2.ClockworkHall.DartChasesTheHero", EAutomationTestFlags::EditorContext | EAutomationTestFlags::ProductFilter)

/** Parks the hero off the dart's straight line and checks the dart turns to it, hits it once, and is used up. */
bool FDojo_M2_ClockworkHall_DartChasesTheHero::RunTest(const FString& Parameters)
{
	using namespace DojoM2HallTest;

	FDojoTestWorld TestWorld;
	const FHallScene Scene = MakeHall(TestWorld);
	if (!TestNotNull(TEXT("The hall spawned"), Scene.Hall)) return false;

	Scene.Hero->SetActorLocation(FVector(1500.f, 500.f, 0.f));
	TestWorld.Tick(300);

	TestEqual(TEXT("The dart curves in and hits the hero once"), Scene.Hall->GetHits(), 1);
	TestTrue(TEXT("The hit sends the hero back to the gate"), IsNear(Scene.Hero, FVector::ZeroVector, 0.1));
	TestFalse(TEXT("A dart that hit is used up"), IsValid(Scene.Hall->GetDart()));
	TestEqual(TEXT("The board shows the hit"), BoardOf(Scene), FString(TEXT("Hits: 1")));

	return true;
}

#endif
