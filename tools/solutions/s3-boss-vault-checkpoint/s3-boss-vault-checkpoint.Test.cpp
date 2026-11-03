#include "Misc/AutomationTest.h"

#if WITH_AUTOMATION_TESTS

#include "Components/TextRenderComponent.h"
#include "Kismet/GameplayStatics.h"
#include "Quests/s3-boss-vault-checkpoint/DojoS3Coin.h"
#include "Quests/s3-boss-vault-checkpoint/DojoS3Runner.h"
#include "Quests/s3-boss-vault-checkpoint/DojoS3VaultDirector.h"
#include "Quests/s3-door/DojoS3Door.h"
#include "Quests/s3-save-system/DojoS3SaveSystem.h"
#include "Support/DojoTestWorld.h"

namespace DojoS3VaultTest
{
	/** Spawns a vault director that saves to this slot and starts play. */
	ADojoS3VaultDirector* MakeVault(FDojoTestWorld& TestWorld, const FString& Slot)
	{
		const FTransform Spot(FVector(0.f, -500.f, 0.f));
		ADojoS3VaultDirector* Director = TestWorld.GetWorld()->SpawnActorDeferred<ADojoS3VaultDirector>(ADojoS3VaultDirector::StaticClass(), Spot);

		if (Director != nullptr)
		{
			Director->SlotName = Slot;
			Director->FinishSpawning(Spot);
		}

		return Director;
	}

	/** Lets this many seconds pass at 60 frames per second. */
	void Wait(FDojoTestWorld& TestWorld, float Seconds)
	{
		TestWorld.Tick(FMath::RoundToInt(Seconds * 60.f));
	}

	/** The board's text. */
	FString BoardOf(const ADojoS3VaultDirector* Director)
	{
		return Director->Board->Text.ToString();
	}

	/** Where the coins still lying in the vault are, in vault order. */
	TArray<float> CoinSpotsOf(const ADojoS3VaultDirector* Director)
	{
		TArray<float> Spots;

		for (const ADojoS3Coin* Coin : Director->GetCoins())
		{
			Spots.Add(static_cast<float>(Coin->GetActorLocation().X));
		}

		Spots.Sort();
		return Spots;
	}

	/** Steps the runner Count times in a direction. */
	void Steps(ADojoS3VaultDirector* Director, int32 Direction, int32 Count)
	{
		for (int32 Step = 0; Step < Count; ++Step)
		{
			Director->PressStep(Direction);
		}
	}

	/** Plays the first half of the reference route: two coins, the first door open, and a checkpoint. */
	void PlayToCheckpoint(FAutomationTestBase& Test, FDojoTestWorld& TestWorld, ADojoS3VaultDirector* Director, const FString& Tag)
	{
		ADojoS3Runner* Runner = Director->GetRunner();

		Director->PressStep(1);
		Director->PressTake();
		Director->PressStep(1);
		Director->PressTake();
		Test.TestEqual(Tag + TEXT("two coins carried"), Runner->GetCoins(), 2);

		Director->PressStep(1);
		Test.TestEqual(Tag + TEXT("a closed door stops the runner at 200"), Runner->GetSpot(), 200.f);

		Director->PressDoor();
		Test.TestTrue(Tag + TEXT("the first door opens"), Director->GetDoors()[0]->IsOpen());
		Wait(TestWorld, 0.5f);

		Director->PressSave();
		Test.TestEqual(Tag + TEXT("the board after the save"), BoardOf(Director), FString(TEXT("Coins 2/5\nDoors open 1/2\nCheckpoint saved")));
		Test.TestTrue(Tag + TEXT("the checkpoint is on disk"), UGameplayStatics::DoesSaveGameExist(Director->SlotName, 0));
	}

