#include "Misc/AutomationTest.h"

#if WITH_AUTOMATION_TESTS

#include "Components/TextRenderComponent.h"
#include "Quests/s2-ability-component/DojoS2AbilityComponent.h"
#include "Quests/s2-ability-data/DojoS2AbilityData.h"
#include "Quests/s2-ability-data/DojoS2AbilityTags.h"
#include "Quests/s2-boss-sparring-ring/DojoS2RefillEffect.h"
#include "Quests/s2-boss-sparring-ring/DojoS2RingDirector.h"
#include "Quests/s2-effects/DojoS2DashEffect.h"
#include "Quests/s2-effects/DojoS2PushEffect.h"
#include "Quests/s2-energy/DojoS2EnergyComponent.h"
#include "Support/DojoTestActor.h"
#include "Support/DojoTestWorld.h"

namespace DojoS2RingTest
{
	/** The ring's three abilities, made the way a designer would fill in the assets. */
	struct FKit
	{
		UDojoS2AbilityData* Dash = nullptr;
		UDojoS2AbilityData* Shockwave = nullptr;
		UDojoS2AbilityData* Focus = nullptr;
	};

	/** The hero, the dummies, the director, and the parts it connects. */
	struct FRing
	{
		FKit Kit;
		ADojoTestActor* Hero = nullptr;
		UDojoS2AbilityComponent* Abilities = nullptr;
		UDojoS2EnergyComponent* Energy = nullptr;
		TArray<ADojoTestActor*> Dummies;
		ADojoS2RingDirector* Director = nullptr;
	};

	/** One ability asset with its numbers and tags. */
	UDojoS2AbilityData* MakeAbility(const TCHAR* Name, int32 Cost, float Cooldown, float Duration)
	{
		UDojoS2AbilityData* Ability = NewObject<UDojoS2AbilityData>();
		Ability->DisplayName = FText::FromString(Name);
		Ability->EnergyCost = Cost;
		Ability->Cooldown = Cooldown;
		Ability->Duration = Duration;
		return Ability;
	}

	/** Dash 20 energy, 1 s cooldown, blocked while rooted, moving 300; Shockwave 40, 3 s, roots for 1 s, blocked while channeling, pushing 300 within 400; Focus free, 12 s, roots and channels for 2 s, refilling the energy. */
	FKit MakeKit()
	{
		FKit Kit;

		Kit.Dash = MakeAbility(TEXT("Dash"), 20, 1.f, 0.f);
		Kit.Dash->BlockedByTags.AddTag(DojoS2Tags::State_Rooted.GetTag());
		UDojoS2DashEffect* Move = NewObject<UDojoS2DashEffect>(Kit.Dash);
		Move->Distance = 300.f;
		Kit.Dash->Effects.Add(Move);

		Kit.Shockwave = MakeAbility(TEXT("Shockwave"), 40, 3.f, 1.f);
		Kit.Shockwave->GrantedTags.AddTag(DojoS2Tags::State_Rooted.GetTag());
		Kit.Shockwave->BlockedByTags.AddTag(DojoS2Tags::State_Channeling.GetTag());
		UDojoS2PushEffect* Push = NewObject<UDojoS2PushEffect>(Kit.Shockwave);
		Push->Radius = 400.f;
		Push->Distance = 300.f;
		Kit.Shockwave->Effects.Add(Push);

		Kit.Focus = MakeAbility(TEXT("Focus"), 0, 12.f, 2.f);
		Kit.Focus->GrantedTags.AddTag(DojoS2Tags::State_Rooted.GetTag());
		Kit.Focus->GrantedTags.AddTag(DojoS2Tags::State_Channeling.GetTag());
		Kit.Focus->Effects.Add(NewObject<UDojoS2RefillEffect>(Kit.Focus));

		return Kit;
	}

