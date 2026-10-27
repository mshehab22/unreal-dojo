#include "Misc/AutomationTest.h"

#if WITH_AUTOMATION_TESTS

#include "Components/TextRenderComponent.h"
#include "Quests/s1-bag-view/DojoS1BagView.h"
#include "Quests/s1-bag/DojoS1InventoryComponent.h"
#include "Quests/s1-boss-expedition-pack/DojoS1PackDirector.h"
#include "Quests/s1-equipment/DojoS1EquipmentComponent.h"
#include "Quests/s1-item-data/DojoS1ItemData.h"
#include "Quests/s1-item-data/DojoS1WorldItem.h"
#include "Support/DojoTestActor.h"
#include "Support/DojoTestWorld.h"

namespace DojoS1ExpeditionTest
{
	/** The expedition's five kinds of item, made the way a designer would fill in the assets. */
	struct FKinds
	{
		UDojoS1ItemData* Potion = nullptr;
		UDojoS1ItemData* Stone = nullptr;
		UDojoS1ItemData* Sword = nullptr;
		UDojoS1ItemData* Dagger = nullptr;
		UDojoS1ItemData* Helmet = nullptr;
	};

	/** The hero, the director, and the pieces it connects. */
	struct FDay
	{
		FKinds Kinds;
		ADojoTestActor* Hero = nullptr;
		UDojoS1InventoryComponent* Bag = nullptr;
		UDojoS1EquipmentComponent* Equipment = nullptr;
		ADojoS1PackDirector* Director = nullptr;
	};

	/** Makes one item asset. */
	UDojoS1ItemData* MakeItem(const TCHAR* Name, int32 MaxStack, int32 Weight, EDojoS1EquipSlot Slot, int32 Power, int32 Heal)
	{
		UDojoS1ItemData* Item = NewObject<UDojoS1ItemData>();
		Item->DisplayName = FText::FromString(Name);
		Item->MaxStack = MaxStack;
		Item->Weight = Weight;
		Item->EquipSlot = Slot;
		Item->PowerBonus = Power;
		Item->HealAmount = Heal;
		return Item;
	}

	/** Adds one loose pile to the director's spots. */
	void AddSpot(ADojoS1PackDirector* Director, UDojoS1ItemData* Item, int32 Count, const FVector& Location)
	{
		FDojoS1LootSpot Spot;
		Spot.Item = Item;
		Spot.Count = Count;
		Spot.Location = Location;
		Director->LootSpots.Add(Spot);
	}

	/** The hero far from every pile, with a four slot bag that holds 20 and the equipment to go with it; the director gets the spots the caller adds before play. */
	FDay MakeDay(FDojoTestWorld& TestWorld, bool bStandardLoot)
	{
		FDay Day;
		Day.Kinds.Potion = MakeItem(TEXT("Potion"), 5, 1, EDojoS1EquipSlot::EES_None, 0, 25);
		Day.Kinds.Stone = MakeItem(TEXT("Stone"), 10, 2, EDojoS1EquipSlot::EES_None, 0, 0);
		Day.Kinds.Sword = MakeItem(TEXT("Sword"), 1, 6, EDojoS1EquipSlot::EES_Hand, 7, 0);
		Day.Kinds.Dagger = MakeItem(TEXT("Dagger"), 1, 2, EDojoS1EquipSlot::EES_Hand, 3, 0);
		Day.Kinds.Helmet = MakeItem(TEXT("Helmet"), 1, 4, EDojoS1EquipSlot::EES_Head, 2, 0);

		Day.Hero = TestWorld.SpawnActor<ADojoTestActor>();
		Day.Hero->SetActorLocation(FVector(0.f, -5000.f, 0.f));
		Day.Bag = TestWorld.AddComponent<UDojoS1InventoryComponent>(Day.Hero);
		Day.Bag->SlotCount = 4;
		Day.Bag->MaxWeight = 20;
		Day.Equipment = TestWorld.AddComponent<UDojoS1EquipmentComponent>(Day.Hero);
		Day.Equipment->UseBag(Day.Bag);

		const FTransform DirectorSpot(FVector(0.f, -3000.f, 0.f));
		Day.Director = TestWorld.GetWorld()->SpawnActorDeferred<ADojoS1PackDirector>(ADojoS1PackDirector::StaticClass(), DirectorSpot);
		Day.Director->Hero = Day.Hero;
		Day.Director->ReadyWeapon = Day.Kinds.Sword;
		Day.Director->ReadyHelmet = Day.Kinds.Helmet;
		Day.Director->PotionItem = Day.Kinds.Potion;

		if (bStandardLoot)
		{
			AddSpot(Day.Director, Day.Kinds.Stone, 6, FVector(500.f, 0.f, 0.f));
			AddSpot(Day.Director, Day.Kinds.Sword, 1, FVector(1000.f, 0.f, 0.f));
			AddSpot(Day.Director, Day.Kinds.Helmet, 1, FVector(1500.f, 0.f, 0.f));
			AddSpot(Day.Director, Day.Kinds.Potion, 4, FVector(2000.f, 0.f, 0.f));
			AddSpot(Day.Director, Day.Kinds.Potion, 4, FVector(2500.f, 0.f, 0.f));
			AddSpot(Day.Director, Day.Kinds.Dagger, 1, FVector(3000.f, 0.f, 0.f));
		}

		return Day;
	}