	/** Checks the vault looks exactly as it did at the checkpoint. */
	void ExpectCheckpoint(FAutomationTestBase& Test, const ADojoS3VaultDirector* Director, const FString& Tag)
	{
		const ADojoS3Runner* Runner = Director->GetRunner();

		Test.TestEqual(Tag + TEXT("the runner is back at 200"), Runner->GetSpot(), 200.f);
		Test.TestEqual(Tag + TEXT("the runner actor stands at 200"), Runner->GetActorLocation().X, 200.0);
		Test.TestEqual(Tag + TEXT("the runner carries two coins again"), Runner->GetCoins(), 2);
		Test.TestTrue(Tag + TEXT("the first door is open"), Director->GetDoors()[0]->IsOpen());
		Test.TestEqual(Tag + TEXT("the first door's panel is swung open"), Director->GetDoors()[0]->Panel->GetRelativeRotation().Yaw, 90.0, 0.5);
		Test.TestFalse(Tag + TEXT("the second door is closed"), Director->GetDoors()[1]->IsOpen());
		Test.TestEqual(Tag + TEXT("the coins at 100 and 200 stay taken and the rest lie in place"), CoinSpotsOf(Director), TArray<float>({ 400.f, 600.f, 800.f }));
		Test.TestEqual(Tag + TEXT("the board after the load"), BoardOf(Director), FString(TEXT("Coins 2/5\nDoors open 1/2\nCheckpoint loaded")));
	}

	/** Plays one full round by the reference route, loading the checkpoint once, and checks every step. */
	void PlayRound(FAutomationTestBase& Test, FDojoTestWorld& TestWorld, ADojoS3VaultDirector* Director, int32 Round)
	{
		const FString Tag = FString::Printf(TEXT("Round %d: "), Round);
		ADojoS3Runner* Runner = Director->GetRunner();

		Test.TestTrue(Tag + TEXT("the round runs"), Director->IsRunning());
		Test.TestEqual(Tag + TEXT("the board starts empty"), BoardOf(Director), FString(TEXT("Coins 0/5\nDoors open 0/2\nCheckpoint none")));
		Test.TestEqual(Tag + TEXT("five coins lie in the vault"), Director->GetCoins().Num(), 5);

		Director->PressLoad();
		Test.TestEqual(Tag + TEXT("a load with no checkpoint changes nothing"), BoardOf(Director), FString(TEXT("Coins 0/5\nDoors open 0/2\nCheckpoint none")));

		PlayToCheckpoint(Test, TestWorld, Director, Tag);

		// After the checkpoint: Q in the first door's doorway does nothing, then two more coins, then a load that takes them back.
		Steps(Director, 1, 1);
		Director->PressDoor();
		Test.TestTrue(Tag + TEXT("a door cannot be shut on the runner standing in it"), Director->GetDoors()[0]->IsOpen());
		Steps(Director, 1, 1);
		Director->PressTake();
		Steps(Director, 1, 2);
		Director->PressTake();
		Test.TestEqual(Tag + TEXT("four coins carried"), Runner->GetCoins(), 4);
		Test.TestEqual(Tag + TEXT("the runner reached 600"), Runner->GetSpot(), 600.f);

		Director->RestartRound();
		Test.TestEqual(Tag + TEXT("R mid-round leaves the runner where it is"), Runner->GetSpot(), 600.f);
		Wait(TestWorld, 0.5f);

		Director->PressLoad();
		ExpectCheckpoint(Test, Director, Tag);

		// The rest of the route from the checkpoint.
		Steps(Director, 1, 2);
		Director->PressTake();
		Steps(Director, 1, 2);
		Director->PressTake();
		Director->PressStep(1);
		Test.TestEqual(Tag + TEXT("the second door stops the runner at 600"), Runner->GetSpot(), 600.f);

		Director->PressDoor();
		Test.TestTrue(Tag + TEXT("the second door opens"), Director->GetDoors()[1]->IsOpen());
		Wait(TestWorld, 0.5f);

		Steps(Director, 1, 2);
		Director->PressTake();
		Test.TestEqual(Tag + TEXT("all five coins carried"), Runner->GetCoins(), 5);
		Test.TestFalse(Tag + TEXT("the round is over"), Director->IsRunning());
		Test.TestEqual(Tag + TEXT("the finish time"), Director->GetFinishSeconds(), 1.5f, 0.05f);
		Test.TestEqual(Tag + TEXT("the board shows the finale"), BoardOf(Director), FString(TEXT("Coins 5/5\nDoors open 2/2\nCheckpoint loaded\nCLEAR in 1.5 s")));
	}
}

