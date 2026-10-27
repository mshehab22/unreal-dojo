---
id: p10-a-class-per-weapon
title: Forty weapons, forty classes, one recompile each
order: 1
kind: concept
difficulty: 2
patterns: []
skills: [type-object, object-model]
terms: [data-asset, primary-data-asset, tobjectptr, editanywhere, uclass]
prerequisites: [p9-component-when-not]
xp: 25
estimatedMinutes: 7
concepts:
  - A subclass per kind that differs only in numbers costs a programmer and a compile for every new kind and every tweak
  - The kind can be an object of its own, holding the numbers every member of that kind shares
  - Each object points at its kind and keeps only what is its own, such as wear
  - In Unreal the kind is usually a data asset, which designers create and edit in the Content Browser
---

# Predict

```yaml
id: predict
type: multiple-choice
prompt: "Guess, no penalty: the armory has forty weapon classes, ASpear, ATrident, AMace and so on, each only setting damage, durability, and a name in its constructor. A designer wants the trident to hit a little harder. What does that take today?"
choices:
  - Changing a number in the editor and pressing Play
  - A programmer edits ATrident's constructor and the project recompiles
  - Nothing; tridents read their damage from the spear
  - Deleting the trident and placing a mace
answerIndex: 1
explanation: The number lives in C++, so only a programmer can change it, and every change is a compile. Forty classes means forty places like that.
```

# Card

The armory starts with a sword. Then a spear, a trident, a mace, a net, a training stick. Each is a subclass of `ADojoArenaWeapon` that sets three numbers in its constructor and adds nothing else. Forty kinds later the project has forty classes that differ only in data.

**What it costs.** Every new kind is a C++ class, a programmer, and a compile. Every balance tweak is the same. Designers, who own the numbers, cannot touch them. Nothing in the forty classes is behavior; they are a spreadsheet written as code.

**Make the kind an object.** Instead of a class per kind, write one class for "a kind of weapon" whose instances each describe one kind: the spear's numbers, the trident's numbers. Each weapon in the arena then points at the kind it is. Weapons of the same kind share one kind object, so changing the kind changes all of them.

**Split what is shared from what is each weapon's own.** Damage, durability when new, and the display name belong to the kind. How worn this particular spear is belongs to the spear. The kind holds the first group and is never changed by one weapon's use; the weapon holds the second.

**In Unreal, a data asset.** A class deriving from `UPrimaryDataAsset` (or `UDataAsset`) with `UPROPERTY(EditDefaultsOnly)` fields is a kind: a designer right-clicks in the Content Browser, makes a Data Asset of that class, names it DA_Trident, and fills in the numbers. The weapon actor holds `UPROPERTY(EditAnywhere) TObjectPtr<const UDojoArenaWeaponKind> Kind;`, picked from a dropdown in its Details panel. A new kind is a new asset, made in the editor with no compile.

# Example

```cpp
// The kind: shared numbers, edited as an asset.
UCLASS(BlueprintType)
class UDojoArenaWeaponKind : public UPrimaryDataAsset
{
	GENERATED_BODY()

public:
	UPROPERTY(EditDefaultsOnly, Category = "Weapon Kind")
	float Damage = 10.f;

	UPROPERTY(EditDefaultsOnly, Category = "Weapon Kind")
	float MaxDurability = 100.f;
};

// The weapon: points at its kind and keeps only its own wear.
UPROPERTY(EditAnywhere, Category = "Weapon")
TObjectPtr<const UDojoArenaWeaponKind> Kind;

float Durability = 0.f;
```

# Questions

```yaml
- id: shared-or-own
  type: multiple-choice
  prompt: "Which of these belongs on the weapon itself rather than on its kind?"
  choices:
    - Damage of one swing
    - Durability a new weapon starts with
    - How much durability this particular weapon has left
    - The name shown above weapons of this kind
  answerIndex: 2
  explanation: Wear differs between two spears of the same kind, so it is the spear's own; the rest is the same for every spear and belongs to the kind.
- id: fill-pointer
  type: fill-blank
  prompt: "A weapon points at its kind with UPROPERTY(EditAnywhere) ___<const UDojoArenaWeaponKind> Kind;"
  acceptedAnswers: [TObjectPtr]
  explanation: TObjectPtr is the UE5 way to hold a UObject reference in a property, and const says the weapon only reads its kind.
- id: spot-class-per-kind
  type: spot-the-bug
  prompt: This trident is one of forty weapon classes. A designer wants it to hit harder. Which line would they need a programmer to change?
  code: |
    ADojoArenaTrident::ADojoArenaTrident()
    {
    	DisplayName = TEXT("Trident");
    	Damage = 18.f;
    	MaxDurability = 80.f;
    }
  bugLine: 4
  fix: Move the numbers into a weapon kind data asset, DA_Trident, and let one weapon class point at it; the designer then edits the asset.
  explanation: A number set in a constructor can only change through C++ and a compile; in an asset it changes in the editor.
- id: what-new-kind-costs
  type: multiple-choice
  prompt: "Once weapons point at data asset kinds, what does a brand new kind of weapon with new numbers take?"
  choices:
    - A new C++ class and a recompile
    - A new data asset of the kind class, filled in by a designer
    - A new level
    - Editing every existing weapon
  answerIndex: 1
  explanation: The kind is data now, so a new kind is a new asset.
- id: explain-kinds
  type: explain-in-one-sentence
  prompt: In one sentence, say what changes when the forty weapon classes become one weapon class plus a kind asset per weapon.
  modelAnswer: Each kind's shared numbers move into an asset that designers create and tune in the editor, and each weapon points at its kind and keeps only its own state, so new kinds and tweaks need no code or compile.
  rubric:
    - Says shared per-kind data moves into a separate kind object or asset
    - Names a benefit such as designers editing, no compile, or one class instead of many
  explanation: Kinds become data; the class stays one.
```