	/** Starts play for a director whose spots are set. */
	void Begin(const FDay& Day)
	{
		Day.Director->FinishSpawning(FTransform(FVector(0.f, -3000.f, 0.f)));
	}

	/** Walks the hero to a place and lets a tenth of a second pass. */
	void Go(FDojoTestWorld& TestWorld, const FDay& Day, const FVector& Location)
	{
		Day.Hero->SetActorLocation(Location);
		TestWorld.Tick(6);
	}

	/** The board's text. */
	FString BoardOf(const FDay& Day)
	{
		return Day.Director->Board->Text.ToString();
	}

	/** The bag view's text. */
	FString ViewOf(const FDay& Day)
	{
		return Day.Director->GetBagView()->Display->Text.ToString();
	}

	/** The bag slot that holds this item, or -1. */
	int32 SlotOf(const FDay& Day, const UDojoS1ItemData* Item)
	{
		const TArray<FDojoS1ItemStack> Piles = Day.Bag->GetSlots();

		for (int32 Index = 0; Index < Piles.Num(); ++Index)
		{
			if (Piles[Index].Item == Item)
			{
				return Index;
			}
		}

		return -1;
	}

	/** The loose pile of this item lying near this X, or null. */
	ADojoS1WorldItem* PileAt(const FDay& Day, const UDojoS1ItemData* Item, float X)
	{
		for (ADojoS1WorldItem* Pile : Day.Director->GetWorldItems())
		{
			if (Pile->GetItem() == Item && FMath::Abs(Pile->GetActorLocation().X - X) < 1.f)
			{
				return Pile;
			}
		}

		return nullptr;
	}

	/** The text on the board a finished round shows. */
	FString ReadyBoard(const FString& Health, const FString& Selected, float Seconds)
	{
		return FString::Printf(TEXT("Health %s\nSelected: %s\nREADY in %.1f s"), *Health, *Selected, Seconds);
	}

	/** The view text of an empty bag with nothing worn. */
	const TCHAR* const EmptyView = TEXT("Weight 0/20\n1. -\n2. -\n3. -\n4. -\nHead: none\nHand: none\nPower: 0");
}

IMPLEMENT_SIMPLE_AUTOMATION_TEST(FDojo_S1_Expedition_TwoRounds, "Dojo.S1.Expedition.TwoRounds", EAutomationTestFlags::EditorContext | EAutomationTestFlags::ProductFilter)