IMPLEMENT_SIMPLE_AUTOMATION_TEST(FDojo_S3_VaultCheckpoint_TwoRounds, "Dojo.S3.VaultCheckpoint.TwoRounds", EAutomationTestFlags::EditorContext | EAutomationTestFlags::ProductFilter)

/** Plays the reference route twice, with R between, and checks the second round plays exactly like the first. */
bool FDojo_S3_VaultCheckpoint_TwoRounds::RunTest(const FString& Parameters)
{
	using namespace DojoS3VaultTest;

	const FString Slot = TEXT("DojoS3VaultTwoRounds");
	UGameplayStatics::DeleteGameInSlot(Slot, 0);

	{
		FDojoTestWorld TestWorld;
		ADojoS3VaultDirector* Director = MakeVault(TestWorld, Slot);
		if (!TestNotNull(TEXT("Director spawned"), Director)) return false;

		PlayRound(*this, TestWorld, Director, 1);
		const float FirstFinish = Director->GetFinishSeconds();

		Wait(TestWorld, 0.5f);
		Director->RestartRound();
		TestTrue(TEXT("R after the finale starts round 2"), Director->IsRunning());
		TestFalse(TEXT("R throws the checkpoint away"), UGameplayStatics::DoesSaveGameExist(Slot, 0));
		TestEqual(TEXT("The runner is back at the start"), Director->GetRunner()->GetSpot(), 0.f);
		TestFalse(TEXT("Every door is closed again"), Director->GetDoors()[0]->IsOpen() || Director->GetDoors()[1]->IsOpen());

		PlayRound(*this, TestWorld, Director, 2);
		TestEqual(TEXT("Round 2 takes as long as round 1"), Director->GetFinishSeconds(), FirstFinish, 0.05f);
	}

	UGameplayStatics::DeleteGameInSlot(Slot, 0);
	return true;
}

IMPLEMENT_SIMPLE_AUTOMATION_TEST(FDojo_S3_VaultCheckpoint_LoadInAFreshVault, "Dojo.S3.VaultCheckpoint.LoadInAFreshVault", EAutomationTestFlags::EditorContext | EAutomationTestFlags::ProductFilter)

/** A checkpoint saved in one world loads into a vault built fresh in another, the way a restarted game would. */
bool FDojo_S3_VaultCheckpoint_LoadInAFreshVault::RunTest(const FString& Parameters)
{
	using namespace DojoS3VaultTest;

	const FString Slot = TEXT("DojoS3VaultFresh");
	UGameplayStatics::DeleteGameInSlot(Slot, 0);

	{
		FDojoTestWorld FirstWorld;
		ADojoS3VaultDirector* Director = MakeVault(FirstWorld, Slot);
		if (!TestNotNull(TEXT("First director spawned"), Director)) return false;

		PlayToCheckpoint(*this, FirstWorld, Director, TEXT("First world: "));
	}

	{
		FDojoTestWorld SecondWorld;
		ADojoS3VaultDirector* Director = MakeVault(SecondWorld, Slot);
		if (!TestNotNull(TEXT("Second director spawned"), Director)) return false;

		TestEqual(TEXT("The fresh vault starts with five coins"), Director->GetCoins().Num(), 5);
		Director->PressLoad();
		ExpectCheckpoint(*this, Director, TEXT("Second world: "));
	}

	UGameplayStatics::DeleteGameInSlot(Slot, 0);
	return true;
}

IMPLEMENT_SIMPLE_AUTOMATION_TEST(FDojo_S3_VaultCheckpoint_NothingAfterTheFinale, "Dojo.S3.VaultCheckpoint.NothingAfterTheFinale", EAutomationTestFlags::EditorContext | EAutomationTestFlags::ProductFilter)

