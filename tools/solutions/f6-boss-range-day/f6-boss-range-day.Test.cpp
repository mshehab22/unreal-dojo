#include "Misc/AutomationTest.h"

#if WITH_AUTOMATION_TESTS

#include "Components/TextRenderComponent.h"
#include "Curves/CurveFloat.h"
#include "Engine/DataTable.h"
#include "Engine/StaticMesh.h"
#include "Quests/f6-boss-range-day/DojoF6RangeDirector.h"
#include "Quests/f6-boss-range-day/DojoF6WaveRow.h"
#include "Quests/f6-level-curve/DojoF6LevelComponent.h"
#include "Quests/f6-showcase/DojoF6Showcase.h"
#include "Quests/f6-target-table/DojoF6Target.h"
#include "Quests/f6-target-table/DojoF6TargetRow.h"
#include "Quests/f6-target-table/DojoF6TargetSpawner.h"
#include "Quests/f6-weapon-data/DojoF6Blaster.h"
#include "Quests/f6-weapon-data/DojoF6WeaponData.h"
#include "Support/DojoTestWorld.h"

namespace DojoF6RangeDayTest
{
	const TCHAR* CubePath = TEXT("/Engine/BasicShapes/Cube.Cube");
	const TCHAR* CylinderPath = TEXT("/Engine/BasicShapes/Cylinder.Cylinder");

	/** The range's data, built in code the way a designer would build the assets. */
	struct FRangeData
	{
		UDataTable* Targets = nullptr;
		UDataTable* Waves = nullptr;
		UCurveFloat* XPCurve = nullptr;
		UDojoF6WeaponData* Pistol = nullptr;
		UDojoF6WeaponData* Rifle = nullptr;
	};

	/** Makes one weapon asset. */
	UDojoF6WeaponData* MakeWeapon(float Damage, int32 ClipSize, const TCHAR* MeshPath)
	{
		UDojoF6WeaponData* Weapon = NewObject<UDojoF6WeaponData>();
		Weapon->Damage = Damage;
		Weapon->ClipSize = ClipSize;
		Weapon->Mesh = TSoftObjectPtr<UStaticMesh>(FSoftObjectPath(MeshPath));
		return Weapon;
	}

	/** Adds one target kind to the target table. */
	void AddTargetRow(UDataTable* Table, const TCHAR* Name, float Health, int32 Points)
	{
		FDojoF6TargetRow Row;
		Row.Health = Health;
		Row.Points = Points;
		Table->AddRow(FName(Name), Row);
	}

	/** Adds one wave to the wave table. */
	void AddWaveRow(UDataTable* Table, const TCHAR* Name, const TCHAR* Kind, int32 Count)
	{
		FDojoF6WaveRow Row;
		Row.TargetKind = FName(Kind);
		Row.Count = Count;
		Table->AddRow(FName(Name), Row);
	}

	/** Tin 1 health 10 points, Steel 3 health 30 points; waves Opening (3 Tin), Plates (2 Steel), Ghosts (1 of a missing kind), Finale (3 Steel); XP 40 at level 1 rising by 20 a level; a 1 damage 6 shot pistol and a 3 damage 4 shot rifle. */
	FRangeData MakeRangeData()
	{
		FRangeData Data;

		Data.Targets = NewObject<UDataTable>();
		Data.Targets->RowStruct = FDojoF6TargetRow::StaticStruct();
		AddTargetRow(Data.Targets, TEXT("Tin"), 1.f, 10);
		AddTargetRow(Data.Targets, TEXT("Steel"), 3.f, 30);

		Data.Waves = NewObject<UDataTable>();
		Data.Waves->RowStruct = FDojoF6WaveRow::StaticStruct();
		AddWaveRow(Data.Waves, TEXT("Opening"), TEXT("Tin"), 3);
		AddWaveRow(Data.Waves, TEXT("Plates"), TEXT("Steel"), 2);
		AddWaveRow(Data.Waves, TEXT("Ghosts"), TEXT("Ghost"), 1);
		AddWaveRow(Data.Waves, TEXT("Finale"), TEXT("Steel"), 3);

		Data.XPCurve = NewObject<UCurveFloat>();
		Data.XPCurve->FloatCurve.AddKey(1.f, 40.f);
		Data.XPCurve->FloatCurve.AddKey(5.f, 120.f);

		Data.Pistol = MakeWeapon(1.f, 6, CubePath);
		Data.Rifle = MakeWeapon(3.f, 4, CylinderPath);
		return Data;
	}