/** Plays a round that meets every rule on the way to ready, restarts, plays a quick round, and checks both play out the same way. */
bool FDojo_S1_Expedition_TwoRounds::RunTest(const FString& Parameters)
{
	using namespace DojoS1ExpeditionTest;

	FDojoTestWorld TestWorld;

	FDay Day = MakeDay(TestWorld, true);
	Begin(Day);
	const FKinds& Kinds = Day.Kinds;
	if (!TestNotNull(TEXT("The bag view exists"), Day.Director->GetBagView())) return false;

	// Round 1: the start.
	const float RoundOneStart = TestWorld.GetWorld()->GetTimeSeconds();
	TestTrue(TEXT("Round 1 is running"), Day.Director->IsRunning());
	TestEqual(TEXT("Six piles lie in the world"), Day.Director->GetWorldItems().Num(), 6);
	TestEqual(TEXT("The hero starts at 50 health"), Day.Director->GetHealth(), 50);
	TestEqual(TEXT("The board at the start"), BoardOf(Day), FString(TEXT("Health 50/100\nSelected: none")));
	TestEqual(TEXT("The view at the start"), ViewOf(Day), FString(EmptyView));

	Day.Director->PressPickUp();
	Day.Director->PressEquip();
	Day.Director->PressDrop();
	Day.Director->PressUse();
	TestEqual(TEXT("Far from every pile and with an empty bag, the keys do nothing"), Day.Bag->GetTotalWeight(), 0);

	// Pick up the stones, then the sword.
	Go(TestWorld, Day, FVector(500.f, 0.f, 0.f));
	Day.Director->PressPickUp();
	TestEqual(TEXT("All six stones fit"), Day.Bag->CountOf(Kinds.Stone), 6);
	TestEqual(TEXT("The stone pile left the world"), Day.Director->GetWorldItems().Num(), 5);
	TestEqual(TEXT("The board shows the selected slot"), BoardOf(Day), FString(TEXT("Health 50/100\nSelected: Stone x6")));

	Go(TestWorld, Day, FVector(1000.f, 0.f, 0.f));
	Day.Director->PressPickUp();
	TestEqual(TEXT("The sword is in the bag"), Day.Bag->CountOf(Kinds.Sword), 1);
	TestEqual(TEXT("The bag weighs 18"), Day.Bag->GetTotalWeight(), 18);
	Day.Director->RestartRound();
	TestEqual(TEXT("R does nothing while the round runs"), Day.Bag->CountOf(Kinds.Sword), 1);

	// A pile that only partly fits stays in the world with the rest.
	Go(TestWorld, Day, FVector(2000.f, 0.f, 0.f));
	Day.Director->PressPickUp();
	TestEqual(TEXT("Only two of the four potions fit under the weight limit"), Day.Bag->CountOf(Kinds.Potion), 2);
	ADojoS1WorldItem* Leftover = PileAt(Day, Kinds.Potion, 2000.f);
	if (!TestNotNull(TEXT("The pile stays in the world"), Leftover)) return false;
	TestEqual(TEXT("Two potions are still on the ground"), Leftover->GetCount(), 2);
	TestEqual(TEXT("Its label follows"), Leftover->Label->Text.ToString(), FString(TEXT("Potion x2")));

	// A pile that does not fit at all stays untouched.
	Go(TestWorld, Day, FVector(1500.f, 0.f, 0.f));
	Day.Director->PressPickUp();
	TestEqual(TEXT("The helmet does not fit at 20 of 20"), Day.Bag->CountOf(Kinds.Helmet), 0);
	if (!TestNotNull(TEXT("The helmet is still lying there"), PileAt(Day, Kinds.Helmet, 1500.f))) return false;

	// Equip the sword from slot 2.
	Day.Director->SelectSlot(1);
	TestEqual(TEXT("The board follows the selection"), BoardOf(Day), FString(TEXT("Health 50/100\nSelected: Sword x1")));
	Day.Director->PressEquip();
	TestTrue(TEXT("The sword is in the hand"), Day.Equipment->GetEquipped(EDojoS1EquipSlot::EES_Hand) == Kinds.Sword);
	TestEqual(TEXT("The view shows the sword worn and the bag lighter"), ViewOf(Day), FString(TEXT("Weight 14/20\n1. Stone x6\n2. Potion x2\n3. -\n4. -\nHead: none\nHand: Sword\nPower: 7")));
	TestTrue(TEXT("Round 1 is still running"), Day.Director->IsRunning());

	// Collect the dagger and the second potion pile, then use potions.
	Go(TestWorld, Day, FVector(3000.f, 0.f, 0.f));
	Day.Director->PressPickUp();
	Go(TestWorld, Day, FVector(2500.f, 0.f, 0.f));
	Day.Director->PressPickUp();
	TestEqual(TEXT("The bag holds six potions in two piles"), Day.Bag->CountOf(Kinds.Potion), 6);
	TestEqual(TEXT("The bag weighs exactly 20"), Day.Bag->GetTotalWeight(), 20);
	TestTrue(TEXT("The second pile of potions is gone"), PileAt(Day, Kinds.Potion, 2500.f) == nullptr);

	Day.Director->SelectSlot(SlotOf(Day, Kinds.Potion));
	Day.Director->PressUse();
	TestEqual(TEXT("A potion heals 25"), Day.Director->GetHealth(), 75);
	Day.Director->PressUse();
	TestEqual(TEXT("A second potion fills the health"), Day.Director->GetHealth(), 100);
	Day.Director->PressUse();
	TestEqual(TEXT("At full health a potion is kept"), Day.Bag->CountOf(Kinds.Potion), 4);
	TestEqual(TEXT("The board shows full health"), BoardOf(Day), FString(TEXT("Health 100/100\nSelected: Potion x4")));

	// A swap that would push the bag over its limit loses nothing.
	Day.Director->SelectSlot(SlotOf(Day, Kinds.Dagger));
	Day.Director->PressEquip();
	TestTrue(TEXT("The sword stays in the hand"), Day.Equipment->GetEquipped(EDojoS1EquipSlot::EES_Hand) == Kinds.Sword);
	TestEqual(TEXT("The dagger stays in the bag"), Day.Bag->CountOf(Kinds.Dagger), 1);
	TestEqual(TEXT("There is still no second sword"), Day.Bag->CountOf(Kinds.Sword), 0);
	TestEqual(TEXT("The bag weighs the same"), Day.Bag->GetTotalWeight(), 18);
	TestEqual(TEXT("The power is the sword's"), Day.Equipment->GetTotalPower(), 7);

	// Drop two stones.
	Day.Director->SelectSlot(SlotOf(Day, Kinds.Stone));
	Day.Director->PressDrop();
	Day.Director->PressDrop();
	TestEqual(TEXT("Two stones left the bag"), Day.Bag->CountOf(Kinds.Stone), 4);
	const FVector DropSpot(2600.f, 0.f, 0.f);
	TestTrue(TEXT("Two stones lie 100 in front of the hero"), PileAt(Day, Kinds.Stone, DropSpot.X) != nullptr);
	TestEqual(TEXT("Four piles are on the ground: potions, helmet, two stones"), Day.Director->GetWorldItems().Num(), 4);

	// Fetch the helmet and wear it: the pack is ready.
	Go(TestWorld, Day, FVector(1500.f, 0.f, 0.f));
	Day.Director->PressPickUp();
	TestEqual(TEXT("The helmet fits now"), Day.Bag->CountOf(Kinds.Helmet), 1);
	TestTrue(TEXT("Not ready until the helmet is worn"), Day.Director->IsRunning());
	Day.Director->SelectSlot(SlotOf(Day, Kinds.Helmet));
	Day.Director->PressEquip();

	const float RoundOneFinish = TestWorld.GetWorld()->GetTimeSeconds() - RoundOneStart;
	TestFalse(TEXT("The finale ended round 1"), Day.Director->IsRunning());
	TestEqual(TEXT("The finish time is the time since the round began"), Day.Director->GetFinishSeconds(), RoundOneFinish, 0.001f);
	TestEqual(TEXT("The board shows the finale"), BoardOf(Day), ReadyBoard(TEXT("100/100"), TEXT("none"), RoundOneFinish));

	Go(TestWorld, Day, FVector(2000.f, 0.f, 0.f));
	Day.Director->PressPickUp();
	Day.Director->SelectSlot(0);
	Day.Director->PressDrop();
	Day.Director->PressUse();
	TestEqual(TEXT("After the finale E, G and U do nothing"), Day.Bag->GetTotalWeight(), 14);
	TestEqual(TEXT("The finale text stays, and the selection still follows"), BoardOf(Day), ReadyBoard(TEXT("100/100"), TEXT("Stone x4"), RoundOneFinish));

	// Round 2 starts from the same state as round 1.
	Day.Director->RestartRound();
	const float RoundTwoStart = TestWorld.GetWorld()->GetTimeSeconds();
	TestTrue(TEXT("Round 2 is running"), Day.Director->IsRunning());
	TestEqual(TEXT("The bag is empty"), Day.Bag->GetSlots().Num(), 0);
	TestTrue(TEXT("The hand is empty"), Day.Equipment->GetEquipped(EDojoS1EquipSlot::EES_Hand) == nullptr);
	TestTrue(TEXT("The head is empty"), Day.Equipment->GetEquipped(EDojoS1EquipSlot::EES_Head) == nullptr);
	TestEqual(TEXT("The health is back to 50"), Day.Director->GetHealth(), 50);
	TestEqual(TEXT("Exactly the six starting piles lie in the world"), Day.Director->GetWorldItems().Num(), 6);
	ADojoS1WorldItem* FreshPotions = PileAt(Day, Kinds.Potion, 2000.f);
	TestEqual(TEXT("The potions are a full pile of four again"), FreshPotions != nullptr ? FreshPotions->GetCount() : 0, 4);
	TestTrue(TEXT("The dropped stones are gone"), PileAt(Day, Kinds.Stone, DropSpot.X) == nullptr);
	TestEqual(TEXT("The board is back at the start"), BoardOf(Day), FString(TEXT("Health 50/100\nSelected: none")));
	TestEqual(TEXT("The view is back at the start"), ViewOf(Day), FString(EmptyView));

	// Round 2, the short way: sword, helmet, four potions, wear both.
	Go(TestWorld, Day, FVector(1000.f, 0.f, 0.f));
	Day.Director->PressPickUp();
	Go(TestWorld, Day, FVector(1500.f, 0.f, 0.f));
	Day.Director->PressPickUp();
	Go(TestWorld, Day, FVector(2000.f, 0.f, 0.f));
	Day.Director->PressPickUp();
	TestEqual(TEXT("All four potions fit this time"), Day.Bag->CountOf(Kinds.Potion), 4);
	Day.Director->SelectSlot(0);
	Day.Director->PressEquip();
	TestTrue(TEXT("Wearing the sword alone is not ready"), Day.Director->IsRunning());
	Day.Director->SelectSlot(0);
	Day.Director->PressEquip();

	const float RoundTwoFinish = TestWorld.GetWorld()->GetTimeSeconds() - RoundTwoStart;
	TestFalse(TEXT("Round 2 ends when the pack is ready"), Day.Director->IsRunning());
	TestEqual(TEXT("Round 2 has its own finish time"), Day.Director->GetFinishSeconds(), RoundTwoFinish, 0.001f);
	TestEqual(TEXT("The board shows round 2's finale"), BoardOf(Day), ReadyBoard(TEXT("50/100"), TEXT("Potion x4"), RoundTwoFinish));
	TestEqual(TEXT("The view shows the finished pack"), ViewOf(Day), FString(TEXT("Weight 4/20\n1. Potion x4\n2. -\n3. -\n4. -\nHead: Helmet\nHand: Sword\nPower: 9")));

	return true;
}

