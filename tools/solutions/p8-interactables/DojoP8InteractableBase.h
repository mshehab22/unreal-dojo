#pragma once

#include "CoreMinimal.h"
#include "GameFramework/Actor.h"
#include "DojoP8InteractableBase.generated.h"

class ADojoP8Visitor;
class UTextRenderComponent;

/** The base for every arena interactable: it owns when an interaction may happen, and hands subclasses, in C++ or Blueprint, a protected toolbox for items, flags, and prompts (Subclass Sandbox: OnInteract is the sandbox method, the BlueprintProtected functions are the provided operations). */
UCLASS(Abstract, Blueprintable)
class ADojoP8InteractableBase : public AActor
{
	GENERATED_BODY()

public:
	/** Creates the label and turns ticking off. */
	ADojoP8InteractableBase();

	/** Floating text that shows the interactable's prompt. */
	UPROPERTY(VisibleAnywhere, Category = "Interactable")
	TObjectPtr<UTextRenderComponent> Label;

	/** A visitor uses this interactable; ignored for an empty visitor or once the interactable is used up. */
	UFUNCTION(BlueprintCallable, Category = "Interactable")
	void Interact(ADojoP8Visitor* Visitor);

	/** The prompt currently shown. */
	UFUNCTION(BlueprintPure, Category = "Interactable")
	FText GetPrompt() const;

	/** True once the interactable will take no more interactions. */
	UFUNCTION(BlueprintPure, Category = "Interactable")
	bool IsUsedUp() const;

	/** Interactions that reached the subclass's OnInteract. */
	UFUNCTION(BlueprintPure, Category = "Interactable")
	int32 GetInteractionCount() const;

protected:
	/** What this kind of interactable does when used. C++ subclasses override OnInteract_Implementation; Blueprint children override the event. The default shows "Nothing happens". */
	UFUNCTION(BlueprintNativeEvent, Category = "Interactable")
	void OnInteract(ADojoP8Visitor* Visitor);

	/** Shows Text as the prompt. */
	UFUNCTION(BlueprintCallable, Category = "Interactable", meta = (BlueprintProtected))
	void ShowPrompt(const FText& Text);

	/** Takes one Item from the visitor; returns false, taking nothing, when the visitor has none. */
	UFUNCTION(BlueprintCallable, Category = "Interactable", meta = (BlueprintProtected))
	bool TakeItem(ADojoP8Visitor* Visitor, FName Item);

	/** Gives the visitor one Item. */
	UFUNCTION(BlueprintCallable, Category = "Interactable", meta = (BlueprintProtected))
	void GiveItem(ADojoP8Visitor* Visitor, FName Item);

	/** Records a quest flag on the visitor. */
	UFUNCTION(BlueprintCallable, Category = "Interactable", meta = (BlueprintProtected))
	void SetQuestFlag(ADojoP8Visitor* Visitor, FName Flag);

	/** Stops the interactable from taking any further interaction. */
	UFUNCTION(BlueprintCallable, Category = "Interactable", meta = (BlueprintProtected))
	void MarkUsedUp();

private:
	FText Prompt;
	bool bUsedUp = false;
	int32 InteractionCount = 0;
};
