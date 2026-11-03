#pragma once

#include "CoreMinimal.h"
#include "NativeGameplayTags.h"

/** The gameplay tags the ability world uses, declared in C++ so they exist without any project settings. */
namespace DojoS2Tags
{
	/** The parent of every state a user can be in while an ability runs. */
	UE_DECLARE_GAMEPLAY_TAG_EXTERN(State);

	/** The user is planted where it stands and cannot move itself. */
	UE_DECLARE_GAMEPLAY_TAG_EXTERN(State_Rooted);

	/** The user is concentrating and cannot start another big ability. */
	UE_DECLARE_GAMEPLAY_TAG_EXTERN(State_Channeling);
}