	/** The hero at the middle facing +X with 100 energy coming back 5 every half second, four tagged dummies 200 from it, and a director that has not begun play. */
	FRing MakeRing(FDojoTestWorld& TestWorld)
	{
		FRing Ring;
		Ring.Kit = MakeKit();

		Ring.Hero = TestWorld.SpawnActor<ADojoTestActor>();
		Ring.Energy = TestWorld.AddComponent<UDojoS2EnergyComponent>(Ring.Hero);
		Ring.Energy->MaxEnergy = 100;
		Ring.Energy->RegenAmount = 5;
		Ring.Energy->RegenInterval = 0.5f;
		Ring.Abilities = TestWorld.AddComponent<UDojoS2AbilityComponent>(Ring.Hero);

		for (const FVector& Spot : { FVector(200.f, 0.f, 0.f), FVector(0.f, 200.f, 0.f), FVector(-200.f, 0.f, 0.f), FVector(0.f, -200.f, 0.f) })
		{
			ADojoTestActor* Dummy = TestWorld.SpawnActor<ADojoTestActor>();
			Dummy->SetActorLocation(Spot);
			Dummy->Tags.Add(TEXT("Target"));
			Ring.Dummies.Add(Dummy);
		}

		const FTransform DirectorSpot(FVector(0.f, 0.f, 400.f));
		Ring.Director = TestWorld.GetWorld()->SpawnActorDeferred<ADojoS2RingDirector>(ADojoS2RingDirector::StaticClass(), DirectorSpot);
		Ring.Director->Hero = Ring.Hero;
		Ring.Director->Loadout = { Ring.Kit.Dash, Ring.Kit.Shockwave, Ring.Kit.Focus };

		for (ADojoTestActor* Dummy : Ring.Dummies)
		{
			Ring.Director->Dummies.Add(Dummy);
		}

		return Ring;
	}

	/** Starts play for a director whose settings are filled in. */
	void Begin(const FRing& Ring)
	{
		Ring.Director->FinishSpawning(FTransform(FVector(0.f, 0.f, 400.f)));
	}

	/** Lets this many seconds pass at 60 frames per second. */
	void Wait(FDojoTestWorld& TestWorld, float Seconds)
	{
		TestWorld.Tick(FMath::RoundToInt(Seconds * 60.f));
	}

	/** The board's text. */
	FString BoardOf(const FRing& Ring)
	{
		return Ring.Director->Board->Text.ToString();
	}

	/** True when two points are within one unit of each other on the ground. */
	bool Near(const FVector& Actual, float X, float Y)
	{
		return FVector::Dist2D(Actual, FVector(X, Y, 0.f)) <= 1.f;
	}

