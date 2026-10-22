---
id: f6-data-tables
title: Data Tables
order: 3
kind: concept
difficulty: 2
patterns: []
skills: [data]
terms: [data-table, table-row-base, ustruct, fname]
prerequisites: [f6-weapon-data]
xp: 25
estimatedMinutes: 7
concepts:
  - A data table is rows of one struct, keyed by row name
  - FindRow returns a pointer to a row or nullptr
  - Tables suit many entries of the same shape; data assets suit fewer, richer ones
---

# Predict

```yaml
id: predict
type: multiple-choice
prompt: "Guess, no penalty: code calls Table->FindRow<FDojoEnemyRow>(TEXT(\"Goblin\"), TEXT(\"Spawner\")) but the table has no Goblin row. What comes back?"
choices:
  - A default FDojoEnemyRow
  - nullptr, and the table logs a warning unless told not to
  - The first row in the table
  - The game stops on a failed check
answerIndex: 1
explanation: FindRow returns a pointer, null when the row is missing, and by default warns with the context string you passed.
```

# Card

A **data table** is a spreadsheet inside Unreal. Every row has the same columns, and a row's name, an `FName`, is its key. Fifty enemy types, every level's XP threshold, a shop's prices: whenever you have many entries of the same shape, a table keeps them side by side, and designers can import and export it as CSV or JSON.

The columns come from a C++ struct:

- Declare it with `USTRUCT(BlueprintType)` and derive it from `FTableRowBase`. The base is what lets the editor offer it as a row structure.
- Give it UPROPERTY fields; each one becomes a column.

A designer then makes the table in the Content Browser (Miscellaneous, then Data Table), picks your struct, and adds rows.

In code, hold the table as a `TObjectPtr<UDataTable>` UPROPERTY and look rows up by name:

- `FindRow<FDojoEnemyRow>(RowName, TEXT("Context"))` returns a pointer to the row, or nullptr when there is no such row. The context string is put into the warning it logs, so it should say who asked.
- Pass `false` as a third argument to silence that warning when you report the problem yourself.
- `GetRowNames()` lists the row names in table order.
- The returned pointer points into the table. Read from it, and copy out what you need; do not keep it around, because the table can be reloaded.

Tables and data assets overlap. A **table** is best for many entries with a few plain fields, compared at a glance. A **data asset** is best for fewer entries with many fields, nested structs, or their own Blueprint-readable identity. Many games use both: a table of enemy stats, and a data asset per boss.

# Example

```cpp
/** One row of the enemy table. */
USTRUCT(BlueprintType)
struct FDojoEnemyRow : public FTableRowBase
{
	GENERATED_BODY()

	/** Health the enemy spawns with. */
	UPROPERTY(EditAnywhere, BlueprintReadOnly, Category = "Enemy")
	float MaxHealth = 100.f;

	/** Walking speed. */
	UPROPERTY(EditAnywhere, BlueprintReadOnly, Category = "Enemy")
	float Speed = 300.f;
};

float ADojoSpawner::HealthFor(FName Kind) const
{
	const FDojoEnemyRow* Row = EnemyTable->FindRow<FDojoEnemyRow>(Kind, TEXT("ADojoSpawner::HealthFor"));
	return Row ? Row->MaxHealth : 0.f;
}
```

# Questions

```yaml
- id: row-base
  type: fill-blank
  prompt: "A struct used as a data table row derives from F___."
  acceptedAnswers: [TableRowBase]
  explanation: FTableRowBase marks the struct as a valid row structure.
- id: table-or-asset
  type: multiple-choice
  prompt: "A game has 80 kinds of loot, each with a name, a weight, and a price. Where do they fit best?"
  choices:
    - 80 C++ classes
    - A data table with one row per kind
    - One data asset with 240 UPROPERTYs
  answerIndex: 1
  explanation: Many entries of one shape is what tables are for, and designers can edit them side by side or as CSV.
- id: spot-null-row
  type: spot-the-bug
  prompt: The game crashes when a designer misspells a row name in a spawner. Which line is wrong?
  code: |
    float ADojoSpawner::SpeedFor(FName Kind) const
    {
    	const FDojoEnemyRow* Row = EnemyTable->FindRow<FDojoEnemyRow>(Kind, TEXT("SpeedFor"));
    	return Row->Speed;
    }
  bugLine: 4
  fix: Check Row for nullptr and return a fallback when the row is missing.
  explanation: FindRow returns nullptr for a missing row, and reading through it crashes.
- id: row-key
  type: multiple-choice
  prompt: "What identifies a row in a data table?"
  choices: [Its index, Its row name as an FName, The first column's value]
  answerIndex: 1
  explanation: Rows are keyed by name; that name is what FindRow takes.
- id: explain-context
  type: explain-in-one-sentence
  prompt: In one sentence, say why FindRow takes a context string.
  modelAnswer: It is written into the warning logged when the row is missing, so the log says which code asked for the bad row.
  rubric:
    - Mentions the warning or log
    - Mentions identifying who asked
  explanation: A warning that names its caller can be traced in seconds.
```
