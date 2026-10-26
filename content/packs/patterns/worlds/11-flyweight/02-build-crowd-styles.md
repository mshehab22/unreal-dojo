---
id: p11-crowd-styles
title: A crowd of small fans and a few shared styles
order: 2
kind: build
scaffold: worked
difficulty: 2
patterns: [flyweight]
skills: [flyweight, memory]
terms: [ustruct, tarray, uproperty]
prerequisites: [p11-thousands-of-the-same]
xp: 50
estimatedMinutes: 15
concepts:
  - Each fan is a small struct holding only its seat, its excitement, and a one-byte index to its style
  - The styles are stored once in the crowd, and fans read them through the index
  - Reading the shared style each time means retuning one style changes every fan of it at once
---

# Brief

When you press Play with the setup below, the crowd's loudness prints as 3000: three thousand half-excited fans in three styles that cheer at volumes 1, 2, and 3.

`ADojoP11Crowd` holds the arena's fans. Its `Styles` list holds a few supporter styles, each with a name, a cheer volume, a scarf color, and a chant. Its fans are `FDojoP11Fan` structs, a few bytes each: a seat, an excitement from 0 to 1, and the index of the fan's style in `Styles`. Seating hands the styles out in turn, so fan 0 is a Local, fan 1 a Drummer, fan 2 a Visitor, fan 3 a Local again.

Most of the code is written. First read the marked lines and say in a sentence why each one is there. Then fill the one gap: `GetLoudness`, the sum over all fans of the fan's excitement times its style's cheer volume. Read the volume from the shared style through the fan's index, and skip a fan whose index names no style.

## See it in the editor

Place a `DojoP11Crowd`. In its Details panel, add three Styles: Locals with Cheer Volume 1, Drummers with 2, and Visitors with 3; leave Fan Count at 3000. In the Level Blueprint, on Begin Play, call Excite on the crowd with 0.5 and print Get Loudness: 3000. While playing, select the crowd in the Outliner and change the Drummers' Cheer Volume to 4 in its Details panel, then print again from a key press: 4000. One edit, a thousand fans louder, because they all read the same style.

# Files

## DojoP11FanStyle.h

```cpp
#pragma once

#include "CoreMinimal.h"
#include "DojoP11FanStyle.generated.h"

/** What every fan of one style shares: stored once in the crowd, never copied into a fan. */
USTRUCT(BlueprintType)
struct FDojoP11FanStyle
{
	GENERATED_BODY()

	/** The style's name, such as Drummers. */
	UPROPERTY(EditAnywhere, BlueprintReadOnly, Category = "Fan Style")
	FName Name = TEXT("Locals");

	/** How loud one fully excited fan of this style cheers. */
	UPROPERTY(EditAnywhere, BlueprintReadOnly, Category = "Fan Style", meta = (ClampMin = "0.0"))
	float CheerVolume = 1.f;

	/** The scarf color every fan of this style waves. */
	UPROPERTY(EditAnywhere, BlueprintReadOnly, Category = "Fan Style")
	FColor ScarfColor = FColor::Red;

	/** The chant this style sings. */
	UPROPERTY(EditAnywhere, BlueprintReadOnly, Category = "Fan Style")
	FText Chant = FText::FromString(TEXT("Again!"));
};
```

## DojoP11Fan.h

```cpp
#pragma once

#include "CoreMinimal.h"

/** One fan in the stands: only what differs from fan to fan, a few bytes each. */
struct FDojoP11Fan
{
	/** The seat this fan sits in. */
	int32 Seat = 0;

	/** Excitement from 0 to 1. */
	float Excitement = 0.f;

	/** Which of the crowd's styles this fan belongs to. */
	uint8 StyleIndex = 0; // @explain: One byte names the fan's style; the style itself, with its name, color, and chant, is stored once in the crowd.
};
```

## DojoP11Crowd.h

```cpp
#pragma once

#include "CoreMinimal.h"
#include "DojoP11Fan.h"
#include "DojoP11FanStyle.h"
#include "GameFramework/Actor.h"
#include "DojoP11Crowd.generated.h"

/** The arena crowd: thousands of small fans that each point at one of a few shared styles. */
UCLASS()
class ADojoP11Crowd : public AActor
{
	GENERATED_BODY()

public:
	/** Turns ticking off. */
	ADojoP11Crowd();

	/** The shared styles; fans refer to them by index. At most 255. */
	UPROPERTY(EditAnywhere, BlueprintReadOnly, Category = "Crowd")
	TArray<FDojoP11FanStyle> Styles;

	/** How many fans SeatFans seats. */
	UPROPERTY(EditAnywhere, BlueprintReadOnly, Category = "Crowd", meta = (ClampMin = "0"))
	int32 FanCount = 3000;

	/** Seats FanCount fans, one per seat, giving the styles out in turn; seats nobody when there are no styles. */
	UFUNCTION(BlueprintCallable, Category = "Crowd")
	void SeatFans();

	/** Adds Amount to every fan's excitement, kept between 0 and 1. */
	UFUNCTION(BlueprintCallable, Category = "Crowd")
	void Excite(float Amount);

	/** The crowd's total loudness: each fan's excitement times its style's cheer volume, summed. */
	UFUNCTION(BlueprintPure, Category = "Crowd")
	float GetLoudness() const;

	/** Fans seated. */
	UFUNCTION(BlueprintPure, Category = "Crowd")
	int32 GetFanCount() const;

	/** The shared style of fan Index, or nullptr for an index with no fan. */
	const FDojoP11FanStyle* GetStyleOf(int32 Index) const; // @explain: Returns a const pointer into the crowd's own list, so callers can read the shared style but not change it for everyone.

	/** Fan Index itself, or nullptr for an index with no fan. */
	const FDojoP11Fan* GetFan(int32 Index) const;

protected:
	/** Seats the fans. */
	virtual void BeginPlay() override;

private:
	/** Every fan, a few bytes each; the styles are not copied in. */
	TArray<FDojoP11Fan> Fans;
};
```