	/** Plays one full round by the reference route and checks every step; Round names the round in the messages. */
	void PlayRound(FAutomationTestBase& Test, FDojoTestWorld& TestWorld, const FRing& Ring, int32 Round)
	{
		const FString Tag = FString::Printf(TEXT("Round %d: "), Round);
		ADojoS2RingDirector* Director = Ring.Director;

		Test.TestTrue(Tag + TEXT("the round runs"), Director->IsRunning());
		Test.TestTrue(Tag + TEXT("the hero starts in the middle"), Near(Ring.Hero->GetActorLocation(), 0.f, 0.f));
		Test.TestEqual(Tag + TEXT("the board starts full and ready"), BoardOf(Ring), FString(TEXT("Energy 100/100\n1. Dash ready\n2. Shockwave ready\n3. Focus ready\nOut 0/4")));

		// t = 0: Shockwave from the middle pushes all four from 200 to 500 and roots the hero for a second.
		Director->PressAbility(1);
		Test.TestTrue(Tag + TEXT("the first push moves the +X dummy to 500"), Near(Ring.Dummies[0]->GetActorLocation(), 500.f, 0.f));
		Test.TestTrue(Tag + TEXT("the first push moves the +Y dummy to 500"), Near(Ring.Dummies[1]->GetActorLocation(), 0.f, 500.f));
		Test.TestEqual(Tag + TEXT("the board follows the shockwave"), BoardOf(Ring), FString(TEXT("Energy 60/100\n1. Dash ready\n2. Shockwave cooling\n3. Focus ready\nOut 0/4")));

		// t = 0.1: rooted, so the dash is refused and costs nothing.
		Wait(TestWorld, 0.1f);
		Director->PressAbility(0);
		Test.TestTrue(Tag + TEXT("a rooted hero does not dash"), Near(Ring.Hero->GetActorLocation(), 0.f, 0.f));
		Test.TestEqual(Tag + TEXT("a refused dash costs nothing"), Ring.Energy->GetEnergy(), 60);

		// t = 1.1: the root is over; two regen steps came back, then the dash pays 20.
		Wait(TestWorld, 1.f);
		Director->PressAbility(0);
		Test.TestTrue(Tag + TEXT("the dash moves the hero 300 ahead"), Near(Ring.Hero->GetActorLocation(), 300.f, 0.f));
		Test.TestEqual(Tag + TEXT("energy after the dash"), Ring.Energy->GetEnergy(), 50);

		// t = 3.2: the second shockwave reaches only the +X dummy, 200 away, and pushes it out.
		Wait(TestWorld, 2.1f);
		Director->PressAbility(1);
		Test.TestTrue(Tag + TEXT("the +X dummy is pushed to 800"), Near(Ring.Dummies[0]->GetActorLocation(), 800.f, 0.f));
		Test.TestTrue(Tag + TEXT("the +Y dummy, 583 away, stays"), Near(Ring.Dummies[1]->GetActorLocation(), 0.f, 500.f));
		Test.TestEqual(Tag + TEXT("one is out"), Director->CountOut(), 1);
		Test.TestEqual(Tag + TEXT("energy after the second shockwave"), Ring.Energy->GetEnergy(), 30);

		// Turn right to face +Y, then dash at t = 4.3.
		Director->PressTurnRight();
		Wait(TestWorld, 1.1f);
		Director->PressAbility(0);
		Test.TestTrue(Tag + TEXT("the dash follows the turn"), Near(Ring.Hero->GetActorLocation(), 300.f, 300.f));

		// t = 6.3: the third shockwave pushes the +Y dummy out along the line from the hero.
		Wait(TestWorld, 2.f);
		Director->PressAbility(1);
		Test.TestTrue(Tag + TEXT("the +Y dummy is pushed away from the hero"), Near(Ring.Dummies[1]->GetActorLocation(), -249.6f, 666.4f));
		Test.TestEqual(Tag + TEXT("two are out"), Director->CountOut(), 2);
		Test.TestEqual(Tag + TEXT("the shockwave spent the last of the energy"), Ring.Energy->GetEnergy(), 0);

		// R in the middle of a round does nothing.
		Director->RestartRound();
		Test.TestTrue(Tag + TEXT("R mid-round leaves the hero where it is"), Near(Ring.Hero->GetActorLocation(), 300.f, 300.f));
		Test.TestEqual(Tag + TEXT("R mid-round leaves the dummies out"), Director->CountOut(), 2);

		// t = 6.4: Focus refills the energy and roots and channels for 2 s, overlapping the shockwave's root.
		Wait(TestWorld, 0.1f);
		Director->PressAbility(2);
		Test.TestEqual(Tag + TEXT("Focus refills the energy"), Ring.Energy->GetEnergy(), 100);

		// Turn right to face -X. At t = 7.5 the shockwave's root is over but Focus still roots the hero.
		Director->PressTurnRight();
		Wait(TestWorld, 1.1f);
		Director->PressAbility(0);
		Test.TestTrue(Tag + TEXT("Focus still holds the hero after the shockwave's root ends"), Near(Ring.Hero->GetActorLocation(), 300.f, 300.f));
		Test.TestEqual(Tag + TEXT("the refused dash costs nothing"), Ring.Energy->GetEnergy(), 100);

		// t = 8.5 and 9.6: two dashes to (-300, 300).
		Wait(TestWorld, 1.f);
		Director->PressAbility(0);
		Wait(TestWorld, 1.1f);
		Director->PressAbility(0);
		Test.TestTrue(Tag + TEXT("two dashes reach the -X side"), Near(Ring.Hero->GetActorLocation(), -300.f, 300.f));
		Test.TestEqual(Tag + TEXT("energy after two dashes"), Ring.Energy->GetEnergy(), 70);

		// t = 9.7: the shockwave pushes the -X dummy out.
		Wait(TestWorld, 0.1f);
		Director->PressAbility(1);
		Test.TestTrue(Tag + TEXT("the -X dummy is pushed away from the hero"), Near(Ring.Dummies[2]->GetActorLocation(), -666.4f, -249.6f));
		Test.TestEqual(Tag + TEXT("three are out"), Director->CountOut(), 3);

		// Turn right to face -Y, then dash at t = 10.8 and 11.9.
		Director->PressTurnRight();
		Wait(TestWorld, 1.1f);
		Director->PressAbility(0);
		Wait(TestWorld, 1.1f);
		Director->PressAbility(0);
		Test.TestTrue(Tag + TEXT("two dashes reach the -Y side"), Near(Ring.Hero->GetActorLocation(), -300.f, -300.f));
		Test.TestEqual(Tag + TEXT("energy after the last dash"), Ring.Energy->GetEnergy(), 10);

		// t = 13.6: 30 energy is not enough for the shockwave.
		Wait(TestWorld, 1.7f);
		Director->PressAbility(1);
		Test.TestTrue(Tag + TEXT("a shockwave without the energy does nothing"), Near(Ring.Dummies[3]->GetActorLocation(), 0.f, -500.f));
		Test.TestEqual(Tag + TEXT("and costs nothing"), Ring.Energy->GetEnergy(), 30);
		Test.TestTrue(Tag + TEXT("the round still runs"), Director->IsRunning());

		// t = 14.6: 40 energy, and the last dummy goes out.
		Wait(TestWorld, 1.f);
		Director->PressAbility(1);
		Test.TestTrue(Tag + TEXT("the last dummy is pushed away from the hero"), Near(Ring.Dummies[3]->GetActorLocation(), 249.6f, -666.4f));
		Test.TestEqual(Tag + TEXT("all four are out"), Director->CountOut(), 4);
		Test.TestFalse(Tag + TEXT("the round is over"), Director->IsRunning());
		Test.TestEqual(Tag + TEXT("the finish time"), Director->GetFinishSeconds(), 14.6f, 0.05f);
		Test.TestEqual(Tag + TEXT("the board shows the finale"), BoardOf(Ring), FString(TEXT("Energy 0/100\n1. Dash ready\n2. Shockwave cooling\n3. Focus cooling\nOut 4/4\nCLEAR in 14.6 s")));
	}
}