IMPLEMENT_SIMPLE_AUTOMATION_TEST(FDojo_S1_Expedition_ReachAndKeys, "Dojo.S1.Expedition.ReachAndKeys", EAutomationTestFlags::EditorContext | EAutomationTestFlags::ProductFilter)

/** Checks the pickup reach and tie rules and the keys that must do nothing when they have nothing to act on. */
bool FDojo_S1_Expedition_ReachAndKeys::RunTest(const FString& Parameters)
{
	using namespace DojoS1ExpeditionTest;

	FDojoTestWorld TestWorld;

	FDay Day = MakeDay(TestWorld, false);
	const FKinds& Kinds = Day.Kinds;
	AddSpot(Day.Director, Kinds.Stone, 1, FVector(0.f, 100.f, 0.f));
	AddSpot(Day.Director, Kinds.Potion, 1, FVector(0.f, -100.f, 0.f));
	AddSpot(Day.Director, Kinds.Sword, 1, FVector(400.f, 0.f, 0.f));
	AddSpot(Day.Director, Kinds.Dagger, 1, FVector(1400.f, 0.f, 0.f));
	Begin(Day);

	Go(TestWorld, Day, FVector(0.f, 0.f, 0.f));
	Day.Director->PressPickUp();
	TestEqual(TEXT("Two piles at the same distance: the earlier one wins"), Day.Bag->CountOf(Kinds.Stone), 1);
	TestEqual(TEXT("The other pile waits"), Day.Bag->CountOf(Kinds.Potion), 0);

	Day.Director->PressPickUp();
	TestEqual(TEXT("The next press takes the other pile"), Day.Bag->CountOf(Kinds.Potion), 1);

	Day.Director->PressPickUp();
	TestEqual(TEXT("The sword is 400 away, out of reach"), Day.Bag->CountOf(Kinds.Sword), 0);

	Go(TestWorld, Day, FVector(200.f, 0.f, 0.f));
	Day.Director->PressPickUp();
	TestEqual(TEXT("A pile exactly 200 away is in reach"), Day.Bag->CountOf(Kinds.Sword), 1);

	Go(TestWorld, Day, FVector(1199.f, 0.f, 0.f));
	Day.Director->PressPickUp();
	TestEqual(TEXT("A pile 201 away is out of reach"), Day.Bag->CountOf(Kinds.Dagger), 0);
	Go(TestWorld, Day, FVector(1201.f, 0.f, 0.f));
	Day.Director->PressPickUp();
	TestEqual(TEXT("A pile 199 away is in reach"), Day.Bag->CountOf(Kinds.Dagger), 1);

	// The bag now holds a stone, a potion, a sword and a dagger.
	Day.Director->SelectSlot(9);
	TestTrue(TEXT("A slot past the bag selects nothing"), Day.Director->GetSelectedItem() == nullptr);
	Day.Director->PressDrop();
	Day.Director->PressUse();
	Day.Director->PressEquip();
	TestEqual(TEXT("Keys with nothing selected do nothing"), Day.Bag->GetTotalWeight(), 2 + 1 + 6 + 2);
	TestEqual(TEXT("Nothing was dropped"), Day.Director->GetWorldItems().Num(), 0);

	Day.Director->SelectSlot(SlotOf(Day, Kinds.Stone));
	Day.Director->PressUse();
	Day.Director->PressEquip();
	TestEqual(TEXT("A stone can be neither used nor worn"), Day.Bag->CountOf(Kinds.Stone), 1);
	TestTrue(TEXT("Nothing is worn"), Day.Equipment->GetEquipped(EDojoS1EquipSlot::EES_Hand) == nullptr);
	TestEqual(TEXT("The hero's health is unchanged"), Day.Director->GetHealth(), 50);

	Day.Director->SelectSlot(SlotOf(Day, Kinds.Potion));
	Day.Director->PressEquip();
	TestEqual(TEXT("A potion cannot be worn"), Day.Bag->CountOf(Kinds.Potion), 1);

	Day.Director->SelectSlot(SlotOf(Day, Kinds.Sword));
	Day.Director->PressUse();
	TestEqual(TEXT("A sword cannot be used"), Day.Bag->CountOf(Kinds.Sword), 1);

	Day.Director->SelectSlot(SlotOf(Day, Kinds.Dagger));
	Day.Director->PressDrop();
	TestEqual(TEXT("A dropped dagger leaves the bag"), Day.Bag->CountOf(Kinds.Dagger), 0);
	ADojoS1WorldItem* Dropped = PileAt(Day, Kinds.Dagger, 1301.f);
	if (!TestNotNull(TEXT("It lies 100 in front of the hero"), Dropped)) return false;
	TestEqual(TEXT("The dropped pile holds one"), Dropped->GetCount(), 1);

	return true;
}