## DojoP11Crowd.cpp

```cpp
#include "DojoP11Crowd.h"

ADojoP11Crowd::ADojoP11Crowd()
{
	PrimaryActorTick.bCanEverTick = false;
}

void ADojoP11Crowd::BeginPlay()
{
	Super::BeginPlay();

	SeatFans();
}

void ADojoP11Crowd::SeatFans()
{
	Fans.Reset();

	const int32 StyleCount = FMath::Min(Styles.Num(), 255);
	if (StyleCount == 0) return;

	Fans.Reserve(FanCount); // @explain: Thousands of small structs in one array, allocated once, instead of thousands of objects.
	for (int32 Seat = 0; Seat < FanCount; Seat++)
	{
		FDojoP11Fan Fan;
		Fan.Seat = Seat;
		Fan.StyleIndex = static_cast<uint8>(Seat % StyleCount); // @explain: Seating hands out styles in turn; no fan gets a copy of a style, only its index.
		Fans.Add(Fan);
	}
}

void ADojoP11Crowd::Excite(float Amount)
{
	for (FDojoP11Fan& Fan : Fans) Fan.Excitement = FMath::Clamp(Fan.Excitement + Amount, 0.f, 1.f);
}

float ADojoP11Crowd::GetLoudness() const
{
	return 0.f;
}

int32 ADojoP11Crowd::GetFanCount() const
{
	return Fans.Num();
}

const FDojoP11FanStyle* ADojoP11Crowd::GetStyleOf(int32 Index) const
{
	const FDojoP11Fan* Fan = GetFan(Index);
	return Fan && Styles.IsValidIndex(Fan->StyleIndex) ? &Styles[Fan->StyleIndex] : nullptr;
}

const FDojoP11Fan* ADojoP11Crowd::GetFan(int32 Index) const
{
	return Fans.IsValidIndex(Index) ? &Fans[Index] : nullptr;
}
```

# Tests