	/** The pieces placed in the level, wired to the director the way a designer would wire them in Details. */
	struct FRange
	{
		ADojoF6RangeDirector* Director = nullptr;
		ADojoF6Blaster* Blaster = nullptr;
		ADojoF6Showcase* Showcase = nullptr;
	};

	/** Places the spawner, blaster, showcase, and director, then begins play, which starts round 1. */
	FRange MakeRange(FDojoTestWorld& TestWorld, const FRangeData& Data, UDojoF6WeaponData* StartingWeapon)
	{
		FRange Range;

		ADojoF6TargetSpawner* Spawner = TestWorld.SpawnActor<ADojoF6TargetSpawner>();
		Spawner->Table = Data.Targets;
		Range.Blaster = TestWorld.SpawnActor<ADojoF6Blaster>();
		Range.Showcase = TestWorld.SpawnActor<ADojoF6Showcase>();

		Range.Director = TestWorld.GetWorld()->SpawnActorDeferred<ADojoF6RangeDirector>(ADojoF6RangeDirector::StaticClass(), FTransform::Identity);
		Range.Director->Waves = Data.Waves;
		Range.Director->Spawner = Spawner;
		Range.Director->Blaster = Range.Blaster;
		Range.Director->Showcase = Range.Showcase;
		Range.Director->Weapons = { StartingWeapon, Data.Rifle };
		Range.Director->Progress->XPCurve = Data.XPCurve;
		Range.Director->FinishSpawning(FTransform::Identity);
		return Range;
	}

	/** The name of the mesh on the showcase, or None. */
	FString ShownMeshName(const ADojoF6Showcase* Showcase)
	{
		const UStaticMesh* Mesh = Showcase->GetShownMesh();
		return Mesh ? Mesh->GetName() : FString(TEXT("None"));
	}

	/** Presses F Count times. */
	void PressFire(ADojoF6RangeDirector* Director, int32 Count)
	{
		for (int32 Press = 0; Press < Count; Press++)
		{
			Director->PressFire();
		}
	}