IMPLEMENT_SIMPLE_AUTOMATION_TEST(FDojo_S1_Expedition_NearestPileWins, "Dojo.S1.Expedition.NearestPileWins", EAutomationTestFlags::EditorContext | EAutomationTestFlags::ProductFilter)

/** Puts three piles in reach at different distances, listed farthest first, and checks they are picked up nearest first. */
bool FDojo_S1_Expedition_NearestPileWins::RunTest(const FString& Parameters)
{
	using namespace DojoS1ExpeditionTest;

	FDojoTestWorld TestWorld;

	FDay Day = MakeDay(TestWorld, false);
	const FKinds& Kinds = Day.Kinds;
	AddSpot(Day.Director, Kinds.Stone, 1, FVector(150.f, 0.f, 0.f));
	AddSpot(Day.Director, Kinds.Dagger, 1, FVector(50.f, 0.f, 0.f));
	AddSpot(Day.Director, Kinds.Potion, 1, FVector(100.f, 0.f, 0.f));
	Begin(Day);

	Go(TestWorld, Day, FVector(0.f, 0.f, 0.f));
	Day.Director->PressPickUp();
	TestEqual(TEXT("The dagger, 50 away, goes first"), Day.Bag->CountOf(Kinds.Dagger), 1);
	TestEqual(TEXT("The others wait"), Day.Bag->CountOf(Kinds.Potion) + Day.Bag->CountOf(Kinds.Stone), 0);

	Day.Director->PressPickUp();
	TestEqual(TEXT("The potion, 100 away, goes second"), Day.Bag->CountOf(Kinds.Potion), 1);
	TestEqual(TEXT("The stone still waits"), Day.Bag->CountOf(Kinds.Stone), 0);

	Day.Director->PressPickUp();
	TestEqual(TEXT("The stone, 150 away, goes last"), Day.Bag->CountOf(Kinds.Stone), 1);

	return true;
}