IMPLEMENT_SIMPLE_AUTOMATION_TEST(FDojo_S2_SparringRing_TwoRounds, "Dojo.S2.SparringRing.TwoRounds", EAutomationTestFlags::EditorContext | EAutomationTestFlags::ProductFilter)

/** Plays the reference route twice, with R between, and checks the second round plays exactly like the first. */
bool FDojo_S2_SparringRing_TwoRounds::RunTest(const FString& Parameters)
{
	using namespace DojoS2RingTest;

	FDojoTestWorld TestWorld;
	FRing Ring = MakeRing(TestWorld);
	if (!TestNotNull(TEXT("Director spawned"), Ring.Director)) return false;

	Begin(Ring);

	PlayRound(*this, TestWorld, Ring, 1);
	const float FirstFinish = Ring.Director->GetFinishSeconds();

	Wait(TestWorld, 0.5f);
	Ring.Director->RestartRound();
	TestTrue(TEXT("R after the finale starts round 2"), Ring.Director->IsRunning());
	TestTrue(TEXT("Focus is ready again for round 2"), Ring.Abilities->CanActivate(Ring.Kit.Focus));
	TestEqual(TEXT("Every dummy is back in the ring"), Ring.Director->CountOut(), 0);
	TestTrue(TEXT("The hero faces +X again"), Ring.Hero->GetActorForwardVector().Equals(FVector(1.f, 0.f, 0.f), 0.01f));

	PlayRound(*this, TestWorld, Ring, 2);
	TestEqual(TEXT("Round 2 takes as long as round 1"), Ring.Director->GetFinishSeconds(), FirstFinish, 0.05f);

	return true;
}

IMPLEMENT_SIMPLE_AUTOMATION_TEST(FDojo_S2_SparringRing_NothingAfterTheFinale, "Dojo.S2.SparringRing.NothingAfterTheFinale", EAutomationTestFlags::EditorContext | EAutomationTestFlags::ProductFilter)

/** After the finale, abilities and turns do nothing until R. */
bool FDojo_S2_SparringRing_NothingAfterTheFinale::RunTest(const FString& Parameters)
{
	using namespace DojoS2RingTest;

	FDojoTestWorld TestWorld;
	FRing Ring = MakeRing(TestWorld);
	if (!TestNotNull(TEXT("Director spawned"), Ring.Director)) return false;

	// Every dummy starts outside the ring, so the round ends the moment it begins.
	for (ADojoTestActor* Dummy : Ring.Dummies)
	{
		Dummy->SetActorLocation(Dummy->GetActorLocation() * 4.f);
	}

	Begin(Ring);
	TestFalse(TEXT("A ring with every dummy out is over at once"), Ring.Director->IsRunning());

	const FString Before = BoardOf(Ring);
	Ring.Director->PressAbility(0);
	Ring.Director->PressTurnLeft();
	Wait(TestWorld, 0.2f);

	TestTrue(TEXT("No dash after the finale"), Near(Ring.Hero->GetActorLocation(), 0.f, 0.f));
	TestTrue(TEXT("No turn after the finale"), Ring.Hero->GetActorForwardVector().Equals(FVector(1.f, 0.f, 0.f), 0.01f));
	TestEqual(TEXT("No energy spent after the finale"), Ring.Energy->GetEnergy(), 100);
	TestEqual(TEXT("The board did not change"), BoardOf(Ring), Before);

	return true;
}