	/** Plays one round with the 1 damage pistol, checking every rule on the way, and returns false if the range broke. */
	bool PlayPistolRound(FAutomationTestBase& Test, const FRange& Range, const FString& Round)
	{
		ADojoF6RangeDirector* Director = Range.Director;

		Test.TestTrue(Round + TEXT(": running"), Director->IsRunning());
		Test.TestEqual(Round + TEXT(": wave 1"), Director->GetWaveNumber(), 1);
		Test.TestEqual(Round + TEXT(": the label shows the wave and score"), Director->Label->Text.ToString(), FString(TEXT("WAVE 1 SCORE 0")));
		Test.TestEqual(Round + TEXT(": level 1"), Director->Progress->GetLevel(), 1);
		Test.TestEqual(Round + TEXT(": the pistol is equipped with a full clip"), Range.Blaster->GetAmmo(), 6);
		Test.TestEqual(Round + TEXT(": the showcase shows the pistol"), ShownMeshName(Range.Showcase), FString(TEXT("Cube")));

		TArray<ADojoF6Target*> Standing = Director->GetStandingTargets();
		if (!Test.TestEqual(Round + TEXT(": three tin targets"), Standing.Num(), 3)) return false;
		Test.TestEqual(Round + TEXT(": the third target stands 300 along the row"), Standing[2]->GetActorLocation().Y, 300.0, 0.01);

		PressFire(Director, 1);
		Standing = Director->GetStandingTargets();
		if (!Test.TestEqual(Round + TEXT(": one shot drops one tin"), Standing.Num(), 2)) return false;
		Test.TestEqual(Round + TEXT(": the oldest target falls first"), Standing[0]->GetActorLocation().Y, 150.0, 0.01);

		PressFire(Director, 2);
		Test.TestEqual(Round + TEXT(": the opening is cleared and the plates begin"), Director->GetWaveNumber(), 2);
		Test.TestEqual(Round + TEXT(": 30 points"), Director->GetScore(), 30);

		Standing = Director->GetStandingTargets();
		if (!Test.TestEqual(Round + TEXT(": two steel targets"), Standing.Num(), 2)) return false;
		ADojoF6Target* FirstSteel = Standing[0];
		ADojoF6Target* SecondSteel = Standing[1];

		PressFire(Director, 1);
		Test.TestEqual(Round + TEXT(": the shot hits the older steel"), FirstSteel->GetHealth(), 2.f);
		Test.TestEqual(Round + TEXT(": and not the newer one"), SecondSteel->GetHealth(), 3.f);

		PressFire(Director, 2);
		Test.TestEqual(Round + TEXT(": level 2 after 60 XP"), Director->Progress->GetLevel(), 2);
		Test.TestEqual(Round + TEXT(": the clip is empty after six shots"), Range.Blaster->GetAmmo(), 0);

		PressFire(Director, 1);
		Test.TestEqual(Round + TEXT(": an empty clip reloads"), Range.Blaster->GetAmmo(), 6);
		Test.TestEqual(Round + TEXT(": the reload is not a shot"), Director->GetShots(), 6);
		Test.TestEqual(Round + TEXT(": the reload hits nothing"), SecondSteel->GetHealth(), 3.f);

		PressFire(Director, 3);
		Test.TestEqual(Round + TEXT(": the empty wave is skipped straight to the finale"), Director->GetWaveNumber(), 4);
		Test.TestTrue(Round + TEXT(": still the pistol at level 2"), Range.Blaster->Weapon.Get() == Director->Weapons[0].Get());

		PressFire(Director, 3);
		Test.TestEqual(Round + TEXT(": level 3 after 140 XP"), Director->Progress->GetLevel(), 3);
		Test.TestTrue(Round + TEXT(": level 3 upgrades to the rifle"), Range.Blaster->Weapon.Get() == Director->Weapons[1].Get());
		Test.TestEqual(Round + TEXT(": the rifle starts with a full clip"), Range.Blaster->GetAmmo(), 4);
		Test.TestEqual(Round + TEXT(": the showcase shows the rifle"), ShownMeshName(Range.Showcase), FString(TEXT("Cylinder")));

		PressFire(Director, 2);
		Test.TestFalse(Round + TEXT(": the finale clears the range"), Director->IsRunning());
		Test.TestEqual(Round + TEXT(": the label shows the result"), Director->Label->Text.ToString(), FString(TEXT("CLEAR 180 in 14 shots")));
		Test.TestEqual(Round + TEXT(": level 4 at the end"), Director->Progress->GetLevel(), 4);

		PressFire(Director, 1);
		Test.TestEqual(Round + TEXT(": F does nothing once the round is over"), Director->GetShots(), 14);
		return true;
	}
}

IMPLEMENT_SIMPLE_AUTOMATION_TEST(FDojo_F6_RangeDay_TwoRoundsPlayAlike, "Dojo.F6.RangeDay.TwoRoundsPlayAlike", EAutomationTestFlags::EditorContext | EAutomationTestFlags::ProductFilter)

