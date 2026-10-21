---
id: f1-uproperty-specifiers
title: UPROPERTY specifiers decide who can see and change a field
order: 3
kind: concept
difficulty: 1
patterns: []
skills: [reflection]
terms: [uproperty, editanywhere, visibleanywhere, blueprintreadwrite, blueprintreadonly, category-specifier, meta-specifier, allowprivateaccess, displayname-meta, tobjectptr]
prerequisites: [f1-reflection-and-uclass]
xp: 25
estimatedMinutes: 6
concepts:
  - Edit and Visible specifiers control the Details panel
  - BlueprintReadOnly and BlueprintReadWrite control Blueprint access
  - Category and meta keep a class usable for designers
---

# Predict

```yaml
id: predict
type: multiple-choice
prompt: "Guess, no penalty: a field is marked `UPROPERTY(VisibleAnywhere)` and holds a component pointer. Can a designer change the component's own settings, such as its color, in the Details panel?"
choices:
  - No, VisibleAnywhere makes everything inside read only
  - Yes, the pointer cannot be swapped, but the component it points to is still editable
  - Only if the component is also marked EditAnywhere in its own class
  - Only in a Blueprint child, never on a placed actor
answerIndex: 1
explanation: VisibleAnywhere locks which object the pointer holds; the object's own editable properties still show and can be changed.
```

# Card

`UPROPERTY(...)` records a field with reflection. The words in the brackets are **specifiers**; they say what each part of the engine may do with the field.

Editor access (pick one):

- `EditAnywhere`: editable on the class defaults and on every placed instance.
- `EditDefaultsOnly` or `EditInstanceOnly`: editable on only one of the two.
- `VisibleAnywhere`: shown read only. The usual choice for component pointers made in the constructor.

Blueprint access (optional): `BlueprintReadOnly` gives a Get node, `BlueprintReadWrite` gives Get and Set. A private field needs `meta = (AllowPrivateAccess = "true")` before Blueprint may touch it.

Organization: `Category = "Target"` groups fields under a heading, and `Category = "Target|Timing"` nests a subheading. The `meta` block holds editor hints: `ClampMin` and `ClampMax` stop impossible values, and `DisplayName` changes the label a designer reads without renaming the C++ field.

Every UObject pointer member gets a UPROPERTY, even an empty one, and is written as `TObjectPtr<T>` in UE5. Without the macro the garbage collector cannot see the reference and may free the object while you still hold it.

# Example

```cpp
UCLASS()
class ADojoF1Scarecrow : public AActor
{
	GENERATED_BODY()

public:
	// Read only in Details; the label's own text and color stay editable inside it.
	UPROPERTY(VisibleAnywhere, Category = "Scarecrow")
	TObjectPtr<UTextRenderComponent> Label;

	// Designers tune it per scarecrow; Blueprint can read it but not change it.
	UPROPERTY(EditAnywhere, BlueprintReadOnly, Category = "Scarecrow|Tuning", meta = (ClampMin = "0.0", DisplayName = "Scare Radius (cm)"))
	float ScareRadius = 400.f;

private:
	// Private in C++, still readable from this class's Blueprint children.
	UPROPERTY(VisibleInstanceOnly, BlueprintReadOnly, Category = "Scarecrow", meta = (AllowPrivateAccess = "true"))
	int32 BirdsScared = 0;
};
```

# Questions

```yaml
- id: pick-edit-specifier
  type: multiple-choice
  prompt: "Every gate in the yard shares one opening speed, and nobody should change it on a single placed gate. Which specifier fits the speed field?"
  choices:
    - EditInstanceOnly
    - VisibleAnywhere
    - BlueprintReadWrite
    - EditDefaultsOnly
  answerIndex: 3
  explanation: EditDefaultsOnly allows edits on the class or its Blueprint child but hides the field on placed instances.
- id: fill-clamp
  type: fill-blank
  prompt: "To stop a designer typing a negative radius, write meta = (___ = \"0.0\")."
  acceptedAnswers: [ClampMin]
  explanation: ClampMin sets the lowest value the Details panel and Blueprint pins accept.
- id: spot-private-blueprint
  type: spot-the-bug
  prompt: The header tool stops this build because a private field is offered to Blueprint without permission. Which line is wrong?
  code: |
    private:
    	UPROPERTY(VisibleAnywhere, BlueprintReadOnly, Category = "Scarecrow")
    	int32 BirdsScared = 0;
  bugLine: 2
  fix: Add meta with AllowPrivateAccess set to true to that UPROPERTY, or move the field to a public or protected section.
  explanation: Blueprint access to a private member must be granted explicitly with AllowPrivateAccess.
- id: readonly-versus-readwrite
  type: multiple-choice
  prompt: "A Blueprint should show a target's current hit count on a widget but never change it. Which Blueprint specifier fits?"
  choices: [BlueprintReadWrite, BlueprintReadOnly, BlueprintAssignable]
  answerIndex: 1
  explanation: BlueprintReadOnly gives only a Get node, so C++ stays the single place that changes the count.
- id: explain-tobjectptr
  type: explain-in-one-sentence
  prompt: In one sentence, say why a component pointer member needs UPROPERTY even when nobody edits it.
  modelAnswer: The garbage collector only tracks references that reflection knows about, so without UPROPERTY the object can be freed while the pointer still points at it.
  rubric:
    - Names the garbage collector
    - Says an unmarked pointer can be left pointing at a freed object
  explanation: The Details panel is a side benefit; keeping the object alive is the reason the macro is required.
```