```cpp
#include "Misc/AutomationTest.h"

#if WITH_AUTOMATION_TESTS

#include "Engine/World.h"
#include "Quests/p11-crowd-styles/DojoP11Crowd.h"
#include "Quests/p11-crowd-styles/DojoP11Fan.h"
#include "Quests/p11-crowd-styles/DojoP11FanStyle.h"
#include "Support/DojoTestWorld.h"

namespace DojoP11CrowdTest
{
	/** A style with Name and CheerVolume. */
	FDojoP11FanStyle Style(const TCHAR* Name, float CheerVolume)
	{
		FDojoP11FanStyle Result;
		Result.Name = Name;
		Result.CheerVolume = CheerVolume;
		return Result;
	}

	/** Spawns a crowd of 3000 fans in three styles, cheering at volumes 1, 2, and 3. */
	ADojoP11Crowd* SpawnCrowd(FDojoTestWorld& TestWorld)
	{
		ADojoP11Crowd* Crowd = TestWorld.GetWorld()->SpawnActorDeferred<ADojoP11Crowd>(ADojoP11Crowd::StaticClass(), FTransform::Identity);
		Crowd->Styles = { Style(TEXT("Locals"), 1.f), Style(TEXT("Drummers"), 2.f), Style(TEXT("Visitors"), 3.f) };
		Crowd->FanCount = 3000;
		Crowd->FinishSpawning(FTransform::Identity);
		return Crowd;
	}
}

IMPLEMENT_SIMPLE_AUTOMATION_TEST(FDojo_P11_CrowdStyles_FansShareTheirStyle, "Dojo.P11.CrowdStyles.FansShareTheirStyle", EAutomationTestFlags::EditorContext | EAutomationTestFlags::ProductFilter)

/** 3000 fans are seated in turn across three styles; fans of one style point at the very same style, and a fan stays small. */
bool FDojo_P11_CrowdStyles_FansShareTheirStyle::RunTest(const FString& Parameters)
{
	using namespace DojoP11CrowdTest;

	FDojoTestWorld TestWorld;

	ADojoP11Crowd* Crowd = SpawnCrowd(TestWorld);
	if (!TestNotNull(TEXT("Crowd spawned"), Crowd)) return false;

	TestEqual(TEXT("Every fan is seated"), Crowd->GetFanCount(), 3000);
	TestTrue(TEXT("Fan 1 is a Drummer"), Crowd->GetStyleOf(1) && Crowd->GetStyleOf(1)->Name == FName(TEXT("Drummers")));
	TestTrue(TEXT("Fans 0 and 3 share one style object"), Crowd->GetStyleOf(0) != nullptr && Crowd->GetStyleOf(0) == Crowd->GetStyleOf(3));
	TestTrue(TEXT("And it is the crowd's own style, not a copy"), Crowd->GetStyleOf(0) == &Crowd->Styles[0]);
	TestTrue(TEXT("A fan is at most 12 bytes"), sizeof(FDojoP11Fan) <= 12);
	TestNull(TEXT("No fan past the end"), Crowd->GetStyleOf(3000));

	return true;
}

IMPLEMENT_SIMPLE_AUTOMATION_TEST(FDojo_P11_CrowdStyles_LoudnessReadsTheStyles, "Dojo.P11.CrowdStyles.LoudnessReadsTheStyles", EAutomationTestFlags::EditorContext | EAutomationTestFlags::ProductFilter)

/** Loudness is each fan's excitement times its style's volume; retuning one style changes the loudness of every fan of that style. */
bool FDojo_P11_CrowdStyles_LoudnessReadsTheStyles::RunTest(const FString& Parameters)
{
	using namespace DojoP11CrowdTest;

	FDojoTestWorld TestWorld;

	ADojoP11Crowd* Crowd = SpawnCrowd(TestWorld);
	if (!TestNotNull(TEXT("Crowd spawned"), Crowd)) return false;

	TestEqual(TEXT("A calm crowd is silent"), Crowd->GetLoudness(), 0.f);

	Crowd->Excite(0.5f);
	TestEqual(TEXT("Half excited: 0.5 times (1000 + 2000 + 3000)"), Crowd->GetLoudness(), 3000.f, 0.5f);

	Crowd->Styles[1].CheerVolume = 4.f;
	TestEqual(TEXT("Louder drummers: 0.5 times (1000 + 4000 + 3000)"), Crowd->GetLoudness(), 4000.f, 0.5f);

	Crowd->Excite(5.f);
	TestEqual(TEXT("Excitement stops at 1"), Crowd->GetLoudness(), 8000.f, 0.5f);

	return true;
}

IMPLEMENT_SIMPLE_AUTOMATION_TEST(FDojo_P11_CrowdStyles_NoStylesNoFans, "Dojo.P11.CrowdStyles.NoStylesNoFans", EAutomationTestFlags::EditorContext | EAutomationTestFlags::ProductFilter)

/** A crowd with no styles seats nobody and is silent. */
bool FDojo_P11_CrowdStyles_NoStylesNoFans::RunTest(const FString& Parameters)
{
	FDojoTestWorld TestWorld;

	ADojoP11Crowd* Crowd = TestWorld.SpawnActor<ADojoP11Crowd>();
	if (!TestNotNull(TEXT("Crowd spawned"), Crowd)) return false;

	TestEqual(TEXT("Nobody is seated"), Crowd->GetFanCount(), 0);
	Crowd->Excite(1.f);
	TestEqual(TEXT("And nobody cheers"), Crowd->GetLoudness(), 0.f);

	return true;
}

#endif
```

# Hints

- Loop over `Fans` by const reference; each fan gives you an excitement and a style index.
- `Styles.IsValidIndex(Fan.StyleIndex)` guards a fan whose index names no style.
- Do not copy the style out of the list in the loop; index into `Styles` and read `CheerVolume` where it lives.

# Rubric

- GetLoudness sums each fan's excitement times its own style's cheer volume.
- It reads the volume through the fan's index into the shared Styles list, never from a copy stored on the fan.
- It skips fans whose index names no style and never changes a style.
- Fans stay small: no style data is added to FDojoP11Fan.
- Retuning one style changes the loudness of every fan of that style.

# Alternative

Each fan could hold a `const FDojoP11FanStyle*` instead of an index. That reads the style without going through the crowd, but costs 8 bytes instead of 1 and breaks if `Styles` grows, because a TArray that grows moves its elements and every stored pointer then points at freed memory. An index into the crowd's list survives the list growing. A third option keeps each style in its own data asset and gives each fan a pointer to it, which is right when styles are authored as assets and shared across many crowds; the memory idea is the same.

# Parsons

```yaml
- id: loudness
  prompt: Put GetLoudness in order.
  lines:
    - "float ADojoP11Crowd::GetLoudness() const"
    - "{"
    - "	float Loudness = 0.f;"
    - "	for (const FDojoP11Fan& Fan : Fans)"
    - "	{"
    - "		if (Styles.IsValidIndex(Fan.StyleIndex)) Loudness += Fan.Excitement * Styles[Fan.StyleIndex].CheerVolume;"
    - "	}"
    - "	return Loudness;"
    - "}"
  distractors:
    - line: "		const FDojoP11FanStyle Style = Styles[Fan.StyleIndex];"
      mistake: Copying the whole style, chant text and all, for each of three thousand fans is the duplication the crowd was built to avoid; read the field in place.
```
