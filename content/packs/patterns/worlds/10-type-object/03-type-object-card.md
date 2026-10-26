---
id: p10-type-object-card
title: The kind is data, the object points at it
order: 3
kind: concept
difficulty: 2
patterns: [type-object]
skills: [type-object]
terms: [primary-data-asset, data-asset, data-table, table-row-base, cdo, tsubclassof, tsoftobjectptr]
prerequisites: [p10-weapon-kinds]
xp: 25
estimatedMinutes: 9
concepts:
  - Type Object makes each kind an instance of one kind class, and each object points at its kind instead of being a subclass of it
  - Shared data lives on the kind and is read through it; state that differs between objects stays on the object
  - "Unreal's forms: primary data assets, data table rows, and the class default object of a defaults-only Blueprint"
  - The kind can also choose the actor class its objects use, so creating them happens in one place
---

# Predict

```yaml
id: predict
type: multiple-choice
prompt: "Guess, no penalty: the archery range has twelve quiver kinds that differ only in arrow count, arrow damage, and name, and designers like editing them side by side like a spreadsheet. Which Unreal form fits best?"
choices:
  - Twelve C++ subclasses
  - A data table whose rows use one row struct, one row per quiver kind
  - One quiver actor with twelve booleans
  - A level per quiver kind
answerIndex: 1
explanation: Many small kinds with the same fields suit a data table, which designers edit as a grid or import from a spreadsheet; each quiver names its row.
```

# Card

What you built for the armory is the **Type Object** pattern. Kinds are not classes: there is one class for "a kind of weapon", and each kind is an instance of it. Each weapon points at its kind. A new kind is a new instance, made as data, and changing a kind changes every object of it.

**Shared on the kind, own on the object.** The kind holds what every member shares and is never changed by one member's use. The object holds what differs between members of the same kind: wear, arrows left, fuel left. Read shared numbers through the kind when you need them, so a retuned kind reaches objects already in play.

**Unreal's forms.**

- **Primary data asset.** A `UPrimaryDataAsset` subclass, one asset per kind. Its primary asset type is the name of its first native class, so once that type is in the Asset Manager's scan list in Project Settings, the Asset Manager can list every weapon kind and load any of them by id, even kinds no level references. The usual choice when kinds have many fields or reference other assets.
- **Data table row.** A struct deriving from `FTableRowBase`, one row per kind in a `UDataTable`, edited as a grid or imported from a spreadsheet. An object names its row with `FDataTableRowHandle` and looks it up with `FindRow`. The usual choice for many small kinds with the same flat fields.
- **A Blueprint that only changes defaults.** Every class has a class default object (CDO) holding its default values, and `GetDefault<UMyKind>()` reads it. A Blueprint child that only sets defaults is a kind the engine manages, at the cost of a class per kind.

**The kind can make its objects.** A kind can name the actor class its objects use, `TSubclassOf<ADojoArenaQuiver>`, so a kind can pick a Blueprint child with its own mesh. A spawning function next to the kind then spawns that class and gives the new object its kind, so every object of a kind is made in one place.

**Heavy assets stay soft.** A kind that names a mesh or a sound with `TSoftObjectPtr` does not force it into memory just because the kind is loaded; load it when an object of that kind actually appears.

# Example

```cpp
// A kind as a data table row: one row per quiver kind.
USTRUCT(BlueprintType)
struct FDojoArenaQuiverRow : public FTableRowBase
{
	GENERATED_BODY()

	UPROPERTY(EditAnywhere, Category = "Quiver Kind")
	int32 ArrowCount = 6;

	UPROPERTY(EditAnywhere, Category = "Quiver Kind")
	float ArrowDamage = 12.f;
};

// An object names its row and reads it.
const FDojoArenaQuiverRow* Row = Kind.DataTable ? Kind.DataTable->FindRow<FDojoArenaQuiverRow>(Kind.RowName, TEXT("Quiver"), false) : nullptr;
```

# Questions

```yaml
- id: asset-or-row
  type: multiple-choice
  prompt: "Kinds of arena banner each need a name, a mesh, three sounds, a material, and a dozen tuning numbers, and a shop must list every kind even if no banner is in the level. Which form fits best?"
  choices:
    - A data table with one flat row per banner
    - A primary data asset per banner kind, found through the Asset Manager
    - A subclass per banner
    - Numbers on every placed banner
  answerIndex: 1
  explanation: Rich kinds that reference other assets, and that code must find without a placed object, suit primary data assets and the Asset Manager.
- id: fill-findrow
  type: fill-blank
  prompt: "Given an FDataTableRowHandle named Kind, the row is Kind.DataTable->___<FDojoArenaQuiverRow>(Kind.RowName, TEXT(\"Quiver\"))."
  acceptedAnswers: [FindRow]
  explanation: FindRow returns a pointer to the row, or nullptr when the table has no row by that name.
- id: spot-shared-state
  type: spot-the-bug
  prompt: Every quiver of a kind empties at once. Which line puts one quiver's state on the shared kind?
  code: |
    float ADojoArenaQuiver::Draw()
    {
    	FDojoArenaQuiverRow* Row = Kind.DataTable->FindRow<FDojoArenaQuiverRow>(Kind.RowName, TEXT("Quiver"));
    	if (!Row || Row->ArrowCount <= 0) return 0.f;
    	Row->ArrowCount--;
    	return Row->ArrowDamage;
    }
  bugLine: 5
  fix: Keep an ArrowsLeft count on the quiver, filled from the row's ArrowCount, and decrement that; the row only says how many a full quiver holds.
  explanation: The row is shared by every quiver of the kind, so taking an arrow from it takes one from all of them.
- id: cdo-as-kind
  type: multiple-choice
  prompt: "What does GetDefault<UDojoArenaWeaponKind>() return?"
  choices:
    - A new weapon kind asset
    - The class default object, holding the class's default values
    - The first weapon kind asset in the Content Browser
    - nullptr unless an asset exists
  answerIndex: 1
  explanation: Every class has one default object; reading it gives the defaults written in the class, which can serve as a fallback kind.
- id: explain-type-object
  type: explain-in-one-sentence
  prompt: In one sentence, describe the Type Object pattern.
  modelAnswer: Each kind of thing is an instance of one kind class holding the data every member shares, and each object points at its kind and keeps only its own state, so new kinds are made as data rather than as subclasses.
  rubric:
    - Mentions kinds as instances or data rather than subclasses
    - Mentions objects pointing at a shared kind and keeping their own state
  explanation: The kind is data; the object points at it.
```