IMPLEMENT_SIMPLE_AUTOMATION_TEST(FDojo_S2_SparringRing_EffectsComeFromTheAsset, "Dojo.S2.SparringRing.EffectsComeFromTheAsset", EAutomationTestFlags::EditorContext | EAutomationTestFlags::ProductFilter)

/** Swapping the effects inside an asset changes what its key does, with no change to the director. */
bool FDojo_S2_SparringRing_EffectsComeFromTheAsset::RunTest(const FString& Parameters)
{
	using namespace DojoS2RingTest;

	FDojoTestWorld TestWorld;
	FRing Ring = MakeRing(TestWorld);
	if (!TestNotNull(TEXT("Director spawned"), Ring.Director)) return false;

	// The designer turns Dash into a short shove with two effects: a small push, then a small step.
	UDojoS2PushEffect* Shove = NewObject<UDojoS2PushEffect>(Ring.Kit.Dash);
	Shove->Radius = 250.f;
	Shove->Distance = 100.f;
	UDojoS2DashEffect* Step = NewObject<UDojoS2DashEffect>(Ring.Kit.Dash);
	Step->Distance = 50.f;
	Ring.Kit.Dash->Effects = { Shove, Step };

	Begin(Ring);
	Ring.Director->PressAbility(0);

	TestTrue(TEXT("The shove ran: the +X dummy moved 100"), Near(Ring.Dummies[0]->GetActorLocation(), 300.f, 0.f));
	TestTrue(TEXT("The shove ran: the -Y dummy moved 100"), Near(Ring.Dummies[3]->GetActorLocation(), 0.f, -300.f));
	TestTrue(TEXT("The step ran after it"), Near(Ring.Hero->GetActorLocation(), 50.f, 0.f));
	TestEqual(TEXT("The asset's cost was paid"), Ring.Energy->GetEnergy(), 80);

	return true;
}

IMPLEMENT_SIMPLE_AUTOMATION_TEST(FDojo_S2_SparringRing_UnbindsWhenItLeaves, "Dojo.S2.SparringRing.UnbindsWhenItLeaves", EAutomationTestFlags::EditorContext | EAutomationTestFlags::ProductFilter)

/** A director that leaves play stops listening to the hero's parts, which keep working without it. */
bool FDojo_S2_SparringRing_UnbindsWhenItLeaves::RunTest(const FString& Parameters)
{
	using namespace DojoS2RingTest;

	FDojoTestWorld TestWorld;
	FRing Ring = MakeRing(TestWorld);
	if (!TestNotNull(TEXT("Director spawned"), Ring.Director)) return false;

	Begin(Ring);
	TestTrue(TEXT("The director listens for starts"), Ring.Abilities->OnAbilityActivated.IsBound());
	TestTrue(TEXT("The director listens for cooldowns"), Ring.Abilities->OnCooldownChanged.IsBound());
	TestTrue(TEXT("The director listens for energy"), Ring.Energy->OnEnergyChanged.IsBound());

	Ring.Director->Destroy();
	TestWorld.Tick(1);

	TestFalse(TEXT("No start listener is left"), Ring.Abilities->OnAbilityActivated.IsBound());
	TestFalse(TEXT("No cooldown listener is left"), Ring.Abilities->OnCooldownChanged.IsBound());
	TestFalse(TEXT("No energy listener is left"), Ring.Energy->OnEnergyChanged.IsBound());

	TestTrue(TEXT("The hero's abilities still work on their own"), Ring.Abilities->TryActivate(Ring.Kit.Dash));
	TestEqual(TEXT("And still pay their cost"), Ring.Energy->GetEnergy(), 80);
	Wait(TestWorld, 1.1f);
	TestFalse(TEXT("And still cool down"), Ring.Abilities->IsOnCooldown(Ring.Kit.Dash));

	return true;
}

#endif