IMPLEMENT_SIMPLE_AUTOMATION_TEST(FDojo_S1_Expedition_FinaleNeedsEverything, "Dojo.S1.Expedition.FinaleNeedsEverything", EAutomationTestFlags::EditorContext | EAutomationTestFlags::ProductFilter)

/** Wears the sword and the helmet before any potion is in the bag, and checks the round ends at exactly three potions and that healing stops at the maximum. */
bool FDojo_S1_Expedition_FinaleNeedsEverything::RunTest(const FString& Parameters)
{
	using namespace DojoS1ExpeditionTest;

	FDojoTestWorld TestWorld;

	FDay Day = MakeDay(TestWorld, false);
	const FKinds& Kinds = Day.Kinds;
	Day.Director->StartHealth = 60;
	AddSpot(Day.Director, Kinds.Sword, 1, FVector(1000.f, 0.f, 0.f));
	AddSpot(Day.Director, Kinds.Helmet, 1, FVector(1500.f, 0.f, 0.f));
	AddSpot(Day.Director, Kinds.Potion, 2, FVector(2000.f, 0.f, 0.f));
	AddSpot(Day.Director, Kinds.Potion, 2, FVector(2500.f, 0.f, 0.f));
	AddSpot(Day.Director, Kinds.Potion, 1, FVector(3000.f, 0.f, 0.f));
	Begin(Day);
	const float Start = TestWorld.GetWorld()->GetTimeSeconds();

	Go(TestWorld, Day, FVector(1000.f, 0.f, 0.f));
	Day.Director->PressPickUp();
	Day.Director->SelectSlot(0);
	Day.Director->PressEquip();
	TestTrue(TEXT("The sword alone is not ready"), Day.Director->IsRunning());

	Go(TestWorld, Day, FVector(1500.f, 0.f, 0.f));
	Day.Director->PressPickUp();
	Day.Director->SelectSlot(0);
	Day.Director->PressEquip();
	TestTrue(TEXT("The sword is in the hand"), Day.Equipment->GetEquipped(EDojoS1EquipSlot::EES_Hand) == Kinds.Sword);
	TestTrue(TEXT("The helmet is on the head"), Day.Equipment->GetEquipped(EDojoS1EquipSlot::EES_Head) == Kinds.Helmet);
	TestTrue(TEXT("Sword and helmet with no potions are not ready"), Day.Director->IsRunning());

	Go(TestWorld, Day, FVector(2000.f, 0.f, 0.f));
	Day.Director->PressPickUp();
	TestEqual(TEXT("Two potions are in the bag"), Day.Bag->CountOf(Kinds.Potion), 2);
	TestTrue(TEXT("Two potions are not enough"), Day.Director->IsRunning());

	Day.Director->SelectSlot(0);
	Day.Director->PressUse();
	TestEqual(TEXT("A potion heals 25 from 60"), Day.Director->GetHealth(), 85);
	Day.Director->PressUse();
	TestEqual(TEXT("Healing stops at the maximum"), Day.Director->GetHealth(), 100);
	TestEqual(TEXT("Both potions were used"), Day.Bag->CountOf(Kinds.Potion), 0);

	Go(TestWorld, Day, FVector(2500.f, 0.f, 0.f));
	Day.Director->PressPickUp();
	TestEqual(TEXT("Two potions are in the bag again"), Day.Bag->CountOf(Kinds.Potion), 2);
	TestTrue(TEXT("Two potions are still not enough"), Day.Director->IsRunning());

	Go(TestWorld, Day, FVector(3000.f, 0.f, 0.f));
	Day.Director->PressPickUp();
	const float Finish = TestWorld.GetWorld()->GetTimeSeconds() - Start;
	TestEqual(TEXT("Three potions are in the bag"), Day.Bag->CountOf(Kinds.Potion), 3);
	TestFalse(TEXT("Exactly three potions end the round"), Day.Director->IsRunning());
	TestEqual(TEXT("The board shows the finale"), BoardOf(Day), ReadyBoard(TEXT("100/100"), TEXT("Potion x3"), Finish));

	return true;
}