/** Plays two full rounds with the pistol and checks the second plays exactly like the first. */
bool FDojo_F6_RangeDay_TwoRoundsPlayAlike::RunTest(const FString& Parameters)
{
	using namespace DojoF6RangeDayTest;

	AddExpectedMessage(TEXT("no row named Ghost"), ELogVerbosity::Warning, EAutomationExpectedMessageFlags::Contains, 2);
	AddExpectedMessage(TEXT("Wave Ghosts spawned no targets and is skipped"), ELogVerbosity::Warning, EAutomationExpectedMessageFlags::Contains, 2);

	FDojoTestWorld TestWorld;
	const FRangeData Data = MakeRangeData();
	const FRange Range = MakeRange(TestWorld, Data, Data.Pistol);
	if (!TestNotNull(TEXT("Director spawned"), Range.Director)) return false;

	if (!PlayPistolRound(*this, Range, TEXT("Round 1"))) return false;

	Range.Director->RestartRound();
	PlayPistolRound(*this, Range, TEXT("Round 2"));

	return true;
}

IMPLEMENT_SIMPLE_AUTOMATION_TEST(FDojo_F6_RangeDay_DataDrivesTheRound, "Dojo.F6.RangeDay.DataDrivesTheRound", EAutomationTestFlags::EditorContext | EAutomationTestFlags::ProductFilter)

/** Plays with a heavier starting weapon, then edits the target table between rounds, and checks the range follows the data without code changes. */
bool FDojo_F6_RangeDay_DataDrivesTheRound::RunTest(const FString& Parameters)
{
	using namespace DojoF6RangeDayTest;

	AddExpectedMessage(TEXT("no row named Ghost"), ELogVerbosity::Warning, EAutomationExpectedMessageFlags::Contains, 1);
	AddExpectedMessage(TEXT("Wave Ghosts spawned no targets and is skipped"), ELogVerbosity::Warning, EAutomationExpectedMessageFlags::Contains, 1);

	FDojoTestWorld TestWorld;
	const FRangeData Data = MakeRangeData();
	UDojoF6WeaponData* Cannon = MakeWeapon(5.f, 6, CubePath);
	const FRange Range = MakeRange(TestWorld, Data, Cannon);
	ADojoF6RangeDirector* Director = Range.Director;
	if (!TestNotNull(TEXT("Director spawned"), Director)) return false;

	Director->RestartRound();
	TestEqual(TEXT("R does nothing while a round runs"), Director->GetWaveNumber(), 1);

	PressFire(Director, 5);
	TestEqual(TEXT("Round 1: 5 damage drops every target with one shot"), Director->GetWaveNumber(), 4);
	TestEqual(TEXT("Round 1: level 2 before the finale"), Director->Progress->GetLevel(), 2);

	PressFire(Director, 1);
	TestTrue(TEXT("Round 1: the sixth shot reaches level 3 and the rifle"), Range.Blaster->Weapon.Get() == Data.Rifle);
	TestEqual(TEXT("Round 1: the upgrade refills the empty clip"), Range.Blaster->GetAmmo(), 4);

	PressFire(Director, 2);
	TestEqual(TEXT("Round 1: cleared in eight shots"), Director->Label->Text.ToString(), FString(TEXT("CLEAR 180 in 8 shots")));

	FDojoF6TargetRow* Steel = Data.Targets->FindRow<FDojoF6TargetRow>(TEXT("Steel"), TEXT("Test"));
	if (!TestNotNull(TEXT("The steel row exists"), Steel)) return false;
	Steel->Health = 6.f;

	Director->RestartRound();
	TestTrue(TEXT("Round 2: back to the starting weapon"), Range.Blaster->Weapon.Get() == Cannon);

	PressFire(Director, 4);
	const TArray<ADojoF6Target*> Standing = Director->GetStandingTargets();
	if (!TestEqual(TEXT("Round 2: both plates still stand after one shot each would have dropped them"), Standing.Num(), 2)) return false;
	TestEqual(TEXT("Round 2: the edited row gives steel 6 health"), Standing[0]->GetHealth(), 1.f);

	return true;
}

#endif