/** Steps stop at both ends of the vault, and after the finale steps, saves, and loads do nothing until R. */
bool FDojo_S3_VaultCheckpoint_NothingAfterTheFinale::RunTest(const FString& Parameters)
{
	using namespace DojoS3VaultTest;

	const FString Slot = TEXT("DojoS3VaultAfter");
	UGameplayStatics::DeleteGameInSlot(Slot, 0);

	{
		FDojoTestWorld TestWorld;
		ADojoS3VaultDirector* Director = TestWorld.GetWorld()->SpawnActorDeferred<ADojoS3VaultDirector>(ADojoS3VaultDirector::StaticClass(), FTransform::Identity);
		if (!TestNotNull(TEXT("Director spawned"), Director)) return false;

		// A vault 100 long with one coin under the runner's feet and no doors, so one press ends the round.
		Director->SlotName = Slot;
		Director->CoinSpots = { 0.f };
		Director->DoorSpots = {};
		Director->VaultLength = 100.f;
		Director->FinishSpawning(FTransform::Identity);

		Director->PressStep(-1);
		TestEqual(TEXT("No step back past the near end"), Director->GetRunner()->GetSpot(), 0.f);
		Steps(Director, 1, 2);
		TestEqual(TEXT("No step past the far end"), Director->GetRunner()->GetSpot(), 100.f);
		Director->PressStep(-1);

		Director->PressTake();
		TestFalse(TEXT("The single coin ends the round"), Director->IsRunning());

		const FString Before = BoardOf(Director);
		Director->PressStep(1);
		Director->PressSave();
		Director->PressLoad();

		TestEqual(TEXT("No step after the finale"), Director->GetRunner()->GetSpot(), 0.f);
		TestFalse(TEXT("No save after the finale"), UGameplayStatics::DoesSaveGameExist(Slot, 0));
		TestEqual(TEXT("The board did not change"), BoardOf(Director), Before);
	}

	UGameplayStatics::DeleteGameInSlot(Slot, 0);
	return true;
}

IMPLEMENT_SIMPLE_AUTOMATION_TEST(FDojo_S3_VaultCheckpoint_UnbindsWhenItLeaves, "Dojo.S3.VaultCheckpoint.UnbindsWhenItLeaves", EAutomationTestFlags::EditorContext | EAutomationTestFlags::ProductFilter)

/** The director never ticks, its board follows saves and loads made by anyone, and once it leaves play it stops listening to the save system. */
bool FDojo_S3_VaultCheckpoint_UnbindsWhenItLeaves::RunTest(const FString& Parameters)
{
	using namespace DojoS3VaultTest;

	const FString Slot = TEXT("DojoS3VaultUnbind");
	const FString Missing = TEXT("DojoS3VaultNoSuchSlot");
	UGameplayStatics::DeleteGameInSlot(Slot, 0);
	UGameplayStatics::DeleteGameInSlot(Missing, 0);

	FDojoTestWorld TestWorld;
	ADojoS3VaultDirector* Director = MakeVault(TestWorld, Slot);
	if (!TestNotNull(TEXT("Director spawned"), Director)) return false;

	UDojoS3SaveSystem* SaveSystem = TestWorld.GetWorld()->GetSubsystem<UDojoS3SaveSystem>();
	if (!TestNotNull(TEXT("The world has a save system"), SaveSystem)) return false;

	TestFalse(TEXT("The director never ticks"), Director->PrimaryActorTick.bCanEverTick);

	// Saves and loads made by anyone else reach the board through the save system's events.
	SaveSystem->SaveToSlot(Slot);
	TestTrue(TEXT("A save made elsewhere shows on the board"), BoardOf(Director).EndsWith(TEXT("Checkpoint saved")));
	SaveSystem->LoadFromSlot(Missing);
	TestTrue(TEXT("A failed load made elsewhere shows on the board"), BoardOf(Director).EndsWith(TEXT("Checkpoint failed")));
	UGameplayStatics::DeleteGameInSlot(Slot, 0);
	TestTrue(TEXT("The director listens for saves"), SaveSystem->OnSaved.IsBound());
	TestTrue(TEXT("The director listens for loads"), SaveSystem->OnLoaded.IsBound());

	Director->Destroy();
	TestWorld.Tick(1);

	TestFalse(TEXT("No save listener is left"), SaveSystem->OnSaved.IsBound());
	TestFalse(TEXT("No load listener is left"), SaveSystem->OnLoaded.IsBound());

	return true;
}

#endif