IMPLEMENT_SIMPLE_AUTOMATION_TEST(FDojo_S1_Expedition_UnbindsWhenItLeaves, "Dojo.S1.Expedition.UnbindsWhenItLeaves", EAutomationTestFlags::EditorContext | EAutomationTestFlags::ProductFilter)

/** Destroys the director and checks that its view left with it and the hero's bag and equipment have no listeners left. */
bool FDojo_S1_Expedition_UnbindsWhenItLeaves::RunTest(const FString& Parameters)
{
	using namespace DojoS1ExpeditionTest;

	FDojoTestWorld TestWorld;

	FDay Day = MakeDay(TestWorld, true);
	Begin(Day);
	if (!TestNotNull(TEXT("The bag view exists"), Day.Director->GetBagView())) return false;

	TestTrue(TEXT("Something listens to the bag"), Day.Bag->OnInventoryChanged.IsBound());
	TestTrue(TEXT("Something listens to the equipment"), Day.Equipment->OnEquipmentChanged.IsBound());

	ADojoS1BagView* View = Day.Director->GetBagView();
	Day.Director->Destroy();
	TestFalse(TEXT("The view leaves with the director"), IsValid(View));
	TestFalse(TEXT("Nobody listens to the bag after the director leaves"), Day.Bag->OnInventoryChanged.IsBound());
	TestFalse(TEXT("Nobody listens to the equipment after the director leaves"), Day.Equipment->OnEquipmentChanged.IsBound());

	Day.Bag->Add(Day.Kinds.Potion, 2);
	TestEqual(TEXT("The bag carries on"), Day.Bag->CountOf(Day.Kinds.Potion), 2);

	return true;
}

#endif
