#include "DojoS2AbilityTags.h"

namespace DojoS2Tags
{
	UE_DEFINE_GAMEPLAY_TAG_COMMENT(State, "DojoS2.State", "Parent of every state an ability can put its user in.");
	UE_DEFINE_GAMEPLAY_TAG_COMMENT(State_Rooted, "DojoS2.State.Rooted", "The user cannot move itself.");
	UE_DEFINE_GAMEPLAY_TAG_COMMENT(State_Channeling, "DojoS2.State.Channeling", "The user cannot start another big ability.");
}
